"""SAP MCP connector — generic OData v2/v4 access to an SAP Cloud service
(S/4HANA Cloud, SuccessFactors, or any SAP BTP-exposed OData service).

SAP doesn't have one universal REST API the way Slack/GitHub do — the actual
entity model (which entity sets exist, their fields) is entirely dependent
on which SAP product and service is provisioned. Rather than inventing
domain-specific tools against a schema we don't have, this connector exposes
the generic OData operations (query/get/create against any entity set path)
that work against any SAP OData service once SAP_BASE_URL points at one —
the real integration surface, not a fake higher-level API.

Auth: OAuth2 client-credentials against SAP_TOKEN_URL (the standard pattern
for SAP BTP-exposed services — the exact token endpoint is provided by
whichever SAP service instance is bound, e.g. via its service key).
"""
from typing import Any, List

from ...config import settings
from ..base import BaseMCPConnector, MCPToolError
from ..http_util import raise_for_tool_error, resilient_request

_token_cache: dict = {"access_token": None}


def _get_access_token() -> str:
    if _token_cache["access_token"]:
        return _token_cache["access_token"]
    resp = resilient_request(
        "mcp_sap_auth", "POST", settings.SAP_TOKEN_URL,
        data={"grant_type": "client_credentials", "client_id": settings.SAP_CLIENT_ID, "client_secret": settings.SAP_CLIENT_SECRET},
    )
    if resp.status_code >= 400:
        raise MCPToolError(f"SAP auth failed ({resp.status_code}): {resp.text[:300]}", code="auth_error", status_code=502)
    _token_cache["access_token"] = resp.json()["access_token"]
    return _token_cache["access_token"]


def _sap_request(method: str, path: str, **kwargs) -> Any:
    headers = kwargs.pop("headers", {})
    headers["Authorization"] = f"Bearer {_get_access_token()}"
    headers.setdefault("Accept", "application/json")
    url = f"{settings.SAP_BASE_URL.rstrip('/')}/{path.lstrip('/')}"
    resp = resilient_request("mcp_sap", method, url, headers=headers, **kwargs)
    if resp.status_code == 401:
        _token_cache["access_token"] = None  # expired — next call re-authenticates
    raise_for_tool_error(resp, "SAP")
    return resp.json() if resp.content else {}


class SAPConnector(BaseMCPConnector):
    name = "sap"
    display_name = "SAP"
    category = "erp"
    required_scopes = ["<service-specific — granted via the SAP BTP service instance's role collection>"]

    def missing_config(self) -> List[str]:
        missing = []
        if not settings.SAP_BASE_URL:
            missing.append("SAP_BASE_URL")
        if not settings.SAP_TOKEN_URL:
            missing.append("SAP_TOKEN_URL")
        if not settings.SAP_CLIENT_ID:
            missing.append("SAP_CLIENT_ID")
        if not settings.SAP_CLIENT_SECRET:
            missing.append("SAP_CLIENT_SECRET")
        return missing

    def register_tools(self) -> None:
        self._add_tool(
            "query_entity_set",
            "Query an OData entity set with optional $filter/$select/$top.",
            {
                "type": "object",
                "properties": {
                    "entity_set": {"type": "string", "description": "e.g. 'API_BUSINESS_PARTNER/A_BusinessPartner'."},
                    "filter": {"type": "string", "description": "OData $filter expression."},
                    "select": {"type": "string", "description": "OData $select expression."},
                    "top": {"type": "integer", "description": "Max rows (OData $top)."},
                },
                "required": ["entity_set"],
            },
            self._query_entity_set,
        )
        self._add_tool(
            "get_entity",
            "Fetch a single entity by its OData key.",
            {"type": "object", "properties": {"entity_set": {"type": "string"}, "key": {"type": "string", "description": "OData key predicate, e.g. \"'0001'\"."}}, "required": ["entity_set", "key"]},
            self._get_entity,
        )
        self._add_tool(
            "create_entity",
            "Create a new entity in an entity set.",
            {"type": "object", "properties": {"entity_set": {"type": "string"}, "fields": {"type": "object"}}, "required": ["entity_set", "fields"]},
            self._create_entity,
        )

    def _query_entity_set(self, params: dict) -> dict:
        odata_params = {}
        if params.get("filter"):
            odata_params["$filter"] = params["filter"]
        if params.get("select"):
            odata_params["$select"] = params["select"]
        if params.get("top"):
            odata_params["$top"] = params["top"]
        data = _sap_request("GET", params["entity_set"], params=odata_params)
        return {"results": data.get("d", {}).get("results", data.get("value", []))}

    def _get_entity(self, params: dict) -> dict:
        return _sap_request("GET", f"{params['entity_set']}({params['key']})")

    def _create_entity(self, params: dict) -> dict:
        return _sap_request("POST", params["entity_set"], json=params["fields"])


connector = SAPConnector()

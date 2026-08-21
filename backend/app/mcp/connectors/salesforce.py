"""Salesforce MCP connector — Salesforce REST API
(https://developer.salesforce.com/docs/atlas.en-us.api_rest.meta/api_rest/).

Auth: OAuth2 username-password flow — the simplest server-to-server option
for a backend integration (no user browser redirect needed), at the cost of
storing a password + security token. Requires a Connected App in Salesforce
Setup with the OAuth username-password flow enabled for its client
id/secret. Token is cached in-process until Salesforce rejects it (a 401
clears the cache and re-authenticates once).

Permission boundary: whichever object-level CRUD permissions the
authenticating user's profile grants — this connector doesn't request an
elevated integration-user profile, it inherits the configured user's own
access, e.g. Leads/Contacts read-write is enough for every tool below.
"""
from typing import Any, List

from ...config import settings
from ..base import BaseMCPConnector, MCPToolError
from ..http_util import resilient_request

API_VERSION = "v59.0"
_session: dict = {"access_token": None, "instance_url": None}


def _login_url() -> str:
    return f"{(settings.SALESFORCE_INSTANCE_URL or 'https://login.salesforce.com').rstrip('/')}/services/oauth2/token"


def _authenticate() -> None:
    resp = resilient_request(
        "mcp_salesforce_auth", "POST", _login_url(),
        data={
            "grant_type": "password",
            "client_id": settings.SALESFORCE_CLIENT_ID,
            "client_secret": settings.SALESFORCE_CLIENT_SECRET,
            "username": settings.SALESFORCE_USERNAME,
            "password": f"{settings.SALESFORCE_PASSWORD}{settings.SALESFORCE_SECURITY_TOKEN}",
        },
    )
    if resp.status_code >= 400:
        raise MCPToolError(f"Salesforce auth failed ({resp.status_code}): {resp.text[:300]}", code="auth_error", status_code=502)
    body = resp.json()
    _session["access_token"] = body["access_token"]
    _session["instance_url"] = body["instance_url"]


def _sf_request(method: str, path: str, retry_on_auth_failure: bool = True, **kwargs) -> Any:
    if not _session["access_token"]:
        _authenticate()
    url = f"{_session['instance_url']}/services/data/{API_VERSION}{path}"
    headers = kwargs.pop("headers", {})
    headers["Authorization"] = f"Bearer {_session['access_token']}"
    resp = resilient_request("mcp_salesforce", method, url, headers=headers, **kwargs)

    if resp.status_code == 401 and retry_on_auth_failure:
        _session["access_token"] = None
        return _sf_request(method, path, retry_on_auth_failure=False, **kwargs)
    if resp.status_code >= 400:
        raise MCPToolError(f"Salesforce API error ({resp.status_code}): {resp.text[:300]}", code="upstream_error", status_code=502)
    return resp.json() if resp.content else {}


class SalesforceConnector(BaseMCPConnector):
    name = "salesforce"
    display_name = "Salesforce"
    category = "crm"
    required_scopes = ["api"]  # OAuth2 "api" scope — object-level access follows the authenticating user's profile

    def missing_config(self) -> List[str]:
        missing = []
        if not settings.SALESFORCE_CLIENT_ID:
            missing.append("SALESFORCE_CLIENT_ID")
        if not settings.SALESFORCE_CLIENT_SECRET:
            missing.append("SALESFORCE_CLIENT_SECRET")
        if not settings.SALESFORCE_USERNAME:
            missing.append("SALESFORCE_USERNAME")
        if not settings.SALESFORCE_PASSWORD:
            missing.append("SALESFORCE_PASSWORD")
        return missing

    def register_tools(self) -> None:
        self._add_tool(
            "query",
            "Run a SOQL query.",
            {"type": "object", "properties": {"soql": {"type": "string"}}, "required": ["soql"]},
            self._query,
        )
        self._add_tool(
            "get_record",
            "Fetch a record by object type and id.",
            {"type": "object", "properties": {"object_type": {"type": "string"}, "record_id": {"type": "string"}}, "required": ["object_type", "record_id"]},
            self._get_record,
        )
        self._add_tool(
            "create_record",
            "Create a new record.",
            {
                "type": "object",
                "properties": {"object_type": {"type": "string", "description": "e.g. 'Lead', 'Contact', 'Opportunity'."}, "fields": {"type": "object"}},
                "required": ["object_type", "fields"],
            },
            self._create_record,
        )
        self._add_tool(
            "update_record",
            "Update an existing record.",
            {
                "type": "object",
                "properties": {"object_type": {"type": "string"}, "record_id": {"type": "string"}, "fields": {"type": "object"}},
                "required": ["object_type", "record_id", "fields"],
            },
            self._update_record,
        )

    def _query(self, params: dict) -> dict:
        data = _sf_request("GET", "/query", params={"q": params["soql"]})
        return {"total_size": data.get("totalSize"), "records": data.get("records", [])}

    def _get_record(self, params: dict) -> dict:
        return _sf_request("GET", f"/sobjects/{params['object_type']}/{params['record_id']}")

    def _create_record(self, params: dict) -> dict:
        data = _sf_request("POST", f"/sobjects/{params['object_type']}", json=params["fields"])
        return {"id": data.get("id"), "success": data.get("success", True)}

    def _update_record(self, params: dict) -> dict:
        _sf_request("PATCH", f"/sobjects/{params['object_type']}/{params['record_id']}", json=params["fields"])
        return {"id": params["record_id"], "success": True}


connector = SalesforceConnector()

"""Google Docs MCP connector — Google Docs API v1
(https://developers.google.com/docs/api), via the shared Google Workspace
service-account helper (_auth.py).
"""
from typing import List

from ...base import BaseMCPConnector
from ...http_util import raise_for_tool_error
from ._auth import google_api_request, google_workspace_missing_config

DOCS_BASE = "https://docs.googleapis.com/v1/documents"
SCOPES = ["https://www.googleapis.com/auth/documents"]


class DocsConnector(BaseMCPConnector):
    name = "google_docs"
    display_name = "Google Docs"
    category = "google_workspace"
    required_scopes = SCOPES

    def missing_config(self) -> List[str]:
        return google_workspace_missing_config()

    def register_tools(self) -> None:
        self._add_tool(
            "create_document",
            "Create a new Google Doc.",
            {"type": "object", "properties": {"title": {"type": "string"}}, "required": ["title"]},
            self._create_document,
        )
        self._add_tool(
            "get_document",
            "Fetch a document's plain-text content.",
            {"type": "object", "properties": {"document_id": {"type": "string"}}, "required": ["document_id"]},
            self._get_document,
        )
        self._add_tool(
            "append_text",
            "Append text to the end of a document.",
            {"type": "object", "properties": {"document_id": {"type": "string"}, "text": {"type": "string"}}, "required": ["document_id", "text"]},
            self._append_text,
        )

    def _create_document(self, params: dict) -> dict:
        resp = google_api_request("mcp_google_docs", "POST", DOCS_BASE, SCOPES, json={"title": params["title"]})
        raise_for_tool_error(resp, "Google Docs")
        data = resp.json()
        return {"document_id": data.get("documentId"), "title": data.get("title")}

    def _get_document(self, params: dict) -> dict:
        resp = google_api_request("mcp_google_docs", "GET", f"{DOCS_BASE}/{params['document_id']}", SCOPES)
        raise_for_tool_error(resp, "Google Docs")
        data = resp.json()
        text = "".join(
            run.get("textRun", {}).get("content", "")
            for el in (data.get("body") or {}).get("content", [])
            for run in el.get("paragraph", {}).get("elements", [])
        )
        return {"document_id": data.get("documentId"), "title": data.get("title"), "text": text}

    def _append_text(self, params: dict) -> dict:
        # Fetch current end index (Docs requires an explicit insert location, not "append").
        doc_resp = google_api_request("mcp_google_docs", "GET", f"{DOCS_BASE}/{params['document_id']}", SCOPES)
        raise_for_tool_error(doc_resp, "Google Docs")
        content = (doc_resp.json().get("body") or {}).get("content", [])
        end_index = content[-1]["endIndex"] - 1 if content else 1

        resp = google_api_request(
            "mcp_google_docs", "POST", f"{DOCS_BASE}/{params['document_id']}:batchUpdate", SCOPES,
            json={"requests": [{"insertText": {"location": {"index": max(end_index, 1)}, "text": params["text"]}}]},
        )
        raise_for_tool_error(resp, "Google Docs")
        return {"document_id": params["document_id"], "appended": True}


connector = DocsConnector()

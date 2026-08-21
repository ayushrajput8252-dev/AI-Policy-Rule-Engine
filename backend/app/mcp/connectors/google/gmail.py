"""Gmail MCP connector — Gmail API (https://developers.google.com/gmail/api),
via the shared Google Workspace service-account helper (_auth.py).

Scopes: gmail.send (send_email), gmail.readonly (list/get) — deliberately
not the full gmail.modify/gmail.compose scope, since nothing here needs to
delete or modify existing mail.
"""
import base64
from email.mime.text import MIMEText
from typing import List

from ...base import BaseMCPConnector
from ...http_util import raise_for_tool_error
from ._auth import google_api_request, google_workspace_missing_config

GMAIL_BASE = "https://gmail.googleapis.com/gmail/v1/users/me"
SCOPES = ["https://www.googleapis.com/auth/gmail.send", "https://www.googleapis.com/auth/gmail.readonly"]


class GmailConnector(BaseMCPConnector):
    name = "gmail"
    display_name = "Gmail"
    category = "google_workspace"
    required_scopes = SCOPES

    def missing_config(self) -> List[str]:
        return google_workspace_missing_config()

    def register_tools(self) -> None:
        self._add_tool(
            "send_email",
            "Send an email as the delegated Workspace user.",
            {"type": "object", "properties": {"to": {"type": "string"}, "subject": {"type": "string"}, "body": {"type": "string"}}, "required": ["to", "subject", "body"]},
            self._send_email,
        )
        self._add_tool(
            "list_messages",
            "List messages matching a Gmail search query.",
            {"type": "object", "properties": {"query": {"type": "string", "description": "Gmail search syntax, e.g. 'from:x@y.com is:unread'."}, "max_results": {"type": "integer"}}},
            self._list_messages,
        )
        self._add_tool(
            "get_message",
            "Fetch a single message by id.",
            {"type": "object", "properties": {"message_id": {"type": "string"}}, "required": ["message_id"]},
            self._get_message,
        )

    def _send_email(self, params: dict) -> dict:
        mime = MIMEText(params["body"])
        mime["to"] = params["to"]
        mime["subject"] = params["subject"]
        raw = base64.urlsafe_b64encode(mime.as_bytes()).decode("ascii")
        resp = google_api_request("mcp_gmail", "POST", f"{GMAIL_BASE}/messages/send", SCOPES, json={"raw": raw})
        raise_for_tool_error(resp, "Gmail")
        data = resp.json()
        return {"id": data.get("id"), "thread_id": data.get("threadId")}

    def _list_messages(self, params: dict) -> dict:
        query_params = {"maxResults": params.get("max_results", 10)}
        if params.get("query"):
            query_params["q"] = params["query"]
        resp = google_api_request("mcp_gmail", "GET", f"{GMAIL_BASE}/messages", SCOPES, params=query_params)
        raise_for_tool_error(resp, "Gmail")
        return {"messages": resp.json().get("messages", [])}

    def _get_message(self, params: dict) -> dict:
        resp = google_api_request("mcp_gmail", "GET", f"{GMAIL_BASE}/messages/{params['message_id']}", SCOPES, params={"format": "metadata"})
        raise_for_tool_error(resp, "Gmail")
        data = resp.json()
        headers = {h["name"]: h["value"] for h in (data.get("payload") or {}).get("headers", [])}
        return {"id": data.get("id"), "snippet": data.get("snippet"), "subject": headers.get("Subject"), "from": headers.get("From")}


connector = GmailConnector()

"""Slack MCP connector — Slack Web API (https://api.slack.com/web).

Auth: a Bot User OAuth Token from an installed Slack App, Bearer-auth on
every call. Unlike most REST APIs, Slack always replies HTTP 200 and signals
failure via a JSON `{"ok": false, "error": "..."}` body — so this connector
checks `ok` explicitly rather than relying on http_util.raise_for_tool_error.

Scopes: chat:write (send_message), channels:read (list_channels),
channels:history (get_channel_history) — deliberately minimal; nothing here
needs admin or write access to workspace/user settings.
"""
from typing import List

from ...config import settings
from ..base import BaseMCPConnector, MCPToolError
from ..http_util import resilient_request

SLACK_API_BASE = "https://slack.com/api"


def _headers() -> dict:
    return {"Authorization": f"Bearer {settings.SLACK_BOT_TOKEN}"}


def _check_ok(data: dict) -> dict:
    if not data.get("ok"):
        raise MCPToolError(f"Slack API error: {data.get('error', 'unknown_error')}", code="upstream_error", status_code=502)
    return data


class SlackConnector(BaseMCPConnector):
    name = "slack"
    display_name = "Slack"
    category = "collaboration"
    required_scopes = ["chat:write", "channels:read", "channels:history"]

    def missing_config(self) -> List[str]:
        return [] if settings.SLACK_BOT_TOKEN else ["SLACK_BOT_TOKEN"]

    def register_tools(self) -> None:
        self._add_tool(
            "send_message",
            "Post a message to a Slack channel.",
            {
                "type": "object",
                "properties": {
                    "channel": {"type": "string", "description": "Channel ID or name, e.g. '#general' or 'C123456'."},
                    "text": {"type": "string", "description": "Message text."},
                },
                "required": ["channel", "text"],
            },
            self._send_message,
        )
        self._add_tool(
            "list_channels",
            "List channels visible to the bot.",
            {"type": "object", "properties": {"limit": {"type": "integer", "description": "Max channels to return (default 100)."}}},
            self._list_channels,
        )
        self._add_tool(
            "get_channel_history",
            "Fetch recent messages from a channel.",
            {
                "type": "object",
                "properties": {
                    "channel": {"type": "string", "description": "Channel ID."},
                    "limit": {"type": "integer", "description": "Max messages to return (default 20)."},
                },
                "required": ["channel"],
            },
            self._get_channel_history,
        )

    def _send_message(self, params: dict) -> dict:
        resp = resilient_request(
            "mcp_slack", "POST", f"{SLACK_API_BASE}/chat.postMessage",
            headers=_headers(), json={"channel": params["channel"], "text": params["text"]},
        )
        data = _check_ok(resp.json())
        return {"ok": True, "channel": data.get("channel"), "ts": data.get("ts")}

    def _list_channels(self, params: dict) -> dict:
        resp = resilient_request(
            "mcp_slack", "GET", f"{SLACK_API_BASE}/conversations.list",
            headers=_headers(), params={"limit": params.get("limit", 100)},
        )
        data = _check_ok(resp.json())
        channels = [{"id": c["id"], "name": c.get("name"), "is_private": c.get("is_private", False)} for c in data.get("channels", [])]
        return {"channels": channels}

    def _get_channel_history(self, params: dict) -> dict:
        resp = resilient_request(
            "mcp_slack", "GET", f"{SLACK_API_BASE}/conversations.history",
            headers=_headers(), params={"channel": params["channel"], "limit": params.get("limit", 20)},
        )
        data = _check_ok(resp.json())
        messages = [{"user": m.get("user"), "text": m.get("text"), "ts": m.get("ts")} for m in data.get("messages", [])]
        return {"messages": messages}


connector = SlackConnector()

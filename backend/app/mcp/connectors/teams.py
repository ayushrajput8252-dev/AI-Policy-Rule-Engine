"""Microsoft Teams MCP connector — Microsoft Graph API
(https://learn.microsoft.com/graph/api/resources/teams-api-overview),
application (client-credentials) permissions via the shared
_microsoft_graph.py helper (same Azure AD app registration as sharepoint.py).

App-only auth doesn't have a signed-in "me" to enumerate teams for, so tools
take an explicit team_id/channel_id (obtained via the tenant's own directory
lookup) rather than a fictitious "list my teams" call that app-only auth
can't actually support.

Scopes: ChannelMessage.Send (send messages), Channel.ReadBasic.All (list
channels/read messages) — application permissions, admin-consented.
"""
from typing import List

from ..base import BaseMCPConnector
from ..http_util import raise_for_tool_error
from ._microsoft_graph import graph_request, microsoft_graph_missing_config


class TeamsConnector(BaseMCPConnector):
    name = "teams"
    display_name = "Microsoft Teams"
    category = "collaboration"
    required_scopes = ["ChannelMessage.Send", "Channel.ReadBasic.All"]

    def missing_config(self) -> List[str]:
        return microsoft_graph_missing_config()

    def register_tools(self) -> None:
        self._add_tool(
            "send_channel_message",
            "Post a message to a Teams channel.",
            {
                "type": "object",
                "properties": {"team_id": {"type": "string"}, "channel_id": {"type": "string"}, "text": {"type": "string"}},
                "required": ["team_id", "channel_id", "text"],
            },
            self._send_channel_message,
        )
        self._add_tool(
            "list_channels",
            "List channels in a team.",
            {"type": "object", "properties": {"team_id": {"type": "string"}}, "required": ["team_id"]},
            self._list_channels,
        )
        self._add_tool(
            "list_channel_messages",
            "List recent messages in a channel.",
            {"type": "object", "properties": {"team_id": {"type": "string"}, "channel_id": {"type": "string"}}, "required": ["team_id", "channel_id"]},
            self._list_channel_messages,
        )

    def _send_channel_message(self, params: dict) -> dict:
        resp = graph_request(
            "mcp_teams", "POST", f"/teams/{params['team_id']}/channels/{params['channel_id']}/messages",
            json={"body": {"content": params["text"]}},
        )
        raise_for_tool_error(resp, "Microsoft Teams")
        data = resp.json()
        return {"id": data.get("id"), "created_at": data.get("createdDateTime")}

    def _list_channels(self, params: dict) -> dict:
        resp = graph_request("mcp_teams", "GET", f"/teams/{params['team_id']}/channels")
        raise_for_tool_error(resp, "Microsoft Teams")
        channels = [{"id": c["id"], "name": c.get("displayName")} for c in resp.json().get("value", [])]
        return {"channels": channels}

    def _list_channel_messages(self, params: dict) -> dict:
        resp = graph_request("mcp_teams", "GET", f"/teams/{params['team_id']}/channels/{params['channel_id']}/messages")
        raise_for_tool_error(resp, "Microsoft Teams")
        messages = [
            {"id": m["id"], "from": ((m.get("from") or {}).get("user") or {}).get("displayName"), "content": (m.get("body") or {}).get("content")}
            for m in resp.json().get("value", [])
        ]
        return {"messages": messages}


connector = TeamsConnector()

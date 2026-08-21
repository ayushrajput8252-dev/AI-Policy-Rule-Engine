"""Jira MCP connector — Atlassian Cloud REST API v3
(https://developer.atlassian.com/cloud/jira/platform/rest/v3/).

Auth: HTTP Basic with an Atlassian account email + API token (generated at
id.atlassian.com/manage-profile/security/api-tokens) — Jira Cloud's REST API
does not accept a bare bearer token for basic API-token auth.

Scope: whatever the token owner's own project permissions allow — this
connector doesn't request anything beyond standard issue create/read/comment,
so it inherits that user's existing project role rather than needing a
separate app-level grant.
"""
from typing import List

from ...config import settings
from ..base import BaseMCPConnector
from ..http_util import raise_for_tool_error, resilient_request


def _auth() -> tuple[str, str]:
    return (settings.JIRA_EMAIL, settings.JIRA_API_TOKEN)


def _base_url() -> str:
    return f"{settings.JIRA_BASE_URL.rstrip('/')}/rest/api/3"


def _plain_text_adf(text: str) -> dict:
    """Jira Cloud's description/comment fields require Atlassian Document
    Format, not a plain string — this wraps text in the minimal valid ADF doc."""
    return {
        "type": "doc",
        "version": 1,
        "content": [{"type": "paragraph", "content": [{"type": "text", "text": text}]}] if text else [],
    }


class JiraConnector(BaseMCPConnector):
    name = "jira"
    display_name = "Jira"
    category = "project_management"
    required_scopes = ["read:jira-work", "write:jira-work"]

    def missing_config(self) -> List[str]:
        missing = []
        if not settings.JIRA_BASE_URL:
            missing.append("JIRA_BASE_URL")
        if not settings.JIRA_EMAIL:
            missing.append("JIRA_EMAIL")
        if not settings.JIRA_API_TOKEN:
            missing.append("JIRA_API_TOKEN")
        return missing

    def register_tools(self) -> None:
        self._add_tool(
            "create_issue",
            "Create a new Jira issue.",
            {
                "type": "object",
                "properties": {
                    "project_key": {"type": "string"},
                    "summary": {"type": "string"},
                    "description": {"type": "string"},
                    "issue_type": {"type": "string", "description": "e.g. 'Task', 'Bug', 'Story' (default 'Task')."},
                },
                "required": ["project_key", "summary"],
            },
            self._create_issue,
        )
        self._add_tool(
            "get_issue",
            "Fetch a single issue by key.",
            {"type": "object", "properties": {"issue_key": {"type": "string"}}, "required": ["issue_key"]},
            self._get_issue,
        )
        self._add_tool(
            "search_issues",
            "Search issues with JQL.",
            {
                "type": "object",
                "properties": {"jql": {"type": "string"}, "max_results": {"type": "integer", "description": "Default 20."}},
                "required": ["jql"],
            },
            self._search_issues,
        )
        self._add_tool(
            "add_comment",
            "Add a comment to an issue.",
            {"type": "object", "properties": {"issue_key": {"type": "string"}, "comment": {"type": "string"}}, "required": ["issue_key", "comment"]},
            self._add_comment,
        )

    def _create_issue(self, params: dict) -> dict:
        payload = {
            "fields": {
                "project": {"key": params["project_key"]},
                "summary": params["summary"],
                "issuetype": {"name": params.get("issue_type", "Task")},
                "description": _plain_text_adf(params.get("description", "")),
            }
        }
        resp = resilient_request("mcp_jira", "POST", f"{_base_url()}/issue", auth=_auth(), json=payload)
        raise_for_tool_error(resp, "Jira")
        data = resp.json()
        return {"key": data["key"], "id": data["id"], "url": f"{settings.JIRA_BASE_URL.rstrip('/')}/browse/{data['key']}"}

    def _get_issue(self, params: dict) -> dict:
        resp = resilient_request("mcp_jira", "GET", f"{_base_url()}/issue/{params['issue_key']}", auth=_auth())
        raise_for_tool_error(resp, "Jira")
        data = resp.json()
        fields = data.get("fields", {})
        return {
            "key": data["key"],
            "summary": fields.get("summary"),
            "status": (fields.get("status") or {}).get("name"),
            "assignee": ((fields.get("assignee") or {}).get("displayName")),
        }

    def _search_issues(self, params: dict) -> dict:
        resp = resilient_request(
            "mcp_jira", "GET", f"{_base_url()}/search", auth=_auth(),
            params={"jql": params["jql"], "maxResults": params.get("max_results", 20)},
        )
        raise_for_tool_error(resp, "Jira")
        data = resp.json()
        issues = [
            {"key": i["key"], "summary": i["fields"].get("summary"), "status": (i["fields"].get("status") or {}).get("name")}
            for i in data.get("issues", [])
        ]
        return {"total": data.get("total", len(issues)), "issues": issues}

    def _add_comment(self, params: dict) -> dict:
        resp = resilient_request(
            "mcp_jira", "POST", f"{_base_url()}/issue/{params['issue_key']}/comment",
            auth=_auth(), json={"body": _plain_text_adf(params["comment"])},
        )
        raise_for_tool_error(resp, "Jira")
        data = resp.json()
        return {"id": data["id"]}


connector = JiraConnector()

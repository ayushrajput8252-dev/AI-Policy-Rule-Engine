"""GitHub MCP connector — GitHub REST API v3 (https://docs.github.com/rest).

Auth: a fine-grained personal access token (or GitHub App installation
token), Bearer-auth. A fine-grained token scoped to just the target
repo(s) with Issues: Read & write, Pull requests: Read, Metadata: Read is
enough for every tool below except list_repositories with no `username`
(the "list my own repos" form), which needs read access to the token
owner's account-level repo list rather than one specific repo.
"""
from typing import List

from ...config import settings
from ..base import BaseMCPConnector
from ..http_util import raise_for_tool_error, resilient_request

GITHUB_API_BASE = "https://api.github.com"


def _headers() -> dict:
    return {
        "Authorization": f"Bearer {settings.GITHUB_TOKEN}",
        "Accept": "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
    }


class GitHubConnector(BaseMCPConnector):
    name = "github"
    display_name = "GitHub"
    category = "development"
    required_scopes = ["issues:write", "pull_requests:read", "metadata:read"]

    def missing_config(self) -> List[str]:
        return [] if settings.GITHUB_TOKEN else ["GITHUB_TOKEN"]

    def register_tools(self) -> None:
        self._add_tool(
            "create_issue",
            "Open a new issue in a repository.",
            {
                "type": "object",
                "properties": {
                    "owner": {"type": "string"},
                    "repo": {"type": "string"},
                    "title": {"type": "string"},
                    "body": {"type": "string"},
                },
                "required": ["owner", "repo", "title"],
            },
            self._create_issue,
        )
        self._add_tool(
            "list_pull_requests",
            "List pull requests for a repository.",
            {
                "type": "object",
                "properties": {
                    "owner": {"type": "string"},
                    "repo": {"type": "string"},
                    "state": {"type": "string", "description": "'open' | 'closed' | 'all' (default 'open')."},
                },
                "required": ["owner", "repo"],
            },
            self._list_pull_requests,
        )
        self._add_tool(
            "list_repositories",
            "List repositories — either the token owner's own repos, or a given user's public repos.",
            {
                "type": "object",
                "properties": {
                    "username": {"type": "string", "description": "If omitted, lists the authenticated token's own repos (including private ones it can see)."},
                    "limit": {"type": "integer", "description": "Max repos to return (default 30)."},
                },
            },
            self._list_repositories,
        )
        self._add_tool(
            "get_repository",
            "Get metadata for a repository.",
            {"type": "object", "properties": {"owner": {"type": "string"}, "repo": {"type": "string"}}, "required": ["owner", "repo"]},
            self._get_repository,
        )
        self._add_tool(
            "add_issue_comment",
            "Add a comment to an existing issue or pull request.",
            {
                "type": "object",
                "properties": {
                    "owner": {"type": "string"},
                    "repo": {"type": "string"},
                    "issue_number": {"type": "integer"},
                    "body": {"type": "string"},
                },
                "required": ["owner", "repo", "issue_number", "body"],
            },
            self._add_issue_comment,
        )

    def _create_issue(self, params: dict) -> dict:
        url = f"{GITHUB_API_BASE}/repos/{params['owner']}/{params['repo']}/issues"
        resp = resilient_request("mcp_github", "POST", url, headers=_headers(), json={"title": params["title"], "body": params.get("body", "")})
        raise_for_tool_error(resp, "GitHub")
        data = resp.json()
        return {"number": data["number"], "url": data["html_url"], "state": data["state"]}

    def _list_pull_requests(self, params: dict) -> dict:
        url = f"{GITHUB_API_BASE}/repos/{params['owner']}/{params['repo']}/pulls"
        resp = resilient_request("mcp_github", "GET", url, headers=_headers(), params={"state": params.get("state", "open")})
        raise_for_tool_error(resp, "GitHub")
        prs = [{"number": p["number"], "title": p["title"], "state": p["state"], "url": p["html_url"]} for p in resp.json()]
        return {"pull_requests": prs}

    def _list_repositories(self, params: dict) -> dict:
        username = params.get("username")
        url = f"{GITHUB_API_BASE}/users/{username}/repos" if username else f"{GITHUB_API_BASE}/user/repos"
        resp = resilient_request(
            "mcp_github", "GET", url, headers=_headers(),
            params={"per_page": min(params.get("limit", 30), 100), "sort": "updated"},
        )
        raise_for_tool_error(resp, "GitHub")
        repos = [
            {
                "full_name": r["full_name"],
                "private": r.get("private", False),
                "default_branch": r.get("default_branch"),
                "open_issues": r.get("open_issues_count"),
                "url": r["html_url"],
                "updated_at": r.get("updated_at"),
            }
            for r in resp.json()
        ]
        return {"repositories": repos}

    def _get_repository(self, params: dict) -> dict:
        url = f"{GITHUB_API_BASE}/repos/{params['owner']}/{params['repo']}"
        resp = resilient_request("mcp_github", "GET", url, headers=_headers())
        raise_for_tool_error(resp, "GitHub")
        data = resp.json()
        return {"full_name": data["full_name"], "default_branch": data["default_branch"], "open_issues": data["open_issues_count"], "url": data["html_url"]}

    def _add_issue_comment(self, params: dict) -> dict:
        url = f"{GITHUB_API_BASE}/repos/{params['owner']}/{params['repo']}/issues/{params['issue_number']}/comments"
        resp = resilient_request("mcp_github", "POST", url, headers=_headers(), json={"body": params["body"]})
        raise_for_tool_error(resp, "GitHub")
        data = resp.json()
        return {"id": data["id"], "url": data["html_url"]}


connector = GitHubConnector()

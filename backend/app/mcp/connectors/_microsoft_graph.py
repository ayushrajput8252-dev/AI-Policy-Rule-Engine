"""Shared Microsoft Graph OAuth2 (client-credentials) auth helper — used by
both teams.py and sharepoint.py, since both are Graph API surfaces under one
Azure AD app registration. Not a connector itself, just the auth+token
plumbing they share.

Required Azure AD app registration: an application (not delegated)
permission grant for whichever Graph scopes the calling connector declares
(e.g. Teams: ChannelMessage.Send, Team.ReadBasic.All; SharePoint:
Sites.Read.All / Sites.ReadWrite.All), admin-consented, client-credentials
flow — see https://learn.microsoft.com/graph/auth-v2-service.
"""
import time
from typing import Optional

import requests

from ...config import settings
from ..http_util import resilient_request
from ..base import MCPToolError

GRAPH_BASE = "https://graph.microsoft.com/v1.0"

_token_cache: dict = {"access_token": None, "expires_at": 0.0}


def microsoft_graph_missing_config() -> list[str]:
    missing = []
    if not settings.MS_GRAPH_TENANT_ID:
        missing.append("MS_GRAPH_TENANT_ID")
    if not settings.MS_GRAPH_CLIENT_ID:
        missing.append("MS_GRAPH_CLIENT_ID")
    if not settings.MS_GRAPH_CLIENT_SECRET:
        missing.append("MS_GRAPH_CLIENT_SECRET")
    return missing


def get_graph_access_token() -> str:
    """Client-credentials token, cached in-process until ~60s before expiry."""
    now = time.monotonic()
    if _token_cache["access_token"] and now < _token_cache["expires_at"] - 60:
        return _token_cache["access_token"]

    missing = microsoft_graph_missing_config()
    if missing:
        raise MCPToolError(f"Microsoft Graph is not configured — missing: {', '.join(missing)}", code="not_configured", status_code=503)

    url = f"https://login.microsoftonline.com/{settings.MS_GRAPH_TENANT_ID}/oauth2/v2.0/token"
    resp = resilient_request(
        "mcp_microsoft_graph_auth", "POST", url,
        data={
            "grant_type": "client_credentials",
            "client_id": settings.MS_GRAPH_CLIENT_ID,
            "client_secret": settings.MS_GRAPH_CLIENT_SECRET,
            "scope": "https://graph.microsoft.com/.default",
        },
    )
    if resp.status_code >= 400:
        raise MCPToolError(f"Microsoft Graph auth failed ({resp.status_code}): {resp.text[:300]}", code="auth_error", status_code=502)

    body = resp.json()
    _token_cache["access_token"] = body["access_token"]
    _token_cache["expires_at"] = now + body.get("expires_in", 3600)
    return _token_cache["access_token"]


def graph_request(breaker_name: str, method: str, path: str, **kwargs) -> requests.Response:
    """`path` is relative to GRAPH_BASE, e.g. '/teams' or '/sites/{id}/drive/root/children'."""
    token = get_graph_access_token()
    headers = kwargs.pop("headers", {})
    headers["Authorization"] = f"Bearer {token}"
    return resilient_request(breaker_name, method, f"{GRAPH_BASE}{path}", headers=headers, **kwargs)

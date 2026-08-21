"""Shared Google Workspace auth helper (service account + domain-wide
delegation) — used by the gmail/drive/calendar/docs/sheets connectors,
since all five are just different Workspace REST APIs under one service
account.

Required setup: a GCP service account with domain-wide delegation enabled in
the Google Workspace admin console (Security > API controls > Domain-wide
delegation), authorized for whichever scopes each connector declares. The
service account impersonates GOOGLE_WORKSPACE_DELEGATED_USER (a real
workspace user) via `with_subject(...)`, since a bare service account has no
access to Gmail/Drive/Calendar/Docs/Sheets data of its own.

Uses `google-auth` directly (already a transitive dependency of google-genai)
for credential/token handling, then plain `requests` for the actual Workspace
REST calls — consistent with the rest of this app's HTTP layer rather than
adding google-api-python-client as a new dependency.
"""
import json
from typing import List

import requests
from google.auth.transport.requests import Request as GoogleAuthRequest
from google.oauth2 import service_account

from ....config import settings
from ...base import MCPToolError
from ...http_util import resilient_request

_credentials_cache: dict = {}


def google_workspace_missing_config() -> List[str]:
    missing = []
    if not settings.GOOGLE_WORKSPACE_SERVICE_ACCOUNT_JSON:
        missing.append("GOOGLE_WORKSPACE_SERVICE_ACCOUNT_JSON")
    if not settings.GOOGLE_WORKSPACE_DELEGATED_USER:
        missing.append("GOOGLE_WORKSPACE_DELEGATED_USER")
    return missing


def get_access_token(scopes: List[str]) -> str:
    missing = google_workspace_missing_config()
    if missing:
        raise MCPToolError(
            f"Google Workspace is not configured — missing: {', '.join(missing)}",
            code="not_configured", status_code=503,
        )

    cache_key = tuple(sorted(scopes))
    creds = _credentials_cache.get(cache_key)
    if creds is None:
        try:
            info = json.loads(settings.GOOGLE_WORKSPACE_SERVICE_ACCOUNT_JSON)
        except json.JSONDecodeError as e:
            raise MCPToolError(
                f"GOOGLE_WORKSPACE_SERVICE_ACCOUNT_JSON is not valid JSON: {e}",
                code="bad_config", status_code=503,
            )
        base_creds = service_account.Credentials.from_service_account_info(info, scopes=scopes)
        creds = base_creds.with_subject(settings.GOOGLE_WORKSPACE_DELEGATED_USER)
        _credentials_cache[cache_key] = creds

    if not creds.valid:
        creds.refresh(GoogleAuthRequest())
    return creds.token


def google_api_request(breaker_name: str, method: str, url: str, scopes: List[str], **kwargs) -> requests.Response:
    token = get_access_token(scopes)
    headers = kwargs.pop("headers", {})
    headers["Authorization"] = f"Bearer {token}"
    return resilient_request(breaker_name, method, url, headers=headers, **kwargs)

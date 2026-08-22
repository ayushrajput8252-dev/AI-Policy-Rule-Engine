"""Shared Google Workspace auth helper — used by the gmail/drive/calendar/
docs/sheets connectors, since all five are just different Workspace REST
APIs that need the same access token.

Two mutually exclusive auth modes, because which one actually works depends
on the account type:

  1. Service account + domain-wide delegation — Google Workspace
     business/education accounts ONLY. An admin must explicitly authorize
     this service account for the declared scopes in the Workspace admin
     console (Security > API controls > Domain-wide delegation); the service
     account then impersonates GOOGLE_WORKSPACE_DELEGATED_USER via
     `with_subject(...)`. Does not exist for personal @gmail.com accounts —
     Google does not offer domain-wide delegation outside Workspace.

  2. OAuth2 user-consent (refresh token) — works for ANY Google account,
     personal or Workspace, since it's the same flow "Sign in with Google"
     apps use. One-time setup: run
     `python backend/scripts/google_oauth_device_setup.py` (device-code
     flow — no redirect URI or browser automation needed) to mint
     GOOGLE_OAUTH_REFRESH_TOKEN, using a "Desktop app" OAuth client ID from
     the same GCP project. Preferred when both modes are configured, since
     it's the one that works everywhere.

Uses `google-auth` directly (already a transitive dependency of
google-genai) for the service-account path, plain `requests` for the OAuth
refresh-token exchange and every actual Workspace REST call — consistent
with the rest of this app's HTTP layer rather than adding
google-api-python-client as a new dependency.
"""
import json
import os
import time
from typing import List

import requests

from ....config import settings
from ...base import MCPToolError
from ...http_util import resilient_request

_credentials_cache: dict = {}
_oauth_token_cache: dict = {"access_token": None, "expires_at": 0.0}

GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token"


def _oauth_configured() -> bool:
    return bool(settings.GOOGLE_OAUTH_CLIENT_ID and settings.GOOGLE_OAUTH_CLIENT_SECRET and settings.GOOGLE_OAUTH_REFRESH_TOKEN)


def _service_account_configured() -> bool:
    return bool(settings.GOOGLE_WORKSPACE_SERVICE_ACCOUNT_JSON and settings.GOOGLE_WORKSPACE_DELEGATED_USER)


def google_workspace_missing_config() -> List[str]:
    if _oauth_configured() or _service_account_configured():
        return []
    # Neither mode is configured — report whichever mode has partial progress
    # (so the error points at what's actually missing instead of listing
    # every field from both modes), defaulting to the OAuth mode's
    # requirements since it's the one that works for any account type.
    oauth_missing = [
        name for name, val in (
            ("GOOGLE_OAUTH_CLIENT_ID", settings.GOOGLE_OAUTH_CLIENT_ID),
            ("GOOGLE_OAUTH_CLIENT_SECRET", settings.GOOGLE_OAUTH_CLIENT_SECRET),
            ("GOOGLE_OAUTH_REFRESH_TOKEN", settings.GOOGLE_OAUTH_REFRESH_TOKEN),
        ) if not val
    ]
    if settings.GOOGLE_OAUTH_CLIENT_ID or settings.GOOGLE_OAUTH_CLIENT_SECRET or settings.GOOGLE_OAUTH_REFRESH_TOKEN:
        return oauth_missing
    if settings.GOOGLE_WORKSPACE_SERVICE_ACCOUNT_JSON or settings.GOOGLE_WORKSPACE_DELEGATED_USER:
        return [
            name for name, val in (
                ("GOOGLE_WORKSPACE_SERVICE_ACCOUNT_JSON", settings.GOOGLE_WORKSPACE_SERVICE_ACCOUNT_JSON),
                ("GOOGLE_WORKSPACE_DELEGATED_USER", settings.GOOGLE_WORKSPACE_DELEGATED_USER),
            ) if not val
        ]
    return oauth_missing


def _load_service_account_info() -> dict:
    raw = settings.GOOGLE_WORKSPACE_SERVICE_ACCOUNT_JSON.strip()
    # Accept either the JSON key pasted inline, or a path to the key file on
    # disk (mirrors Google's own GOOGLE_APPLICATION_CREDENTIALS convention
    # rather than forcing everyone to inline a ~2KB JSON blob).
    if raw.startswith("{"):
        try:
            return json.loads(raw)
        except json.JSONDecodeError as e:
            raise MCPToolError(f"GOOGLE_WORKSPACE_SERVICE_ACCOUNT_JSON is not valid JSON: {e}", code="bad_config", status_code=503)
    if not os.path.isfile(raw):
        raise MCPToolError(
            f"GOOGLE_WORKSPACE_SERVICE_ACCOUNT_JSON is neither inline JSON nor an existing file path: {raw!r}",
            code="bad_config", status_code=503,
        )
    try:
        with open(raw, "r", encoding="utf-8") as f:
            return json.load(f)
    except json.JSONDecodeError as e:
        raise MCPToolError(f"File at GOOGLE_WORKSPACE_SERVICE_ACCOUNT_JSON does not contain valid JSON: {e}", code="bad_config", status_code=503)


def _get_service_account_token(scopes: List[str]) -> str:
    from google.auth.transport.requests import Request as GoogleAuthRequest
    from google.oauth2 import service_account

    cache_key = ("service_account",) + tuple(sorted(scopes))
    creds = _credentials_cache.get(cache_key)
    if creds is None:
        info = _load_service_account_info()
        base_creds = service_account.Credentials.from_service_account_info(info, scopes=scopes)
        creds = base_creds.with_subject(settings.GOOGLE_WORKSPACE_DELEGATED_USER)
        _credentials_cache[cache_key] = creds

    if not creds.valid:
        creds.refresh(GoogleAuthRequest())
    return creds.token


def _get_oauth_token() -> str:
    now = time.monotonic()
    if _oauth_token_cache["access_token"] and now < _oauth_token_cache["expires_at"] - 60:
        return _oauth_token_cache["access_token"]

    resp = resilient_request(
        "mcp_google_oauth", "POST", GOOGLE_TOKEN_URL,
        data={
            "grant_type": "refresh_token",
            "client_id": settings.GOOGLE_OAUTH_CLIENT_ID,
            "client_secret": settings.GOOGLE_OAUTH_CLIENT_SECRET,
            "refresh_token": settings.GOOGLE_OAUTH_REFRESH_TOKEN,
        },
    )
    if resp.status_code >= 400:
        raise MCPToolError(f"Google OAuth token refresh failed ({resp.status_code}): {resp.text[:300]}", code="auth_error", status_code=502)
    body = resp.json()
    _oauth_token_cache["access_token"] = body["access_token"]
    _oauth_token_cache["expires_at"] = now + body.get("expires_in", 3600)
    return _oauth_token_cache["access_token"]


def get_access_token(scopes: List[str]) -> str:
    missing = google_workspace_missing_config()
    if missing:
        raise MCPToolError(f"Google Workspace is not configured — missing: {', '.join(missing)}", code="not_configured", status_code=503)

    # OAuth user-consent is preferred when both modes happen to be set,
    # since it's the one that works regardless of account type.
    if _oauth_configured():
        return _get_oauth_token()
    return _get_service_account_token(scopes)


def google_api_request(breaker_name: str, method: str, url: str, scopes: List[str], **kwargs) -> requests.Response:
    token = get_access_token(scopes)
    headers = kwargs.pop("headers", {})
    headers["Authorization"] = f"Bearer {token}"
    return resilient_request(breaker_name, method, url, headers=headers, **kwargs)

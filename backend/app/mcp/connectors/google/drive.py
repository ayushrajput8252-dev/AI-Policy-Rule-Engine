"""Google Drive MCP connector — Drive API v3
(https://developers.google.com/drive/api), via the shared Google Workspace
service-account helper (_auth.py).

Scope: drive.file (create/access files this app creates or is explicitly
shared) is intentionally *not* used here since search/list needs visibility
into existing files the delegated user already owns — this connector
declares the broader `drive` scope but only exercises read/upload/share
operations, never delete, keeping the blast radius to "can see and add
files," not "can wipe the delegated user's Drive."
"""
import base64
import json
from typing import List

from ...base import BaseMCPConnector
from ...http_util import raise_for_tool_error
from ._auth import google_api_request, google_workspace_missing_config

DRIVE_BASE = "https://www.googleapis.com/drive/v3"
DRIVE_UPLOAD_BASE = "https://www.googleapis.com/upload/drive/v3"
SCOPES = ["https://www.googleapis.com/auth/drive"]


class DriveConnector(BaseMCPConnector):
    name = "google_drive"
    display_name = "Google Drive"
    category = "google_workspace"
    required_scopes = SCOPES

    def missing_config(self) -> List[str]:
        return google_workspace_missing_config()

    def register_tools(self) -> None:
        self._add_tool(
            "list_files",
            "List/search files the delegated user can see.",
            {"type": "object", "properties": {"query": {"type": "string", "description": "Drive query syntax, e.g. \"name contains 'report'\"."}}},
            self._list_files,
        )
        self._add_tool(
            "upload_file",
            "Upload a small file (<10MB).",
            {
                "type": "object",
                "properties": {"name": {"type": "string"}, "content_base64": {"type": "string"}, "mime_type": {"type": "string"}, "folder_id": {"type": "string"}},
                "required": ["name", "content_base64"],
            },
            self._upload_file,
        )
        self._add_tool(
            "download_file",
            "Download a file's content (base64-encoded).",
            {"type": "object", "properties": {"file_id": {"type": "string"}}, "required": ["file_id"]},
            self._download_file,
        )
        self._add_tool(
            "share_file",
            "Grant a user access to a file.",
            {
                "type": "object",
                "properties": {"file_id": {"type": "string"}, "email": {"type": "string"}, "role": {"type": "string", "description": "'reader' | 'writer' | 'commenter' (default 'reader')."}},
                "required": ["file_id", "email"],
            },
            self._share_file,
        )

    def _list_files(self, params: dict) -> dict:
        query_params = {"pageSize": 25, "fields": "files(id,name,mimeType,modifiedTime)"}
        if params.get("query"):
            query_params["q"] = params["query"]
        resp = google_api_request("mcp_google_drive", "GET", f"{DRIVE_BASE}/files", SCOPES, params=query_params)
        raise_for_tool_error(resp, "Google Drive")
        return {"files": resp.json().get("files", [])}

    def _upload_file(self, params: dict) -> dict:
        metadata = {"name": params["name"]}
        if params.get("folder_id"):
            metadata["parents"] = [params["folder_id"]]
        content = base64.b64decode(params["content_base64"])
        files = {
            "metadata": (None, json.dumps(metadata), "application/json"),
            "file": (params["name"], content, params.get("mime_type", "application/octet-stream")),
        }
        resp = google_api_request("mcp_google_drive", "POST", f"{DRIVE_UPLOAD_BASE}/files?uploadType=multipart", SCOPES, files=files)
        raise_for_tool_error(resp, "Google Drive")
        data = resp.json()
        return {"id": data.get("id"), "name": data.get("name")}

    def _download_file(self, params: dict) -> dict:
        resp = google_api_request("mcp_google_drive", "GET", f"{DRIVE_BASE}/files/{params['file_id']}", SCOPES, params={"alt": "media"})
        raise_for_tool_error(resp, "Google Drive")
        return {"content_base64": base64.b64encode(resp.content).decode("ascii")}

    def _share_file(self, params: dict) -> dict:
        resp = google_api_request(
            "mcp_google_drive", "POST", f"{DRIVE_BASE}/files/{params['file_id']}/permissions", SCOPES,
            json={"type": "user", "role": params.get("role", "reader"), "emailAddress": params["email"]},
        )
        raise_for_tool_error(resp, "Google Drive")
        return {"permission_id": resp.json().get("id")}


connector = DriveConnector()

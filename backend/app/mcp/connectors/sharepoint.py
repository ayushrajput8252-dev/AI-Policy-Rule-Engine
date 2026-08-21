"""SharePoint MCP connector — Microsoft Graph API
(https://learn.microsoft.com/graph/api/resources/sharepoint), application
permissions via the shared _microsoft_graph.py helper (same Azure AD app
registration as teams.py).

Scopes: Sites.Read.All for search/list/download, Sites.ReadWrite.All only
for upload_file — declared separately so a deployment that only needs read
access can grant the narrower scope.
"""
import base64
from typing import List

from ..base import BaseMCPConnector
from ..http_util import raise_for_tool_error
from ._microsoft_graph import graph_request, microsoft_graph_missing_config


class SharePointConnector(BaseMCPConnector):
    name = "sharepoint"
    display_name = "SharePoint"
    category = "document"
    required_scopes = ["Sites.Read.All", "Sites.ReadWrite.All"]

    def missing_config(self) -> List[str]:
        return microsoft_graph_missing_config()

    def register_tools(self) -> None:
        self._add_tool(
            "search_sites",
            "Search SharePoint sites by name/keyword.",
            {"type": "object", "properties": {"query": {"type": "string"}}, "required": ["query"]},
            self._search_sites,
        )
        self._add_tool(
            "list_files",
            "List files/folders at a path in a site's default document library.",
            {"type": "object", "properties": {"site_id": {"type": "string"}, "path": {"type": "string", "description": "Folder path, or '' for root."}}, "required": ["site_id"]},
            self._list_files,
        )
        self._add_tool(
            "get_file_content",
            "Download a file's raw content (base64-encoded) by item id.",
            {"type": "object", "properties": {"site_id": {"type": "string"}, "item_id": {"type": "string"}}, "required": ["site_id", "item_id"]},
            self._get_file_content,
        )
        self._add_tool(
            "upload_file",
            "Upload (or overwrite) a small file at a path — requires Sites.ReadWrite.All.",
            {
                "type": "object",
                "properties": {
                    "site_id": {"type": "string"},
                    "path": {"type": "string", "description": "Folder path, or '' for root."},
                    "filename": {"type": "string"},
                    "content_base64": {"type": "string", "description": "Base64-encoded file content (small files only, <4MB)."},
                },
                "required": ["site_id", "filename", "content_base64"],
            },
            self._upload_file,
        )

    def _search_sites(self, params: dict) -> dict:
        resp = graph_request("mcp_sharepoint", "GET", "/sites", params={"search": params["query"]})
        raise_for_tool_error(resp, "SharePoint")
        sites = [{"id": s["id"], "name": s.get("displayName"), "web_url": s.get("webUrl")} for s in resp.json().get("value", [])]
        return {"sites": sites}

    def _list_files(self, params: dict) -> dict:
        path = params.get("path", "").strip("/")
        suffix = f":/{path}:" if path else ""
        resp = graph_request("mcp_sharepoint", "GET", f"/sites/{params['site_id']}/drive/root{suffix}/children")
        raise_for_tool_error(resp, "SharePoint")
        items = [{"id": i["id"], "name": i.get("name"), "is_folder": "folder" in i, "size": i.get("size")} for i in resp.json().get("value", [])]
        return {"items": items}

    def _get_file_content(self, params: dict) -> dict:
        resp = graph_request("mcp_sharepoint", "GET", f"/sites/{params['site_id']}/drive/items/{params['item_id']}/content")
        raise_for_tool_error(resp, "SharePoint")
        return {"content_base64": base64.b64encode(resp.content).decode("ascii")}

    def _upload_file(self, params: dict) -> dict:
        path = params.get("path", "").strip("/")
        full_path = f"{path}/{params['filename']}" if path else params["filename"]
        content = base64.b64decode(params["content_base64"])
        resp = graph_request(
            "mcp_sharepoint", "PUT", f"/sites/{params['site_id']}/drive/root:/{full_path}:/content",
            data=content, headers={"Content-Type": "application/octet-stream"},
        )
        raise_for_tool_error(resp, "SharePoint")
        data = resp.json()
        return {"id": data.get("id"), "web_url": data.get("webUrl")}


connector = SharePointConnector()

"""REST surface for the MCP (Model Context Protocol) enterprise tool
connectors — Microsoft Teams, Slack, Jira, GitHub, Salesforce, SAP,
SharePoint, and Google Workspace (Gmail, Drive, Calendar, Docs, Sheets).

Three endpoints cover every connector uniformly:
  GET  /mcp/connectors                          — status + tool list for all
  GET  /mcp/connectors/{name}/tools              — one connector's tool schemas
  POST /mcp/connectors/{name}/tools/{tool}/call  — invoke a tool

This is also the surface this app's own agents would call through once
wired into a tool-calling loop — a REST layer in front of the same
BaseMCPConnector.call_tool used everywhere else keeps "an agent calls a
tool" and "an operator/test calls a tool over HTTP" going through identical
config-check/logging/error-handling, not two parallel code paths.
"""
from typing import Any, Dict, Optional

from fastapi import APIRouter, HTTPException

from ..mcp import registry
from ..mcp.base import MCPToolError

router = APIRouter(prefix="/mcp", tags=["mcp"])


@router.get("/connectors")
def list_connectors():
    """Status + tool catalog for every MCP connector — this is what an
    "Enterprise Integrations" settings page would render."""
    connectors = [c.info() for c in registry.all_connectors()]
    return {
        "connectors": [
            {
                "name": c.name,
                "display_name": c.display_name,
                "category": c.category,
                "status": c.status,
                "missing_config": c.missing_config,
                "required_scopes": c.required_scopes,
                "tool_count": len(c.tools),
            }
            for c in connectors
        ]
    }


@router.get("/connectors/{name}/tools")
def list_connector_tools(name: str):
    connector = registry.get(name)
    if not connector:
        raise HTTPException(status_code=404, detail=f"Unknown MCP connector '{name}'")
    info = connector.info()
    return {
        "name": info.name,
        "display_name": info.display_name,
        "status": info.status,
        "missing_config": info.missing_config,
        "required_scopes": info.required_scopes,
        "tools": info.tools,
    }


@router.post("/connectors/{name}/tools/{tool_name}/call")
def call_connector_tool(name: str, tool_name: str, params: Optional[Dict[str, Any]] = None):
    connector = registry.get(name)
    if not connector:
        raise HTTPException(status_code=404, detail=f"Unknown MCP connector '{name}'")
    try:
        return connector.call_tool(tool_name, params or {})
    except MCPToolError as e:
        raise HTTPException(status_code=e.status_code, detail={"code": e.code, "message": str(e)})

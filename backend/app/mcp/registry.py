"""Registry of every MCP connector — api/mcp.py is the only caller. Import of
the connector modules is deferred into `ensure_bootstrapped()` (rather than
at module load time) so importing `registry` itself never has import-order
side effects. Each connector module exposes a module-level `connector`
instance; this file is the one place that collects them, so a connector
module never needs to import registry itself (no circular import)."""
from typing import Dict, List, Optional

from .base import BaseMCPConnector

_connectors: Dict[str, BaseMCPConnector] = {}
_bootstrapped = False


def register(connector: BaseMCPConnector) -> None:
    _connectors[connector.name] = connector


def get(name: str) -> Optional[BaseMCPConnector]:
    ensure_bootstrapped()
    return _connectors.get(name)


def all_connectors() -> List[BaseMCPConnector]:
    ensure_bootstrapped()
    return list(_connectors.values())


def ensure_bootstrapped() -> None:
    global _bootstrapped
    if _bootstrapped:
        return
    _bootstrapped = True

    from .connectors import github, jira, salesforce, sap, sharepoint, slack, teams
    from .connectors.google import calendar, docs, drive, gmail, sheets

    for module in (github, jira, salesforce, sap, sharepoint, slack, teams, calendar, docs, drive, gmail, sheets):
        register(module.connector)

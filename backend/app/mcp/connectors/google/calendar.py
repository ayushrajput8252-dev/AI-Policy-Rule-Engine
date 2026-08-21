"""Google Calendar MCP connector — Calendar API v3
(https://developers.google.com/calendar/api), via the shared Google
Workspace service-account helper (_auth.py).

Scope: calendar.events (create/list/delete events) rather than the full
`calendar` scope, since nothing here needs to change calendar *settings* or
list/create other calendars.
"""
from typing import List

from ...base import BaseMCPConnector
from ...http_util import raise_for_tool_error
from ._auth import google_api_request, google_workspace_missing_config

CALENDAR_BASE = "https://www.googleapis.com/calendar/v3"
SCOPES = ["https://www.googleapis.com/auth/calendar.events"]


class CalendarConnector(BaseMCPConnector):
    name = "google_calendar"
    display_name = "Google Calendar"
    category = "google_workspace"
    required_scopes = SCOPES

    def missing_config(self) -> List[str]:
        return google_workspace_missing_config()

    def register_tools(self) -> None:
        self._add_tool(
            "create_event",
            "Create a calendar event.",
            {
                "type": "object",
                "properties": {
                    "calendar_id": {"type": "string", "description": "Usually 'primary'."},
                    "summary": {"type": "string"},
                    "start_iso": {"type": "string", "description": "RFC3339 datetime, e.g. '2026-09-01T10:00:00-07:00'."},
                    "end_iso": {"type": "string"},
                    "attendee_emails": {"type": "array", "items": {"type": "string"}},
                },
                "required": ["calendar_id", "summary", "start_iso", "end_iso"],
            },
            self._create_event,
        )
        self._add_tool(
            "list_events",
            "List events in a time window.",
            {
                "type": "object",
                "properties": {"calendar_id": {"type": "string"}, "time_min_iso": {"type": "string"}, "time_max_iso": {"type": "string"}},
                "required": ["calendar_id"],
            },
            self._list_events,
        )
        self._add_tool(
            "delete_event",
            "Delete an event.",
            {"type": "object", "properties": {"calendar_id": {"type": "string"}, "event_id": {"type": "string"}}, "required": ["calendar_id", "event_id"]},
            self._delete_event,
        )

    def _create_event(self, params: dict) -> dict:
        body = {
            "summary": params["summary"],
            "start": {"dateTime": params["start_iso"]},
            "end": {"dateTime": params["end_iso"]},
        }
        if params.get("attendee_emails"):
            body["attendees"] = [{"email": e} for e in params["attendee_emails"]]
        resp = google_api_request("mcp_google_calendar", "POST", f"{CALENDAR_BASE}/calendars/{params['calendar_id']}/events", SCOPES, json=body)
        raise_for_tool_error(resp, "Google Calendar")
        data = resp.json()
        return {"id": data.get("id"), "html_link": data.get("htmlLink")}

    def _list_events(self, params: dict) -> dict:
        query = {"singleEvents": True, "orderBy": "startTime"}
        if params.get("time_min_iso"):
            query["timeMin"] = params["time_min_iso"]
        if params.get("time_max_iso"):
            query["timeMax"] = params["time_max_iso"]
        resp = google_api_request("mcp_google_calendar", "GET", f"{CALENDAR_BASE}/calendars/{params['calendar_id']}/events", SCOPES, params=query)
        raise_for_tool_error(resp, "Google Calendar")
        events = [{"id": e["id"], "summary": e.get("summary"), "start": e.get("start"), "end": e.get("end")} for e in resp.json().get("items", [])]
        return {"events": events}

    def _delete_event(self, params: dict) -> dict:
        resp = google_api_request("mcp_google_calendar", "DELETE", f"{CALENDAR_BASE}/calendars/{params['calendar_id']}/events/{params['event_id']}", SCOPES)
        if resp.status_code not in (200, 204):
            raise_for_tool_error(resp, "Google Calendar")
        return {"deleted": True}


connector = CalendarConnector()

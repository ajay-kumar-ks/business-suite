"""Event handlers for the tasks module.

Subscribes to events published by other modules (e.g., hr.employee_list)
and maintains an in-memory store so the frontend can query the data.
"""

from typing import Any
from app.core.event_bus import event_bus

# In-memory cache of employees received via event bus
_employees: list[dict[str, Any]] = []


def get_employees() -> list[dict[str, Any]]:
    """Return the cached list of employees."""
    return _employees


def handle_employee_list(payload: list[dict[str, Any]]) -> None:
    """Handler for hr.employee_list event.

    Expects payload to be a list of employee dicts with at least 'id' and 'name'.
    """
    global _employees
    if isinstance(payload, list):
        _employees = payload


def register_handlers() -> None:
    """Register all event handlers for the tasks module."""
    event_bus.subscribe("hr.employee_list", handle_employee_list)

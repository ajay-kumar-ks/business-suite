"""WebSocket connection manager for real-time notification delivery.

Maintains a mapping of user_id → list of active WebSocket connections
so the server can push notifications to specific users in real time.
"""

import json
import logging
from typing import Any
from fastapi import WebSocket

logger = logging.getLogger(__name__)


class WebSocketManager:
    """Manages WebSocket connections keyed by user_id.

    Each user may have multiple simultaneous connections (e.g. multiple tabs).
    """

    def __init__(self) -> None:
        # user_id -> list[WebSocket]
        self._connections: dict[int, list[WebSocket]] = {}

    async def connect(self, user_id: int, ws: WebSocket) -> None:
        """Accept and register a new WebSocket connection for a user."""
        await ws.accept()
        self._connections.setdefault(user_id, []).append(ws)
        logger.info("WebSocket connected: user_id=%d (total conns=%d)", user_id, len(self._connections[user_id]))

    def disconnect(self, user_id: int, ws: WebSocket) -> None:
        """Remove a WebSocket connection for a user."""
        conns = self._connections.get(user_id, [])
        if ws in conns:
            conns.remove(ws)
            if not conns:
                del self._connections[user_id]
            logger.info("WebSocket disconnected: user_id=%d", user_id)

    async def send_to_user(self, user_id: int, data: dict[str, Any]) -> bool:
        """Send a JSON payload to all active connections for a user.

        Returns True if at least one connection received the message.
        """
        conns = self._connections.get(user_id, [])
        if not conns:
            return False

        message = json.dumps(data, default=str)
        sent = False
        dead = []
        for ws in conns:
            try:
                await ws.send_text(message)
                sent = True
            except Exception:
                dead.append(ws)

        # Clean up dead connections
        for ws in dead:
            conns.remove(ws)
        if not conns:
            del self._connections[user_id]

        return sent

    async def broadcast(self, data: dict[str, Any]) -> int:
        """Send a JSON payload to ALL connected users.

        Returns the number of users who received the message.
        """
        message = json.dumps(data, default=str)
        count = 0
        for user_id, conns in list(self._connections.items()):
            dead = []
            for ws in conns:
                try:
                    await ws.send_text(message)
                    count += 1
                except Exception:
                    dead.append(ws)
            for ws in dead:
                conns.remove(ws)
            if not conns:
                del self._connections[user_id]
        return count

    @property
    def active_users(self) -> int:
        """Return the number of users currently connected."""
        return len(self._connections)

    @property
    def active_connections(self) -> int:
        """Return the total number of active WebSocket connections."""
        return sum(len(conns) for conns in self._connections.values())


# Singleton instance
ws_manager = WebSocketManager()

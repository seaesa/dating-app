import asyncio
import json
import time

from fastapi import APIRouter, WebSocket, WebSocketDisconnect

from app.modules.realtime.auth import CLOSE_AUTH, SocketAuthError, authenticate_socket
from app.modules.realtime.events import (
    mark_connected,
    mark_disconnected,
    refresh_presence,
)
from app.modules.realtime.hub import hub

router = APIRouter(tags=["realtime"])

# Upper bound on one receive wait, so token expiry is noticed between pings.
RECEIVE_TIMEOUT_SECONDS = 30.0


@router.websocket("/ws")
async def realtime_socket(websocket: WebSocket) -> None:
    """Receive-only event stream. Clients send nothing but pings.

    Accepted before authenticating so a refusal arrives as a close code the app
    can act on (4401 refresh, 4403 stop) rather than a bare handshake failure.
    """
    await websocket.accept()
    settings = websocket.app.state.settings
    token_param = websocket.query_params.get("token")
    try:
        user, expires_at = await authenticate_socket(
            websocket.headers.get("authorization"), settings, token=token_param
        )
    except SocketAuthError as exc:
        await websocket.close(code=exc.code)
        return

    user_id = str(user.oid)
    try:
        await hub.attach(user_id, websocket)
        await mark_connected(user_id)
        while True:
            remaining = expires_at - time.time()
            if remaining <= 0:
                await websocket.close(code=CLOSE_AUTH)
                return
            try:
                raw = await asyncio.wait_for(
                    websocket.receive_text(),
                    timeout=min(remaining, RECEIVE_TIMEOUT_SECONDS),
                )
            except TimeoutError:
                continue
            try:
                kind = json.loads(raw).get("type")
            except (ValueError, AttributeError):
                continue
            if kind == "ping":
                await refresh_presence(user_id)
    except WebSocketDisconnect:
        pass
    finally:
        await hub.detach(user_id, websocket)
        await mark_disconnected(user_id)

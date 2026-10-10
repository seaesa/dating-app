from typing import Annotated

from beanie import PydanticObjectId
from fastapi import APIRouter, Path, Query, status

from app.core.deps import CurrentUser, SettingsDep
from app.core.repository import DEFAULT_PAGE_SIZE
from app.modules.connections.messaging import MessagingService
from app.modules.connections.models import RevealKind
from app.modules.connections.schemas import (
    CloseBody,
    ConnectionPage,
    ConnectionRead,
    MarkReadBody,
    MessagePage,
    MessageRead,
    SendMessageBody,
    UnreadCountRead,
)
from app.modules.connections.service import ConnectionService

router = APIRouter(prefix="/connections", tags=["connections"])

ConnectionId = Annotated[PydanticObjectId, Path(alias="connectionId")]
MESSAGE_PAGE_SIZE = 30


@router.get("", response_model=ConnectionPage, operation_id="listConnections")
async def list_connections(
    user: CurrentUser,
    settings: SettingsDep,
    cursor: str | None = None,
    limit: Annotated[int, Query(ge=1, le=100)] = DEFAULT_PAGE_SIZE,
) -> ConnectionPage:
    return await MessagingService(settings).list_for(user, limit=limit, cursor=cursor)


# Declared before /{connectionId} so it is not captured as an id.
@router.get(
    "/unread-count", response_model=UnreadCountRead, operation_id="getUnreadCount"
)
async def get_unread_count(user: CurrentUser, settings: SettingsDep) -> UnreadCountRead:
    return await MessagingService(settings).unread_count(user)


@router.get(
    "/{connectionId}", response_model=ConnectionRead, operation_id="getConnection"
)
async def get_connection(
    connection_id: ConnectionId, user: CurrentUser, settings: SettingsDep
) -> ConnectionRead:
    return await MessagingService(settings).get_for(user, connection_id)


@router.get(
    "/{connectionId}/messages", response_model=MessagePage, operation_id="listMessages"
)
async def list_messages(
    connection_id: ConnectionId,
    user: CurrentUser,
    settings: SettingsDep,
    cursor: str | None = None,
    limit: Annotated[int, Query(ge=1, le=100)] = MESSAGE_PAGE_SIZE,
) -> MessagePage:
    return await MessagingService(settings).list_messages(
        user, connection_id, limit=limit, cursor=cursor
    )


@router.post(
    "/{connectionId}/messages", response_model=MessageRead, operation_id="sendMessage"
)
async def send_message(
    connection_id: ConnectionId,
    body: SendMessageBody,
    user: CurrentUser,
    settings: SettingsDep,
) -> MessageRead:
    return await MessagingService(settings).send(user, connection_id, body)


@router.post(
    "/{connectionId}/read",
    status_code=status.HTTP_204_NO_CONTENT,
    operation_id="markConnectionRead",
)
async def mark_connection_read(
    connection_id: ConnectionId,
    body: MarkReadBody,
    user: CurrentUser,
    settings: SettingsDep,
) -> None:
    await MessagingService(settings).mark_read(user, connection_id, body.last_read_id)


Kind = Annotated[RevealKind, Path(alias="kind")]


@router.post(
    "/{connectionId}/reveals/{kind}",
    response_model=ConnectionRead,
    operation_id="requestReveal",
)
async def request_reveal(
    connection_id: ConnectionId, kind: Kind, user: CurrentUser, settings: SettingsDep
) -> ConnectionRead:
    return await MessagingService(settings).request_reveal(user, connection_id, kind)


@router.post(
    "/{connectionId}/reveals/{kind}/accept",
    response_model=ConnectionRead,
    operation_id="acceptReveal",
)
async def accept_reveal(
    connection_id: ConnectionId, kind: Kind, user: CurrentUser, settings: SettingsDep
) -> ConnectionRead:
    return await MessagingService(settings).accept_reveal(user, connection_id, kind)


@router.post(
    "/{connectionId}/reveals/{kind}/decline",
    response_model=ConnectionRead,
    operation_id="declineReveal",
)
async def decline_reveal(
    connection_id: ConnectionId, kind: Kind, user: CurrentUser, settings: SettingsDep
) -> ConnectionRead:
    return await MessagingService(settings).decline_reveal(user, connection_id, kind)


@router.post(
    "/{connectionId}/close",
    status_code=status.HTTP_204_NO_CONTENT,
    operation_id="closeConnection",
)
async def close_connection(
    connection_id: ConnectionId, body: CloseBody, user: CurrentUser
) -> None:
    await ConnectionService().close(user, connection_id, body.reason)

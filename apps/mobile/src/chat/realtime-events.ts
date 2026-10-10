import type { InfiniteData, QueryClient } from "@tanstack/react-query";

import {
  connectionQuery,
  connectionsQuery,
  messagesQuery,
  unreadCountQuery,
  userQuery,
  type ConnectionPage,
  type ConnectionSummaryRead,
  type LastMessageRead,
  type MessagePage,
  type MessageRead,
  type RevealKind,
  type RevealState,
} from "@repo/api-contract";

import type { ChatMessage } from "./messages";

// Payloads of the chat events the API publishes (connections/timeline.py,
// connections/service.py, connections/messaging.py).
export interface MessageCreated {
  connectionId: string;
  message: MessageRead;
}
export interface ConnectionRead {
  connectionId: string;
  userId: string;
  lastReadId: string;
}
export interface RevealUpdated {
  connectionId: string;
  kind: RevealKind;
  state: RevealState;
  requestedBy: string | null;
}
export interface ConnectionClosed {
  connectionId: string;
}

type MessagesData = InfiniteData<MessagePage>;
type ListData = InfiniteData<ConnectionPage>;

/** Replace by id or clientId, else prepend to the newest page. */
export function upsertMessage(
  data: MessagesData | undefined,
  message: ChatMessage,
): MessagesData | undefined {
  if (!data) return data;
  const matches = (m: ChatMessage) =>
    m.id === message.id || (message.clientId != null && m.clientId === message.clientId);
  let found = false;
  const pages = data.pages.map((page) => ({
    ...page,
    items: page.items.map((m) => {
      if (!matches(m)) return m;
      found = true;
      return message;
    }),
  }));
  if (found) return { ...data, pages };
  const [first, ...rest] = pages;
  if (!first) return data;
  return { ...data, pages: [{ ...first, items: [message, ...first.items] }, ...rest] };
}

function toLastMessage(message: MessageRead): LastMessageRead {
  return {
    id: message.id,
    senderId: message.senderId,
    actorId: message.actorId,
    kind: message.kind,
    preview: (message.body ?? "").slice(0, 80),
    event: message.event,
    revealKind: message.revealKind,
    createdAt: message.createdAt,
  };
}

function mapItem(
  data: ListData | undefined,
  connectionId: string,
  update: (item: ConnectionSummaryRead) => ConnectionSummaryRead,
): ListData | undefined {
  if (!data) return data;
  return {
    ...data,
    pages: data.pages.map((page) => ({
      ...page,
      items: page.items.map((item) => (item.id === connectionId ? update(item) : item)),
    })),
  };
}

function removeItem(
  data: ListData | undefined,
  connectionId: string,
): ListData | undefined {
  if (!data) return data;
  return {
    ...data,
    pages: data.pages.map((page) => ({
      ...page,
      items: page.items.filter((item) => item.id !== connectionId),
    })),
  };
}

/** Move a room to the top with its new last message; false if it is not loaded. */
function bump(
  queryClient: QueryClient,
  connectionId: string,
  message: MessageRead,
  myId: string | undefined,
): boolean {
  let listed = false;
  queryClient.setQueryData(connectionsQuery().queryKey, (data) => {
    if (!data) return data;
    let moved: ConnectionSummaryRead | undefined;
    const pages = data.pages.map((page) => ({
      ...page,
      items: page.items.filter((item) => {
        if (item.id !== connectionId) return true;
        moved = item;
        return false;
      }),
    }));
    if (!moved) return data;
    listed = true;
    const fromPeer = message.actorId !== myId;
    const updated: ConnectionSummaryRead = {
      ...moved,
      lastMessage: toLastMessage(message),
      lastActivityAt: message.createdAt,
      unreadCount: fromPeer ? moved.unreadCount + 1 : moved.unreadCount,
      yourTurn: message.kind === "text" ? message.senderId !== myId : moved.yourTurn,
    };
    const [first, ...rest] = pages;
    if (!first) return data;
    return { ...data, pages: [{ ...first, items: [updated, ...first.items] }, ...rest] };
  });
  return listed;
}

export function onMessageCreated(
  queryClient: QueryClient,
  { connectionId, message }: MessageCreated,
  myId: string | undefined,
): void {
  queryClient.setQueryData(messagesQuery(connectionId).queryKey, (data) =>
    upsertMessage(data, message),
  );
  if (!bump(queryClient, connectionId, message, myId)) {
    void queryClient.invalidateQueries({ queryKey: connectionsQuery().queryKey });
  }
  if (message.actorId !== myId) {
    queryClient.setQueryData(unreadCountQuery().queryKey, (data) =>
      data ? { count: data.count + 1 } : data,
    );
  }
}

export function onConnectionRead(
  queryClient: QueryClient,
  { connectionId, userId, lastReadId }: ConnectionRead,
  myId: string | undefined,
): void {
  if (userId === myId) {
    // Read on another of my devices.
    queryClient.setQueryData(connectionsQuery().queryKey, (data) =>
      mapItem(data, connectionId, (item) => ({ ...item, unreadCount: 0 })),
    );
    void queryClient.invalidateQueries({ queryKey: unreadCountQuery().queryKey });
    return;
  }
  queryClient.setQueryData(connectionQuery(connectionId).queryKey, (data) =>
    data ? { ...data, peerLastReadId: lastReadId } : data,
  );
}

export function onRevealUpdated(
  queryClient: QueryClient,
  { connectionId }: RevealUpdated,
): void {
  const peerId = queryClient.getQueryData(connectionQuery(connectionId).queryKey)?.peer
    .id;
  // The event carries state only; photos and phone come back through the
  // API's single gate when these refetch.
  void queryClient.invalidateQueries({
    queryKey: connectionQuery(connectionId).queryKey,
    exact: true,
  });
  void queryClient.invalidateQueries({ queryKey: connectionsQuery().queryKey });
  if (peerId)
    void queryClient.invalidateQueries({ queryKey: userQuery(peerId).queryKey });
}

export function onConnectionClosed(
  queryClient: QueryClient,
  { connectionId }: ConnectionClosed,
): void {
  queryClient.setQueryData(connectionsQuery().queryKey, (data) =>
    removeItem(data, connectionId),
  );
  void queryClient.invalidateQueries({
    queryKey: connectionQuery(connectionId).queryKey,
    exact: true,
  });
  void queryClient.invalidateQueries({ queryKey: unreadCountQuery().queryKey });
}

import {
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { useFocusEffect } from "expo-router";
import * as React from "react";

import {
  acceptReveal,
  closeConnection,
  connectionQuery,
  connectionsQuery,
  declineReveal,
  markConnectionRead,
  meQuery,
  messagesQuery,
  requestReveal,
  sendMessage,
  unreadCountQuery,
  type ApiError,
  type CloseReason,
  type ConnectionRead,
  type RevealKind,
} from "@repo/api-contract";

import { setActiveConnection } from "./active-connection";
import {
  buildChatRows,
  isLocalId,
  localMessage,
  newClientId,
  type ChatMessage,
} from "./messages";
import { upsertMessage } from "./realtime-events";

const statusOf = (error: unknown) => (error as ApiError | null)?.response?.status;

type RevealAction = "request" | "accept" | "decline";

const REVEAL_CALLS: Record<
  RevealAction,
  (connectionId: string, kind: RevealKind) => Promise<ConnectionRead>
> = { request: requestReveal, accept: acceptReveal, decline: declineReveal };

/** Everything a room screen needs: data, optimistic send, read receipts, reveals. */
export function useChatRoom(connectionId: string) {
  const queryClient = useQueryClient();
  const me = useQuery(meQuery());
  const connection = useQuery(connectionQuery(connectionId));
  const messages = useInfiniteQuery(messagesQuery(connectionId));
  const myId = me.data?.id;

  const ended = statusOf(connection.error) === 409 || statusOf(messages.error) === 409;
  const missing = statusOf(connection.error) === 404;

  // Sending/failed copies live outside the query cache: a refetch replaces
  // the cached pages, and must not take an unsent message and its text with it.
  const [outbox, setOutbox] = React.useState<Record<string, ChatMessage>>({});
  const serverMessages: ChatMessage[] = React.useMemo(
    () => messages.data?.pages.flatMap((page) => page.items) ?? [],
    [messages.data],
  );
  const delivered = React.useMemo(
    () => new Set(serverMessages.map((m) => m.clientId).filter(Boolean)),
    [serverMessages],
  );
  const newestFirst: ChatMessage[] = React.useMemo(() => {
    const waiting = Object.values(outbox)
      .filter((m) => !delivered.has(m.clientId))
      .sort((x, y) => y.createdAt.localeCompare(x.createdAt));
    return [...waiting, ...serverMessages];
  }, [outbox, delivered, serverMessages]);
  const peerLastReadId = connection.data?.peerLastReadId;
  const rows = React.useMemo(
    () => (myId ? buildChatRows(newestFirst, myId, peerLastReadId) : []),
    [newestFirst, myId, peerLastReadId],
  );

  const putMessage = React.useCallback(
    (message: ChatMessage) =>
      queryClient.setQueryData(messagesQuery(connectionId).queryKey, (data) =>
        upsertMessage(data, message),
      ),
    [queryClient, connectionId],
  );

  const toOutbox = React.useCallback(
    (clientId: string, message: ChatMessage | null) =>
      setOutbox((current) => {
        const next = { ...current };
        if (message) next[clientId] = message;
        else delete next[clientId];
        return next;
      }),
    [],
  );

  const send = useMutation({
    mutationFn: (vars: { clientId: string; body: string }) =>
      sendMessage(connectionId, vars),
    onMutate: (vars) => {
      if (myId) {
        toOutbox(
          vars.clientId,
          localMessage({ connectionId, myId, ...vars, status: "sending" }),
        );
      }
    },
    onSuccess: (message, vars) => {
      putMessage(message);
      toOutbox(vars.clientId, null);
    },
    onError: (error, vars) => {
      if (statusOf(error) === 409) {
        void queryClient.invalidateQueries({
          queryKey: connectionQuery(connectionId).queryKey,
          exact: true,
        });
      }
      // The request may have landed and its response been lost: if the socket
      // already delivered it, there is nothing to retry.
      if (myId && !delivered.has(vars.clientId)) {
        toOutbox(
          vars.clientId,
          localMessage({ connectionId, myId, ...vars, status: "failed" }),
        );
      } else {
        toOutbox(vars.clientId, null);
      }
    },
  });

  const sendText = (body: string) => {
    const trimmed = body.trim();
    if (trimmed) send.mutate({ clientId: newClientId(), body: trimmed });
  };
  const retry = (message: ChatMessage) => {
    if (message.clientId && message.body) {
      send.mutate({ clientId: message.clientId, body: message.body });
    }
  };

  // Mark read while this room is on screen.
  const [focused, setFocused] = React.useState(false);
  useFocusEffect(
    React.useCallback(() => {
      setFocused(true);
      setActiveConnection(connectionId);
      return () => {
        setFocused(false);
        setActiveConnection(null);
      };
    }, [connectionId]),
  );
  const newest = newestFirst.find((m) => !isLocalId(m.id));
  const unread = connection.data?.unreadCount ?? 0;
  const lastMarked = React.useRef<string | null>(null);
  React.useEffect(() => {
    if (!focused || !newest || lastMarked.current === newest.id) return;
    if (newest.actorId === myId && unread === 0) return;
    const timer = setTimeout(() => {
      lastMarked.current = newest.id;
      markConnectionRead(connectionId, newest.id)
        .then(() => {
          queryClient.setQueryData(connectionQuery(connectionId).queryKey, (data) =>
            data ? { ...data, unreadCount: 0 } : data,
          );
          void queryClient.invalidateQueries({ queryKey: unreadCountQuery().queryKey });
          void queryClient.invalidateQueries({ queryKey: connectionsQuery().queryKey });
        })
        .catch(() => {
          lastMarked.current = null;
        });
    }, 500);
    return () => clearTimeout(timer);
  }, [focused, newest, myId, unread, connectionId, queryClient]);

  const revealMutation = useMutation({
    mutationFn: ({ kind, action }: { kind: RevealKind; action: RevealAction }) =>
      REVEAL_CALLS[action](connectionId, kind),
    onSuccess: (data) => {
      queryClient.setQueryData(connectionQuery(connectionId).queryKey, data);
      // The system message also arrives by socket; refetch in case it is down.
      void queryClient.invalidateQueries({
        queryKey: messagesQuery(connectionId).queryKey,
      });
    },
    onError: () =>
      void queryClient.invalidateQueries({
        queryKey: connectionQuery(connectionId).queryKey,
        exact: true,
      }),
  });

  const close = async (reason: CloseReason) => {
    await closeConnection(connectionId, { reason });
    void queryClient.invalidateQueries({ queryKey: connectionsQuery().queryKey });
    void queryClient.invalidateQueries({ queryKey: unreadCountQuery().queryKey });
  };

  return {
    me: me.data,
    connection: connection.data,
    rows,
    ended,
    missing,
    loading: connection.isLoading || messages.isLoading || me.isLoading,
    hasOlder: Boolean(messages.hasNextPage),
    loadOlder: () => {
      if (messages.hasNextPage && !messages.isFetchingNextPage) {
        void messages.fetchNextPage();
      }
    },
    hasText: newestFirst.some((m) => m.kind === "text"),
    sendText,
    retry,
    reveal: {
      request: (kind: RevealKind) =>
        revealMutation.mutateAsync({ kind, action: "request" }),
      accept: (kind: RevealKind) =>
        revealMutation.mutateAsync({ kind, action: "accept" }),
      decline: (kind: RevealKind) =>
        revealMutation.mutateAsync({ kind, action: "decline" }),
      pending: revealMutation.isPending,
    },
    close,
  };
}

import { useQuery, useQueryClient } from "@tanstack/react-query";

import { meQuery } from "@repo/api-contract";

import {
  onConnectionClosed,
  onConnectionRead,
  onMessageCreated,
  onRevealUpdated,
  type ConnectionClosed,
  type ConnectionRead,
  type MessageCreated,
  type RevealUpdated,
} from "./realtime-events";

import { useRealtimeEvent } from "@/realtime/bus";

/** Keeps every chat cache current from the socket, wherever the user is in the app. */
export function useChatEvents(): void {
  const queryClient = useQueryClient();
  const myId = useQuery(meQuery()).data?.id;

  useRealtimeEvent<MessageCreated>("message.created", (data) =>
    onMessageCreated(queryClient, data, myId),
  );
  useRealtimeEvent<ConnectionRead>("connection.read", (data) =>
    onConnectionRead(queryClient, data, myId),
  );
  useRealtimeEvent<RevealUpdated>("reveal.updated", (data) =>
    onRevealUpdated(queryClient, data),
  );
  useRealtimeEvent<ConnectionClosed>("connection.closed", (data) =>
    onConnectionClosed(queryClient, data),
  );
}

import * as React from "react";

/** What the API sends down the socket: `{type, data}`, one shape for every feature. */
export interface RealtimeEnvelope {
  type: string;
  data: unknown;
}

const listeners = new Map<string, Set<(data: unknown) => void>>();

/**
 * Register for one event type. Each feature listens for its own types, so
 * adding realtime to a feature never means editing another feature's handler.
 */
function subscribe<T>(type: string, listener: (data: T) => void): () => void {
  const forType = listeners.get(type) ?? new Set();
  const wrapped = listener as (data: unknown) => void;
  forType.add(wrapped);
  listeners.set(type, forType);
  return () => {
    forType.delete(wrapped);
  };
}

export function dispatch(event: RealtimeEnvelope): void {
  for (const listener of listeners.get(event.type) ?? []) listener(event.data);
}

/** `useRealtimeEvent("match.created", (data) => …)` — latest handler, no resubscribe. */
export function useRealtimeEvent<T>(type: string, listener: (data: T) => void): void {
  const latest = React.useRef(listener);
  latest.current = listener;
  React.useEffect(() => subscribe<T>(type, (data) => latest.current(data)), [type]);
}

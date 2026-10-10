import type { RealtimeEnvelope } from "./bus";

const PING_MS = 25_000;
const MAX_BACKOFF_MS = 30_000;
// The server accepts before it authenticates, so "open" alone proves nothing:
// a socket closed right away (4401, 1011) must keep backing off instead of
// resetting the delay and refetching on every attempt.
const STABLE_MS = 5_000;
const CLOSE_AUTH_EXPIRED = 4401;
const CLOSE_FORBIDDEN = 4403;

// React Native's WebSocket takes a third `options` argument (see
// react-native/Libraries/WebSocket/WebSocket.js) that the DOM typings omit.
type NativeWebSocketConstructor = new (
  url: string,
  protocols: string | string[] | null,
  options: { headers: Record<string, string> },
) => WebSocket;
const NativeWebSocket = WebSocket as unknown as NativeWebSocketConstructor;

export interface RealtimeSocketOptions {
  url: string;
  getToken: () => Promise<string | null>;
  onEvent: (event: RealtimeEnvelope) => void;
  onOpen: () => void;
  onAuthExpired: () => Promise<void>;
}

export function socketUrl(apiUrl: string): string {
  return `${apiUrl.replace(/\/$/, "").replace(/^http/, "ws")}/v1/ws`;
}

/** One receive-only socket with ping, backoff and token-expiry handling. */
export class RealtimeSocket {
  private readonly options: RealtimeSocketOptions;
  private socket: WebSocket | null = null;
  private ping: ReturnType<typeof setInterval> | null = null;
  private retry: ReturnType<typeof setTimeout> | null = null;
  private stable: ReturnType<typeof setTimeout> | null = null;
  private attempt = 0;
  private running = false;

  constructor(options: RealtimeSocketOptions) {
    this.options = options;
  }

  start(): void {
    if (this.running) return;
    this.running = true;
    void this.connect();
  }

  stop(): void {
    this.running = false;
    this.clearTimers();
    const socket = this.socket;
    this.socket = null;
    socket?.close(1000);
  }

  private async connect(): Promise<void> {
    if (!this.running || this.socket) return;
    const token = await this.options.getToken().catch(() => null);
    if (!this.running) return;
    if (!token) {
      this.scheduleReconnect();
      return;
    }
    // React Native's WebSocket takes headers; the token stays out of URLs and logs.
    const socket = new NativeWebSocket(this.options.url, null, {
      headers: { Authorization: `Bearer ${token}` },
    });
    this.socket = socket;
    socket.onopen = () => {
      this.ping = setInterval(
        () => socket.send(JSON.stringify({ type: "ping" })),
        PING_MS,
      );
      this.stable = setTimeout(() => {
        this.stable = null;
        this.attempt = 0;
        this.options.onOpen();
      }, STABLE_MS);
    };
    socket.onmessage = (message) => {
      try {
        this.options.onEvent(JSON.parse(String(message.data)) as RealtimeEnvelope);
      } catch {
        // A malformed frame is dropped; the next refetch heals the cache.
      }
    };
    socket.onclose = (closed) => {
      if (this.socket !== socket) return;
      this.socket = null;
      this.clearTimers();
      if (!this.running || closed.code === CLOSE_FORBIDDEN) return;
      if (closed.code === CLOSE_AUTH_EXPIRED) {
        void this.options
          .onAuthExpired()
          .catch(() => undefined)
          .finally(() => this.scheduleReconnect());
        return;
      }
      this.scheduleReconnect();
    };
  }

  private scheduleReconnect(): void {
    if (!this.running || this.retry) return;
    const base = Math.min(MAX_BACKOFF_MS, 1000 * 2 ** this.attempt);
    this.attempt += 1;
    // Jitter on the upper half, so a server restart is not a thundering herd.
    const delay = base / 2 + Math.random() * (base / 2);
    this.retry = setTimeout(() => {
      this.retry = null;
      void this.connect();
    }, delay);
  }

  private clearTimers(): void {
    if (this.ping) clearInterval(this.ping);
    if (this.retry) clearTimeout(this.retry);
    if (this.stable) clearTimeout(this.stable);
    this.ping = null;
    this.retry = null;
    this.stable = null;
  }
}

import type { MessageRead } from "@repo/api-contract";

export type LocalStatus = "sending" | "failed";

/** A server message, or one still on its way (`localStatus` set). */
export type ChatMessage = MessageRead & { localStatus?: LocalStatus };

export type ChatRow =
  | { type: "day"; key: string; label: string }
  | {
      type: "message";
      key: string;
      message: ChatMessage;
      mine: boolean;
      startsGroup: boolean;
      /** Last of its group: the only row that shows the time. */
      endsGroup: boolean;
      seen: boolean;
    };

const GROUP_GAP_MS = 2 * 60 * 1000;
const DAY_MS = 86_400_000;

export const isLocalId = (id: string) => id.startsWith("local-");

/** 8+ characters as the API requires; unique enough per sender. */
export function newClientId(): string {
  const random = () => Math.random().toString(36).slice(2, 10);
  return `${Date.now().toString(36)}-${random()}${random()}`;
}

export function localMessage(params: {
  connectionId: string;
  myId: string;
  clientId: string;
  body: string;
  status: LocalStatus;
}): ChatMessage {
  return {
    id: `local-${params.clientId}`,
    connectionId: params.connectionId,
    senderId: params.myId,
    actorId: params.myId,
    kind: "text",
    body: params.body,
    event: null,
    revealKind: null,
    clientId: params.clientId,
    createdAt: new Date().toISOString(),
    localStatus: params.status,
  };
}

function dayLabel(date: Date, now: Date = new Date()): string {
  const start = (d: Date) =>
    new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  const diff = Math.round((start(now) - start(date)) / DAY_MS);
  if (diff === 0) return "Hôm nay";
  if (diff === 1) return "Hôm qua";
  return `${date.getDate()}/${date.getMonth() + 1}/${date.getFullYear()}`;
}

export function formatTime(iso: string, now: Date = new Date()): string {
  const date = new Date(iso);
  const label = dayLabel(date, now);
  if (label !== "Hôm nay") return label;
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

/**
 * My newest message the peer has read. ObjectIds of equal length sort by
 * creation time as plain strings.
 */
function lastSeenMineId(
  newestFirst: ChatMessage[],
  myId: string,
  peerLastReadId: string | null | undefined,
): string | null {
  if (!peerLastReadId) return null;
  const seen = newestFirst.find(
    (m) =>
      m.kind === "text" &&
      m.senderId === myId &&
      !isLocalId(m.id) &&
      m.id <= peerLastReadId,
  );
  return seen?.id ?? null;
}

function sameGroup(previous: ChatMessage, message: ChatMessage): boolean {
  return (
    previous.kind === "text" &&
    message.kind === "text" &&
    previous.senderId === message.senderId &&
    new Date(message.createdAt).getTime() - new Date(previous.createdAt).getTime() <=
      GROUP_GAP_MS
  );
}

/** Oldest first, with day separators: FlashList renders a chat from the bottom. */
export function buildChatRows(
  newestFirst: ChatMessage[],
  myId: string,
  peerLastReadId: string | null | undefined,
  now: Date = new Date(),
): ChatRow[] {
  const seenId = lastSeenMineId(newestFirst, myId, peerLastReadId);
  const rows: ChatRow[] = [];
  let lastDay = "";
  let previous: ChatMessage | null = null;
  for (const message of [...newestFirst].reverse()) {
    const at = new Date(message.createdAt);
    const day = at.toDateString();
    if (day !== lastDay) {
      rows.push({ type: "day", key: `day-${day}`, label: dayLabel(at, now) });
      lastDay = day;
      previous = null;
    }
    const startsGroup = !previous || !sameGroup(previous, message);
    if (!startsGroup) {
      const last = rows[rows.length - 1];
      if (last?.type === "message") last.endsGroup = false;
    }
    rows.push({
      type: "message",
      // clientId survives the swap from local to server message, so the row
      // keeps its identity and does not flicker.
      key: message.clientId ?? message.id,
      message,
      mine: message.senderId === myId,
      startsGroup,
      endsGroup: true,
      seen: message.id === seenId,
    });
    previous = message;
  }
  return rows;
}

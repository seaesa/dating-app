import type { LastMessageRead, MessageRead } from "@repo/api-contract";

import { REVEAL_NOUNS } from "./reveal";

type Systemish = Pick<MessageRead, "event" | "revealKind" | "actorId">;

export function systemText(message: Systemish, myId: string, peerName: string): string {
  const noun = message.revealKind ? REVEAL_NOUNS[message.revealKind] : "";
  const mine = message.actorId === myId;
  switch (message.event) {
    case "connected":
      return "Các bạn đã kết nối";
    case "reveal_requested":
      return mine
        ? `Bạn đã gửi yêu cầu mở ${noun}`
        : `${peerName} muốn mở ${noun} với bạn`;
    case "reveal_granted":
      return `Hai bạn đã mở ${noun} cho nhau`;
    case "reveal_declined":
      return mine
        ? `Bạn đã từ chối yêu cầu mở ${noun}`
        : `${peerName} chưa sẵn sàng mở ${noun} lúc này`;
    default:
      return "";
  }
}

export function previewText(
  last: LastMessageRead | null | undefined,
  myId: string,
  peerName: string,
): string {
  if (!last) return "Hãy gửi lời chào đầu tiên";
  if (last.kind === "system") return systemText(last, myId, peerName);
  const text = last.kind === "image" ? "Đã gửi một ảnh" : last.preview;
  return last.senderId === myId ? `Bạn: ${text}` : text;
}

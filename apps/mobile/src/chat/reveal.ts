import type { RevealKind, RevealRead } from "@repo/api-contract";

/** none · incoming (waiting on me) · outgoing (waiting on them) · granted */
export type ChipState = "none" | "incoming" | "outgoing" | "granted";

export function chipState(reveal: RevealRead, myId: string): ChipState {
  if (reveal.state === "granted") return "granted";
  if (reveal.state === "requested") {
    return reveal.requestedBy === myId ? "outgoing" : "incoming";
  }
  return "none";
}

export const REVEAL_NOUNS: Record<RevealKind, string> = {
  photos: "ảnh",
  phone: "số điện thoại",
};
export const REVEAL_KINDS: RevealKind[] = ["photos", "phone"];

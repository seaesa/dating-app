import type { ProfileOptionsRead, PublicProfileRead } from "@repo/api-contract";

import { interestEntry } from "./catalog";

export function sharedInterests(a?: string[] | null, b?: string[] | null): string[] {
  const theirs = new Set(b ?? []);
  return (a ?? []).filter((key) => theirs.has(key));
}

/**
 * Openers for an empty room. Built so they read naturally whatever the label
 * is ("phim ảnh", "chạy bộ"): the interest is the object of "thích", never
 * the verb of a question.
 */
export function icebreakers(
  peer: PublicProfileRead,
  mine: PublicProfileRead | undefined,
  catalog: ProfileOptionsRead | undefined,
): string[] {
  const out = sharedInterests(peer.interests, mine?.interests)
    .slice(0, 2)
    .map((key) => {
      const label = interestEntry(catalog, key).label.toLowerCase();
      return `Mình thấy hai đứa cùng thích ${label}, bạn hay ${label} ở đâu?`;
    });
  const prompt = peer.prompts?.[0];
  if (prompt) out.push(`Mình đọc câu "${prompt.question}" của bạn, kể thêm đi!`);
  if (out.length === 0)
    out.push(`Chào ${peer.displayName}! Cuối tuần của bạn thường thế nào?`);
  return out.slice(0, 3);
}

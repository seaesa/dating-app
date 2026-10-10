import { useQuery } from "@tanstack/react-query";

import { profileOptionsQuery, type ProfileOptionsRead } from "@repo/api-contract";

/**
 * Labels and emoji for profile values come from the API catalog, where the
 * emoji are chosen by name and capped at Emoji 12 so older Android phones
 * draw them. The app never hard-codes either.
 */
export interface CatalogEntry {
  label: string;
  icon: string | null;
}

export const useCatalog = () => useQuery(profileOptionsQuery()).data;

export function interestEntry(
  catalog: ProfileOptionsRead | undefined,
  key: string,
): CatalogEntry {
  for (const group of catalog?.interestGroups ?? []) {
    const option = group.options.find((o) => o.value === key);
    if (option) return { label: option.label, icon: option.icon ?? null };
  }
  return { label: key.replace(/_/g, " "), icon: null };
}

export function attributeEntry(
  catalog: ProfileOptionsRead | undefined,
  key: string,
  value: string | null | undefined,
): (CatalogEntry & { title: string }) | null {
  if (!value) return null;
  const attribute = catalog?.attributes.find((a) => a.key === key);
  const option = attribute?.options.find((o) => o.value === value);
  return {
    title: attribute?.label ?? key,
    label: option?.label ?? value,
    icon: option?.icon ?? attribute?.icon ?? null,
  };
}

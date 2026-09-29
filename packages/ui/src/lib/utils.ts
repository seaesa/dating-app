import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * Merge class names, resolving Tailwind conflicts so a caller's class beats a
 * component's default. Without twMerge, `cn("p-2", "p-4")` emits both and the
 * winner depends on stylesheet order.
 */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}

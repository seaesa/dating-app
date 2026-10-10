/**
 * The product name users see. Set EXPO_PUBLIC_APP_NAME (mobile, also read by
 * app.config.ts) or NEXT_PUBLIC_APP_NAME (web) to rebrand. Both are read
 * statically so the bundlers inline them at build time.
 */
export const APP_NAME =
  process.env.EXPO_PUBLIC_APP_NAME || process.env.NEXT_PUBLIC_APP_NAME || "Terdin";

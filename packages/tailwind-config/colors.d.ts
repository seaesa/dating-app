// Hand-written because colors.cjs must stay CommonJS: it is required from
// tailwind.config.js, and an ESM module there returns { default: ... } and
// merges nothing.
type Scheme = "light" | "dark";
type ColorName =
  "background" | "foreground" | "card" | "border" | "primary" | "destructive";

export declare const CHANNELS: Record<Scheme, Record<ColorName, string>>;
export declare const THEME_COLORS: Record<Scheme, Record<ColorName, string>>;

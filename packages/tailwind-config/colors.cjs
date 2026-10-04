/**
 * Finished colours, for the places that cannot take a Tailwind class.
 *
 * React Navigation themes and the browser's `themeColor` meta both want a
 * concrete colour string. Without this they would be hand-written literals
 * that drift from theme.css the first time a brand colour changes — and a
 * literal is invisible to dark mode besides.
 *
 * The channel values here are asserted against theme.css by this package's
 * tests, so the two cannot diverge silently.
 */
const CHANNELS = {
  light: {
    background: "0 0% 100%",
    foreground: "240 10% 4%",
    card: "0 0% 100%",
    border: "240 6% 90%",
    primary: "5 100% 69%",
    destructive: "0 84% 60%",
  },
  dark: {
    background: "240 10% 4%",
    foreground: "0 0% 98%",
    card: "240 10% 6%",
    border: "240 4% 16%",
    primary: "5 100% 65%",
    destructive: "0 72% 51%",
  },
};

const hsl = (channels) => `hsl(${channels})`;

const finish = (scheme) =>
  Object.fromEntries(
    Object.entries(CHANNELS[scheme]).map(([name, channels]) => [name, hsl(channels)]),
  );

module.exports = {
  CHANNELS,
  THEME_COLORS: { light: finish("light"), dark: finish("dark") },
};

const path = require("path");

const preset = require("@repo/tailwind-config/preset");

/** @type {import("tailwindcss").Config} */
module.exports = {
  darkMode: "class",
  // Absolute paths: Turbopack runs PostCSS from a different working directory,
  // so relative globs match nothing and Tailwind emits the theme variables
  // with no utilities at all — the build succeeds and every class is missing.
  content: [
    path.join(__dirname, "app/**/*.{ts,tsx}"),
    path.join(__dirname, "components/**/*.{ts,tsx}"),
    // The shared package must be scanned too: a missing glob here fails only
    // on web, while mobile keeps looking correct.
    path.join(__dirname, "../../packages/ui/src/**/*.{ts,tsx}"),
  ],
  presets: [require("nativewind/preset"), preset],
  theme: { extend: {} },
  plugins: [],
};

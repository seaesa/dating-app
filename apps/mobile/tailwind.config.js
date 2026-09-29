const preset = require("@repo/tailwind-config/preset");

/** @type {import("tailwindcss").Config} */
module.exports = {
  // Scanning @repo/ui source is required: components live there, and a build
  // artifact would hide their class names from Tailwind. This is why that
  // package exports source rather than a bundle.
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "../../packages/ui/src/**/*.{ts,tsx}",
  ],
  presets: [require("nativewind/preset"), preset],
  theme: { extend: {} },
  plugins: [],
};

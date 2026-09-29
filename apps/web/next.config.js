/** @type {import("next").NextConfig} */
module.exports = {
  reactStrictMode: true,
  // Standalone so the container ships only what it needs.
  output: "standalone",
  // Required in a monorepo: without it Next traces only apps/web and the
  // standalone bundle is missing every workspace package.
  outputFileTracingRoot: require("path").join(__dirname, "../../"),
  // Internal packages ship TypeScript source, and NativeWind plus its interop
  // layer ship untranspiled too, so Next must handle all of them.
  transpilePackages: [
    "nativewind",
    "react-native-css-interop",
    "react-native",
    "react-native-web",
    "react-native-safe-area-context",
    "@repo/ui",
    "@repo/core",
    "@repo/tailwind-config",
    "@repo/store",
    "@repo/api-contract",
    "@repo/i18n",
  ],
  turbopack: {
    resolveAlias: {
      "react-native": "react-native-web",
    },
    resolveExtensions: [
      ".web.js",
      ".web.jsx",
      ".web.ts",
      ".web.tsx",
      ".js",
      ".jsx",
      ".ts",
      ".tsx",
      ".json",
    ],
  },
  webpack: (config) => {
    config.resolve.alias = {
      ...(config.resolve.alias || {}),
      // Transform all direct `react-native` imports to `react-native-web`
      "react-native$": "react-native-web",
    };
    // `.web.*` ahead of the plain extensions, which is how @repo/store's
    // platform files resolve correctly here.
    config.resolve.extensions = [
      ".web.js",
      ".web.jsx",
      ".web.ts",
      ".web.tsx",
      ...config.resolve.extensions,
    ];
    return config;
  },
};

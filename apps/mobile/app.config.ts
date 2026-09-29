import type { ExpoConfig } from "expo/config";

type Variant = "development" | "preview" | "production";

const variant = (process.env.APP_VARIANT ?? "development") as Variant;

const NAME: Record<Variant, string> = {
  development: "Terdin (Dev)",
  preview: "Terdin (Preview)",
  production: "Terdin",
};

// Distinct identifiers so all three builds install side by side on one device.
const ID_SUFFIX: Record<Variant, string> = {
  development: ".dev",
  preview: ".preview",
  production: "",
};

const bundleId = `com.terdin.date${ID_SUFFIX[variant]}`;

const config: ExpoConfig = {
  name: NAME[variant],
  slug: "terdin-date",
  scheme: "terdin",
  version: "1.0.0",
  orientation: "portrait",
  icon: "./assets/icon.png",
  userInterfaceStyle: "automatic",
  // `newArchEnabled` is deliberately absent: SDK 56 runs the New Architecture
  // unconditionally and dropped the flag from ExpoConfig entirely.
  assetBundlePatterns: ["**/*"],
  ios: {
    bundleIdentifier: bundleId,
    supportsTablet: true,
  },
  android: {
    package: bundleId,
    adaptiveIcon: {
      foregroundImage: "./assets/adaptive-icon.png",
      backgroundColor: "#ffffff",
    },
    // `edgeToEdgeEnabled` is deliberately absent: Android 16 makes edge-to-edge
    // mandatory, and the plugin now rejects the option outright during prebuild.
  },
  web: {
    bundler: "metro",
    favicon: "./assets/favicon.png",
  },
  plugins: [
    "expo-router",
    // SDK 57 requires expo-status-bar to be registered as a config plugin;
    // importing the component is no longer enough.
    "expo-status-bar",
    // SDK 56 removed the top-level `splash` key; splash configuration moved
    // into this plugin's options, and expo-doctor rejects the old placement.
    [
      "expo-splash-screen",
      {
        image: "./assets/splash.png",
        resizeMode: "contain",
        backgroundColor: "#ffffff",
      },
    ],
  ],
  experiments: { typedRoutes: true },
};

export default config;

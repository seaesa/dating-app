import type { ExpoConfig } from "expo/config";

// Same variable and default as APP_NAME in @repo/core, which the Expo config
// loader cannot import (workspace packages ship TypeScript source).
const APP_NAME = process.env.EXPO_PUBLIC_APP_NAME || "Terdin";

type Variant = "development" | "preview" | "production";

const variant = (process.env.APP_VARIANT ?? "development") as Variant;

const NAME: Record<Variant, string> = {
  development: `${APP_NAME} (Dev)`,
  preview: `${APP_NAME} (Preview)`,
  production: APP_NAME,
};

// Distinct identifiers so all three builds install side by side on one device.
const ID_SUFFIX: Record<Variant, string> = {
  development: ".dev",
  preview: ".preview",
  production: "",
};

const bundleId = `com.terdin.date${ID_SUFFIX[variant]}`;

// The staging server has no domain yet, so its API and photos are plain HTTP,
// which Android (cleartext) and iOS (ATS) refuse by default. Store builds stay
// HTTPS-only.
const allowHttp = variant !== "production";

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
    infoPlist: {
      NSPhotoLibraryUsageDescription: `${APP_NAME} cần truy cập thư viện để bạn chọn ảnh hồ sơ.`,
      ...(allowHttp && { NSAppTransportSecurity: { NSAllowsArbitraryLoads: true } }),
    },
  },
  android: {
    package: bundleId,
    // Android push goes through FCM, which needs google-services.json from the
    // Firebase console. Unset, the app still builds but gets no push token.
    googleServicesFile: process.env.GOOGLE_SERVICES_JSON,
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
    "expo-notifications",
    [
      "expo-location",
      {
        locationWhenInUsePermission: `${APP_NAME} dùng vị trí để gợi ý người ở gần bạn. Không ai thấy vị trí chính xác của bạn.`,
        // Only "while using": no background or "always" location is requested.
        locationAlwaysAndWhenInUsePermission: false,
        locationAlwaysPermission: false,
      },
    ],
    [
      "expo-camera",
      {
        cameraPermission: `${APP_NAME} dùng camera để xác thực khuôn mặt của bạn. Ảnh được xóa ngay sau khi xử lý.`,
        recordAudioAndroid: false,
      },
    ],
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
    // Xcode 27 / iOS 27 SDK requires the UIScene lifecycle. Needs SDK >= 57.0.23;
    // SDK 58+ does this by default, so remove this entry when upgrading.
    [
      "expo-build-properties",
      {
        ios: { enableSceneSupport: true },
        android: { usesCleartextTraffic: allowHttp },
      },
    ],
  ],
  extra: {
    eas: {
      projectId: "17f7f1b4-ba70-4577-9782-0b9bacf8790c",
    },
  },
  owner: "hairipi",
  experiments: { typedRoutes: true },
};

export default config;

import type { Metadata, Viewport } from "next";
import { headers } from "next/headers";

import { APP_NAME } from "@repo/core";
import { THEME_COLORS } from "@repo/tailwind-config/colors";

import "./global.css";
import { Providers } from "./providers";

export const metadata: Metadata = {
  title: { default: APP_NAME, template: `%s · ${APP_NAME}` },
  description: "Meet people without giving away who you are, until you both choose to.",
  applicationName: `${APP_NAME} Admin`,
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: `${APP_NAME} Admin`,
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
  // From the shared tokens, not literals: the browser chrome should match the
  // page, and a hand-written hex drifts the first time a brand colour changes.
  themeColor: [
    {
      media: "(prefers-color-scheme: light)",
      color: THEME_COLORS.light.background,
    },
    {
      media: "(prefers-color-scheme: dark)",
      color: THEME_COLORS.dark.background,
    },
  ],
};

/**
 * Applies the `dark` class before first paint.
 *
 * Tailwind is configured with darkMode: "class" (NativeWind's requirement on
 * native), so without something setting that class every `dark:` variant in
 * @repo/ui and the whole `.dark:root` token block are dead code on web — while
 * viewport.themeColor still hands a dark-mode browser its dark chrome, framing a
 * white page. Inline and blocking, because doing it in an effect would flash the
 * light theme first.
 */
const APPLY_COLOR_SCHEME = `try{var m=matchMedia("(prefers-color-scheme: dark)");
var a=function(){document.documentElement.classList.toggle("dark",m.matches)};
a();m.addEventListener("change",a)}catch(e){}`;

const PWA_EARLY_INIT = `try{window.__pwaInstallPrompt=null;window.addEventListener("beforeinstallprompt",function(e){e.preventDefault();window.__pwaInstallPrompt=e;window.dispatchEvent(new CustomEvent("pwa-prompt-ready"))});if("serviceWorker" in navigator){navigator.serviceWorker.register("/sw.js")}}catch(e){}`;

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  // Set by proxy.ts in production; the CSP there blocks this script without it.
  const nonce = (await headers()).get("x-nonce") ?? undefined;

  // Real HTML lives here. react-native-web renders every View and Text as a
  // div, so anything a crawler should read belongs at this level rather than
  // inside a React Native tree.
  return (
    <html lang="vi" suppressHydrationWarning>
      <head>
        <link rel="manifest" href="/manifest.webmanifest" />
        <link rel="icon" href="/logo.svg" type="image/svg+xml" />
        <link rel="icon" href="/icon-512.png" type="image/png" sizes="512x512" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
        <script nonce={nonce} dangerouslySetInnerHTML={{ __html: APPLY_COLOR_SCHEME }} />
        <script nonce={nonce} dangerouslySetInnerHTML={{ __html: PWA_EARLY_INIT }} />
      </head>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}

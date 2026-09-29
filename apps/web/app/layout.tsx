import type { Metadata, Viewport } from "next";

import { THEME_COLORS } from "@repo/tailwind-config/colors";

import "./global.css";
import { Providers } from "./providers";

export const metadata: Metadata = {
  title: { default: "Terdin", template: "%s · Terdin" },
  description: "Meet people without giving away who you are, until you both choose to.",
};

export const viewport: Viewport = {
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

export default function RootLayout({ children }: { children: React.ReactNode }) {
  // Real HTML lives here. react-native-web renders every View and Text as a
  // div, so anything a crawler should read belongs at this level rather than
  // inside a React Native tree.
  return (
    <html lang="vi" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: APPLY_COLOR_SCHEME }} />
      </head>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}

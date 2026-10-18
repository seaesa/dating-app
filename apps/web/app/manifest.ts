import type { MetadataRoute } from "next";

import { THEME_COLORS } from "@repo/tailwind-config/colors";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Terdin Admin",
    short_name: "Terdin Admin",
    description: "Cổng Quản Trị Hệ Thống Terdin Date",
    start_url: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: THEME_COLORS.light.background,
    theme_color: THEME_COLORS.light.background,
    icons: [
      {
        src: "/logo.svg",
        sizes: "any",
        type: "image/svg+xml",
      },
      {
        src: "/icon-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icon-maskable.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}

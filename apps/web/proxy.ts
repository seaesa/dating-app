import { NextResponse, type NextRequest } from "next/server";

/**
 * Content-Security-Policy with a per-request nonce.
 *
 * The App Router streams its payload in inline <script> tags, so a static
 * `script-src 'self'` blocks hydration and leaves a page that renders but never
 * responds. Next reads the nonce from this request header and stamps it on its
 * own scripts; the layout stamps it on the colour-scheme script.
 *
 * The CSP is what keeps an injected script from reading the refresh token in
 * localStorage, so do not loosen script-src to 'unsafe-inline'.
 *
 * Production only: the dev server needs eval and a websocket for HMR.
 */
export function proxy(request: NextRequest) {
  if (process.env.NODE_ENV !== "production") return NextResponse.next();

  const nonce = btoa(crypto.randomUUID());
  // An absolute API URL (API on another origin) must be allowed to connect.
  const api = process.env.NEXT_PUBLIC_API_URL ?? "";
  const apiOrigin = /^https?:\/\//.test(api) ? ` ${new URL(api).origin}` : "";

  const csp = [
    "default-src 'self'",
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'`,
    // react-native-web injects its styles at runtime.
    "style-src 'self' 'unsafe-inline'",
    // Presigned media URLs point at the object store's origin.
    "img-src 'self' data: blob: https:",
    `connect-src 'self'${apiOrigin}`,
    "font-src 'self'",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
  ].join("; ");

  const headers = new Headers(request.headers);
  headers.set("x-nonce", nonce);
  headers.set("Content-Security-Policy", csp);

  const response = NextResponse.next({ request: { headers } });
  response.headers.set("Content-Security-Policy", csp);
  return response;
}

export const config = {
  // Pages only: static assets and prefetches need no policy of their own.
  matcher: [
    {
      source: "/((?!_next/static|_next/image|favicon.ico).*)",
      missing: [{ type: "header", key: "next-router-prefetch" }],
    },
  ],
};

# AGENTS.md — apps/web

**The admin dashboard.** End users never use this app: their app is
`apps/mobile`. Web is for the team running Terdin — the "Admin" section of the
requirements (users, profile moderation, verification, reports, matching
parameters, membership and payment configuration, audit log).

Next.js 16 App Router rendering `@repo/ui` React Native components through
react-native-web, styled with NativeWind. Workspace rules:
[root AGENTS.md](../../AGENTS.md).

## Structure

```
proxy.ts              per-request CSP nonce (production only)
next.config.js        standalone output, transpilePackages, react-native → react-native-web
app/
  layout.tsx          <html>, metadata, nonce'd dark-mode script
  providers.tsx       QueryClient + configureApiClient, once at module scope
  page.tsx            empty until the first admin screen lands
```

There are no screens yet. The end-user pages that used to live here (login,
onboarding, profile, public profile) were removed: that journey belongs to the
mobile app.

## Do not change

- **`--webpack` in `dev` and `build`.** Turbopack panics on react-native-web.
  The `turbopack` block in `next.config.js` is not permission to drop the flag.
- **No Babel config in this app.** NativeWind works through
  `"jsxImportSource": "nativewind"` in `packages/typescript-config/nextjs.json`;
  a `babel.config.js` disables SWC. Without that tsconfig line every `className`
  silently does nothing.
- **No `react-native-reanimated`** — it requires Babel.
- **CSP lives in `proxy.ts`**, not Caddy: Next's inline scripts need the
  per-request nonce. Never add `'unsafe-inline'` to `script-src` — tokens are in
  `localStorage`. An inline `<script>` you add must take the nonce from
  `(await headers()).get("x-nonce")`, as `layout.tsx` does.

## Building admin screens

- **Admins are not end users.** Admin sign-in, roles and admin-only API routes
  do not exist yet; build them before the first screen that reads user data.
  Never reuse the end-user OTP session as admin access.
- **Rule zero still applies.** An admin may need a user's private tier (to
  verify or moderate), but only through admin endpoints that check the role and
  write the audit log — never through the end-user `/v1/users/{id}` route.
- **Client pages.** Tokens are in `localStorage`, which a server component
  cannot read: guard and redirect on the client, after the session store has
  hydrated. `providers.tsx` still redirects an expired session to `/login`;
  point it at the admin sign-in once that exists.
- **Data.** Calls and types come from `@repo/api-contract`; never `fetch` or
  `axios` here. Validation messages live in `packages/api-contract/src/forms.ts`.
- **Layout.** `View` + token classes from `@repo/tailwind-config`; no literal
  colours. Dense tables and filters are fine here — this is a desktop tool, not
  the mobile journey.
- **Copy is Vietnamese.**

## Env

`NEXT_PUBLIC_API_URL` (`.env.local`; `/api` in the Docker image) is inlined at
build time. Public — never a secret.

## Commands

```bash
pnpm dev:web                    # from the root → http://localhost:3000
pnpm --filter=web lint
pnpm --filter=web typecheck
pnpm --filter=web build         # the only proof react-native-web still resolves
```

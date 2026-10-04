# AGENTS.md — apps/web

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
  session-gate.ts     useRequireSession, useRedirectWhenSignedIn, homeFor
  page.tsx            client redirect to /login or /profile
  login/ onboarding/ profile/     client pages ("use client")
  u/[id]/page.tsx     server component shell (SEO) + client public-profile.tsx
```

## Do not change

- **`--webpack` in `dev` and `build`.** Turbopack panics on react-native-web.
  The `turbopack` block in `next.config.js` is not permission to drop the flag.
- **No Babel config in this app.** NativeWind works through
  `"jsxImportSource": "nativewind"` in `packages/typescript-config/nextjs.json`;
  a `babel.config.js` disables SWC. Without that tsconfig line every `className`
  silently does nothing.
- **No `react-native-reanimated`** — it requires Babel.
- **CSP lives in `proxy.ts`**, not Caddy: Next's inline scripts need the
  per-request nonce. Never add `'unsafe-inline'` to `script-src` — the refresh
  token is in `localStorage`. An inline `<script>` you add must take the nonce
  from `(await headers()).get("x-nonce")`, as `layout.tsx` does.

## Pages

A guarded page is a client component that calls a session hook first and
enables its queries on the session:

```tsx
"use client";
export default function ProfilePage() {
  const { hydrated, signedIn } = useRequireSession();
  const { data, isPending } = useQuery({ ...meQuery(), enabled: signedIn });
  if (!hydrated || isPending) return <Skeleton className="h-40 w-full" />;
  // compose @repo/ui components from `data`
}
```

- Guards: `useRequireSession()` (needs a session; pass
  `{ requireOnboarded: false }` for onboarding) or `useRedirectWhenSignedIn()`
  (login). Never hand-roll a check, and never route before `hydrated`.
- Never redirect on auth in a server component — the token is in
  `localStorage`, which the server cannot read.
- Content a crawler should read (`<main>`, `<h1>`, `metadata`) goes in a server
  component wrapping the client tree; react-native-web renders only `div`s.
  `u/[id]/` is the pattern.
- Layout with `View` + token classes; `mx-auto w-full max-w-lg` is the page
  column.
- Forms: validate with the shared parser from `@repo/api-contract`
  (`parseProfileForm`) before `mutate`, so the form never accepts what the API
  refuses. Mutations: `useMutation({ mutationFn: updateMyProfile })`.

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

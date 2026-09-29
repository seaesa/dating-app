# AGENTS.md — apps/web

Next.js App Router rendering React Native components through react-native-web,
styled by NativeWind.

Read [the root AGENTS.md](../../AGENTS.md) for workspace-wide rules.

## The two things that will surprise you

**1. The build uses webpack, not Turbopack.** `dev` and `build` both pass
`--webpack`. Turbopack panics on react-native-web's package shape. `next.config.js`
still carries a `turbopack` block for the day that is fixed — that block is not
permission to drop the flag. `pnpm check:ui` fails if either script loses it.

**2. NativeWind is configured through tsconfig, not Babel.** `jsxImportSource:
"nativewind"` in `packages/typescript-config/nextjs.json` is what makes
`className` work on a React Native element. **Never add a Babel config to this
app** — a `babel.config.js` switches off Next's SWC compiler, which is the whole
reason the JSX runtime is set this way.

Deleting that one line is the most expensive mistake available here: the build
still succeeds, Tailwind still emits every class from content scanning, and
every `className` in the app becomes a dead prop at runtime. A gate step asserts
`tsc --showConfig` still reports it.

## Layout

```
app/
  layout.tsx          real HTML, metadata, the dark-class script
  providers.tsx       query client, API client, session listeners
  session-gate.ts     the route guards every page uses
  page.tsx            routes to /login or /profile
  login/page.tsx      phone then OTP
  onboarding/page.tsx the first profile
  profile/page.tsx    own profile, both tiers
  u/[id]/             a public profile — a server component, for crawlers
```

## Rules

**Server components for anything a crawler reads.** react-native-web renders
every `View` and `Text` as a `div`, so semantic HTML — `<main>`, `<h1>`, real
metadata — has to live in a server component or a layout. `u/[id]/page.tsx` is
the pattern: a server component holding the HTML, with the React Native tree
inside it.

**A page that needs a session uses `session-gate.ts`.** Never hand-roll the
check. Every guard waits for `hydrated` before routing, because the refresh
token is read asynchronously from storage and routing before that bounces a
signed-in user to login on every reload. Mobile gets this from expo-router
layouts; Next has no equivalent for client state, so the hook is the shared
piece.

**Never redirect based on auth from a server component.** The refresh token is
in `localStorage`, which the server cannot read. The root page used to
`redirect("/login")` on the server, so a signed-in user was handed the login
form forever.

**Never hand-write a request.** Import the generated hook from
`@repo/api-contract`. `configureApiClient` is called once at module scope in
`providers.tsx` — not from an effect, because child effects run before parent
effects and a page could otherwise fire its first request before the
interceptors existed.

**Never hard-code a colour.** Tokens come from `@repo/tailwind-config`. This is
checked, in every notation — `#fff`, `#RRGGBBAA`, `rgb()` and `hsl()` all fail.
The two places that need a finished colour import `THEME_COLORS`.

**Do not add `react-native-reanimated`.** It requires a Babel plugin, which
brings back the config this app must not have. A gate step refuses the
dependency.

**Refresh tokens live in `localStorage`** — the tradeoff recorded in the spec.
Only `packages/store/src/storage.web.ts` touches it; moving to a httpOnly cookie
replaces that one file.

## Local development

```bash
pnpm dev:web             # http://localhost:3000
```

`NEXT_PUBLIC_API_URL` comes from `.env.local`. It is inlined into client
JavaScript, so it is a public value — never put a secret behind that prefix.

## Before pushing

```bash
pnpm --filter=web lint
pnpm --filter=web typecheck
pnpm check:ui             # boundaries, tokens, the private-tier grep, the build
```

**Never add a test runner or a `*.test.ts` file.** `pnpm check:ui` builds the
app and asserts against the output instead: design tokens and the dark-mode block
reached the stylesheet, no native-only storage reached the bundle, and no page
outside `/profile` reads a private field.

## Deploy

`docker/web.Dockerfile` builds a standalone output. `output: "standalone"` plus
`outputFileTracingRoot` in `next.config.js` are what make that work from a pnpm
workspace — without the tracing root, the traced bundle misses the shared
packages.

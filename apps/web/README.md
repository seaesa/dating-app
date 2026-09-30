# Terdin Date — Web

The browser client. Next.js App Router rendering the same React Native
components the mobile app uses, through react-native-web.

See [AGENTS.md](./AGENTS.md) for the rules — particularly the two that will
surprise you: the build runs on webpack rather than Turbopack, and NativeWind is
configured through tsconfig rather than Babel.

## Tech stack

| Layer     | Choice                                                              |
| --------- | ------------------------------------------------------------------- |
| Framework | Next.js 16 App Router                                               |
| Rendering | react-native-web, so `@repo/ui` components run unchanged            |
| Styling   | NativeWind 4 + Tailwind 3, tokens from `@repo/tailwind-config`      |
| Data      | `@repo/api-contract` — generated types, Zod, axios, query options   |
| State     | `@repo/store` (Zustand); refresh token in `localStorage`            |
| Bundler   | webpack (`--webpack`), because Turbopack panics on react-native-web |

## Setup

```bash
pnpm install                      # from the repository root
cp apps/web/.env.example apps/web/.env.local
```

| Variable              | Meaning                                                     |
| --------------------- | ----------------------------------------------------------- |
| `NEXT_PUBLIC_API_URL` | Where the API is. Inlined into client JS, so never a secret |

## Run locally

```bash
pnpm services:up      # MongoDB, Redis, S3 — the API needs them
pnpm dev:api          # the API this client talks to
pnpm dev:web          # http://localhost:3000
```

Sign in with any phone number: `SMS_PROVIDER=console` in development prints the
OTP to the API's log under `sms.console`.

| Route         | What                                        |
| ------------- | ------------------------------------------- |
| `/`           | Routes to login or profile once hydrated    |
| `/login`      | Phone, then OTP                             |
| `/onboarding` | The first public profile                    |
| `/profile`    | Own profile, both tiers                     |
| `/u/<id>`     | A public profile — server rendered, for SEO |

## Verify

```bash
pnpm --filter=web lint && pnpm --filter=web typecheck
pnpm --filter=web build   # webpack; proves react-native-web resolves everything
```

## Deploy

Ships as a container built by `docker/web.Dockerfile`, published to GHCR on every
push to `main`, and served by Caddy on the same origin as the API — so production
needs no CORS.

```bash
docker compose -f docker-compose.prod.yml up -d web
```

`NEXT_PUBLIC_API_URL` is a build argument, not a runtime one: it is inlined into
the client bundle, so changing it means rebuilding the image.

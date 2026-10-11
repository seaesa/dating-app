# Terdin Date

A dating platform built on three ideas: people discover each other socially, a
match forms only when both sides opt in, and real identities stay hidden until
both people choose to reveal them.

A user has two tiers. The **public persona** — nickname, age, city, bio,
interests — is visible to anyone. The **private identity** — real name, real
photos, socials, precise location — is locked, and the API refuses to return it
until a mutual reveal is recorded. That rule is enforced in one function, not
scattered across endpoints.

> **Agents:** read [AGENTS.md](./AGENTS.md) first. It routes to the rules for
> whichever part you are changing.

## What is here

```
apps/
  api/       FastAPI + MongoDB          → apps/api/README.md
  web/       Next.js + react-native-web → apps/web/README.md
  mobile/    Expo, iOS and Android      → apps/mobile/README.md
packages/
  api-contract/    API client: generated types, hand-written axios calls
  ui/              React Native Reusables components, shared by web and mobile
  tailwind-config/ design tokens, defined once
  core/            pure TypeScript helpers
  store/           Zustand state behind a platform storage adapter
  i18n/            i18next configuration
```

One component library serves all three platforms: `@repo/ui` holds React Native
components, which Expo renders natively and Next renders through
react-native-web. Neither app calls axios directly — `@repo/api-contract` has
one function per endpoint, typed by types generated from the API's OpenAPI
document.

## Architecture

```
                  ┌───────────────────┐
apps/mobile ─────►│                   │
                  │ @repo/api-contract│──── generated from ────┐
apps/web ────────►│   types (gen) ·   │                        │
                  │   axios calls     │                        │
                  └───────────────────┘                        │
       │                                                       │
       ├──► @repo/ui ──► @repo/tailwind-config                 ▼
       ├──► @repo/store                          apps/api/openapi.json
       └──► @repo/core                                  ▲
                                                        │
                                     ┌──────────────────┴──────┐
                                     │ apps/api  FastAPI       │
                                     │  auth · users · media   │
                                     └───┬──────┬──────┬───────┘
                                    MongoDB  Redis   S3
```

## Requirements

| Tool                   | Version | Why                                                        |
| ---------------------- | ------- | ---------------------------------------------------------- |
| Node                   | 24+     | Workspace tooling                                          |
| pnpm                   | 12.5.1  | Workspaces; `npm` does not forward `--filter` to Turborepo |
| Docker                 | 27+     | MongoDB, Redis and the S3 gateway                          |
| uv                     | 0.12+   | Python for the API. It downloads Python itself             |
| Xcode / Android Studio | current | Only for running on a simulator                            |

## Quickstart

```bash
pnpm install
cp apps/api/.env.example apps/api/.env
sed -i '' "s|^JWT_SECRET=.*|JWT_SECRET=$(openssl rand -hex 32)|" apps/api/.env
cp apps/web/.env.example apps/web/.env.local
cp apps/mobile/.env.example apps/mobile/.env

pnpm services:up   # MongoDB, Redis, S3
pnpm dev           # all three apps
```

| URL                        | What              |
| -------------------------- | ----------------- |
| http://localhost:3000      | Web               |
| http://localhost:8000/docs | API documentation |
| http://localhost:8081      | Expo dev server   |
| http://localhost:8333      | S3 API            |

Object storage is a SeaweedFS S3 gateway, not MinIO — MinIO's container images
were withdrawn. It is an API only, with no console: inspect buckets with the AWS
CLI against `--endpoint-url http://localhost:8333`.

**Signing in locally.** `SMS_PROVIDER=console` in development, so OTP codes are
printed to the API's output rather than sent. Enter a phone number, find the
`sms.console` line in the API log, and use that code.

## Commands

| Command                                                 | Does                                                                           |
| ------------------------------------------------------- | ------------------------------------------------------------------------------ |
| `pnpm dev`                                              | Every app                                                                      |
| `pnpm dev:api` · `dev:web` · `dev:mobile`               | One app                                                                        |
| `pnpm services:up` · `services:down` · `services:reset` | Development infrastructure                                                     |
| `pnpm contract`                                         | Re-export the schema and regenerate the client. Run after changing an endpoint |
| `pnpm lint` · `typecheck` · `format`                    | Across the workspace                                                           |

`pnpm dev --filter=<app>` also works. `npm run dev --filter=api` does not — npm
treats `--filter` as its own flag and never passes it to Turborepo.

## Deploy

**API and web** ship as containers, published to GHCR on every push to `main`.

```bash
cp .env.prod.example .env.prod          # fill it in
docker compose --env-file .env.prod -f docker-compose.prod.yml up -d
```

`--env-file` rather than exporting into the shell: an exported secret ends up in
the environment of everything else you run in that terminal, and a value
containing a space does not survive the round trip.

The images are private on first publish, so a first deploy needs
`docker login ghcr.io` with a token that can read packages. Without published
images, build them on the host instead: `... up -d --build`.

Caddy terminates TLS and serves the API under `/api` on the same origin as the
web app, so production needs no CORS. Point `MONGODB_URL`, `REDIS_URL` and
`S3_*` at managed services, or run MongoDB, Redis and SeaweedFS here with
`COMPOSE_PROFILES=selfhosted`. `.env.prod.example` documents both, and the
ports to move to when another stack on the host already holds 80/443.

**Mobile** builds through EAS:

```bash
cd apps/mobile
eas build --profile preview      # APK for internal testing
eas build --profile production   # AAB and IPA for the stores
```

CI can run these: the **Mobile build** workflow takes a platform and a profile,
and a `v*` tag builds for production automatically.

## Documentation

| File                                             | Covers                                             |
| ------------------------------------------------ | -------------------------------------------------- |
| [AGENTS.md](./AGENTS.md)                         | Where the rules live, and the workspace-wide ones  |
| [apps/api/AGENTS.md](./apps/api/AGENTS.md)       | Adding an endpoint, the visibility invariant       |
| [apps/web/AGENTS.md](./apps/web/AGENTS.md)       | Server and client components with react-native-web |
| [apps/mobile/AGENTS.md](./apps/mobile/AGENTS.md) | expo-router, CNG, EAS                              |
| [packages/ui/AGENTS.md](./packages/ui/AGENTS.md) | Adding a component, universal code                 |
| [packages/README.md](./packages/README.md)       | What each shared package is for                    |
| [CONTRIBUTING.md](./CONTRIBUTING.md)             | Branching, review expectations                     |

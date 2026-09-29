# Terdin Date — Mobile

The iOS and Android client. Expo SDK 57 with expo-router, sharing `@repo/ui` and
the generated API client with the web app.

See [AGENTS.md](./AGENTS.md) for the rules — particularly that `ios/` and
`android/` are generated and must never be committed.

## Tech stack

| Layer      | Choice                                                            |
| ---------- | ----------------------------------------------------------------- |
| Runtime    | Expo SDK 57, React Native 0.86, New Architecture                  |
| Navigation | expo-router, typed routes, route groups for auth state            |
| Styling    | NativeWind 4, tokens from `@repo/tailwind-config`                 |
| Data       | `@repo/api-contract` — generated types, Zod, axios, query options |
| State      | `@repo/store` (Zustand); refresh token in the keychain            |
| Builds     | EAS, with Continuous Native Generation                            |

## Setup

```bash
pnpm install                        # from the repository root
cp apps/mobile/.env.example apps/mobile/.env
```

| Variable              | Meaning                                                     |
| --------------------- | ----------------------------------------------------------- |
| `EXPO_PUBLIC_API_URL` | Where the API is. Must be reachable _from the device_       |
| `APP_VARIANT`         | `development` · `preview` · `production`. Selects bundle id |

A physical device needs the machine's LAN address, not `localhost`.

## Run locally

```bash
pnpm services:up      # MongoDB, Redis, S3 — the API needs them
pnpm dev:api          # the API this client talks to
pnpm dev:mobile       # Expo dev server on :8081
```

Then press `i` for an iOS simulator or `a` for Android, or scan the QR code.
Sign in with any phone number: the OTP is printed to the API's log under
`sms.console`.

## Verify

There is no JavaScript test runner in this repository — a deliberate scope
decision. `expo export` is the check that matters here: it is the only thing
that proves Metro and NativeWind still resolve every import on both platforms.

```bash
pnpm --filter=mobile lint && pnpm --filter=mobile typecheck
pnpm exec expo export --platform all --output-dir dist
pnpm check:eas            # build profiles and bundle identifiers
```

## Build and deploy

```bash
pnpm build:dev        # dev client: APK plus a simulator build
pnpm build:preview    # APK for internal testing
pnpm build:prod       # AAB and IPA for the stores
```

One-time setup: create an Expo account, `eas login`, then `eas init` in this
directory to create the project. For CI, add `EXPO_TOKEN` as a repository
secret — the **Mobile build** workflow takes a platform and a profile, and a
`v*` tag builds production automatically.

Submitting to the stores is the **Mobile submit** workflow, which is manual and
gated on the `production` environment so a release needs an approval. It expects
`GOOGLE_SERVICE_ACCOUNT_JSON`, `APPLE_ID`, `ASC_APP_ID` and `APPLE_TEAM_ID`.

All three variants install side by side, so a tester can hold the production app
and a preview build at once.

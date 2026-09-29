# AGENTS.md — apps/mobile

Expo SDK 57, React Native 0.86, expo-router, NativeWind. iOS and Android from
one codebase.

Read [the root AGENTS.md](../../AGENTS.md) for workspace-wide rules.

## Continuous Native Generation

There are no `ios/` or `android/` directories, and there must not be. They are
generated from `app.config.ts` at build time, by EAS or by `expo prebuild`.

**Never commit native directories.** Once they exist, `app.config.ts` stops being
the source of truth and every config plugin silently stops applying. If you need
to inspect generated native code, run `pnpm exec expo prebuild --clean`, look,
then delete what it produced.

Native configuration therefore goes in `app.config.ts` or a config plugin —
never in `Info.plist` or `AndroidManifest.xml`.

## Variants

`APP_VARIANT` selects the name and bundle id, so all three builds install side
by side on one device:

| Variant     | Identifier              | Name             |
| ----------- | ----------------------- | ---------------- |
| development | com.terdin.date.dev     | Terdin (Dev)     |
| preview     | com.terdin.date.preview | Terdin (Preview) |
| production  | com.terdin.date         | Terdin           |

Every profile in `eas.json` **must** set `APP_VARIANT`. A profile that forgets it
falls back to development and builds the development bundle id under a production
channel, which collides on device and in the store. `pnpm check:eas` resolves the
real config per variant and fails if two identifiers match.

## Layout

```
app/
  _layout.tsx           root: providers, the global stylesheet
  index.tsx             routes on the persisted session
  providers.tsx         query client, API client, session listeners
  (auth)/               phone, otp — guarded: a signed-in user is sent out
  (onboarding)/         the first profile — guarded on a session
  (app)/                the signed-in app — guarded on a finished profile
```

## Rules

**A route group's `_layout.tsx` owns its guard.** Never guard inside a screen.
Every guard reads `refreshToken` and `onboardingPending` from `@repo/store`, and
both targets of a redirect read the same persisted flag — otherwise two guards
disagree and the outcome depends on which render wins.

**`onboardingPending` is persisted, not passed.** It comes from `verifyOtp`'s
`isNewUser` and is cleared by `completeOnboarding()` after the first successful
save. Acting on it once was a bug: killing the app on the onboarding form
satisfied every guard on the next cold start and stranded the user on a profile
of empty strings with no route back.

**Screens hold no business logic.** They compose a `@repo/ui` component with an
`@repo/api-contract` hook. Anything worth reusing belongs in a package.

**Never add a test runner or a `*.test.ts` file.** A screen is verified by
`expo export` succeeding and nothing else — a reason to keep screens thin.

**Never hard-code a colour**; tokens come from `@repo/tailwind-config`. Checked
in every notation.

**Refresh tokens live in the keychain** via `expo-secure-store`, in
`packages/store/src/storage.native.ts` and nowhere else.

**Use `FlashList`, not `FlatList`,** for anything unbounded, and `expo-image`
rather than `Image` for remote photographs — a dating app is mostly photographs,
and `Image` caches none of them.

## Local development

```bash
pnpm dev:mobile          # Expo dev server on :8081
pnpm exec expo start --ios
pnpm exec expo start --android
```

The dev client needs a build once per native dependency change:
`pnpm build:dev`.

`EXPO_PUBLIC_API_URL` must be reachable from the device, so a physical phone
needs the machine's LAN address, not `localhost`.

## Before pushing

```bash
pnpm --filter=mobile lint
pnpm --filter=mobile typecheck
pnpm exec expo export --platform all --output-dir dist   # from apps/mobile
pnpm check:eas
```

`expo export` is the real check: it is the only thing here that proves Metro and
NativeWind still resolve every import on both platforms.

## Builds

```bash
pnpm build:dev       # dev client, APK + simulator build
pnpm build:preview   # APK for internal testing
pnpm build:prod      # AAB and IPA for the stores
```

One-time setup: an Expo account, `eas login`, then `eas init` in this directory
to create the project. For CI, add `EXPO_TOKEN` as a repository secret; the
**Mobile build** workflow takes a platform and a profile, and a `v*` tag builds
production automatically.

`eas.json` sets `requireCommit`, so a dirty tree is refused — that is what makes
a build traceable to a commit — and `appVersionSource: "remote"`, so EAS owns
the build number and two builds never collide.

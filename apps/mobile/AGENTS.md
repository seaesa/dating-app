# AGENTS.md — apps/mobile

**The app end users use** (the admin dashboard is `apps/web`). Expo SDK 57,
React Native 0.86 (New Architecture), expo-router, NativeWind 4. iOS and
Android from one codebase. Workspace rules:
[root AGENTS.md](../../AGENTS.md).

## Structure

```
app.config.ts          name, bundle id, plugins — the ONLY native config
eas.json               build profiles; each sets APP_VARIANT
metro.config.js        monorepo resolution + NativeWind
src/
  app/                 routes ONLY — every file here is a screen or a layout
    _layout.tsx        providers; renders nothing until the store is hydrated
    index.tsx          redirects on the persisted session
    (auth)/            phone, otp        — layout sends signed-in users away
    (onboarding)/      index.tsx — one-question-per-screen sign-up, resumes from server data
    (app)/             signed-in screens — layout requires a finished profile
  providers.tsx        QueryClient + configureApiClient, once at module scope
  components/          mobile-only components (shared ones go in @repo/ui)
  phone-form.ts        screen helpers live beside app/, never inside it
```

Import from `src/` with the `@/` alias (`import { Providers } from "@/providers"`),
not `../../`.

## Do not change

- **No `ios/` or `android/` directories.** Native projects are generated
  (Continuous Native Generation). Native settings go in `app.config.ts` or a
  config plugin, never in `Info.plist`/`AndroidManifest.xml`. To inspect:
  `pnpm exec expo prebuild --clean`, look, delete.
- **Every `eas.json` profile sets `APP_VARIANT`.** It picks the bundle id
  (`com.terdin.date` + `.dev`/`.preview`/none); a missing one ships the dev id.
- **Add native modules with `pnpm exec expo install <pkg>`**, never a bare
  `pnpm add` — Expo pins the SDK-compatible version. Then rebuild the dev client.
- **One version of each native module.** `expo-doctor` fails CI on duplicates;
  fix with `pnpm dedupe` at the root.

## Screens

Guards live in the route group's `_layout.tsx`, never in a screen:

```tsx
export default function AppLayout() {
  const refreshToken = useAuthStore((s) => s.refreshToken);
  const onboardingPending = useAuthStore((s) => s.onboardingPending);
  if (!refreshToken) return <Redirect href="/(auth)/phone" />;
  if (onboardingPending) return <Redirect href="/(onboarding)" />;
  return <Stack screenOptions={{ headerShown: false }} />;
}
```

- A new signed-in screen goes under `(app)/` and inherits its guard.
- A screen composes `@repo/ui` components with a generated query hook; wrap it
  in `SafeAreaView className="flex-1 bg-background"`.
- Only routes go in `src/app/`: expo-router turns every file there into a
  route. Helpers, hooks and components go in `src/` (`src/phone-form.ts`);
  shared validation in `@repo/api-contract` (`parseProfileForm`).
- `onboardingPending` is persisted in `@repo/store`; clear it only with
  `completeOnboarding()` after a successful save.
- Tokens in the keychain via `expo-secure-store` — only
  `packages/store/src/storage.native.ts` touches it.
- Remote images: `expo-image`. Unbounded lists: `FlashList`. Install either with
  `expo install` when first needed.
- Platform-specific code: `file.ios.tsx` / `file.android.tsx`, or
  `Platform.select`, with the same exported API.

## Env

`EXPO_PUBLIC_API_URL` (`.env` locally, per profile in `eas.json`). On a physical
device use the machine's LAN IP, not `localhost`. Public — never a secret.

## Commands

```bash
pnpm dev:mobile                         # from the root → Expo on :8081
pnpm --filter=mobile lint
pnpm --filter=mobile typecheck
pnpm exec expo export --platform all --output-dir dist   # proves Metro resolves
pnpm dlx expo-doctor@latest             # dependency health, as CI runs it
pnpm build:dev | build:preview | build:prod             # EAS builds
```

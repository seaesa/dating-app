# AGENTS.md — packages/ui

React Native components shared by both apps: Expo renders them natively, Next
renders them through react-native-web. Built on React Native Reusables, which is
a copy-in registry rather than a dependency.

Read [the root AGENTS.md](../../AGENTS.md) for workspace-wide rules.

## The boundary

**This package must never import `@repo/api-contract` or `@repo/store`.** A
component takes its data through props, so it renders from a fixture and cannot
depend on a live session. `pnpm check:ui` enforces it.

That is what lets one component serve a server-rendered public profile and a
client-rendered own-profile screen without either knowing about the other.

## Layout

```
src/
  components/ui/      primitives: button, input, text, badge, skeleton, label
  components/         composed: profile-card, otp-input
  lib/
    slot.tsx          asChild support — ours, see below
    utils.ts          cn()
    theme.ts          NAV_THEME, useColorScheme
```

## Rules

**Write for both platforms.** No `document`, no `window`, no DOM event. If a
component needs a platform difference, use a `.native.tsx` / `.web.tsx` pair and
keep the shared API identical.

**Never hard-code a colour, a spacing or a font size.** Use a token class —
`bg-primary`, `text-foreground`, `p-4`. The check rejects `#fff`, `#RRGGBBAA`,
`rgb()` and `hsl()` alike. If a token is missing, add it to
`packages/tailwind-config/theme.css` and to the preset; never reach for a
literal.

**Style with `cn()`,** which merges class names so a caller's `className` can
override a default rather than fighting it.

**Variants use `class-variance-authority`.** A component with more than two
visual states gets a `cva` definition, not a chain of ternaries.

**`asChild` goes through our own `Slot`.** `@rn-primitives/slot` publishes raw
JSX inside its built output; Metro tolerates it, bundlers for web do not, and it
makes the web app unbuildable. `lib/slot.tsx` is the replacement and is unit
tested directly — it composes function-valued `style` props and runs React 19
ref cleanups, both of which a naive merge gets silently wrong.

**Never add a test runner or a `*.test.ts` file.** `pnpm check:ui` holds this
package instead: the boundary against the client and the store, the
no-literal-colour rule, and — by building both apps — that every component still
compiles and its classes reach the stylesheet. Keep components simple enough that
a build is meaningful proof.

## Adding a component

```bash
# Prefer the registry — it generates a component already wired to the tokens.
cd packages/ui && pnpm exec @react-native-reusables/cli@latest add <name>
```

Then: move it under `src/components/ui/`, replace any literal colour with a
token class, re-point a `@rn-primitives/slot` import at `../../lib/slot`, and
export it from `src/index.ts`.

## Before pushing

```bash
pnpm --filter=@repo/ui lint
pnpm --filter=@repo/ui typecheck
pnpm check:ui            # boundaries, tokens, and both apps' builds
```

A component is only proven to render by `next build` and `expo export`, which
`pnpm check:ui` runs. `asChild` is exercised by neither, so treat `lib/slot.tsx`
as the one file here where a change deserves real scepticism.

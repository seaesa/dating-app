# AGENTS.md — packages/ui

React Native components shared by both apps: Expo renders them natively, Next
through react-native-web. Based on React Native Reusables (copied in, not a
dependency). Workspace rules: [root AGENTS.md](../../AGENTS.md).

## Structure

```
src/
  index.ts             public exports — every component is exported here
  components/ui/       primitives: button, input, text, card, badge, avatar, …
  components/          composed: profile-card, otp-input
  lib/
    utils.ts           cn() — clsx + tailwind-merge
    slot.tsx           our Slot for asChild
    theme.ts           NAV_THEME, useColorScheme
```

## Rules

- **Props only.** Never import `@repo/api-contract` or `@repo/store`. A
  component takes plain data (`nickname`, `avatarUrl`), not an API object or a
  hook, so it renders from a fixture on both platforms.
- **Both platforms.** No `document`, `window` or DOM events. Web-only classes go
  through `Platform.select({ web: "..." })`; a real split uses
  `name.native.tsx` / `name.web.tsx` with an identical API.
- **Tokens only.** `bg-primary`, `text-muted-foreground`, `border-border`. Never
  a literal colour; a missing token goes in `packages/tailwind-config/theme.css`.
- **`className` last through `cn()`**, so callers can override defaults:
  `className={cn(buttonVariants({ variant, size }), className)}`.
- **Variants with `cva`** once a component has more than two visual states.
- **Text inside a styled container** reads `TextClassContext` — set it on the
  container (see `badge.tsx`) instead of passing text classes down.
- **`asChild` uses `../../lib/slot`**, never `@rn-primitives/slot` (it ships raw
  JSX and breaks the web build).
- **Copy is Vietnamese** when a component owns text; otherwise take it as a prop.

## Component shape

```tsx
type BadgeProps = React.ComponentProps<typeof View> &
  React.RefAttributes<View> & { asChild?: boolean } & VariantProps<typeof badgeVariants>;

function Badge({ className, variant, asChild, ...props }: BadgeProps) {
  const Component = asChild ? Slot : View;
  return <Component className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { Badge, badgeVariants };
```

Named exports only; the file is named after the component (`profile-card.tsx`
→ `ProfileCard`).

## Adding a component

1. `cd packages/ui && pnpm exec @react-native-reusables/cli@latest add <name>`
2. Move it to `src/components/ui/`; replace literal colours with tokens; point
   any `@rn-primitives/slot` import at `../../lib/slot`.
3. Export it from `src/index.ts`.
4. Verify: `pnpm --filter=@repo/ui typecheck`, then `pnpm --filter=web build`
   and `pnpm exec expo export` in `apps/mobile` — a component is only proven
   when both apps build.

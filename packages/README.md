# packages

Shared code. Every package ships TypeScript from `src/` — no build step, no
`dist` — because Tailwind scans component source for class names and Metro
resolves source directly.

| Package             | What                                                                | Depends on |
| ------------------- | ------------------------------------------------------------------- | ---------- |
| `api-contract`      | Generated client: types, Zod schemas, axios SDK, query options      | `core`     |
| `ui`                | React Native components for both apps · [AGENTS.md](./ui/AGENTS.md) | `core`     |
| `tailwind-config`   | Design tokens and the shared Tailwind preset                        | —          |
| `core`              | Pure TypeScript helpers. No React, no React Native                  | —          |
| `store`             | Zustand auth state behind a platform storage adapter                | —          |
| `i18n`              | i18next configuration. Configured, not yet applied                  | —          |
| `eslint-config`     | Shared lint rules                                                   | —          |
| `typescript-config` | Shared tsconfig bases, including the NativeWind JSX runtime         | —          |

## Rules

- A package never imports from an app.
- `core` imports neither `react` nor `react-native`, so it runs under plain
  Node.
- `ui` imports neither `api-contract` nor `store`. Components take data through
  props.
- `api-contract/src/generated/` is machine output. Never edit it; run
  `pnpm contract`.

`pnpm check:ui` enforces the boundaries.

## Adding a package

```bash
mkdir -p packages/<name>/src
```

`package.json` needs `"main": "./src/index.ts"` and
`"exports": { ".": "./src/index.ts", "./*": "./src/*" }`. Add the name to
`transpilePackages` in `apps/web/next.config.js`, or Next will not compile it.

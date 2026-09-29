# AGENTS.md

Rules for working in this repository. Read the file for the area you are
changing — this one covers what applies everywhere.

## Where the rules live

| Changing                                | Read                                                    |
| --------------------------------------- | ------------------------------------------------------- |
| An endpoint, a document, business logic | [apps/api/AGENTS.md](./apps/api/AGENTS.md)              |
| A web page or layout                    | [apps/web/AGENTS.md](./apps/web/AGENTS.md)              |
| A mobile screen or native config        | [apps/mobile/AGENTS.md](./apps/mobile/AGENTS.md)        |
| A shared component                      | [packages/ui/AGENTS.md](./packages/ui/AGENTS.md)        |
| Colour, spacing, typography             | `packages/tailwind-config/theme.css` — and nowhere else |
| The API client                          | Nothing by hand. Run `pnpm contract`                    |

## The one rule that outranks the rest

A user's `PrivateIdentity` — real name, real photos, socials, precise location —
must never reach anyone but that user, until a mutual reveal is recorded.

Everything else in this repository is a preference. This is the product.

- One function projects a user: `project_user()` in
  `apps/api/src/app/modules/users/visibility.py`. No route serializes a `User`.
- `tests/test_visibility.py` compares response key sets against the private
  field names, so adding a field to `PrivateIdentity` and forgetting to hide it
  fails the test rather than shipping.
- Private media is presigned inside the same function, so it passes the same
  gate rather than a second one that could drift.
- On the clients, the query cache is cleared at every session boundary.
  `getMe`'s cache key carries no user identity, so without that a second user on
  the same device is served the first one's cached profile — real name included.
  `onSessionChange` in `@repo/store` is where that is wired.

If a change makes any of that harder to hold, the change is wrong.

## Package dependencies flow one way

```
apps/*  ──►  @repo/ui  ──►  @repo/core
        ──►  @repo/api-contract  ──►  @repo/core
        ──►  @repo/store  ──►  @repo/core
        ──►  @repo/i18n
```

- A package never imports from an app.
- `@repo/core` imports neither `react` nor `react-native`. It runs under plain
  Node, which is what keeps it cheap to reason about.
- `@repo/ui` never imports `@repo/api-contract` or `@repo/store`. Components
  take data through props, so they render from a fixture.
- Route files hold no business logic. They compose a `@repo/ui` screen with an
  `@repo/api-contract` hook. Logic worth reusing belongs in a package.

`pnpm check:ui` enforces the last two.

## Internal packages ship source, not builds

Every `packages/*` exports TypeScript from `src/`. There is no `build` script
and no `dist`.

Two reasons: Tailwind must scan component source to find class names, and Metro
resolves source directly instead of waiting on a build. Adding a build step to a
package breaks both.

A new package therefore needs `"main": "./src/index.ts"` and
`"exports": { ".": "./src/index.ts", "./*": "./src/*" }`, plus an entry in
`apps/web/next.config.js` under `transpilePackages`.

## Changing an endpoint

```
1. Edit apps/api/src/app/modules/<domain>/
2. pnpm contract          # re-export the schema, regenerate the client
3. Commit packages/api-contract/ alongside the API change
```

Skipping step 3 makes CI's `contract` job fail. Never hand-edit
`packages/api-contract/src/generated/` — the next `pnpm contract` overwrites it.

## Conventions

**Files.** `kebab-case.tsx` in TypeScript, `snake_case.py` in Python. A React
component's file is named after the component: `profile-card.tsx` exports
`ProfileCard`.

**Commits.** Conventional Commits, enforced by commitlint. Scope is the package
or app: `feat(api):`, `fix(mobile):`, `refactor(ui):`. Subject is lower case,
no trailing period — proper nouns are allowed, so `fix(web): keep Turbopack out
of the build` passes. Breaking changes use `!` and a `BREAKING CHANGE:` footer.

**Branches.** `feat/<short-name>`, `fix/<short-name>`.

**Tests.** Do not write JavaScript tests and do not add a test runner — testing
is out of scope on the TypeScript side. What protects it instead are the gates in
`scripts/`, run by `pnpm check:*`. To protect something new, add an assertion to
a gate, never a test file.

The API keeps a pytest suite covering the visibility projection, authentication,
media access control and profile updates. Write the failing test first there, and
prefer a real dependency over a mock.

When you add a gate, plant a violation and watch it fail before you trust it.

## Before pushing

```bash
pnpm check              # every gate below except docker, in sequence
pnpm check:docker       # images build, start and answer — needs a Docker daemon
```

Hooks run a subset automatically: `pre-commit` formats and lints staged files,
`commit-msg` validates the message, `pre-push` typechecks. Do not bypass them
with `--no-verify`; if a hook is wrong, fix the hook.

## Performance

**Database.** Every query needs an index — add it to the document's
`Settings.indexes` in the same change as the query. Paginate with cursors, never
`skip`/`limit`: `skip` re-reads what it skips and returns duplicates when
documents shift. Fetch a batch in one `$in` query rather than looping
(`MediaService.urls_for` is the pattern).

**Lists.** Use `FlashList` over `FlatList` on mobile for anything unbounded.
Give every list item a stable `key`; an index key re-renders the whole list on
insert.

**Images.** `expo-image` on mobile, `next/image` on web. Never a raw `Image` for
remote content — neither caches, and a dating app is mostly photographs.

**Queries.** `gcTime` — not just `staleTime` — stays well under the presigned
media lifetime. Cached data renders on mount whatever its staleness, so `gcTime`
is what bounds the age of a URL on screen. Both come from `createQueryClient`.

**Bundles.** Before adding a dependency, check whether `@repo/core` already
covers it. Each app's bundle is built separately, so a package added for one
screen costs every screen.

<!-- BEGIN:turborepo-agent-rules -->

# This is NOT the Turborepo you know

Turborepo configuration, task behavior, and CLI commands can vary between installed versions and may differ from your training data. Resolve the `turbo` package from this file's directory or relevant workspace; in monorepos, it may not be visible from the repository root. For example, run `node -p "require.resolve('turbo/package.json')"` from a workspace that depends on `turbo`.

Read `docs/README.md` inside that installed package first, then read the relevant pages from its `docs/` directory before changing Turborepo configuration or commands. Heed deprecation notices. These bundled docs match the installed package version and are available without network access.

This block is written and re-added by `turbo` before repository-scoped commands when an AI agent is detected. In the Turborepo source repository, its template is defined in `crates/turborepo-cli/src/cli/agent_guidance.rs`. Removing the managed block while updates are enabled means a later qualifying invocation will add it again. Set `"agentGuidance": false` in the root `turbo.json` or `turbo.jsonc` to opt out; this does not remove an existing block. Keep the block committed with your work to avoid an uncommitted change on the next agent invocation.
<!-- END:turborepo-agent-rules -->

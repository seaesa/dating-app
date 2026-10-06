# AGENTS.md

Terdin Date — a dating app where real identities stay hidden until both people
choose to reveal them. pnpm + Turborepo monorepo: FastAPI API, Expo mobile (the
app end users use), Next.js web (the admin dashboard), sharing React Native
components.

Before changing code under a directory, read the nearest `AGENTS.md`:

| Changing                         | Read                                             |
| -------------------------------- | ------------------------------------------------ |
| `apps/api/**` — endpoints, logic | [apps/api/AGENTS.md](./apps/api/AGENTS.md)       |
| `apps/web/**` — admin dashboard  | [apps/web/AGENTS.md](./apps/web/AGENTS.md)       |
| `apps/mobile/**` — end-user app  | [apps/mobile/AGENTS.md](./apps/mobile/AGENTS.md) |
| `packages/ui/**` — components    | [packages/ui/AGENTS.md](./packages/ui/AGENTS.md) |

## Rule zero: the private identity

A user's `PrivateIdentity` (real name, real photos, socials, precise location)
and `phone` reach nobody but that user until a mutual reveal is recorded. This
outranks every other rule; a change that makes it harder to hold is wrong.

- API: every response containing a user goes through `project_user()` in
  `apps/api/src/app/modules/users/visibility.py`. Never serialize a `User`.
- Clients: only the owner's own profile screen reads `identity`. Public views
  render `profile` only.
- Clients: the TanStack Query cache is cleared on every sign-in/sign-out
  (`onSessionChange` in `@repo/store`). Keep it that way — `meQuery` has no user
  in its cache key.

## Stack

| Layer   | Choice                                                            |
| ------- | ----------------------------------------------------------------- |
| API     | Python 3.13, FastAPI, Beanie (MongoDB), Redis, S3, uv, ruff, mypy |
| Web     | Next.js 16 App Router, react-native-web, NativeWind 4, webpack    |
| Mobile  | Expo SDK 57, React Native 0.86, expo-router, NativeWind 4         |
| Shared  | TypeScript 6, React 19, TanStack Query 5, Zustand, Zod 4, Axios   |
| Tooling | pnpm 12 workspaces, Turborepo, ESLint 9, Prettier, Husky          |

## Packages and dependency direction

```
apps/*  ──►  @repo/ui            components, props only
        ──►  @repo/api-contract  generated types + one axios function per endpoint
        ──►  @repo/store         Zustand session store + platform storage
        ──►  @repo/core          pure TS helpers (phone, age, env)
@repo/tailwind-config            design tokens — the only place colours live
```

- A package never imports from an app.
- `@repo/core` imports neither `react` nor `react-native`.
- `@repo/ui` never imports `@repo/api-contract` or `@repo/store`.
- pnpm is isolated: a package can only import what its own `package.json`
  declares. Add the dependency to that package, not to the root.
- Packages ship TypeScript source, no build step. A new package needs
  `"main": "./src/index.ts"`, `"exports": { ".": "./src/index.ts", "./*": "./src/*" }`
  and an entry in `transpilePackages` in `apps/web/next.config.js`.

## Commands

```bash
pnpm install
pnpm services:up              # MongoDB (replica set), Redis, S3 in Docker
pnpm dev                      # all apps; or dev:api · dev:web · dev:mobile
pnpm contract                 # after any API schema change: regenerate the types
pnpm lint && pnpm typecheck   # everything, through turbo
pnpm format                   # prettier
pnpm --filter=<pkg> <script>  # one package — never `npm run x --filter`
```

## Workflows

**Changing an endpoint**

1. Edit `apps/api/src/app/modules/<domain>/`.
2. Run `pnpm contract` to regenerate `src/generated/types.gen.ts`.
3. Add or update the function in `packages/api-contract/src/api.ts`, typed with
   the generated request/response types:
   ```ts
   export const getUser = (userId: string) =>
     http.get<UserRead>(`/v1/users/${encodeURIComponent(userId)}`).then((r) => r.data);
   ```
   A query read by more than one screen also gets a `...Query()` there.
4. Commit `packages/api-contract/` in the same commit — CI fails on drift.

**Adding a screen**: `@repo/ui` component (data via props) + `useQuery(meQuery())`
or `useMutation({ mutationFn: updateMyProfile })` from `@repo/api-contract`,
composed in the route file. Logic worth reusing
goes into a package, not the route.

## Conventions

- Files: `kebab-case.tsx` (component `ProfileCard` → `profile-card.tsx`),
  `snake_case.py`.
- UI copy is Vietnamese. Validation messages live in
  `packages/api-contract/src/forms.ts`.
- Styling: NativeWind token classes (`bg-primary`, `text-foreground`). Never a
  literal colour (`#fff`, `rgb()`, `hsl()`); add a token to
  `packages/tailwind-config/theme.css` instead.
- Requests: never `fetch`/`axios` in an app; call the functions in
  `@repo/api-contract`. Errors are `ApiError` (axios error with a `Problem` body).
- Never edit `packages/api-contract/src/generated/` — `pnpm contract` overwrites it.
- Secrets: nothing secret behind `NEXT_PUBLIC_` or `EXPO_PUBLIC_`; both are
  inlined into client bundles.

## Performance

- MongoDB: every new query gets an index in the document's `Settings.indexes`,
  in the same change. Paginate with cursors (`BaseRepository.list_page`), never
  `skip`. Batch lookups with one `$in`, not a loop (`MediaService.urls_for`).
- Query cache: keep `gcTime` below the presigned-URL lifetime; both come from
  `createQueryClient` in `@repo/api-contract`. Do not override per query.
- Lists: `FlashList` for unbounded lists on mobile; stable `key`s, never the index.
- Images: `expo-image` on mobile, `next/image` on web for remote photos.
- Bundle: check `@repo/core` before adding a dependency; every dependency ships
  to every screen.

## Git

- Conventional Commits, scope = app or package: `feat(api):`, `fix(mobile):`,
  `refactor(ui):`. Lower-case subject, no trailing period.
- Branches: `feat/<name>`, `fix/<name>`.
- Hooks: pre-commit lints/formats staged files, pre-push typechecks. Never
  `--no-verify`; fix the cause.

## How to work

Adapted from
[andrej-karpathy-skills](https://github.com/multica-ai/andrej-karpathy-skills/blob/main/CLAUDE.md).
These bias toward caution over speed; for trivial tasks, use judgment.

**1. Think before coding.** Don't assume, don't hide confusion, surface tradeoffs.

- State your assumptions explicitly. If uncertain, ask.
- If multiple interpretations exist, present them — don't pick silently.
- If a simpler approach exists, say so. Push back when warranted.
- If something is unclear, stop, name what is confusing, and ask.

**2. Simplicity first.** Minimum code that solves the problem, nothing speculative.

- No features beyond what was asked.
- No abstractions for single-use code.
- No flexibility or configurability that wasn't requested.
- No error handling for impossible scenarios.
- If you write 200 lines and it could be 50, rewrite it.

**3. Surgical changes.** Touch only what you must; clean up only your own mess.

- Don't "improve" adjacent code, comments or formatting.
- Don't refactor what isn't broken. Match the existing style.
- Unrelated dead code: mention it, don't delete it.
- Remove the imports, variables and functions that _your_ change made unused.
- Every changed line should trace directly to the request.

**4. Goal-driven execution.** Define success criteria, loop until verified.
Verify by running things:

- "Add an endpoint" → `pnpm contract` produces the types, and a `curl` against
  `pnpm dev:api` returns the expected shape.
- "Fix the bug" → reproduce it first (request, screen, log line), fix it, then
  show the reproduction no longer fails.
- "Refactor X" → `pnpm lint && pnpm typecheck` and the affected app's build
  (`pnpm --filter=web build`, `expo export`) pass before and after.

For multi-step tasks, state a brief plan first:

```
1. [Step] → verify: [check]
2. [Step] → verify: [check]
```

# This is NOT the Turborepo you know

Turborepo configuration, task behavior, and CLI commands can vary between installed versions and may differ from your training data. Resolve the `turbo` package from this file's directory or relevant workspace; in monorepos, it may not be visible from the repository root. For example, run `node -p "require.resolve('turbo/package.json')"` from a workspace that depends on `turbo`.

Read `docs/README.md` inside that installed package first, then read the relevant pages from its `docs/` directory before changing Turborepo configuration or commands. Heed deprecation notices. These bundled docs match the installed package version and are available without network access.

This block is written and re-added by `turbo` before repository-scoped commands when an AI agent is detected. In the Turborepo source repository, its template is defined in `crates/turborepo-cli/src/cli/agent_guidance.rs`. Removing the managed block while updates are enabled means a later qualifying invocation will add it again. Set `"agentGuidance": false` in the root `turbo.json` or `turbo.jsonc` to opt out; this does not remove an existing block. Keep the block committed with your work to avoid an uncommitted change on the next agent invocation.
<!-- END:turborepo-agent-rules -->

<!-- code-review-graph MCP tools -->

## MCP Tools: code-review-graph

**This project has a knowledge graph. Start with the code-review-graph
MCP tools to narrow scope, then read the source.** The graph is cheaper than scanning files and
gives you structural context (callers, dependents, test coverage) that file search cannot.

### When to use graph tools FIRST

- **Exploring code**: `semantic_search_nodes_tool` or `query_graph_tool` instead of Grep
- **Understanding impact**: `get_impact_radius_tool` instead of manually tracing imports
- **Code review**: `detect_changes_tool` + `get_review_context_tool` instead of reading entire files
- **Finding relationships**: `query_graph_tool` with callers_of/callees_of/imports_of/tests_for
- **Architecture questions**: `get_architecture_overview_tool` + `list_communities_tool`

### Verify in the source

- Narrow scope with the graph, then read the source. Do not change code from graph output alone.
- For any non-trivial change, read the implementation and the relevant tests before concluding.
- Verify the exact source when touching behavior, database logic, migrations, retries, fallbacks,
  recovery, or compatibility code.
- When the graph and the source disagree, the source wins. The graph may be stale or may not
  model that relationship.
- An empty graph result can mean "not indexed" or "not statically visible", not "does not exist".

### Key Tools

| Tool                             | Use when                                               |
| -------------------------------- | ------------------------------------------------------ |
| `detect_changes_tool`            | Reviewing code changes — gives risk-scored analysis    |
| `get_review_context_tool`        | Need source snippets for review — token-efficient      |
| `get_impact_radius_tool`         | Understanding blast radius of a change                 |
| `get_affected_flows_tool`        | Finding which execution paths are impacted             |
| `query_graph_tool`               | Tracing callers, callees, imports, tests, dependencies |
| `semantic_search_nodes_tool`     | Finding functions/classes by name or keyword           |
| `get_architecture_overview_tool` | Understanding high-level codebase structure            |
| `refactor_tool`                  | Planning renames, finding dead code                    |

### Workflow

1. The graph auto-updates on file changes (via hooks).
2. Use `detect_changes_tool` for code review.
3. Use `get_affected_flows_tool` to understand impact.
4. Use `query_graph_tool` pattern="tests_for" to check coverage.

<!-- /code-review-graph MCP tools -->

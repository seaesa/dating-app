# Contributing

## Setup

See [README.md](./README.md#quickstart).

## Workflow

1. Branch from `main`: `git checkout -b feat/<short-name>`
2. Write the code
3. `pnpm lint && pnpm typecheck`
4. Commit using Conventional Commits — the hook enforces it
5. Open a pull request

## Changing an endpoint

Run `pnpm contract` and commit `packages/api-contract/` with the API change.
CI fails otherwise.

## What gets reviewed

- Does it keep `PrivateIdentity` unreachable from a public request?
- Does it respect the package dependency direction in [AGENTS.md](./AGENTS.md)?
- Does any new query have an index?

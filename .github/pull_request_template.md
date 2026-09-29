## What changed

## Why

## How it was verified

<!-- Commands run and what they printed. "It works" without output is not verification. -->

## Checklist

- [ ] API logic changed → a test fails without this change
- [ ] `pnpm check` passes locally
- [ ] Endpoint changed → `pnpm contract` run and `packages/api-contract/` committed
- [ ] New query → index added to the document's `Settings.indexes`
- [ ] No `PrivateIdentity` field can reach a public response
- [ ] New gate → verified to fail on a planted violation

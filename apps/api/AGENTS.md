# AGENTS.md — apps/api

FastAPI on uv, MongoDB through Beanie, Redis for OTP and rate limiting, and
S3-compatible object storage for media.

Read [the root AGENTS.md](../../AGENTS.md) for workspace-wide rules.

## The invariant

`PrivateIdentity` — `real_name`, `photo_media_ids`, `socials`, `location` — and
`phone` must never reach anyone but the user themselves, until a mutual reveal is
recorded.

**Never serialize a `User` directly.** Every path out goes through
`project_user()` in `src/app/modules/users/visibility.py`. A route that builds a
response dict from a `User` is a defect, even if it looks correct today.

```python
# Wrong: nothing stops the private tier from leaking when the model grows.
return {"nickname": user.public.nickname, "id": str(user.id)}

# Right: one gate, and the leak test covers it.
scope = await resolve_scope(target, viewer)
return project_user(target, scope)
```

When identity exchange lands, change `resolve_scope()` and nothing else. It is
the extension point, marked in the source.

`tests/test_visibility.py` compares a response's recursive key set against the
private field names taken from the model, so adding a field to
`PrivateIdentity` and forgetting to hide it fails a test rather than shipping.
Two guards there are deliberately falsifiable — an earlier version of that test
derived both sides from the same source and could not fail.

This suite is the only one in the repository, and it is scoped on purpose:
visibility, auth, media access control and profile updates. Plumbing that was
once covered here — the error shape, schema aliasing, the repository helpers —
is now held by `pnpm check:api`, which re-derives the OpenAPI document and fails
on any drift. Add a test when you change the four areas above; do not rebuild
the coverage that was removed.

## Layout

```
src/app/
  main.py            create_app(settings) — a factory, never a module-level app
  asgi.py            app = create_app() — what uvicorn imports
  core/
    config.py        Settings; rejects development defaults in production
    db.py            Beanie init, document discovery, bounded connect
    deps.py          CurrentUser, OptionalUser, SettingsDep
    errors.py        AppError tree → RFC 9457 problem+json
    schemas.py       BaseSchema (camelCase out), CursorPage[T]
  modules/<domain>/
    router.py        HTTP only: no logic
    service.py       the logic, and the only place that writes
    models.py        Beanie documents, with Settings.indexes
    schemas.py       request and response shapes
```

`main.py` exposes a factory and no module-level instance, so a test can build an
app with its own settings. `asgi.py` exists because the CLI resolves the app by
inspecting the module's AST — a lazily constructed app is not found.

## Rules

**Routes hold no logic.** A route reads dependencies, calls a service, returns
the result. If a route has an `if` that is not input shaping, it belongs in the
service.

**Settings come from the request.** Use the `SettingsDep` dependency, which
reads `request.app.state.settings`. Never call `get_settings()` inside a
dependency: a test that builds an app with different settings would silently get
the process-wide ones instead, and every request would 401.

**Every route declares its errors.** Spread `ERROR_RESPONSES` into the route's
`responses`, so the OpenAPI document — and therefore the generated client —
knows a 401 and a 422 are possible.

**Every error is a problem document.** Raise an `AppError` subclass. Never raise
`HTTPException` directly; it produces `{"detail": ...}`, which is a second error
shape the clients would have to handle.

**Never accept an explicit null you cannot store.** `_apply()` in the user
service rejects a null for a field the model requires. Before it did, a
`PATCH {"nickname": null}` bricked the account.

**Presign per owner and per kind.** `_may_sign()` in the media service checks
both. A signature request must never be answerable for an id the caller does not
own, or for a kind whose lifetime differs.

**Every query needs an index**, added to the document's `Settings.indexes` in the
same change as the query. Cursor pagination only: `skip` re-reads what it skips
and returns duplicates when documents shift under it.

**camelCase leaves, snake_case stays.** `BaseSchema` aliases fields on the way
out. A path parameter cannot be aliased by the base class, so it takes
`Path(alias="userId")` explicitly — that is why `get_user` looks the way it does.

## Local development

```bash
pnpm services:up                 # MongoDB replica set, Redis, S3
pnpm dev:api                     # or: cd apps/api && uv run fastapi dev
```

OTP codes are printed to the log under `sms.console`, because
`SMS_PROVIDER=console` in development. Production refuses to start with that
value — see `_reject_dev_defaults_in_production`.

## Before pushing

```bash
cd apps/api
uv run ruff check . && uv run ruff format --check .
uv run mypy                      # strict, and it stays strict
uv run pytest
```

Or `pnpm check:api` from the root, which also checks the contract for drift.

The tests need `pnpm services:up` first. They run against real MongoDB, Redis
and S3 rather than mocks, because unique indexes, geospatial queries and
projections are what they exist to check — and a mock fakes exactly those.
Testcontainers is not used: MongoDB needs a replica set for transactions, and a
set initiated inside an ephemeral container advertises a member address nothing
outside it can reach.

## Adding an endpoint

```
1. schemas.py  — request and response shapes, on BaseSchema
2. service.py  — the logic, with a failing test first if it touches
                 visibility, auth, media access or profile updates
3. router.py   — wire it, with ERROR_RESPONSES
4. pnpm contract  (from the root) — regenerate the client
5. Commit packages/api-contract/ with this change
```

Step 4 is not optional. CI's `contract` job re-derives both and fails on any
diff, because a committed client that no longer describes the API ships code
that type-checks and fails at runtime.

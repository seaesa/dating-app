# AGENTS.md — apps/api

FastAPI on uv. MongoDB through Beanie (`pymongo.AsyncMongoClient`), Redis for
OTP and rate limits, S3-compatible storage for media. Workspace rules:
[root AGENTS.md](../../AGENTS.md).

## Structure

```
src/app/
  main.py              create_app(settings) — factory; no module-level app
  asgi.py              app = create_app() — what uvicorn imports
  api/v1.py            mounts every module router under /v1
  core/
    config.py          Settings (env vars); rejects dev defaults in production
    deps.py            CurrentUser, OptionalUser, SettingsDep
    errors.py          AppError subclasses → RFC 9457 problem+json
    schemas.py         BaseSchema (camelCase out), CursorPage[T]
    repository.py      BaseRepository[D]: get_or_404, update, list_page
    ratelimit.py       sliding_window(key, limit=, window=)
  modules/<domain>/    auth · users · media · catalog · verification
    router.py          HTTP only
    service.py         business logic; the only layer that writes
    repository.py      queries, extends BaseRepository
    models.py          Beanie documents + Settings.indexes
    schemas.py         request/response models on BaseSchema
```

## Rules

**Never serialize a `User`.** Resolve the scope, then project:

```python
scope = await resolve_scope(target, viewer)
return project_user(target, scope)  # users/visibility.py — the only gate
```

Never build a response dict from a `User`. To change who sees what, change
`resolve_scope()` only. A new private field goes in `PrivateIdentity` and is
hidden by `project_user()` automatically; a new public field goes in
`PublicProfile`.

**Routes hold no logic.** Read dependencies, call one service method, return.
Any `if` beyond input shaping belongs in the service.

```python
@router.patch("/me/profile", response_model=UserRead, operation_id="updateMyProfile")
async def update_my_profile(
    user: CurrentUser, patch: PublicProfileUpdate, settings: SettingsDep
) -> UserRead:
    return await UserService(settings=settings).update_profile(user, patch)
```

- Every route sets `operation_id` in camelCase — it names the generated types
  (`UpdateMyProfileData`, `UpdateMyProfileResponse`) and the client function.
- Settings: inject `SettingsDep`. Never call `get_settings()` inside a
  dependency or service.
- Errors: raise an `AppError` subclass (`NotFoundError`, `ConflictError`,
  `ForbiddenError`, …) or add one in the module's `exceptions.py`. Never
  `HTTPException` — it produces a second error shape.
- Schemas extend `BaseSchema`: snake_case in Python, camelCase on the wire.
  Path parameters need `Path(alias="userId")` explicitly.
- PATCH: apply only the fields sent (`model_dump(exclude_unset=True)`), and
  reject an explicit `null` for a required field.
- Media: presign only for the owner and the right kind (`MediaService._may_sign`).
  Batch URLs with `urls_for`, never per-item calls in a loop.
- Datetimes are timezone-aware UTC (`datetime.now(UTC)`); ruff `DTZ` enforces it.
- Rate-limit anything that sends an SMS or can be brute-forced, with
  `sliding_window`.
- New query → index in `models.py` `Settings.indexes` in the same change.
  List endpoints return `CursorPage[T]` via `list_page`; never `skip`.
- New setting → field on `Settings` + `apps/api/.env.example`; a secret also
  goes in `docker-compose.prod.yml` with `${VAR:?set VAR}`.
- mypy is `strict`. Do not add `# type: ignore` or loosen the config; type it.

- Face verification runs behind `FaceVerificationProvider` in a **separate
  worker**, never in the API process: `submit` pushes a job onto the Redis list
  `verify:jobs`, and `python -m app.cli verification-worker` scores it.
  DeepFace/TensorFlow are the optional `face` extra, so the API image does not
  install them. `VERIFICATION_ENABLED=false` (the default) switches the feature
  off: the API answers 503 and the worker refuses to start. Selfie frames are
  deleted right after scoring and never stored.

## Adding an endpoint

1. `schemas.py` — request and response models.
2. `service.py` — the logic; `repository.py` for any new query (+ index).
3. `router.py` — wire it with `operation_id`; a new module's router gets
   included in `api/v1.py`.
4. From the root: `pnpm contract`, add the call to `packages/api-contract/src/api.ts`,
   then commit `packages/api-contract/` with it.

## Commands

```bash
pnpm services:up                   # from the root; needs Docker
cp .env.example .env               # once
uv run fastapi dev src/app/asgi.py # or `pnpm dev:api` from the root
uv run ruff check --fix . && uv run ruff format .
uv run mypy
uv run --extra face python -m app.cli verification-worker   # needs VERIFICATION_ENABLED=true
```

Local OTP codes are not sent: `SMS_PROVIDER=console` logs them under
`sms.console`. Production refuses to start with `console` or the local S3 keys.

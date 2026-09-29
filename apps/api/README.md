# Terdin Date API

FastAPI service backing the Terdin Date apps: phone OTP authentication, a
two-tier user profile, and presigned media upload on S3-compatible storage.

See [AGENTS.md](./AGENTS.md) for architecture rules and the checklist for
adding an endpoint.

## Tech stack

| Concern                 | Choice                                                    |
| ----------------------- | --------------------------------------------------------- |
| Runtime                 | Python 3.13, managed by uv                                |
| Framework               | FastAPI 0.141                                             |
| Database                | MongoDB 8 (replica set `rs0`), Beanie 2 ODM               |
| Cache and rate limiting | Redis 8                                                   |
| Object storage          | S3-compatible — SeaweedFS locally, R2 or S3 in production |
| Auth                    | JWT access and refresh tokens, phone OTP                  |
| Lint and format         | Ruff                                                      |
| Types                   | mypy strict                                               |
| Tests                   | pytest against the real development stack                 |

## Setup

Requires [uv](https://docs.astral.sh/uv/) and Docker. Python itself is not
required — uv downloads 3.13.

```bash
cp .env.example .env
sed -i '' "s|^JWT_SECRET=.*|JWT_SECRET=$(openssl rand -hex 32)|" .env
uv sync
```

## Run locally

From the repository root:

```bash
pnpm services:up      # MongoDB, Redis, object storage
pnpm dev:api          # http://localhost:8000
```

Interactive docs: http://localhost:8000/docs

In development `SMS_PROVIDER=console`, so OTP codes are printed to the API's
stdout rather than sent. Look for the `sms.console` line. No SMS account needed.

## Commands

| Command                       | Does                                           |
| ----------------------------- | ---------------------------------------------- |
| `pnpm dev:api`                | Dev server with reload                         |
| `pnpm test`                   | The pytest suite (this is the only one)        |
| `pnpm --filter=api lint`      | Ruff                                           |
| `pnpm --filter=api typecheck` | mypy strict                                    |
| `pnpm openapi`                | Re-export `packages/api-contract/openapi.json` |
| `pnpm check:api`              | Every gate, including the OpenAPI drift check  |

This is the only test suite in the repository; the TypeScript side is covered by
the gate scripts instead. It is deliberately scoped to the logic where being
wrong is expensive — the visibility projection, authentication, media access
control and profile updates.

It runs against the compose stack using a separate `terdin_test` database, so
`pnpm services:up` must be running first.

## Deploy

The API ships as a container and runs behind a reverse proxy. See the
repository root README.

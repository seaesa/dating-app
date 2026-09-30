# syntax=docker/dockerfile:1

# ---- builder ---------------------------------------------------------------
FROM ghcr.io/astral-sh/uv:python3.13-bookworm-slim AS builder

ENV UV_COMPILE_BYTECODE=1 \
    UV_LINK_MODE=copy \
    UV_PYTHON_DOWNLOADS=never

WORKDIR /app

# Dependencies first, in their own layer: application code changes far more
# often than the lockfile, so this layer stays cached across most builds.
COPY apps/api/pyproject.toml apps/api/uv.lock ./
RUN --mount=type=cache,target=/root/.cache/uv \
    uv sync --frozen --no-install-project --no-dev

COPY apps/api/README.md ./README.md
COPY apps/api/src ./src
RUN --mount=type=cache,target=/root/.cache/uv \
    uv sync --frozen --no-dev

# ---- runtime ---------------------------------------------------------------
FROM python:3.13-slim-bookworm AS runtime

RUN groupadd --system --gid 1001 app \
    && useradd --system --uid 1001 --gid app --create-home app

# curl is for the healthcheck below; without it HEALTHCHECK silently fails.
RUN apt-get update \
    && apt-get install --no-install-recommends -y curl \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY --from=builder --chown=app:app /app/.venv /app/.venv
COPY --from=builder --chown=app:app /app/src /app/src

ENV PATH="/app/.venv/bin:$PATH" \
    PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    PYTHONPATH=/app/src

USER app
EXPOSE 8000

HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
    CMD curl -fsS http://localhost:8000/health || exit 1

# app.asgi holds the module-level instance servers look for; app.main holds only
# the factory, so importing it reads no settings.
#
# Workers, not --reload. Four is a starting point; tune against CPU count.
# RUN THIS UNDER A RESTART POLICY THAT IGNORES THE EXIT CODE.
#
# uvicorn's multiprocess parent exits 0 when a worker fails to start, so a
# container that came up before its database looks like a clean shutdown.
# `restart: unless-stopped` (compose), `Restart=always` (systemd) and the default
# `restartPolicy: Always` (Kubernetes) all recover; `on-failure`/`OnFailure` give
# a permanently dead API.
CMD ["uvicorn", "app.asgi:app", "--host", "0.0.0.0", "--port", "8000", "--workers", "4"]

# syntax=docker/dockerfile:1

FROM node:24-slim AS base
ENV PNPM_HOME=/pnpm PATH=/pnpm:$PATH
RUN corepack enable

# ---- dependencies ----------------------------------------------------------
FROM base AS deps
WORKDIR /repo

# Manifests only, so this layer survives a source-only change. Every workspace
# package is listed: pnpm resolves the whole graph before it can filter, so a
# missing manifest fails the install rather than being quietly skipped.
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY apps/web/package.json ./apps/web/
COPY packages/api-contract/package.json ./packages/api-contract/
COPY packages/core/package.json ./packages/core/
COPY packages/eslint-config/package.json ./packages/eslint-config/
COPY packages/i18n/package.json ./packages/i18n/
COPY packages/store/package.json ./packages/store/
COPY packages/tailwind-config/package.json ./packages/tailwind-config/
COPY packages/typescript-config/package.json ./packages/typescript-config/
COPY packages/ui/package.json ./packages/ui/

RUN --mount=type=cache,id=pnpm,target=/pnpm/store \
    pnpm install --frozen-lockfile --filter=web...

# ---- build -----------------------------------------------------------------
FROM base AS builder
WORKDIR /repo
COPY --from=deps /repo ./
COPY turbo.json ./
COPY apps/web ./apps/web
COPY packages ./packages

# Public variables are inlined at build time, so the API URL must be known here
# rather than at runtime — a compose `environment:` entry cannot correct it.
#
# Origin-relative by default, because docker/Caddyfile serves the API under
# /api on the same origin as the web app. An absolute default would bake
# http://localhost:8000 into every published image and break the documented
# deploy path for everyone who did not know to set a build argument.
ARG NEXT_PUBLIC_API_URL=/api
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL
ARG NEXT_PUBLIC_APP_NAME=
ENV NEXT_PUBLIC_APP_NAME=$NEXT_PUBLIC_APP_NAME
ENV NEXT_TELEMETRY_DISABLED=1

# The package script, not `next build`: it passes --webpack, and Turbopack
# panics on the react-native-web dependency chain.
RUN pnpm --filter=web run build

# ---- runtime ---------------------------------------------------------------
FROM node:24-slim AS runtime
WORKDIR /app

RUN groupadd --system --gid 1001 nodejs \
    && useradd --system --uid 1001 --gid nodejs nextjs

ENV NODE_ENV=production NEXT_TELEMETRY_DISABLED=1 PORT=3000 HOSTNAME=0.0.0.0

COPY --from=builder --chown=nextjs:nodejs /repo/apps/web/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /repo/apps/web/.next/static ./apps/web/.next/static
COPY --from=builder --chown=nextjs:nodejs /repo/apps/web/public ./apps/web/public

USER nextjs
EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
    CMD node -e "fetch('http://localhost:3000/').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

CMD ["node", "apps/web/server.js"]

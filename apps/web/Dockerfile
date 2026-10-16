# syntax=docker/dockerfile:1
# Web de Acopio: Bun construye el build de Vite y nginx lo sirve, con /api hacia la API.
# Contexto de construcción: la raíz del monorepo.

FROM oven/bun:1.3 AS construccion
WORKDIR /app
COPY package.json bun.lock tsconfig.base.json ./
COPY apps/api/package.json apps/api/
COPY packages/shared/package.json packages/shared/
COPY packages/ui-tokens/package.json packages/ui-tokens/
COPY apps/web/package.json apps/web/
RUN bun install --frozen-lockfile
COPY packages/shared packages/shared
COPY packages/ui-tokens packages/ui-tokens
COPY apps/web apps/web
# Vacío: la web llama a la API en su mismo origen (ADR-0014)
ARG VITE_API_URL=
ENV VITE_API_URL=$VITE_API_URL
WORKDIR /app/apps/web
RUN bun run build

FROM nginx:1.28-alpine AS ejecucion
COPY apps/web/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=construccion /app/apps/web/dist /usr/share/nginx/html
EXPOSE 80
HEALTHCHECK --interval=15s --timeout=3s --retries=5 \
  CMD wget -q -O /dev/null http://127.0.0.1/ || exit 1

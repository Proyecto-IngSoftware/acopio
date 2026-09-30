# syntax=docker/dockerfile:1
# API de Acopio (D-01): Bun instala y construye; Node 22 ejecuta.
# Las dos etapas son Debian trixie (la base de oven/bun:1.3): el motor de migraciones de Prisma que se
# descarga al construir tiene que servir al ejecutar.
# Contexto de construcción: la raíz del monorepo.

FROM oven/bun:1.3 AS construccion
WORKDIR /app
COPY package.json bun.lock tsconfig.base.json ./
COPY apps/api/package.json apps/api/
COPY packages/shared/package.json packages/shared/
COPY packages/ui-tokens/package.json packages/ui-tokens/
COPY apps/web/package.json apps/web/
RUN bun install --frozen-lockfile
COPY prisma prisma
COPY packages/shared packages/shared
COPY apps/api apps/api
WORKDIR /app/apps/api
RUN bun run db:generar && bun run build

FROM node:22-trixie-slim AS ejecucion
ENV NODE_ENV=production
# Prisma detecta la plataforma por OpenSSL; la imagen slim no lo trae
RUN apt-get update && apt-get install -y --no-install-recommends openssl \
  && rm -rf /var/lib/apt/lists/*
WORKDIR /app
# node_modules completo: el CLI de Prisma hace falta para `migrate deploy` y el seed
COPY --from=construccion /app/node_modules node_modules
COPY --from=construccion /app/package.json package.json
COPY --from=construccion /app/prisma prisma
COPY --from=construccion /app/packages/shared packages/shared
COPY --from=construccion /app/apps/api/package.json /app/apps/api/prisma.config.ts apps/api/
COPY --from=construccion /app/apps/api/node_modules apps/api/node_modules
COPY --from=construccion /app/apps/api/dist apps/api/dist
WORKDIR /app/apps/api
# Carpeta de las llaves del adaptador local; el volumen hereda el dueño
RUN mkdir /llaves && chown node:node /llaves
USER node
EXPOSE 3000
HEALTHCHECK --interval=15s --timeout=3s --retries=5 \
  CMD node -e "fetch('http://127.0.0.1:3000/api/salud').then(r=>process.exit(r.ok?0:1),()=>process.exit(1))"
CMD ["node", "dist/main.js"]

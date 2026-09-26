# Built from the repo root: docker compose build (see docker-compose.yml)
FROM node:22-bookworm-slim AS build
WORKDIR /repo
COPY package.json package-lock.json ./
COPY apps/server/package.json apps/server/
COPY packages/shared/package.json packages/shared/
RUN npm ci --workspace @maktabatna/server --include-workspace-root=false
COPY apps/server apps/server
RUN cd apps/server && npx prisma generate && npx nest build

FROM node:22-bookworm-slim
WORKDIR /repo
ENV NODE_ENV=production
COPY --from=build /repo/node_modules node_modules
COPY --from=build /repo/apps/server apps/server
WORKDIR /repo/apps/server
EXPOSE 3000
# Apply pending migrations, then start the API.
CMD ["sh", "-c", "npx prisma migrate deploy && node dist/main.js"]

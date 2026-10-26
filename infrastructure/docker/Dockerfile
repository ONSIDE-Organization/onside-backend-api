FROM node:20-alpine AS base
WORKDIR /app
COPY package.json pnpm-workspace.yaml ./
COPY apps/api/package.json apps/api/package.json
RUN corepack enable
RUN pnpm install --frozen-lockfile=false
COPY . .
RUN pnpm --filter @onside/api build
EXPOSE 3000
CMD ["pnpm", "--filter", "@onside/api", "start:prod"]

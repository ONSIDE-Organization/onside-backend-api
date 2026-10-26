# Onside Backend Monorepo

NestJS backend scaffold following the agreed Onside domain-driven structure.

## Structure
- `apps/api`: NestJS HTTP API
- `packages/shared`: shared TypeScript contracts and enums
- `packages/eslint-config`: shared lint configuration
- `infrastructure`: Docker, Railway, and Supabase helpers
- `docs`: ADRs, API documentation, and runbooks

## Prerequisites
- Node.js 20+
- pnpm 9+
- Docker (for local PostgreSQL and Redis)

## Getting started
```bash
pnpm install
pnpm --filter @onside/api start:dev
```

Copy `apps/api/.env.example` to `apps/api/.env` and configure the values before connecting infrastructure.
This is a bootstrap scaffold: domain use-cases, provider credentials, database schema, and deployment secrets still need implementation.

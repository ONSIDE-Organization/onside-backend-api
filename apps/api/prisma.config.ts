import { defineConfig, env } from 'prisma/config';

export default defineConfig({
  schema: 'src/infra/prisma/schema.prisma',
  migrations: {
    path: 'src/infra/prisma/migrations',
  },
  datasource: {
    url: env('DATABASE_URL'),
  },
});

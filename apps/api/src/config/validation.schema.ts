// import { z } from 'zod';

// export const envSchema = z.object({
//   NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
//   PORT: z.coerce.number().int().positive().default(3000),
//   DATABASE_URL: z.string().url().optional(),
//   REDIS_URL: z.string().url().optional(),
// });

// export type Environment = z.infer<typeof envSchema>;


///
import { z } from 'zod';

export const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(3000),

  DATABASE_URL: z.string().url(),                       // Supabase pooled URL

  FIREBASE_PROJECT_ID: z.string().min(1),
  FIREBASE_CLIENT_EMAIL: z.string().email(),
  FIREBASE_PRIVATE_KEY: z.string().min(1),              // \n-escaped in env

  JWT_SECRET: z.string().min(32),
  JWT_EXPIRES_IN: z.string().default('7d'),

  CORS_ALLOWED_ORIGINS: z.string().default(''),

  // SENTRY_DSN: z.string().url().optional(),
  // SENTRY_RELEASE: z.string().optional(),

  // Phase 2+ placeholders — validated but optional so M1 boots without them
  //SPORTS_API_KEY: z.string().optional(),
  REDIS_URL: z.string().url().optional(),
});

export type Env = z.infer<typeof envSchema>;

export function validateEnv(config: Record<string, unknown>): Env {
  const parsed = envSchema.safeParse(config);
  if (!parsed.success) {
    // eslint-disable-next-line no-console
    console.error('❌ Invalid environment variables:\n', parsed.error.flatten().fieldErrors);
    throw new Error('Invalid environment configuration');
  }
  return parsed.data;
}
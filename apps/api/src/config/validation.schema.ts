
// import { z } from 'zod';

// export const envSchema = z.object({
//   NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
//   PORT: z.coerce.number().int().positive().default(3000),

//   DATABASE_URL: z.string().url(),                       // Supabase pooled URL

//   FIREBASE_PROJECT_ID: z.string().min(1),
//   FIREBASE_CLIENT_EMAIL: z.string().email(),
//   FIREBASE_PRIVATE_KEY: z.string().min(1),              // \n-escaped in env

//   JWT_SECRET: z.string().min(32),
//   JWT_EXPIRES_IN: z.string().default('7d'),

//   CORS_ALLOWED_ORIGINS: z.string().default(''),

//   SENTRY_DSN: z.string().url().optional(),
//   SENTRY_RELEASE: z.string().optional(),
//   SPORTS_API_KEY: z.string().optional(),

//   // Phase 2+ placeholders — validated but optional so M1 boots without them
//   //SPORTS_API_KEY: z.string().optional(),
//   REDIS_URL: z.string().url().optional(),
// });

// export type Env = z.infer<typeof envSchema>;

// export function validateEnv(config: Record<string, unknown>): Env {
//   const parsed = envSchema.safeParse(config);
//   if (!parsed.success) {
//     // eslint-disable-next-line no-console
//     console.error('❌ Invalid environment variables:\n', parsed.error.flatten().fieldErrors);
//     throw new Error('Invalid environment configuration');
//   }
//   return parsed.data;
// }
// src/config/validation.schema.ts
import { z } from 'zod';

/**
 * The single source of truth for required env vars.
 *
 * Design rules:
 *  - Every var the app reads MUST be here. A missing var in this schema
 *    is a boot-time crash waiting to happen at 3am.
 *  - Coerce numbers/booleans here so `configuration.ts` receives clean types.
 *  - Phase 2+ vars (Sports API, Redis) are `.optional()` so M1 boots without
 *    them; the modules that need them fail-fast at *their* module init.
 *  - Secrets use `.min(1)` not `.min(32)` for third-party keys we don't
 *    control the format of; our own secrets (JWT) get a length floor.
 */
export const envSchema = z.object({
  // ── Runtime ──────────────────────────────────────────────────────
  NODE_ENV: z
    .enum(['development', 'test', 'production'])
    .default('development'),
  PORT: z.coerce.number().int().positive().max(65535).default(3000),

  // ── Database (Supabase pooled URL) ───────────────────────────────
  DATABASE_URL: z
    .string()
    .url()
    .refine((v) => v.startsWith('postgres://') || v.startsWith('postgresql://'), {
      message: 'DATABASE_URL must be a postgres:// or postgresql:// URL',
    }),

  // ── Firebase Admin SDK ──────────────────────────────────────────
  FIREBASE_PROJECT_ID: z.string().min(1),
  FIREBASE_CLIENT_EMAIL: z.string().email(),
  FIREBASE_PRIVATE_KEY: z
    .string()
    .min(1)
    .refine((v) => v.includes('BEGIN PRIVATE KEY'), {
      message: 'FIREBASE_PRIVATE_KEY looks malformed (missing PEM header)',
    }),

  // ── JWT (our own, issued after Firebase verification) ──────────
  JWT_SECRET: z.string().min(32, 'JWT_SECRET must be ≥ 32 chars'),
  JWT_EXPIRES_IN: z
    .string()
    .regex(/^\d+[smhdwy]$/, 'JWT_EXPIRES_IN must look like "7d", "12h", "30m"')
    .default('7d'),

  // ── HTTP ────────────────────────────────────────────────────────
  CORS_ALLOWED_ORIGINS: z.string().default(''),

  // ── Observability ──────────────────────────────────────────────
  SENTRY_DSN: z.string().url().optional(),
  SENTRY_RELEASE: z.string().optional(),

  // ── Phase 2+ (validated when present, boot doesn't require them) ─
  SPORTS_API_KEY: z.string().optional(),
  REDIS_URL: z
    .string()
    .url()
    .refine((v) => v.startsWith('redis://') || v.startsWith('rediss://'), {
      message: 'REDIS_URL must be a redis:// or rediss:// URL',
    })
    .optional(),
});

export type Env = z.infer<typeof envSchema>;

/**
 * Called by Nest's ConfigModule with the raw process.env.
 * On failure we log a *grouped, field-by-field* report and throw so the
 * process exits — never start a server with a bad config.
 */
export function validateEnv(config: Record<string, unknown>): Env {
  const parsed = envSchema.safeParse(config);

  if (!parsed.success) {
    const issues = parsed.error.issues.map((i) => ({
      var: i.path.join('.'),
      problem: i.message,
      received:
        i.code === 'invalid_type'
          ? i.received
          : '<redacted>', // never echo secret values
    }));

    // eslint-disable-next-line no-console
    console.error(
      '\n❌ Invalid environment configuration — refusing to start.\n',
      issues.map((i) => `  • ${i.var}: ${i.problem} (received: ${i.received})`).join('\n'),
      '\n',
    );

    throw new Error(`Invalid environment configuration (${issues.length} issue(s))`);
  }

  // Production hardening: Sentry should be present in prod
  if (parsed.data.NODE_ENV === 'production' && !parsed.data.SENTRY_DSN) {
    // eslint-disable-next-line no-console
    console.warn('⚠️  SENTRY_DSN is unset in production — errors will not be reported.');
  }

  return parsed.data;
}
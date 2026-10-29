// export default () => ({
//   nodeEnv: process.env.NODE_ENV ?? 'development',
//   port: Number(process.env.PORT ?? 3000),
//   databaseUrl: process.env.DATABASE_URL,
//   redisUrl: process.env.REDIS_URL,
//   jwtSecret: process.env.JWT_SECRET,
// });
// src/config/configuration.ts
import type { Env } from './validation.schema';

export interface AppConfig {
  nodeEnv: Env['NODE_ENV'];
  port: number;
  corsAllowedOrigins: string[];
  jwt: {
    secret: string;
    expiresIn: string;
  };
  sentry: {
    dsn?: string;
    release?: string;
    tracesSampleRate: number;
  };
  firebase: {
    projectId: string;
    clientEmail: string;
    privateKey: string;
  };
  database: {
    url: string;
  };
  // Phase 2+ — optional in M1, presence-checked by the modules that need them
  sportsApi?: { key: string };
  redis?: { url: string };
}

/**
 * Receives the *validated* env object (Zod already ran). This function's
 * only job is to shape it into a namespaced tree that ConfigService
 * consumers can read with dot-paths:
 *
 *   config.get('jwt.secret')
 *   config.get('firebase.projectId')
 *   config.get('corsAllowedOrigins')  // string[]
 */
export default (): AppConfig => {
  const env = process.env as unknown as Env;

  const tracesSampleRate =
    env.NODE_ENV === 'production' ? 0.2 : 1.0;

  return {
    nodeEnv: env.NODE_ENV,
    port: env.PORT,
    corsAllowedOrigins: env.CORS_ALLOWED_ORIGINS
      ? env.CORS_ALLOWED_ORIGINS.split(',')
          .map((o) => o.trim())
          .filter(Boolean)
      : [],
    jwt: {
      secret: env.JWT_SECRET,
      expiresIn: env.JWT_EXPIRES_IN,
    },
    sentry: {
      dsn: env.SENTRY_DSN,
      release: env.SENTRY_RELEASE,
      tracesSampleRate,
    },
    firebase: {
      projectId: env.FIREBASE_PROJECT_ID,
      clientEmail: env.FIREBASE_CLIENT_EMAIL,
      // Railway stores "\n" literally; unescape once here so downstream
      // consumers never have to remember to.
      privateKey: env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
    },
    database: {
      url: env.DATABASE_URL,
    },
    sportsApi: env.SPORTS_API_KEY ? { key: env.SPORTS_API_KEY } : undefined,
    redis: env.REDIS_URL ? { url: env.REDIS_URL } : undefined,
  };
};
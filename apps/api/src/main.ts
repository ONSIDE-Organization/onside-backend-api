
import { NestFactory } from '@nestjs/core';
import { ValidationPipe, VersioningType, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestExpressApplication } from '@nestjs/platform-express';
import helmet from 'helmet';
import compression from 'compression';
import cookieParser from 'cookie-parser';
import { AppModule } from './app.module';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';
import { PrismaErrorFilter } from './common/filters/prisma-error.filter';
import { TransformResponseInterceptor } from './common/interceptors/transform-response.interceptor';
import { CorrelationIdMiddleware } from './common/middleware/correlation-id.middleware';
import { setupSwagger } from './config/swagger.config';
import * as Sentry from '@sentry/nestjs';

async function bootstrap() {
  // ── Sentry FIRST, before NestFactory ─────────────────────────────
  // Must init before any other import touches instrumentation targets.
  const sentryDsn = process.env.SENTRY_DSN;
  if (sentryDsn) {
    Sentry.init({
      dsn: sentryDsn,
      environment: process.env.NODE_ENV ?? 'development',
      release: process.env.SENTRY_RELEASE,          // set by CI (git SHA)
      tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.2 : 1.0,
      profileSessionSampleRate: 0.1,
      // Never leak PII into error reports
      beforeSend(event) {
        if (event.request?.headers) {
          delete event.request.headers['authorization'];
          delete event.request.headers['cookie'];
        }
        return event;
      },
    });
  }

  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    bufferLogs: false,          // buffer until logger attached
    rawBody: true,             // needed later for webhook signature verification
    abortOnError: false,
  });

  const config = app.get(ConfigService);
  const logger = new Logger('Bootstrap');

  // ── Trust proxy (Railway sits behind a proxy) ────────────────────
  // Without this, req.ip is the proxy IP → rate limiting & Sentry geo break.
  app.set('trust proxy', 1);

  // ── Security headers ─────────────────────────────────────────────
  app.use(
    helmet({
      contentSecurityPolicy: false,   // API only; CSP is a frontend concern
      crossOriginResourcePolicy: { policy: 'cross-origin' },
    }),
  );
  app.use(compression());
  app.use(cookieParser());

  // ── CORS — explicit allowlist, never '*' in prod ─────────────────
  const allowedOrigins = config
    .get<string>('CORS_ALLOWED_ORIGINS', '')
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean);
  app.enableCors({
    origin: allowedOrigins.length ? allowedOrigins : false,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Correlation-Id'],
    exposedHeaders: ['X-Correlation-Id'],
    maxAge: 86400,
  });

  // ── Correlation ID — every log/error carries it ──────────────────
  app.use(new CorrelationIdMiddleware().use.bind(new CorrelationIdMiddleware()));

  // ── Global validation — Zod is used at DTO level; this is the
  //    last-line class-validator defense for any misannotated DTO ───
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,               // strip unknown props
      forbidNonWhitelisted: true,    // 400 on unexpected props
      transform: true,
      transformOptions: { enableImplicitConversion: false }, // explicit @Type()
      validationError: { target: false, value: false },      // don't leak payload
    }),
  );

  // ── Global filters — order matters: specific before generic ──────
  app.useGlobalFilters(new PrismaErrorFilter(), new AllExceptionsFilter());
  app.useGlobalInterceptors(new TransformResponseInterceptor());

  // ── API versioning — URI-based so mobile clients can pin ─────────
  app.enableVersioning({ type: VersioningType.URI, defaultVersion: '1' });
  app.setGlobalPrefix('api', {
    exclude: ['health', 'health/liveness', 'health/readiness'],
  });

  // ── Graceful shutdown — critical for Railway zero-downtime ───────
  app.enableShutdownHooks();

  // ── Swagger — never exposed in production unless explicitly on ───
  if (config.get<string>('NODE_ENV') !== 'production') {
    setupSwagger(app);
  }

  const port = config.get<number>('PORT', 3000);
  await app.listen(port, '0.0.0.0');
  logger.log(`🚀 Onside API listening on :${port} (${process.env.NODE_ENV})`);
}

// ── Process-level safety nets ──────────────────────────────────────
process.on('unhandledRejection', (reason) => {
  Sentry.captureException(reason);
  new Logger('Process').error('Unhandled rejection', reason as any);
});
process.on('uncaughtException', (err) => {
  Sentry.captureException(err);
  new Logger('Process').fatal('Uncaught exception', err);
  // Let Railway restart; do NOT process.exit(0) or you'll mask crashes.
  process.exit(1);
});

bootstrap();
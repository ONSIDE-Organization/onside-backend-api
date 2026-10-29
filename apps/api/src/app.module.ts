// import { Module } from '@nestjs/common';
// import { ConfigModule } from '@nestjs/config';
// import { HealthModule } from './modules/health/health.module';
// import { PrismaModule } from './infra/prisma/prisma.module';

// @Module({
//   imports: [
//     ConfigModule.forRoot({ isGlobal: true, envFilePath: ['.env', 'apps/api/.env'] }),
//     PrismaModule,
//     HealthModule,
//   ],
// })
// export class AppModule {}

// src/app.module.ts
import { Module } from '@nestjs/common';
import { APP_FILTER, APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';

import { validateEnv } from './config/validation.schema';
import configuration from './config/configuration';

// Infra
import { PrismaModule } from './infra/prisma/prisma.module';
import { FirebaseModule } from './infra/firebase/firebase.module';

// Feature modules
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { HealthModule } from './modules/health/health.module';

// Global providers
import { JwtAuthGuard } from './common/guards/jwt-auth.guard';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';
import { PrismaErrorFilter } from './common/filters/prisma-error.filter';
import { TransformResponseInterceptor } from './common/interceptors/transform-response.interceptor';
import { RequestLoggerInterceptor } from './common/interceptors/request-logger.interceptor';

@Module({
  imports: [
    // ── Config — MUST be first ──────────────────────────────────────
    ConfigModule.forRoot({
      isGlobal: true,
      cache: true,
      validate: validateEnv,
      load: [configuration],
      // envFilePath intentionally omitted — Railway injects env directly,
      // local dev uses .env via dotenv already loaded by pnpm start:dev
    }),

    // ── Data ───────────────────────────────────────────────────────
    PrismaModule, // @Global() — provides PrismaService everywhere
    FirebaseModule, // @Global() — provides FIREBASE_ADMIN token

    // ── JWT (our own, post-Firebase) ───────────────────────────────
    JwtModule.registerAsync({
      global: true,
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.getOrThrow<string>('jwt.secret'),
        signOptions: {
          expiresIn: config.getOrThrow<string | number>('jwt.expiresIn') as any,
        },
      }),
    }),

    // ── Auth strategy plumbing ─────────────────────────────────────
    PassportModule.register({ defaultStrategy: 'jwt' }),

    // ── Feature modules ────────────────────────────────────────────
    HealthModule,
    AuthModule,
    UsersModule,
  ],
  providers: [
    // ── Global guard — secure by default ───────────────────────────
    // Every route requires auth UNLESS annotated @Public().
    // Order matters: only one APP_GUARD, but it runs before all
    // other guards. JwtAuthGuard is our single global gate.
    { provide: APP_GUARD, useClass: JwtAuthGuard },

    // ── Global interceptors ────────────────────────────────────────
    // RequestLogger runs AFTER the response is generated (tap), so
    // its order relative to TransformResponse is:
    //   request → ... handler ... → TransformResponse → RequestLogger
    // That's what we want: RequestLogger sees the final response
    // that actually hits the wire (including the envelope).
    { provide: APP_INTERCEPTOR, useClass: TransformResponseInterceptor },
    { provide: APP_INTERCEPTOR, useClass: RequestLoggerInterceptor },

    // ── Global filters ─────────────────────────────────────────────
    // Filters run in reverse registration order — the *last* registered
    // filter runs *first*. We want PrismaErrorFilter to have first
    // crack at Prisma errors before AllExceptionsFilter catches them,
    // so PrismaErrorFilter must be registered LAST.
    //
    // Equivalent alternative: keep PrismaErrorFilter scoped to Prisma
    // exceptions via @Catch(Prisma.*) — which it already is. Either
    // way, order is correct because the @Catch scopes are disjoint.
    { provide: APP_FILTER, useClass: AllExceptionsFilter },
    { provide: APP_FILTER, useClass: PrismaErrorFilter },
  ],
})
export class AppModule {}
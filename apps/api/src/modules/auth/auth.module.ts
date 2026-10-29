// src/modules/auth/auth.module.ts
import { Module } from '@nestjs/common';
import { PassportModule } from '@nestjs/passport';
import { PrismaModule } from '../../infra/prisma/prisma.module';
import { FirebaseModule } from '../../infra/firebase/firebase.module';
import { AuthController } from './api/auth.controller';
import { LoginUseCase } from './application/login.use-case';
import { FirebaseTokenVerifier } from './infra/firebase-token.verifier';
import { JwtStrategy } from './infra/jwt.strategy';
import { RegisterUseCase } from './application/register.use-case';
import { CheckUsernameUseCase } from './application/check-username.use-case';

/**
 * Auth module — Firebase → Onside JWT exchange and session validation.
 *
 * Exports nothing. The JWT strategy is registered globally via
 * PassportModule in AppModule, and downstream modules just use
 * `@CurrentUser()` (which reads req.user) — they don't inject anything
 * from AuthModule. This keeps Auth decoupled from feature modules.
 */
@Module({
  imports: [
    PassportModule,   // explicit for JwtStrategy registration
    PrismaModule,     // @Global but explicit — documents dependency
    FirebaseModule,   // @Global but explicit — documents dependency
  ],
  controllers: [AuthController],
  providers: [
    LoginUseCase,
    FirebaseTokenVerifier,
    JwtStrategy,      // Passport strategy — must be in providers, not exports
    RegisterUseCase,
    CheckUsernameUseCase
  ],
})
export class AuthModule {}
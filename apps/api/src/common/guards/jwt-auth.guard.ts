// src/common/guards/jwt-auth.guard.ts
import {
  ExecutionContext,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthGuard } from '@nestjs/passport';
import { Observable } from 'rxjs';
import type { Request } from 'express';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';
import type { AuthUser } from '../decorators/current-user.decorator';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  private readonly logger = new Logger(JwtAuthGuard.name);

  constructor(private readonly reflector: Reflector) {
    super();
  }

  canActivate(
    context: ExecutionContext,
  ): boolean | Promise<boolean> | Observable<boolean> {
    // Method-level @Public() overrides class-level @Public(),
    // and either overrides "protected by default".
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) {
      return true; // skip Passport entirely — no DB lookup, no token parse
    }

    return super.canActivate(context);
  }

  /**
   * Passport's default behavior on failure is to throw an
   * UnauthorizedException with message "Unauthorized". We keep that
   * contract but normalize the message and log the reason so
   * operators can distinguish "no token" from "bad token" from
   * "user row missing".
   */
  handleRequest<TUser = AuthUser>(
    err: Error | null,
    user: TUser | false,
    info: { message?: string } | undefined,
    context: ExecutionContext,
  ): TUser {
    if (err || !user) {
      const req = context
        .switchToHttp()
        .getRequest<Request & { correlationId?: string }>();

      // Log at warn: this is expected user behavior, not an incident.
      this.logger.warn({
        correlationId: req.correlationId ?? null,
        path: req.originalUrl,
        method: req.method,
        reason: err?.message ?? info?.message ?? 'No user attached',
      });

      throw new UnauthorizedException({
        status: 401,
        code: 'UNAUTHORIZED',
        message: 'Authentication required',
      });
    }

    return user;
  }
}
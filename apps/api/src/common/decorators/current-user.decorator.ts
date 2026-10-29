// src/common/decorators/current-user.decorator.ts
import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import type { Request } from 'express';

/**
 * The authenticated principal attached to req.user by JwtStrategy.
 * Kept minimal on purpose — DB-sourced fields (avatar, email) are
 * fetched by use-cases when needed, not baked into the request.
 */
export interface AuthUser {
  id: string;
  username: string;
  displayName: string;
}

/**
 * Usage:
 *   @Get('me')
 *   getMe(@CurrentUser() user: AuthUser) { … }
 *
 *   @Get('me/id')
 *   getId(@CurrentUser('id') id: string) { … }
 *
 * Throws if used on a @Public() route without a fallback — the global
 * JwtAuthGuard will already have 401'd, so we return undefined and let
 * TypeScript surface the misuse at compile time.
 */
export const CurrentUser = createParamDecorator(
  <K extends keyof AuthUser>(
    field: K | undefined,
    ctx: ExecutionContext,
  ): AuthUser | AuthUser[K] | undefined => {
    const req = ctx.switchToHttp().getRequest<Request & { user?: AuthUser }>();
    const user = req.user;
    if (!user) return undefined;
    return field ? user[field] : user;
  },
);
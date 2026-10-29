// src/common/decorators/public.decorator.ts
import { SetMetadata } from '@nestjs/common';

/**
 * Metadata key used by JwtAuthGuard to bypass auth.
 * Exported so guards import the key, not a magic string.
 */
export const IS_PUBLIC_KEY = 'isPublic';

/**
 * Marks a route (or controller) as publicly accessible.
 *
 *   @Public()
 *   @Post('login')
 *   login() { … }
 *
 * Precedence: method-level @Public() wins over class-level,
 * and class-level @Public() marks every route in that controller public.
 * This is the *only* sanctioned way to open a route — the global guard
 * protects everything by default (secure-by-default).
 */
export const Public = (): MethodDecorator & ClassDecorator =>
  SetMetadata(IS_PUBLIC_KEY, true);
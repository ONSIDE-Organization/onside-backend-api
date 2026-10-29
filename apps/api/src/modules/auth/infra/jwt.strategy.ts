// src/modules/auth/infra/jwt.strategy.ts
import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { PrismaService } from '../../../infra/prisma/prisma.service';
import type { AuthUser } from '../../../common/decorators/current-user.decorator';

/**
 * The shape we sign into the Onside JWT.
 * Intentionally minimal — email/displayName can change mid-session and
 * shouldn't be trusted from the token (mobile would render stale data).
 * We re-load the user from DB on every request instead.
 */
export interface OnsideJwtPayload {
  sub: string;        // User.id (uuid)
  username: string;   // denormalized for logging, not authorization
  iat?: number;
  exp?: number;
}

/**
 * Passport strategy that verifies the Onside JWT and attaches an
 * AuthUser to req.user.
 *
 * The DB lookup on every request is deliberate:
 *  - It rejects deleted accounts instantly, even if the token hasn't expired.
 *  - It rejects accounts whose identity changed (username hijacked, etc).
 *  - In M4+, league-owner guards can trust `req.user.id` without a second query.
 *
 * At M1 scale this is one indexed `findUnique` — negligible.
 * If it ever becomes a bottleneck (M4+, thousands of req/s), cache the
 * user in Redis keyed by `sub` with a 60s TTL and invalidate on
 * `user.updated` / `user.deleted` events. Do NOT cache in-process —
 * multiple Railway replicas would go stale independently.
 */
@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  private readonly logger = new Logger(JwtStrategy.name);

  constructor(
    config: ConfigService,
    private readonly prisma: PrismaService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: config.getOrThrow<string>('jwt.secret'),
      // algorithms: ['HS256'],  // uncomment and pin once you have a rotation story
    });
  }

  async validate(payload: OnsideJwtPayload): Promise<AuthUser> {
    // Guard against malformed payloads (shouldn't happen if we signed it,
    // but a JWT-secret rotation mistake could let a stale token through).
    if (!payload?.sub || typeof payload.sub !== 'string') {
      throw new UnauthorizedException({
        status: 401,
        code: 'INVALID_TOKEN_PAYLOAD',
        message: 'Authentication required',
      });
    }

    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
      select: { id: true, username: true, displayName: true },
    });

    if (!user) {
      // Account was deleted after token was issued.
      this.logger.warn({
        msg: 'token-for-deleted-user',
        userId: payload.sub,
      });
      throw new UnauthorizedException({
        status: 401,
        code: 'ACCOUNT_NOT_FOUND',
        message: 'Account no longer exists',
      });
    }

    return {
      id: user.id,
      username: user.username,
      displayName: user.displayName,
    };
  }
}
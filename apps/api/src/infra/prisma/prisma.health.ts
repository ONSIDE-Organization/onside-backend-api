// src/infra/prisma/prisma.health.ts
import { Injectable, Logger } from '@nestjs/common';
import {
  HealthIndicatorResult,
  HealthIndicatorService,
} from '@nestjs/terminus';
import { PrismaService } from './prisma.service';

/**
 * Readiness check for Postgres via Prisma.
 *
 * Uses `$queryRaw\`SELECT 1\`` — the cheapest possible round-trip that
 * proves the connection pool has at least one live connection AND the
 * DB is accepting queries. `$connect()` alone is insufficient because
 * it's a no-op when the pool is already warm.
 *
 * Timeout rationale:
 *   - Railway's readiness probe default timeout is 5s. If we let the
 *     query hang, the probe times out → container marked unhealthy →
 *     Railway restarts a perfectly fine process because Supabase had
 *     a 3-second hiccup.
 *   - 2s gives the probe headroom to report a clean failure while
 *     still catching genuine outages.
 */
@Injectable()
export class PrismaHealthIndicator {
  private readonly logger = new Logger(PrismaHealthIndicator.name);
  private static readonly TIMEOUT_MS = 2000;

  constructor(
    private readonly prisma: PrismaService,
    private readonly indicator: HealthIndicatorService,
  ) {}

  async isHealthy(key = 'database'): Promise<HealthIndicatorResult> {
    const check = this.indicator.check(key);

    try {
      await this.withTimeout(this.prisma.$queryRaw`SELECT 1`, PrismaHealthIndicator.TIMEOUT_MS);
      return check.up({ message: 'Postgres reachable' });
    } catch (err) {
      const message =
        err instanceof Error && err.message.toLowerCase().includes('timeout')
          ? `Postgres did not respond within ${PrismaHealthIndicator.TIMEOUT_MS}ms`
          : err instanceof Error
            ? err.message
            : 'Unknown database error';

      // Log at warn, not error — readiness flapping is operational signal,
      // not an incident per se. Sentry should not page on this.
      this.logger.warn(`Readiness check failed: ${message}`);

      return check.down({ message });
    }
  }

  private withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
    return Promise.race([
      promise,
      new Promise<T>((_, reject) =>
        setTimeout(() => reject(new Error(`timeout after ${ms}ms`)), ms).unref(),
      ),
    ]);
  }
}
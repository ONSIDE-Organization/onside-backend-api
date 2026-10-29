import { Controller, Get, Logger, VERSION_NEUTRAL } from '@nestjs/common';
import {
  HealthCheck,
  HealthCheckService,
  HealthCheckResult,
  MemoryHealthIndicator,
} from '@nestjs/terminus';
import { ApiExcludeController } from '@nestjs/swagger';
import { Public } from '../../common/decorators/public.decorator';
import { PrismaHealthIndicator } from '../../infra/prisma/prisma.health';

/**
 * Health endpoints consumed by:
 *  - Railway liveness probe  → GET /health/liveness
 *  - Railway readiness probe → GET /health/readiness
 *  - Future k8s / load balancer checks
 *
 * Both routes are intentionally outside `/api/v1` (excluded from the
 * global prefix in main.ts) — infra tooling should not depend on API
 * versioning. A `/v2` API must not require a probe change.
 *
 * Swagger-excluded: these are infra, not product. Documenting them
 * invites client integrations we don't want to support.
 */
@ApiExcludeController()
@Public()
//@Controller('health')
@Controller({
  path: 'health',
  version: VERSION_NEUTRAL,
})
export class HealthController {
  private readonly logger = new Logger(HealthController.name);

  constructor(
    private readonly health: HealthCheckService,
    private readonly prisma: PrismaHealthIndicator,
    private readonly memory: MemoryHealthIndicator,
  ) {}

  /**
   * Liveness — "is the process running?"
   *
   * Deliberately does NOT call any external dependency. If we checked
   * the DB here, a transient Supabase blip would cause Railway to
   * restart a healthy container, wiping in-flight requests and making
   * the outage worse. Liveness failure = "the process itself is
   * wedged and restart is the only fix."
   *
   * It does check memory because a Node process leaking into OOM is
   * exactly the scenario where a restart *is* the right answer.
   */
  @Get('liveness')
  @HealthCheck()
  async liveness(): Promise<HealthCheckResult> {
    return this.health.check([
      // 512 MB heap ceiling — Railway's default container has 1GB RAM;
      // hitting 512MB means we're minutes from OOM. Restart proactively.
      () => this.memory.checkHeap('memory_heap', 512 * 1024 * 1024),
    ]);
  }

  /**
   * Readiness — "can we accept traffic?"
   *
   * Railway only routes traffic to a container whose readiness probe
   * passes. During a deploy this is what gates the old→new handoff,
   * so a failing readiness = zero-downtime deploy aborts (correctly).
   *
   * Checks Postgres. Redis is intentionally excluded in M1 because
   * Redis is optional (Phase 3+). When Redis becomes load-bearing in
   * M4, add a `redis.isHealthy` check here — but only then.
   */
  @Get('readiness')
  @HealthCheck()
  async readiness(): Promise<HealthCheckResult> {
    return this.health.check([
      () => this.prisma.isHealthy('database'),
    ]);
  }
}
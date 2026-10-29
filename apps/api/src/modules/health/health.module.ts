
import { Module } from '@nestjs/common';
import { TerminusModule } from '@nestjs/terminus';
import { PrismaModule } from '../../infra/prisma/prisma.module';
import { HealthController } from './health.controller';
import { PrismaHealthIndicator } from 'src/infra/prisma/prisma.health';

/**
 * Health module — Railway probes and future load-balancer checks.
 *
 * TerminusModule provides:
 *  - HealthCheckService (the orchestrator)
 *  - HealthIndicatorService (base for custom indicators)
 *
 * PrismaModule is imported so the readiness check can ping the DB.
 * We do NOT import ConfigModule here — health checks should have zero
 * config dependencies beyond what PrismaService already holds.
 */
@Module({
  imports: [TerminusModule, PrismaModule],
  controllers: [HealthController],
  providers: [PrismaHealthIndicator],
})
export class HealthModule {}
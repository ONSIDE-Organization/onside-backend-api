import { Module } from '@nestjs/common';
import { PrismaModule } from '../../infra/prisma/prisma.module';
import { RivalriesController } from './api/rivalries.controller';
import { CreateRivalryUseCase } from './application/create-rivalry.use-case';
import { ResolveRivalryUseCase } from './application/resolve-rivalry.use-case';

@Module({
  imports: [PrismaModule],
  controllers: [RivalriesController],
  providers: [CreateRivalryUseCase, ResolveRivalryUseCase],
  exports: [ResolveRivalryUseCase], // Exported for ScoringModule
})
export class RivalriesModule {}
// src/modules/scoring/scoring.module.ts
import { Module } from '@nestjs/common';
import { PrismaModule } from '../../infra/prisma/prisma.module';
import { ScorePredictionsUseCase } from './application/score-predictions.use-case';
import { ResolveRivalryUseCase } from '../rivalries/application/resolve-rivalry.use-case';

@Module({
  imports: [PrismaModule],
  providers: [ScorePredictionsUseCase, ResolveRivalryUseCase],
  exports: [ScorePredictionsUseCase, ResolveRivalryUseCase],
})
export class ScoringModule {}
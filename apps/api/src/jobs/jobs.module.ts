// src/jobs/jobs.module.ts
import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { PrismaModule } from '../infra/prisma/prisma.module';
import { SportsApiModule } from '../infra/sports-api/sports-api.module';
import { ScoringModule } from '../modules/scoring/scoring.module';

import { PullFixturesScheduler } from './schedulers/pull-fixtures.scheduler';
import { ScorePredictionsScheduler } from './schedulers/score-predictions.scheduler';

@Module({
  imports: [
    ScheduleModule.forRoot(), // Initializes the cron engine
    PrismaModule,
    SportsApiModule,
    ScoringModule,
  ],
  providers: [
    PullFixturesScheduler,
    ScorePredictionsScheduler,
  ],
})
export class JobsModule {}
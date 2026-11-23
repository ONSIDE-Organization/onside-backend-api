import { Module } from '@nestjs/common';
import { SubmitPicksUseCase } from './application/submit-pick.use-case';
import { PrismaService } from '../../infra/prisma/prisma.service';
import { PredictionsController } from './api/predictions.controller';

@Module({
  controllers: [PredictionsController],
  providers: [
    SubmitPicksUseCase,
    PrismaService,
  ],
})
export class PredictionsModule {}
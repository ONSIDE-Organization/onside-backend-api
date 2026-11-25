import { Module } from '@nestjs/common';
import { PrismaModule } from '../../infra/prisma/prisma.module';
import { RivalriesController } from './api/rivalries.controller';
import { CreateRivalryUseCase } from './application/create-rivalry.use-case';
import { GetRivalryDetailUseCase } from './application/get-rivalry-detail.use-case';
import { AcceptRivalryUseCase } from './application/accept-rivalry.use-case';
import { DeclineRivalryUseCase } from './application/decline-rivalry.use-case';
import { ResolveRivalryUseCase } from './application/resolve-rivalry.use-case';
import { GetRivalriesUseCase } from './application/get-rivalries.use-case';

@Module({
  imports: [PrismaModule],
  controllers: [RivalriesController],
  providers: [
    GetRivalriesUseCase,
    CreateRivalryUseCase,
    GetRivalryDetailUseCase,
    AcceptRivalryUseCase,
    DeclineRivalryUseCase,
    ResolveRivalryUseCase, // Used by ScoringModule
  ],
  exports: [ResolveRivalryUseCase], 
})
export class RivalriesModule {}
import { Module } from '@nestjs/common';
import { PrismaModule } from '../../infra/prisma/prisma.module';
import { LeaguesController } from './api/leagues.controller';
import { CreateLeagueUseCase } from './application/create-league.use-case';
import { JoinLeagueUseCase } from './application/join-league.use-case';
import { GetLeaderboardUseCase } from './application/get-leaderboard.use-case';

@Module({
  imports: [PrismaModule],
  controllers: [LeaguesController],
  providers: [
    CreateLeagueUseCase,
    JoinLeagueUseCase,
    GetLeaderboardUseCase,
  ],
})
export class LeaguesModule {}
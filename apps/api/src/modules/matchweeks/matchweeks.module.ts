import { Module } from '@nestjs/common';
import { PrismaModule } from '../../infra/prisma/prisma.module';
import { MatchweeksController } from './api/matchweeks.controller';

@Module({
  imports: [PrismaModule],
  controllers: [MatchweeksController],
})
export class MatchweeksModule {}
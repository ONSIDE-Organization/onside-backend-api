import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../../../infra/prisma/prisma.service';

@Injectable()
export class JoinLeagueUseCase {
  constructor(private readonly prisma: PrismaService) {}

  async execute(userId: string, inviteCode: string) {
    const league = await this.prisma.league.findUnique({
      where: { inviteCode },
    });

    if (!league) {
      throw new NotFoundException({ status: 404, code: 'LEAGUE_NOT_FOUND', message: 'Invalid invite code' });
    }

    try {
      await this.prisma.leagueMember.create({
        data: {
          leagueId: league.id,
          userId,
        },
      });
      return league;
    } catch (err: any) {
      if (err.code === 'P2002') {
        throw new ConflictException({ status: 409, code: 'ALREADY_MEMBER', message: 'You are already in this league' });
      }
      throw err;
    }
  }
}
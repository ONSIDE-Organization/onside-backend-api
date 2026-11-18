import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../infra/prisma/prisma.service';

@Injectable()
export class GetLeaderboardUseCase {
  constructor(private readonly prisma: PrismaService) {}

  async execute(leagueId: string) {
    // Aggregate points for users in this league
    const leaderboard = await this.prisma.$queryRaw`
      SELECT 
        u.id as "userId",
        u.username,
        u."display_name" as "displayName",
        u."avatar_url" as "avatarUrl",
        COALESCE(SUM(up."points_awarded"), 0)::int as "totalPoints",
        COUNT(CASE WHEN up."is_correct" = true THEN 1 END)::int as "correctPicks",
        COUNT(up.id)::int as "totalPicks"
      FROM "league_members" lm
      JOIN "users" u ON u.id = lm.user_id
      LEFT JOIN "user_predictions" up ON up.user_id = u.id
      WHERE lm.league_id = ${leagueId}::uuid
      GROUP BY u.id
      ORDER BY "totalPoints" DESC;
    `;

    return leaderboard;
  }
}
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../infra/prisma/prisma.service';

@Injectable()
export class GetLeaderboardUseCase {
  constructor(private readonly prisma: PrismaService) {}

  async execute(leagueId: string, matchweekId?: string) {
    // If a matchweekId is provided, we filter the query by it.
    // The Prisma raw query uses an optional parameter `$2` which is either the matchweekId or null.
    
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
      LEFT JOIN "predictions" p ON p.id = up."prediction_id"
      WHERE lm.league_id = ${leagueId}::uuid
      AND (${matchweekId}::uuid IS NULL OR p."matchweek_id" = ${matchweekId}::uuid)
      GROUP BY u.id
      ORDER BY "totalPoints" DESC;
    `;

    return leaderboard;
  }
}
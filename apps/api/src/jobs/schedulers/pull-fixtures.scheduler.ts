// src/jobs/schedulers/pull-fixtures.scheduler.ts
import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { PrismaService } from '../../infra/prisma/prisma.service';
import { SportsApiClient } from '../../infra/sports-api/sports-api.client';
import { Match } from '@prisma/client';

@Injectable()
export class PullFixturesScheduler {
  private readonly logger = new Logger(PullFixturesScheduler.name);

  // Bzzoiro's ID for the Premier League
  private readonly PREMIER_LEAGUE_ID = 1;

  constructor(
    private readonly sportsApi: SportsApiClient,
    private readonly prisma: PrismaService,
  ) {}

  /**
   * Runs every 6 hours.
   * Pulls Premier League fixtures for the next 14 days.
   */
  @Cron('0 */6 * * *')
  async syncFixtures(): Promise<void> {
    this.logger.log('Starting Premier League fixture sync');

    try {
      const dateFrom = new Date().toISOString().slice(0, 10);
      const dateTo = new Date(
        Date.now() + 14 * 86400_000,
      ).toISOString().slice(0, 10);

      this.logger.log(
        `Fetching Premier League fixtures from ${dateFrom} to ${dateTo}`,
      );

      let offset = 0;
      let total = 0;

      while (true) {
        // We now filter directly by leagueId instead of fetching a season first
        const response = await this.sportsApi.getEvents({
          dateFrom,
          dateTo,
          leagueId: this.PREMIER_LEAGUE_ID,
          limit: 200,
          offset,
        });

        for (const event of response.results) {
          await this.upsertMatch(event);
        }

        total += response.results.length;

        if (!response.next || response.results.length < 200) {
          break;
        }

        offset += 200;
      }

      this.logger.log(
        `Premier League fixture sync complete: ${total} events processed`,
      );
    } catch (error) {
      // Catch errors so the cron job doesn't crash the entire server
      this.logger.error(
        'Failed to sync fixtures from Bzzoiro',
        error instanceof Error ? error.stack : error,
      );
    }
  }

  private async upsertMatch(event: any): Promise<void> {
    // Determine the season string (fallback to 'unknown' if missing)
    const season = String(event.season_id ?? 'unknown');
    const weekNumber = event.round_number ?? 0;

    try {
      // Find or create the matchweek.
      const matchweek = await this.prisma.matchweek.upsert({
        where: {
          season_weekNumber: {
            season,
            weekNumber,
          },
        },
        update: {},
        create: {
          season,
          weekNumber,
          deadline: this.computeDeadline(event),
          status: 'UPCOMING',
        },
      });

      // Upsert the match.
      const match = await this.prisma.match.upsert({
        where: {
          externalId: event.id,
        },
        update: {
          status: this.mapStatus(event.status),
          homeScore: event.score?.home ?? null,
          awayScore: event.score?.away ?? null,
          result: this.computeResult(event),
        },
        create: {
          externalId: event.id,
          matchweekId: matchweek.id,
          homeTeam: event.home.name,
          awayTeam: event.away.name,
          kickoff: new Date(event.kickoff_at),
          status: this.mapStatus(event.status),
          homeScore: event.score?.home ?? null,
          awayScore: event.score?.away ?? null,
          result: this.computeResult(event),
        },
      });

      // Create a default prediction if one doesn't exist.
      await this.createDefaultPrediction(match, matchweek.id);
    } catch (error) {
      this.logger.error(
        `Failed to upsert event ${event.id} (${event.home?.name} vs ${event.away?.name})`,
        error instanceof Error ? error.stack : error,
      );
      // We don't throw here, so one bad event doesn't stop the rest of the sync
    }
  }

  private async createDefaultPrediction(
    match: Match,
    matchweekId: string,
  ): Promise<void> {
    const existing = await this.prisma.prediction.findFirst({
      where: {
        matchId: match.id,
        category: 'MATCHWEEK',
      },
    });

    if (existing) return;

    await this.prisma.prediction.create({
      data: {
        matchweekId,
        matchId: match.id,
        category: 'MATCHWEEK',
        question: `Who wins ${match.homeTeam} vs ${match.awayTeam}?`,
        options: [match.homeTeam, 'Draw', match.awayTeam],
        resolutionType: 'AUTO_FIXTURE_RESULT',
        resolutionConfig: {
          resultToOption: {
            HOME: match.homeTeam,
            DRAW: 'Draw',
            AWAY: match.awayTeam,
          },
        },
        pointsValue: 10,
        deadline: new Date(match.kickoff.getTime() - 60 * 60 * 1000),
      },
    });
  }

  private computeDeadline(event: any): Date {
    return new Date(
      new Date(event.kickoff_at).getTime() - 60 * 60 * 1000,
    );
  }

  private mapStatus(
    s: string,
  ): 'UPCOMING' | 'LIVE' | 'FINISHED' | 'POSTPONED' | 'CANCELLED' | 'UNRESOLVED' {
    const map: Record<string, any> = {
      upcoming: 'UPCOMING',
      live: 'LIVE',
      finished: 'FINISHED',
      postponed: 'POSTPONED',
      cancelled: 'CANCELLED',
      unresolved: 'UNRESOLVED',
    };

    return map[s] ?? 'UPCOMING';
  }

  private computeResult(event: any): string | null {
    if (event.status !== 'finished' || event.score?.home == null) {
      return null;
    }

    if (event.score.home > event.score.away) return 'HOME';
    if (event.score.home < event.score.away) return 'AWAY';

    return 'DRAW';
  }
}
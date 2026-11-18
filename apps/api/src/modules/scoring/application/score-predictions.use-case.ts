
import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../infra/prisma/prisma.service';
import { ResolveRivalryUseCase } from '../../rivalries/application/resolve-rivalry.use-case';

@Injectable()
export class ScorePredictionsUseCase {
  private readonly logger = new Logger(ScorePredictionsUseCase.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly resolveRivalry: ResolveRivalryUseCase,
  ) {}

  /**
   * Score all open predictions whose match has finished.
   * Also resolves associated rivalries after scoring.
   */
  async executeForMatch(matchId: string): Promise<number> {
    const match = await this.prisma.match.findUnique({
      where: { id: matchId },
    });

    if (!match || match.status !== 'FINISHED' || !match.result) {
      return 0;
    }

    const predictions = await this.prisma.prediction.findMany({
      where: {
        matchId,
        status: 'OPEN',
        resolutionType: 'AUTO_FIXTURE_RESULT',
      },
    });

    let scored = 0;

    for (const prediction of predictions) {
      const options = prediction.options as string[];

      const config = prediction.resolutionConfig as {
        resultToOption?: Record<string, string>;
      } | null;

      const correctOption = config?.resultToOption?.[match.result];

      if (!correctOption || !options.includes(correctOption)) {
        this.logger.warn(
          `Cannot resolve prediction ${prediction.id}: no mapping for result ${match.result}`,
        );
        continue;
      }

      // Mark prediction as resolved.
      await this.prisma.prediction.update({
        where: { id: prediction.id },
        data: {
          status: 'RESOLVED',
          correctOption,
          resolvedAt: new Date(),
        },
      });

      // Award points to users who picked correctly.
      const picks = await this.prisma.userPrediction.findMany({
        where: {
          predictionId: prediction.id,
        },
      });

      for (const pick of picks) {
        const isCorrect = pick.selectedOption === correctOption;

        await this.prisma.userPrediction.update({
          where: { id: pick.id },
          data: {
            isCorrect,
            pointsAwarded: isCorrect
              ? prediction.pointsValue
              : 0,
          },
        });
      }

      // Resolve rivalry after scoring the prediction.
      try {
        await this.resolveRivalry.execute(prediction.id);

        this.logger.log(
          `Checked rivalry resolution for prediction ${prediction.id}`,
        );
      } catch (error) {
        this.logger.error(
          `Failed to resolve rivalry for prediction ${prediction.id}`,
          error instanceof Error ? error.stack : String(error),
        );
      }

      scored++;
    }

    this.logger.log(
      `Scored ${scored} predictions for match ${matchId}`,
    );

    return scored;
  }

  /**
   * Batch scoring: process finished matches
   * that still have open predictions.
   */
  async executeBatch(): Promise<number> {
    const matches = await this.prisma.match.findMany({
      where: {
        status: 'FINISHED',
        result: { not: null },
        predictions: {
          some: { status: 'OPEN' },
        },
      },
      select: { id: true },
    });

    let total = 0;

    for (const match of matches) {
      total += await this.executeForMatch(match.id);
    }

    return total;
  }
}

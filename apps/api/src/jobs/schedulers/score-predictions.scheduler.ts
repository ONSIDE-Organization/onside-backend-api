// src/jobs/schedulers/score-predictions.scheduler.ts
import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { ScorePredictionsUseCase } from '../../modules/scoring/application/score-predictions.use-case';

@Injectable()
export class ScorePredictionsScheduler {
  private readonly logger = new Logger(ScorePredictionsScheduler.name);

  constructor(private readonly scorePredictions: ScorePredictionsUseCase) {}

  /**
   * Runs every 15 minutes. Bzzoiro updates match results within
   * a few minutes of the final whistle. 15min cadence means
   * predictions resolve within ~20 minutes of match end.
   */
  @Cron('*/15 * * * *')
  async run(): Promise<void> {
    const count = await this.scorePredictions.executeBatch();
    if (count > 0) {
      this.logger.log(`Auto-scored ${count} predictions`);
    }
  }
}
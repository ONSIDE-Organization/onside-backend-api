// src/modules/rivalries/application/resolve-rivalry.use-case.ts
import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../infra/prisma/prisma.service';

@Injectable()
export class ResolveRivalryUseCase {
  private readonly logger = new Logger(ResolveRivalryUseCase.name);

  constructor(private readonly prisma: PrismaService) {}

  async execute(predictionId: string): Promise<void> {
    const prediction = await this.prisma.prediction.findUnique({
      where: { id: predictionId },
    });

    if (!prediction) return;

    const rivalry = await this.prisma.rivalry.findFirst({
      where: { predictionId },
    });

    if (!rivalry) return;
    if (rivalry.status === 'RESOLVED') return; // Idempotency guard

    const picks = await this.prisma.userPrediction.findMany({
      where: { predictionId },
    });

    const creatorPick = picks.find((p) => p.userId === rivalry.creatorId);
    const opponentPick = picks.find((p) => p.userId === rivalry.opponentId);

    let winnerId: string | null = null;

    if (creatorPick?.isCorrect && !opponentPick?.isCorrect) {
      winnerId = rivalry.creatorId;
    } else if (!creatorPick?.isCorrect && opponentPick?.isCorrect) {
      winnerId = rivalry.opponentId;
    }

    await this.prisma.rivalry.update({
      where: { id: rivalry.id },
      data: {
        status: 'RESOLVED',
        winnerId,
        resolvedAt: new Date(),
      },
    });

    this.logger.log({
      msg: 'rivalry-resolved',
      rivalryId: rivalry.id,
      winnerId,
    });
  }
}
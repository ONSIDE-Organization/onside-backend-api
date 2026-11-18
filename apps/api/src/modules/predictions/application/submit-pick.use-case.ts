import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../infra/prisma/prisma.service';
import { SubmitPicksDto } from '../api/dto/submit-pick.dto';

@Injectable()
export class SubmitPicksUseCase {
  constructor(private readonly prisma: PrismaService) {}

  async execute(userId: string, dto: SubmitPicksDto) {
    const matchweek = await this.prisma.matchweek.findUnique({
      where: { id: dto.matchweekId },
    });

    if (!matchweek) {
      throw new NotFoundException({ status: 404, code: 'MATCHWEEK_NOT_FOUND', message: 'Matchweek not found' });
    }

    // 1. Validate deadline
    if (new Date() > matchweek.deadline) {
      throw new BadRequestException({
        status: 400,
        code: 'MATCHWEEK_LOCKED',
        message: 'This matchweek is locked. The deadline has passed.',
      });
    }

    // 2. Validate all predictions exist and options are valid
    const predictionIds = dto.picks.map((p: SubmitPicksDto['picks'][number]) => p.predictionId);
    const predictions = await this.prisma.prediction.findMany({
      where: { id: { in: predictionIds }, matchweekId: dto.matchweekId },
    });

    if (predictions.length !== predictionIds.length) {
      throw new BadRequestException({
        status: 400,
        code: 'INVALID_PREDICTIONS',
        message: 'One or more predictions are invalid or do not belong to this matchweek.',
      });
    }

    for (const pick of dto.picks) {
      const prediction = predictions.find((p) => p.id === pick.predictionId)!;
      const options = prediction.options as string[];
      if (!options.includes(pick.selectedOption)) {
        throw new BadRequestException({
          status: 400,
          code: 'INVALID_OPTION',
          message: `Invalid option for prediction ${prediction.id}.`,
        });
      }
    }

    // 3. Upsert all picks in a transaction
    const results = await this.prisma.$transaction(
      dto.picks.map((pick: SubmitPicksDto['picks'][number]) =>
        this.prisma.userPrediction.upsert({
          where: {
            predictionId_userId: { predictionId: pick.predictionId, userId },
          },
          update: { selectedOption: pick.selectedOption, submittedAt: new Date() },
          create: {
            predictionId: pick.predictionId,
            userId,
            selectedOption: pick.selectedOption,
          },
        })
      )
    );

    return { success: true, submittedCount: results.length };
  }
}
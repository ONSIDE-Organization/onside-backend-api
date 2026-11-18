// src/modules/predictions/application/submit-pick.use-case.ts
import { Injectable, BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../infra/prisma/prisma.service';
import { SubmitPickDto } from '../api/dto/submit-pick.dto';

@Injectable()
export class SubmitPickUseCase {
  constructor(private readonly prisma: PrismaService) {}

  async execute(userId: string, dto: SubmitPickDto) {
    const prediction = await this.prisma.prediction.findUnique({
      where: { id: dto.predictionId },
    });

    if (!prediction) {
      throw new NotFoundException({ status: 404, code: 'PREDICTION_NOT_FOUND', message: 'Prediction not found' });
    }

    // 1. Deadline check — the most critical guard
    if (new Date() > prediction.deadline) {
      throw new BadRequestException({
        status: 400,
        code: 'PREDICTION_LOCKED',
        message: 'This prediction is locked. The deadline has passed.',
      });
    }

    if (prediction.status !== 'OPEN') {
      throw new BadRequestException({
        status: 400,
        code: 'PREDICTION_NOT_OPEN',
        message: 'This prediction is no longer accepting picks.',
      });
    }

    // 2. Validate the option is one of the allowed choices
    const options = prediction.options as string[];
    if (!options.includes(dto.selectedOption)) {
      throw new BadRequestException({
        status: 400,
        code: 'INVALID_OPTION',
        message: `"${dto.selectedOption}" is not a valid option. Choose from: ${options.join(', ')}`,
      });
    }

    // 3. Upsert — allow changing pick before deadline, reject duplicate
    try {
      return await this.prisma.userPrediction.upsert({
        where: {
          predictionId_userId: { predictionId: dto.predictionId, userId },
        },
        update: {
          selectedOption: dto.selectedOption,
          submittedAt: new Date(),
        },
        create: {
          predictionId: dto.predictionId,
          userId,
          selectedOption: dto.selectedOption,
        },
      });
    } catch (err: any) {
      if (err.code === 'P2002') {
        throw new ConflictException({ status: 409, code: 'ALREADY_PICKED', message: 'You already picked this prediction.' });
      }
      throw err;
    }
  }
}
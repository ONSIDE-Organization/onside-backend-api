import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../infra/prisma/prisma.service';
import { CreateRivalryDto } from '../api/dto/create-rivalry.dto';

@Injectable()
export class CreateRivalryUseCase {
  constructor(private readonly prisma: PrismaService) {}

  async execute(creatorId: string, dto: CreateRivalryDto) {
    // 1. Validate opponent exists
    const opponent = await this.prisma.user.findUnique({ where: { id: dto.opponentId } });
    if (!opponent) {
      throw new NotFoundException({ status: 404, code: 'OPPONENT_NOT_FOUND', message: 'Opponent not found' });
    }
    if (creatorId === dto.opponentId) {
      throw new BadRequestException({ status: 400, code: 'INVALID_OPPONENT', message: 'You cannot challenge yourself' });
    }

    // 2. Handle Prediction (Either use existing or create a new one)
    let predictionId = dto.predictionId;
    
    if (!predictionId) {
      // Custom statement flow (Rivalry-first)
      // Find or create a placeholder matchweek for "Custom" rivalries (or use current)
      const currentMatchweek = await this.prisma.matchweek.findFirst({
        where: { status: 'UPCOMING' },
        orderBy: { weekNumber: 'asc' },
      });
      
      if (!currentMatchweek) {
        throw new BadRequestException({ status: 400, code: 'NO_ACTIVE_MATCHWEEK', message: 'No active matchweek to attach rivalry' });
      }

      const newPrediction = await this.prisma.prediction.create({
        data: {
          matchweekId: currentMatchweek.id,
          category: dto.category,
          question: dto.statement,
          options: ['Yes', 'No'], // Default for custom rivalries
          resolutionType: 'MANUAL',
          deadline: currentMatchweek.deadline,
        },
      });
      predictionId = newPrediction.id;
    }

    // 3. Create the Rivalry
    return this.prisma.rivalry.create({
      data: {
        creatorId,
        opponentId: dto.opponentId,
        predictionId,
        status: 'PENDING',
      },
      include: {
        prediction: true,
        opponent: { select: { id: true, username: true, displayName: true, avatarUrl: true } },
      }
    });
  }
}
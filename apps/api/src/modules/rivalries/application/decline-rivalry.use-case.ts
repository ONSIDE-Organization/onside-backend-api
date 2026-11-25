import { Injectable, ForbiddenException, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../../infra/prisma/prisma.service';

@Injectable()
export class DeclineRivalryUseCase {
  constructor(private readonly prisma: PrismaService) {}

  async execute(userId: string, rivalryId: string) {
    const rivalry = await this.prisma.rivalry.findUnique({
      where: { id: rivalryId },
    });

    if (!rivalry) {
      throw new NotFoundException({
        status: 404,
        code: 'RIVALRY_NOT_FOUND',
        message: 'Rivalry not found',
      });
    }

    // Security check: Only the invited opponent can decline.
    // (If we wanted the creator to be able to cancel, we'd add an `if (userId !== creator && userId !== opponent)` check)
    if (userId !== rivalry.opponentId) {
      throw new ForbiddenException({
        status: 403,
        code: 'NOT_OPPONENT',
        message: 'Only the invited opponent can decline this rivalry',
      });
    }

    // Business rule: Can only decline if PENDING
    if (rivalry.status !== 'PENDING') {
      throw new BadRequestException({
        status: 400,
        code: 'INVALID_RIVALRY_STATUS',
        message: `Cannot decline a rivalry that is currently ${rivalry.status}`,
      });
    }

    return this.prisma.rivalry.update({
      where: { id: rivalryId },
      data: { status: 'DECLINED' },
    });
  }
}
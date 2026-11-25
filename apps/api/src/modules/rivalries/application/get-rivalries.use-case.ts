import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../infra/prisma/prisma.service';

@Injectable()
export class GetRivalriesUseCase {
  constructor(private readonly prisma: PrismaService) {}

  async execute(userId: string, statusFilter?: string) {
    // Map the UI filter to DB statuses
    let statusQuery: any = undefined;

    if (statusFilter && statusFilter !== 'ALL') {
      switch (statusFilter) {
        case 'LIVE':
          statusQuery = { in: ['ACTIVE'] };
          break;
        case 'PENDING':
          // If I am the creator, it's 'PENDING' (waiting for them).
          // If I am the opponent, it needs my action, so we treat it as 'PENDING' too.
          statusQuery = { in: ['PENDING'] };
          break;
        case 'SETTLED':
          statusQuery = { in: ['RESOLVED', 'DECLINED'] };
          break;
        default:
          statusQuery = undefined;
      }
    }

    return this.prisma.rivalry.findMany({
      where: {
        OR: [{ creatorId: userId }, { opponentId: userId }],
        ...(statusQuery ? { status: statusQuery } : {}),
      },
      include: {
        prediction: {
          select: {
            id: true,
            question: true,
            deadline: true,
            status: true,
            category: true,
            correctOption: true,
          },
        },
        creator: {
          select: { id: true, username: true, displayName: true, avatarUrl: true },
        },
        opponent: {
          select: { id: true, username: true, displayName: true, avatarUrl: true },
        },
        winner: {
          select: { id: true, username: true, displayName: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }
}
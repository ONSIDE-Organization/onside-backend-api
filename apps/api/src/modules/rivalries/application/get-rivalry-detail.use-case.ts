// import { Injectable, ForbiddenException, NotFoundException } from '@nestjs/common';
// import { PrismaService } from '../../../infra/prisma/prisma.service';
// import { Prisma } from '@prisma/client';

// @Injectable()
// export class GetRivalryDetailUseCase {
//   constructor(private readonly prisma: PrismaService) {}

//   async execute(userId: string, status?: string) {
//   const where: Prisma.RivalryWhereInput = {
//     OR: [
//       { creatorId: userId },
//       { opponentId: userId },
//     ],
//     ...(status && status !== 'ALL'
//       ? { status: status as Prisma.RivalryWhereInput['status'] }
//       : {}),
//   };

//   const rivalries = await this.prisma.rivalry.findMany({
//     where,
//     include: {
//       prediction: true,
//       creator: {
//         select: {
//           id: true,
//           username: true,
//           displayName: true,
//           avatarUrl: true,
//         },
//       },
//       opponent: {
//         select: {
//           id: true,
//           username: true,
//           displayName: true,
//           avatarUrl: true,
//         },
//       },
//       winner: {
//         select: {
//           id: true,
//           username: true,
//           displayName: true,
//         },
//       },
//     },
//     orderBy: {
//       createdAt: 'desc',
//     },
//   });

//   // Fetch picks for all predictions
//   const predictionIds = rivalries.map((r) => r.predictionId);

//   const picks = await this.prisma.userPrediction.findMany({
//     where: {
//       predictionId: { in: predictionIds },
//     },
//     select: {
//       predictionId: true,
//       userId: true,
//       selectedOption: true,
//       isCorrect: true,
//       pointsAwarded: true,
//     },
//   });

//   return rivalries.map((rivalry) => {
//     const rivalryPicks = picks.filter(
//       (p) => p.predictionId === rivalry.predictionId,
//     );

//     return {
//       ...rivalry,
//       creatorPick:
//         rivalryPicks.find((p) => p.userId === rivalry.creatorId) || null,
//       opponentPick:
//         rivalryPicks.find((p) => p.userId === rivalry.opponentId) || null,
//     };
//   });
// }

//   async executeOld(userId: string, rivalryId: string) {
//     const rivalry = await this.prisma.rivalry.findUnique({
//       where: { id: rivalryId },
//       include: {
//         prediction: true,
//         creator: {
//           select: { id: true, username: true, displayName: true, avatarUrl: true },
//         },
//         opponent: {
//           select: { id: true, username: true, displayName: true, avatarUrl: true },
//         },
//         winner: {
//           select: { id: true, username: true, displayName: true },
//         },
//       },
//     });

//     if (!rivalry) {
//       throw new NotFoundException({
//         status: 404,
//         code: 'RIVALRY_NOT_FOUND',
//         message: 'Rivalry not found',
//       });
//     }

//     // Security check: Only the creator or opponent can view the detail
//     if (userId !== rivalry.creatorId && userId !== rivalry.opponentId) {
//       throw new ForbiddenException({
//         status: 403,
//         code: 'NOT_RIVALRY_PARTICIPANT',
//         message: 'You are not a participant in this rivalry',
//       });
//     }

//     // Fetch the picks for both users to show who picked what
//     const picks = await this.prisma.userPrediction.findMany({
//       where: { predictionId: rivalry.predictionId },
//       select: { userId: true, selectedOption: true, isCorrect: true, pointsAwarded: true },
//     });

//     return {
//       ...rivalry,
//       creatorPick: picks.find((p) => p.userId === rivalry.creatorId) || null,
//       opponentPick: picks.find((p) => p.userId === rivalry.opponentId) || null,
//     };
//   }
// }

import { Injectable, ForbiddenException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../infra/prisma/prisma.service';

@Injectable()
export class GetRivalryDetailUseCase {
  constructor(private readonly prisma: PrismaService) {}

  async execute(userId: string, rivalryId: string) {
    const rivalry = await this.prisma.rivalry.findUnique({
      where: { id: rivalryId },
      include: {
        prediction: true,
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
    });

    if (!rivalry) {
      throw new NotFoundException({
        status: 404,
        code: 'RIVALRY_NOT_FOUND',
        message: 'Rivalry not found',
      });
    }

    // Security check: Only the creator or opponent can view the detail
    if (userId !== rivalry.creatorId && userId !== rivalry.opponentId) {
      throw new ForbiddenException({
        status: 403,
        code: 'NOT_RIVALRY_PARTICIPANT',
        message: 'You are not a participant in this rivalry',
      });
    }

    // Fetch the picks for both users to show who picked what
    const picks = await this.prisma.userPrediction.findMany({
      where: { predictionId: rivalry.predictionId },
      select: { userId: true, selectedOption: true, isCorrect: true, pointsAwarded: true },
    });

    return {
      ...rivalry,
      creatorPick: picks.find((p) => p.userId === rivalry.creatorId) || null,
      opponentPick: picks.find((p) => p.userId === rivalry.opponentId) || null,
    };
  }
}
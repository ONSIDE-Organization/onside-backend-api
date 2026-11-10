// src/modules/users/application/update-me.use-case.ts
import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../infra/prisma/prisma.service';
import type { UpdateMeDto } from '../api/dto/users.dto';

@Injectable()
export class UpdateMeUseCase {
  private readonly logger = new Logger(UpdateMeUseCase.name);

  constructor(private readonly prisma: PrismaService) {}

  async execute(userId: string, dto: UpdateMeDto) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, deletedAt: true },
    });

    if (!user || user.deletedAt) {
      throw new NotFoundException({
        status: 404,
        code: 'ACCOUNT_NOT_FOUND',
        message: 'Account no longer exists',
      });
    }

    const updated = await this.prisma.user.update({
      where: { id: userId },
      data: {
        ...(dto.displayName !== undefined && { displayName: dto.displayName }),
        ...(dto.avatarUrl !== undefined && { avatarUrl: dto.avatarUrl }),
      },
      select: {
        id: true,
        username: true,
        displayName: true,
        avatarUrl: true,
        email: true,
      },
    });

    this.logger.log({ msg: 'user-updated', userId, fields: Object.keys(dto) });

    return updated;
  }
}
// src/modules/users/application/delete-me.use-case.ts
import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../infra/prisma/prisma.service';

@Injectable()
export class DeleteMeUseCase {
  private readonly logger = new Logger(DeleteMeUseCase.name);

  constructor(private readonly prisma: PrismaService) {}

  async execute(userId: string): Promise<void> {
    // Soft delete: mark the account as deleted, bump tokenVersion so any
    // in-flight JWT is rejected on next request, and free up the username
    // (if you want to release it — see note below).
    await this.prisma.user.update({
      where: { id: userId },
      data: {
        deletedAt: new Date(),
        tokenVersion: { increment: 1 },
        // Optional: anonymize PII so a GDPR-style "right to be forgotten"
        // request is satisfied even while the row exists.
        // email: `deleted-${userId}@deleted.local`,
        // username: `deleted_${userId.slice(0, 8)}`,
      },
    });

    this.logger.log({ msg: 'user-deleted', userId });
  }
}
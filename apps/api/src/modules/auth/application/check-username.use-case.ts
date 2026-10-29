// src/modules/auth/application/check-username.use-case.ts
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../infra/prisma/prisma.service';

@Injectable()
export class CheckUsernameUseCase {
  constructor(private readonly prisma: PrismaService) {}

  async execute(username: string) {
    const exists = await this.prisma.user.findUnique({
      where: { username },
      select: { id: true },
    });

    return { available: !exists, username };
  }
}
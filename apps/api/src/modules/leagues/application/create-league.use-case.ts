import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../infra/prisma/prisma.service';
import { CreateLeagueDto } from '../api/dto/league.dto';
import { randomBytes } from 'crypto';

@Injectable()
export class CreateLeagueUseCase {
  constructor(private readonly prisma: PrismaService) {}

  async execute(ownerId: string, dto: CreateLeagueDto) {
    // Generate a 6-char invite code (alphanumeric)
    const inviteCode = randomBytes(3).toString('hex').toUpperCase(); // e.g. "A1B2C3"

    return this.prisma.league.create({
      data: {
        ownerId,
        name: dto.name,
        inviteCode,
        type: 'PRIVATE',
        members: {
          create: {
            userId: ownerId,
          },
        },
      },
      include: {
        members: true,
      }
    });
  }
}
// src/modules/auth/application/register.use-case.ts
import { Injectable, Logger, ConflictException, BadRequestException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../../../infra/prisma/prisma.service';
import { FirebaseTokenVerifier } from '../infra/firebase-token.verifier';
import { RegisterDto } from '../api/dto/auth.dto';

@Injectable()
export class RegisterUseCase {
  private readonly logger = new Logger(RegisterUseCase.name);

  constructor(
    private readonly verifier: FirebaseTokenVerifier,
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
  ) {}

  async execute(dto: RegisterDto) {
    const decoded = await this.verifier.verify(dto.idToken);

    if (!decoded.email) {
      throw new BadRequestException({
        status: 400,
        code: 'EMAIL_REQUIRED',
        message: 'An email is required to create an account.',
      });
    }

    // 1. Check if they somehow already registered (idempotency)
    const existing = await this.prisma.user.findUnique({
      where: { firebaseUid: decoded.uid },
    });

    if (existing) {
      throw new ConflictException({
        status: 409,
        code: 'ALREADY_REGISTERED',
        message: 'User is already registered.',
      });
    }

    // 2. Create the user (username uniqueness is enforced by DB constraint)
    try {
      const user = await this.prisma.user.create({
        data: {
          firebaseUid: decoded.uid,
          email: decoded.email,
          username: dto.username,
          displayName: dto.displayName,
          avatarUrl: dto.avatarUrl || decoded.picture || null,
        },
      });

      const accessToken = await this.jwt.signAsync({
        sub: user.id,
        username: user.username,
      });

      this.logger.log({ msg: 'user-registered', userId: user.id });

      return {
        accessToken,
        user: {
          id: user.id,
          username: user.username,
          displayName: user.displayName,
          avatarUrl: user.avatarUrl,
          email: user.email,
        },
      };
    } catch (error: any) {
      // Prisma P2002 = Unique constraint failed
      if (error.code === 'P2002') {
        const target = error.meta?.target as string[];
        if (target?.includes('username')) {
          throw new ConflictException({
            status: 409,
            code: 'USERNAME_TAKEN',
            message: 'That username is already taken.',
          });
        }
        if (target?.includes('email')) {
          throw new ConflictException({
            status: 409,
            code: 'EMAIL_TAKEN',
            message: 'An account with this email already exists.',
          });
        }
      }
      throw error;
    }
  }
}
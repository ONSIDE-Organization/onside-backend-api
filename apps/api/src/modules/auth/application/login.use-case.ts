// src/modules/auth/application/login.use-case.ts
import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../../../infra/prisma/prisma.service';
import { FirebaseTokenVerifier } from '../infra/firebase-token.verifier';

@Injectable()
export class LoginUseCase {
  private readonly logger = new Logger(LoginUseCase.name);

  constructor(
    private readonly verifier: FirebaseTokenVerifier,
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
  ) {}

  async execute(idToken: string) {
    const decoded = await this.verifier.verify(idToken);

    const user = await this.prisma.user.findUnique({
      where: { firebaseUid: decoded.uid },
    });

    // If they aren't in our DB, they need to go to the Register screen
    if (!user) {
      throw new NotFoundException({
        status: 404,
        code: 'USER_NOT_REGISTERED',
        message: 'Account not found. Please complete registration.',
      });
    }

    const accessToken = await this.jwt.signAsync({
      sub: user.id,
      username: user.username,
    });

    this.logger.log({ msg: 'user-logged-in', userId: user.id });

    return { accessToken, user: this.toPublic(user) };
  }

  private toPublic(u: any) {
    return {
      id: u.id,
      username: u.username,
      displayName: u.displayName,
      avatarUrl: u.avatarUrl,
      email: u.email,
    };
  }
}
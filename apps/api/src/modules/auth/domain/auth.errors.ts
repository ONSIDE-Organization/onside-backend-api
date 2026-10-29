// src/modules/auth/domain/auth.errors.ts
import { HttpException, HttpStatus } from '@nestjs/common';

/**
 * Domain errors for the auth module.
 *
 * They extend HttpException directly (not a shared DomainError base)
 * because M1 has no other domain modules yet. When M2+ introduces
 * Predictions/Rivalries, introduce a shared `DomainError` base and
 * refactor these to extend it — same shape, shared parent.
 *
 * The `code` field is what the mobile client switches on. It must be
 * stable across releases; `message` is for humans and can change.
 */
export class InvalidFirebaseTokenError extends HttpException {
  constructor(reason?: string) {
    super(
      {
        status: HttpStatus.UNAUTHORIZED,
        code: 'INVALID_FIREBASE_TOKEN',
        message: 'Firebase ID token is invalid or expired',
        // detail: reason,  // ← uncomment only in dev if needed; never leak in prod
      },
      HttpStatus.UNAUTHORIZED,
    );
  }
}

export class EmailNotProvidedError extends HttpException {
  constructor() {
    super(
      {
        status: HttpStatus.BAD_REQUEST,
        code: 'EMAIL_REQUIRED',
        message:
          'Firebase account has no email. Onside requires a verified email to create an account.',
      },
      HttpStatus.BAD_REQUEST,
    );
  }
}

export class UsernameCollisionError extends HttpException {
  constructor(username: string) {
    super(
      {
        status: HttpStatus.CONFLICT,
        code: 'USERNAME_COLLISION',
        message: `Username "${username}" is already taken. Choose a different display name or contact support.`,
      },
      HttpStatus.CONFLICT,
    );
  }
}

export class AccountDeletedError extends HttpException {
  constructor() {
    super(
      {
        status: HttpStatus.FORBIDDEN,
        code: 'ACCOUNT_DELETED',
        message: 'This account has been deleted.',
      },
      HttpStatus.FORBIDDEN,
    );
  }
}
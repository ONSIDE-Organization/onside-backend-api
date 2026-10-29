// src/modules/auth/infra/firebase-token.verifier.ts
import { Inject, Injectable, Logger } from '@nestjs/common';
import type { DecodedIdToken } from 'firebase-admin/auth';
import { FIREBASE_AUTH } from '../../../infra/firebase/firebase.providers';
import type { Auth } from 'firebase-admin/auth';
import { InvalidFirebaseTokenError } from '../domain/auth.errors';

/**
 * Verifies a Firebase ID token and returns its decoded claims.
 *
 * Design decisions:
 *
 * 1. checkRevoked: true — this catches tokens whose issuing session was
 *    revoked (user signed out on another device, password changed).
 *    It costs one extra round-trip to Firebase but is worth it for a
 *    social app where "someone got into my account" is a support ticket
 *    you never want. In M4+, add a Redis cache keyed on the Firebase
 *    token fingerprint (5 min TTL) to make this cheap under load.
 *
 * 2. Timeout — Firebase SDK has no built-in timeout. A Firebase outage
 *    with no timeout makes every /auth/login hang until Railway kills
 *    the container. 3s is our login SLO for the verify step.
 *
 * 3. No token logging — ever. Not even truncated. Auth tokens are
 *    bearer credentials; leaking half of one in a log aggregator is
 *    the same incident class as leaking the whole one.
 */
@Injectable()
export class FirebaseTokenVerifier {
  private readonly logger = new Logger(FirebaseTokenVerifier.name);
  private static readonly VERIFY_TIMEOUT_MS = 3000;

  constructor(@Inject(FIREBASE_AUTH) private readonly auth: Auth) {}

  async verify(idToken: string): Promise<DecodedIdToken> {
    if (!idToken || typeof idToken !== 'string' || idToken.length < 20) {
      // Reject obvious garbage before hitting Firebase — saves quota
      // and makes malformed requests distinguishable in logs.
      throw new InvalidFirebaseTokenError('malformed');
    }

    try {
      return await this.withTimeout(
        this.auth.verifyIdToken(idToken, true /* checkRevoked */),
        FirebaseTokenVerifier.VERIFY_TIMEOUT_MS,
      );
    } catch (err) {
      const code = this.extractFirebaseCode(err);

      // Map Firebase's granular codes to our single public error.
      // We log the underlying code at debug so operators can tell
      // "expired" from "malformed" without exposing it to the client.
      this.logger.debug(`Firebase verify failed: ${code}`);
      throw new InvalidFirebaseTokenError(code);
    }
  }

  private extractFirebaseCode(err: unknown): string {
    if (err && typeof err === 'object' && 'code' in err) {
      return String((err as { code: unknown }).code);
    }
    if (err instanceof Error) return err.message;
    return 'unknown';
  }

  private withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
    return Promise.race([
      promise,
      new Promise<T>((_, reject) =>
        setTimeout(
          () => reject(new Error('auth/verify-timeout')),
          ms,
        ).unref(),
      ),
    ]);
  }
}
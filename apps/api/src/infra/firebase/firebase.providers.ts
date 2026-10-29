// src/infra/firebase/firebase.providers.ts
import { Provider, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as admin from 'firebase-admin';
import { getAuth } from 'firebase-admin/auth';
import { cert, getApps } from 'firebase-admin/app';

/**
 * DI tokens — import these instead of magic strings.
 * Used by FirebaseTokenVerifier (M1) and PushService (M3+).
 */
export const FIREBASE_ADMIN_APP = Symbol('FIREBASE_ADMIN_APP');
export const FIREBASE_AUTH = Symbol('FIREBASE_AUTH');

/**
 * Initializes the Firebase Admin SDK exactly once.
 *
 * Idempotency matters because:
 *  - `nest start --watch` re-evaluates module files on change; a second
 *    `initializeApp()` call with the same name throws.
 *  - In tests, the module may be instantiated per test suite.
 *  - In a monorepo where a worker app also imports this, both processes
 *    must not race — but they're separate processes, so no issue there.
 *
 * The privateKey unescaping lives in `configuration.ts` (already shipped),
 * so `config.get('firebase.privateKey')` already has real newlines.
 * We do NOT re-unescape here — single source of truth.
 */
export const firebaseAdminAppProvider: Provider = {
  provide: FIREBASE_ADMIN_APP,
  inject: [ConfigService],
  useFactory: (config: ConfigService): admin.App => {
    const logger = new Logger('FirebaseAdmin');

    // Guard against double-init across module reloads
    const existing = getApps().find((a) => a.name === '[DEFAULT]');
    if (existing) {
      logger.debug('Reusing existing Firebase Admin app');
      return existing;
    }

    const app = admin.initializeApp({
      credential: cert({
        projectId: config.getOrThrow<string>('firebase.projectId'),
        clientEmail: config.getOrThrow<string>('firebase.clientEmail'),
        privateKey: config.getOrThrow<string>('firebase.privateKey'),
      }),
    });

    logger.log(
      `Firebase Admin initialized (project: ${config.get('firebase.projectId')})`,
    );

    return app;
  },
};

/**
 * Exposes `admin.auth.Auth` as its own token so consumers don't have to
 * reach into `app.auth()` themselves. This makes it trivial to mock in
 * unit tests (mock `FIREBASE_AUTH` rather than a whole App object).
 */
export const firebaseAuthProvider: Provider = {
  provide: FIREBASE_AUTH,
  inject: [FIREBASE_ADMIN_APP],
  useFactory: (app: admin.App) => getAuth(app),
};
// src/infra/firebase/firebase.module.ts
import { Global, Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import {
  FIREBASE_ADMIN_APP,
  FIREBASE_AUTH,
  firebaseAdminAppProvider,
  firebaseAuthProvider,
} from './firebase.providers';

/**
 * Global Firebase module.
 *
 * @Global() because Firebase is infrastructure, like Prisma — feature
 * modules should not each re-import it. Every module gets FIREBASE_AUTH
 * for free via DI.
 *
 * Exports both tokens:
 *   - FIREBASE_ADMIN_APP  → for admin.messaging() (M3 push notifications)
 *   - FIREBASE_AUTH       → for verifyIdToken (M1 token verification)
 *
 * ConfigModule is imported even though it's global — it makes the
 * dependency explicit and survives a future refactor where ConfigModule
 * stops being global (which some teams do for stricter isolation).
 */
@Global()
@Module({
  imports: [ConfigModule],
  providers: [firebaseAdminAppProvider, firebaseAuthProvider],
  exports: [FIREBASE_ADMIN_APP, FIREBASE_AUTH],
})
export class FirebaseModule {}
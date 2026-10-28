/** TODO: Configure Firebase Admin using environment-provided credentials. */
//export const FIREBASE_ADMIN = Symbol('FIREBASE_ADMIN');
import { Provider } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { App, cert, getApps, initializeApp } from 'firebase-admin/app';

export const FIREBASE_ADMIN = 'FIREBASE_ADMIN';

export const firebaseAdminProvider: Provider = {
  provide: FIREBASE_ADMIN,
  inject: [ConfigService],
  useFactory: (config: ConfigService): App => {
    const apps = getApps();
    if (apps.length) return apps[0]!;
    return initializeApp({
      credential: cert({
        projectId: config.getOrThrow('FIREBASE_PROJECT_ID'),
        clientEmail: config.getOrThrow('FIREBASE_CLIENT_EMAIL'),
        // Railway stores \n literally; unescape for the cert
        privateKey: config.getOrThrow<string>('FIREBASE_PRIVATE_KEY').replace(/\\n/g, '\n'),
      }),
    });
  },
};
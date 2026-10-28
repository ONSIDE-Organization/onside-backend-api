// src/config/swagger.config.ts
import { INestApplication, Logger } from '@nestjs/common';
import {
  DocumentBuilder,
  SwaggerModule,
  type OpenAPIObject,
} from '@nestjs/swagger';

const SWAGGER_PATH = 'docs';
const SWAGGER_JSON_PATH = 'docs-json';

/**
 * Builds the OpenAPI document. Exported so CI can generate it headlessly
 * (e.g. `pnpm swagger:export` builds the app without listening, writes JSON,
 * then mobile codegen consumes it).
 */
export function buildOpenApiDocument(app: INestApplication): OpenAPIObject {
  const config = new DocumentBuilder()
    .setTitle('Onside API')
    .setDescription(
      [
        'Social football prediction API.',
        '',
        '**Auth flow:**',
        '1. Client signs in with Firebase (email/password or Google).',
        '2. Client sends the Firebase ID token to `POST /api/v1/auth/login`.',
        '3. API returns an Onside JWT — use it as `Authorization: Bearer <token>` on all other routes.',
      ].join('\n'),
    )
    .setVersion('1.0.0')
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        description: 'Onside access token issued by /auth/login',
      },
      'onside-jwt',
    )
    .addTag('Auth', 'Firebase login + session')
    .addTag('Users', 'Profile, stats, badges, receipts')
    .addTag('Health', 'Railway liveness/readiness probes')
    .addServer('http://localhost:3000', 'Local')
    .build();

  return SwaggerModule.createDocument(app, config, {
    // Only document v1; bump when you ship v2
    ignoreGlobalPrefix: false,
  });
}

export function setupSwagger(app: INestApplication): void {
  const document = buildOpenApiDocument(app);
  const logger = new Logger('Swagger');

  SwaggerModule.setup(SWAGGER_PATH, app, document, {
    swaggerOptions: {
      persistAuthorization: true,      // keeps the token across page reloads in dev
      displayRequestDuration: true,
      docExpansion: 'none',            // collapsed by default; large APIs stay navigable
      filter: true,                    // client-side route search
      tagsSorter: 'alpha',
      operationsSorter: 'alpha',
    },
    customSiteTitle: 'Onside API Docs',
    jsonDocumentUrl: SWAGGER_JSON_PATH,
  });

  logger.log(`📘 Swagger UI available at /${SWAGGER_PATH}`);
  logger.log(`📘 OpenAPI JSON available at /${SWAGGER_JSON_PATH}`);
}
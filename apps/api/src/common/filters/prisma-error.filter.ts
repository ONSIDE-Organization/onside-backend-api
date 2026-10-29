import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpStatus,
  Logger,
} from '@nestjs/common';
//import { Prisma } from '@prisma/client';
//import { Prisma } from '../src/generated/prisma/client';
import type { Request, Response } from 'express';
import * as Sentry from '@sentry/nestjs';
import { correlationIdStorage } from '../middleware/correlation-id.middleware';
import { Prisma } from '../../infra/src/generated/prisma/client';

/**
 * Maps Prisma known-request error codes to HTTP statuses + app error codes.
 * Full list: https://www.prisma.io/docs/orm/reference/error-reference#error-codes
 * Only the codes this app can realistically hit are mapped; others fall through.
 */
const PRISMA_ERROR_MAP: Record<
  string,
  { status: number; code: string; message: string }
> = {
  P2000: { status: 400, code: 'VALUE_TOO_LONG', message: 'A provided value is too long.' },
  P2002: { status: 409, code: 'CONFLICT', message: 'A record with this value already exists.' },
  P2003: { status: 400, code: 'FOREIGN_KEY_VIOLATION', message: 'Referenced record does not exist.' },
  P2005: { status: 400, code: 'INVALID_STORED_VALUE', message: 'Invalid stored value.' },
  P2006: { status: 400, code: 'INVALID_INPUT', message: 'Invalid input value.' },
  P2011: { status: 400, code: 'NULL_CONSTRAINT', message: 'A required field cannot be null.' },
  P2014: { status: 409, code: 'RELATION_VIOLATION', message: 'This change would break a required relation.' },
  P2015: { status: 404, code: 'RELATED_NOT_FOUND', message: 'Related record not found.' },
  P2025: { status: 404, code: 'NOT_FOUND', message: 'The requested record was not found.' },
};

@Catch(Prisma.PrismaClientKnownRequestError, Prisma.PrismaClientValidationError)
export class PrismaErrorFilter implements ExceptionFilter {
  private readonly logger = new Logger(PrismaErrorFilter.name);

  catch(
    exception:
      | Prisma.PrismaClientKnownRequestError
      | Prisma.PrismaClientValidationError,
    host: ArgumentsHost,
  ): void {
    const ctx = host.switchToHttp();
    const req = ctx.getRequest<Request & { user?: { id?: string } }>();
    const res = ctx.getResponse<Response>();

    const correlationId =
      (req as Request & { correlationId?: string }).correlationId ??
      correlationIdStorage.getStore()?.correlationId ??
      null;

    // Validation error → almost always a programmer bug; treat as 500 + Sentry
    if (exception instanceof Prisma.PrismaClientValidationError) {
      Sentry.withScope((scope) => {
        if (correlationId) scope.setTag('correlationId', correlationId);
        if (req.user?.id) scope.setUser({ id: req.user.id });
        Sentry.captureException(exception);
      });
      this.logger.error(
        { correlationId, path: req.originalUrl },
        'Prisma validation error',
      );
      res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
        error: {
          status: 500,
          code: 'DB_VALIDATION_ERROR',
          message: 'Internal server error',
          correlationId,
          timestamp: new Date().toISOString(),
          path: req.originalUrl,
        },
      });
      return;
    }

    const mapping = PRISMA_ERROR_MAP[exception.code];

    if (!mapping) {
      // Unknown Prisma code — capture to Sentry and respond 500.
      // The AllExceptionsFilter won't see it (this filter is scoped), so
      // we must emit the response ourselves.
      Sentry.withScope((scope) => {
        if (correlationId) scope.setTag('correlationId', correlationId);
        scope.setTag('prisma.code', exception.code);
        Sentry.captureException(exception);
      });
      this.logger.error(
        {
          correlationId,
          path: req.originalUrl,
          prismaCode: exception.code,
          meta: exception.meta,
        },
        'Unmapped Prisma error',
      );
      res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
        error: {
          status: 500,
          code: 'DB_ERROR',
          message: 'Internal server error',
          correlationId,
          timestamp: new Date().toISOString(),
          path: req.originalUrl,
        },
      });
      return;
    }

    // Mapped 4xx — expected user input; log at warn, no Sentry.
    this.logger.warn(
      {
        correlationId,
        path: req.originalUrl,
        prismaCode: exception.code,
        target: exception.meta?.target, // e.g. ['email'] for P2002
      },
      `Prisma ${exception.code} → ${mapping.status}`,
    );

    res.status(mapping.status).json({
      error: {
        status: mapping.status,
        code: mapping.code,
        message: mapping.message,
        correlationId,
        timestamp: new Date().toISOString(),
        path: req.originalUrl,
      },
    });
  }
}
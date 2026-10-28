// src/common/filters/all-exceptions.filter.ts
import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import * as Sentry from '@sentry/nestjs';
import { correlationIdStorage } from '../middleware/correlation-id.middleware';

interface ErrorEnvelope {
  error: {
    status: number;
    code: string;
    message: string;
    correlationId: string | null;
    timestamp: string;
    path: string;
  };
}

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const req = ctx.getRequest<Request & { user?: { id?: string } }>();
    const res = ctx.getResponse<Response>();

    const status = this.resolveStatus(exception);
    const correlationId =
      (req as Request & { correlationId?: string }).correlationId ??
      correlationIdStorage.getStore()?.correlationId ??
      null;

    // ── Sentry capture — ONLY for unexpected (5xx) failures ────────
    // 4xx are business-as-usual (bad token, validation); they'd drown
    // out real incidents in Sentry and burn quota.
    if (status >= HttpStatus.INTERNAL_SERVER_ERROR) {
      Sentry.withScope((scope) => {
        if (correlationId) scope.setTag('correlationId', correlationId);
        if (req.user?.id) scope.setUser({ id: req.user.id });
        scope.setContext('request', {
          method: req.method,
          path: req.originalUrl,
        });
        Sentry.captureException(exception);
      });
    }

    // Server-side log — always, with correlation ID for grep-ability
    const logPayload = {
      status,
      correlationId,
      path: req.originalUrl,
      method: req.method,
      userId: req.user?.id,
    };
    if (status >= HttpStatus.INTERNAL_SERVER_ERROR) {
      this.logger.error(
        { ...logPayload, err: exception instanceof Error ? exception.stack : exception },
        'Unhandled server error',
      );
    } else {
      this.logger.warn(logPayload, 'Client error');
    }

    // ── Response — never leak internals ────────────────────────────
    const envelope: ErrorEnvelope = {
      error: {
        status,
        code: this.resolveCode(exception, status),
        // 5xx → generic. 4xx → the HttpException message (safe by design).
        message:
          status >= HttpStatus.INTERNAL_SERVER_ERROR
            ? 'Internal server error'
            : this.resolveMessage(exception),
        correlationId,
        timestamp: new Date().toISOString(),
        path: req.originalUrl,
      },
    };

    if (!res.headersSent) {
      res.status(status).json(envelope);
    }
  }

  private resolveStatus(exception: unknown): number {
    if (exception instanceof HttpException) return exception.getStatus();
    return HttpStatus.INTERNAL_SERVER_ERROR;
  }

  private resolveCode(exception: unknown, status: number): string {
    if (exception instanceof HttpException) {
      const response = exception.getResponse();
      if (typeof response === 'object' && response !== null && 'code' in response) {
        return String((response as { code: unknown }).code);
      }
      return exception.name.replace(/Exception$/, '').toUpperCase() || 'HTTP_ERROR';
    }
    return status >= 500 ? 'INTERNAL_ERROR' : 'REQUEST_ERROR';
  }

  private resolveMessage(exception: unknown): string {
    if (exception instanceof HttpException) {
      const response = exception.getResponse();
      if (typeof response === 'string') return response;
      if (typeof response === 'object' && response !== null && 'message' in response) {
        const msg = (response as { message: unknown }).message;
        return Array.isArray(msg) ? msg.join('; ') : String(msg);
      }
      return exception.message;
    }
    return 'Request failed';
  }
}
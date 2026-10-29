// src/common/interceptors/request-logger.interceptor.ts
import {
  CallHandler,
  ExecutionContext,
  Injectable,
  Logger,
  NestInterceptor,
} from '@nestjs/common';
import { Observable, tap, catchError, throwError } from 'rxjs';
import type { Request, Response } from 'express';
import { correlationIdStorage } from '../middleware/correlation-id.middleware';
import type { AuthUser } from '../decorators/current-user.decorator';

/**
 * Paths excluded from request logging:
 *  - /health*   → Railway probes every 10s; would drown every other log
 *  - /docs*     → Swagger asset fetches, not API traffic
 *  - /metrics   → Prometheus scrape (future)
 */
const SILENT_PREFIXES = ['/health', '/docs', '/metrics', '/favicon.ico'];

interface RequestLog {
  msg: 'request';
  correlationId: string | null;
  method: string;
  path: string;
  status: number;
  durationMs: number;
  userId?: string;
  userAgent?: string;
  ip?: string;
  err?: string; // only for 5xx
}

@Injectable()
export class RequestLoggerInterceptor implements NestInterceptor {
  private readonly logger = new Logger('HTTP');

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const ctx = context.switchToHttp();
    const req = ctx.getRequest<Request & { correlationId?: string; user?: AuthUser }>();
    const res = ctx.getResponse<Response>();

    // Skip infra noise
    if (SILENT_PREFIXES.some((p) => req.path.startsWith(p))) {
      return next.handle();
    }

    const startedAt = process.hrtime.bigint();
    const correlationId =
      req.correlationId ??
      correlationIdStorage.getStore()?.correlationId ??
      null;

    const finish = (status: number, err?: unknown): void => {
      const durationMs =
        Number(process.hrtime.bigint() - startedAt) / 1_000_000;

      const payload: RequestLog = {
        msg: 'request',
        correlationId,
        method: req.method,
        path: req.originalUrl,
        status,
        durationMs: Math.round(durationMs * 100) / 100,
        userId: req.user?.id,
        userAgent: req.get('user-agent')?.slice(0, 200),
        ip: req.ip,
      };

      // Only capture the error *class/message*, never the stack — the
      // AllExceptionsFilter already captured the full stack to Sentry.
      if (err instanceof Error && status >= 500) {
        payload.err = `${err.name}: ${err.message}`;
      }

      // Error-level for 5xx so Railway alerting can key on it; info otherwise.
      if (status >= 500) this.logger.error(payload);
      else if (status >= 400) this.logger.warn(payload);
      else this.logger.log(payload);
    };

    return next.handle().pipe(
      tap(() => finish(res.statusCode)),
      catchError((err: unknown) => {
        // The exception filter will set the real status, but for logging
        // we need a best-effort number; default 500 if unknown.
        const status =
          typeof err === 'object' && err !== null && 'getStatus' in err &&
          typeof (err as { getStatus: unknown }).getStatus === 'function'
            ? (err as { getStatus: () => number }).getStatus()
            : 500;
        finish(status, err);
        return throwError(() => err);
      }),
    );
  }
}
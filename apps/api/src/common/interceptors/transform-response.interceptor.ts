// src/common/interceptors/transform-response.interceptor.ts
import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import type { Request, Response } from 'express';

export interface SuccessEnvelope<T> {
  data: T;
  meta: {
    correlationId: string | null;
    timestamp: string;
  };
}

/**
 * Paths that must bypass the envelope:
 * - /health*        → Terminus expects its raw shape for Railway probes
 * - /metrics        → Prometheus scraper (future)
 * - /docs*          → Swagger UI assets
 */
const BYPASS_PREFIXES = ['/health', '/metrics', '/docs'];

@Injectable()
export class TransformResponseInterceptor<T>
  implements NestInterceptor<T, SuccessEnvelope<T> | T>
{
  intercept(
    context: ExecutionContext,
    next: CallHandler<T>,
  ): Observable<SuccessEnvelope<T> | T> {
    const ctx = context.switchToHttp();
    const req = ctx.getRequest<Request & { correlationId?: string }>();
    const res = ctx.getResponse<Response>();

    // Bypass for infra endpoints
    if (BYPASS_PREFIXES.some((p) => req.path.startsWith(p))) {
      return next.handle();
    }

    // Bypass if a previous layer already set the envelope (defensive)
    if (res.getHeader('x-onside-enveloped') === '1') {
      return next.handle();
    }

    return next.handle().pipe(
      map((data) => {
        // 204 / empty body → don't wrap
        if (data === undefined || data === null) {
          return data as unknown as T;
        }

        // Already enveloped (e.g. paginated responses from a use case)
        if (
          typeof data === 'object' &&
          data !== null &&
          'data' in data &&
          'meta' in data
        ) {
          return data as unknown as SuccessEnvelope<T>;
        }

        res.setHeader('x-onside-enveloped', '1');
        return {
          data,
          meta: {
            correlationId: req.correlationId ?? null,
            timestamp: new Date().toISOString(),
          },
        };
      }),
    );
  }
}
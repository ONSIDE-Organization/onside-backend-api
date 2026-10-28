// src/common/middleware/correlation-id.middleware.ts
import { Injectable, NestMiddleware } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { AsyncLocalStorage } from 'node:async_hooks';
import type { Request, Response, NextFunction } from 'express';

/**
 * AsyncLocalStorage instance shared with the logger so any code path can
 * read the current correlation ID via `correlationIdStorage.getStore()`.
 * Exported here so it has exactly one definition across the app.
 */
export const correlationIdStorage = new AsyncLocalStorage<{ correlationId: string }>();

const HEADER = 'x-correlation-id';
const CORRELATION_ID_REGEX = /^[a-zA-Z0-9._-]{8,128}$/;

@Injectable()
export class CorrelationIdMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction): void {
    // Honor a well-formed inbound ID (from mobile client / gateway),
    // otherwise mint a fresh UUID. Reject malformed to prevent header injection.
    const inbound = req.headers[HEADER];
    const candidate = Array.isArray(inbound) ? inbound[0] : inbound;

    const correlationId =
      typeof candidate === 'string' && CORRELATION_ID_REGEX.test(candidate)
        ? candidate
        : randomUUID();

    // Attach to request + response so downstream filters/logs can read it
    // even outside the ALS context (e.g. Express internals).
    (req as Request & { correlationId: string }).correlationId = correlationId;
    res.setHeader(HEADER, correlationId);

    // Run the rest of the request inside the ALS context.
    correlationIdStorage.run({ correlationId }, () => next());
  }
}
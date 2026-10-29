// src/common/pipes/zod-validation.pipe.ts
import {
  ArgumentMetadata,
  BadRequestException,
  Injectable,
  PipeTransform,
} from '@nestjs/common';
import type { ZodSchema } from 'zod';

/**
 * Bridges Zod schemas to Nest's pipe system.
 *
 * Usage:
 *   @UsePipes(new ZodValidationPipe(loginSchema))
 *   async login(@Body() dto: LoginDto) { … }
 *
 * Why not class-validator:
 *  - Zod schemas live in packages/shared and are consumed by the
 *    mobile client too. One source of truth beats duplicated rules.
 *  - Zod's `.safeParse` returns typed errors we can map to our envelope.
 *
 * Error shape: BadRequestException → AllExceptionsFilter →
 *   { error: { status: 400, code: 'VALIDATION_ERROR', message, ... } }
 * with `message` containing all Zod issues joined. Mobile can render
 * per-field errors by parsing the joined string OR (M2+) we split them
 * into a `fields` array — do that when the first form with >2 fields ships.
 */
@Injectable()
export class ZodValidationPipe implements PipeTransform {
  constructor(private readonly schema: ZodSchema) {}

  transform(value: unknown, _metadata: ArgumentMetadata): unknown {
    const result = this.schema.safeParse(value);
    if (!result.success) {
      const issues = result.error.issues.map((i) => ({
        path: i.path.join('.'),
        message: i.message,
      }));
      throw new BadRequestException({
        status: 400,
        code: 'VALIDATION_ERROR',
        message: issues.map((i) => `${i.path}: ${i.message}`).join('; '),
      });
    }
    return result.data;
  }
}
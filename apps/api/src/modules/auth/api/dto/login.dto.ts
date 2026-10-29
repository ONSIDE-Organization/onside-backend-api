// src/modules/auth/api/dto/login.dto.ts
import { z } from 'zod';

/**
 * Zod schema for POST /auth/login.
 *
 * Kept in Zod (not class-validator) because:
 *  - packages/shared will export this for the mobile client (M2+).
 *  - Zod gives us runtime validation AND TypeScript inference from one source.
 *  - The controller uses a small inline pipe to bridge Zod → Nest;
 *    when M2 lands a proper ZodValidationPipe, this file needs zero changes.
 */
export const loginSchema = z.object({
  idToken: z
    .string()
    .min(20, 'idToken is too short to be a Firebase ID token')
    .max(4096, 'idToken is too long'),
});

export type LoginDto = z.infer<typeof loginSchema>;
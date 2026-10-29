// src/modules/auth/api/dto/auth.dto.ts
import { z } from 'zod';

const baseAuthSchema = z.object({
  idToken: z.string().min(20).max(4096),
});

export const loginSchema = baseAuthSchema;
export type LoginDto = z.infer<typeof loginSchema>;

export const registerSchema = baseAuthSchema.extend({
  username: z
    .string()
    .min(3, 'Username must be at least 3 characters')
    .max(20, 'Username must be at most 20 characters')
    .regex(
      /^[a-zA-Z0-9_]+$/,
      'Username can only contain letters, numbers, and underscores',
    ),
  displayName: z.string().min(1, 'Display name is required').max(50),
  avatarUrl: z.string().url().optional().nullable(),
});
export type RegisterDto = z.infer<typeof registerSchema>;

export const checkUsernameSchema = z.object({
  username: z.string().min(3).max(20),
});
export type CheckUsernameDto = z.infer<typeof checkUsernameSchema>;
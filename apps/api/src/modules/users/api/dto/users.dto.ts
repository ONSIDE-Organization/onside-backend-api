// src/modules/users/api/dto/users.dto.ts
import { z } from 'zod';

export const updateMeSchema = z
  .object({
    displayName: z.string().min(1).max(50).optional(),
    avatarUrl: z.string().url().nullable().optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: 'At least one field must be provided',
  });

export type UpdateMeDto = z.infer<typeof updateMeSchema>;

// No body for DELETE — kept as a type-only placeholder if needed later
export const deleteMeSchema = z.object({}).strict();
export type DeleteMeDto = z.infer<typeof deleteMeSchema>;
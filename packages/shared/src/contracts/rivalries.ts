import { z } from 'zod';

export const createRivalrySchema = z.object({
  opponentId: z.string().min(1),
  matchweekId: z.string().min(1),
});
export type CreateRivalryContract = z.infer<typeof createRivalrySchema>;

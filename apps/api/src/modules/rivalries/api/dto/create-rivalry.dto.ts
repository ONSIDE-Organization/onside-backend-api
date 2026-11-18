import { z } from 'zod';

export const createRivalrySchema = z.object({
  opponentId: z.string().uuid(),
  statement: z.string().min(5).max(200),
  category: z.enum(['TEAMS', 'GOALSCORERS', 'ASSISTS', 'MATCHWEEK', 'MANAGERS']),
  predictionId: z.string().uuid().optional(), // If created from Predict tab
});

export type CreateRivalryDto = z.infer<typeof createRivalrySchema>;
import { z } from 'zod';

export const predictionSchema = z.object({
  matchweekId: z.string().min(1),
  homeScore: z.number().int().min(0),
  awayScore: z.number().int().min(0),
});
export type PredictionContract = z.infer<typeof predictionSchema>;

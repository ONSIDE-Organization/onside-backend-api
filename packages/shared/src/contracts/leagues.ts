import { z } from 'zod';

export const createLeagueSchema = z.object({
  name: z.string().trim().min(2).max(80),
  isPrivate: z.boolean().default(false),
});
export type CreateLeagueContract = z.infer<typeof createLeagueSchema>;

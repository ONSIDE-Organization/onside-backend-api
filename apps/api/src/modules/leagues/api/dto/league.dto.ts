import { z } from 'zod';

export const createLeagueSchema = z.object({
  name: z.string().min(3).max(50),
});

export type CreateLeagueDto = z.infer<typeof createLeagueSchema>;

export const joinLeagueSchema = z.object({
  inviteCode: z.string().length(6, 'Invite code must be exactly 6 characters'),
});

export type JoinLeagueDto = z.infer<typeof joinLeagueSchema>;
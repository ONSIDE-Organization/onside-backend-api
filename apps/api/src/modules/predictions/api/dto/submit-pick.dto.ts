// src/modules/predictions/api/dto/submit-pick.dto.ts
import { z } from 'zod';

export const submitPickSchema = z.object({
  predictionId: z.string().uuid(),
  selectedOption: z.string().min(1).max(100),
});

export type SubmitPickDto = z.infer<typeof submitPickSchema>;
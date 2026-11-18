// // src/modules/predictions/api/dto/submit-pick.dto.ts
// import { z } from 'zod';

// export const submitPickSchema = z.object({
//   predictionId: z.string().uuid(),
//   selectedOption: z.string().min(1).max(100),
// });


// export type SubmitPickDto = z.infer<typeof submitPickSchema>;
// src/modules/predictions/api/dto/submit-picks.dto.ts
import { z } from 'zod';

export const submitPicksSchema = z.object({
  matchweekId: z.string().uuid(),
  picks: z.array(
    z.object({
      predictionId: z.string().uuid(),
      selectedOption: z.string().min(1).max(100),
    })
  ).min(1, 'Must submit at least one pick'),
});

export type SubmitPicksDto = z.infer<typeof submitPicksSchema>;
export const defaultJobOptions = {
  attempts: 5,
  backoff: { type: 'exponential' as const, delay: 1_000 },
  removeOnComplete: 1_000,
  removeOnFail: 5_000,
};

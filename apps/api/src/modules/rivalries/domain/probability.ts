/** Pure probability calculations belong in domain/ and should be unit tested. */
export function calculateProbability(homeVotes: number, awayVotes: number): number {
  const total = homeVotes + awayVotes;
  if (total <= 0) return 0;
  return homeVotes / total;
}

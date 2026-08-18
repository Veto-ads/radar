export function normalizeAdDuration(seconds: number): number {
  if (seconds < 13) return 10;
  if (seconds <= 15) return 15;
  return 20;
}

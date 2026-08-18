const DAY_MS = 24 * 60 * 60 * 1000;

// A board's price covers a fixed rental window (price_duration_days) starting from
// whichever sighting opens it. Any later sighting that still falls inside that window
// is already paid for; only a sighting landing on/after the window's end opens — and
// pays for — a new one. This walks distinct sighting dates in order and counts those
// windows, rather than dividing total sighting-day counts by the duration.
export function countBillingCycles(sortedDates: string[], durationDays: number): number {
  if (sortedDates.length === 0) return 0;
  let cycles = 1;
  let anchor = new Date(sortedDates[0]).getTime();
  for (let i = 1; i < sortedDates.length; i++) {
    const current = new Date(sortedDates[i]).getTime();
    const diffDays = Math.round((current - anchor) / DAY_MS);
    if (diffDays >= durationDays) {
      cycles++;
      anchor = current;
    }
  }
  return cycles;
}

export function estimateSpend(dates: string[], price: number, durationDays: number): number {
  const uniqueSorted = Array.from(new Set(dates)).sort();
  return countBillingCycles(uniqueSorted, durationDays) * price;
}

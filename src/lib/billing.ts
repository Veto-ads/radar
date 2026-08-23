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

export type BoardSpendRow = {
  board_type: string;
  price: number;
  duration: number;
  captured_date: string;
};

// Boards of the same type are the same media slot at the same rate — a
// company spotted on "Mezah B", "Mezah D", and "Mezah E" within one rental
// window is one "Mezah" booking, not three. So billing groups by board TYPE
// rather than by individual board, and (defensively, in case one board row
// was entered with a stale price) takes the highest price/duration seen for
// that type rather than assuming they're all identical.
export function spendAmountsByType(rows: BoardSpendRow[]): number[] {
  const byType = new Map<string, { price: number; duration: number; dates: string[] }>();
  for (const r of rows) {
    const bucket = byType.get(r.board_type);
    if (bucket) {
      bucket.dates.push(r.captured_date);
      bucket.price = Math.max(bucket.price, r.price);
      bucket.duration = Math.max(bucket.duration, r.duration);
    } else {
      byType.set(r.board_type, { price: r.price, duration: r.duration, dates: [r.captured_date] });
    }
  }
  return Array.from(byType.values()).map(({ price, duration, dates }) => estimateSpend(dates, price, duration));
}

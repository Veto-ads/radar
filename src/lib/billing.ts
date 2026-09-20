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

// Package discount: a company booking 2+ different board types (types, not
// individual boards — matches spendAmountsByType's grouping) gets 20% off
// its total spend for the period. This only discounts the summed total; it
// does not change how each type's own cycles/amount are computed above.
const MULTI_TYPE_DISCOUNT_RATE = 0.2;

export function applyMultiTypeDiscount(typeAmounts: number[]): number {
  const total = typeAmounts.reduce((sum, a) => sum + a, 0);
  return typeAmounts.length >= 2 ? total * (1 - MULTI_TYPE_DISCOUNT_RATE) : total;
}

export type BoardRepeatRow = {
  board_type: string;
  repeats_per_day: number;
  duration: number;
  captured_date: string;
};

// Same "one rental window, one charge" idea as spendAmountsByType, but for
// the AI's per-video repeats-per-day estimate instead of price: a company
// re-sighted on the same board type before its rental window elapses is
// still the same booking, so that re-sighting doesn't add a second
// daily-repeat count on top — only the highest estimate seen within a given
// window counts (defensive, in case two sightings within the same window
// disagree), and only a sighting landing on/after the window's end opens a
// new one whose repeats add to the total.
function repeatsPerCycle(sorted: { date: string; repeats: number }[], durationDays: number): number[] {
  if (sorted.length === 0) return [];
  const cycles: number[] = [sorted[0].repeats];
  let anchor = new Date(sorted[0].date).getTime();
  for (let i = 1; i < sorted.length; i++) {
    const current = new Date(sorted[i].date).getTime();
    const diffDays = Math.round((current - anchor) / DAY_MS);
    if (diffDays >= durationDays) {
      cycles.push(sorted[i].repeats);
      anchor = current;
    } else {
      cycles[cycles.length - 1] = Math.max(cycles[cycles.length - 1], sorted[i].repeats);
    }
  }
  return cycles;
}

export function repeatsAmountsByType(rows: BoardRepeatRow[]): number[] {
  const byType = new Map<string, { duration: number; entries: { date: string; repeats: number }[] }>();
  for (const r of rows) {
    const bucket = byType.get(r.board_type);
    if (bucket) {
      bucket.entries.push({ date: r.captured_date, repeats: r.repeats_per_day });
      bucket.duration = Math.max(bucket.duration, r.duration);
    } else {
      byType.set(r.board_type, { duration: r.duration, entries: [{ date: r.captured_date, repeats: r.repeats_per_day }] });
    }
  }
  return Array.from(byType.values()).map(({ duration, entries }) => {
    const sorted = [...entries].sort((a, b) => a.date.localeCompare(b.date));
    return repeatsPerCycle(sorted, duration).reduce((sum, v) => sum + v, 0);
  });
}

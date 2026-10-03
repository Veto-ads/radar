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

export type BoardCycleRow = {
  board_type: string;
  duration: number;
  captured_date: string;
};

// Same grouping and cycle walk as spendAmountsByType, but keeps the type name
// and returns the number of booking cycles per type instead of a price — the
// shared basis for the dashboard's "how much did this company book" metrics
// (a re-sighting inside an open rental window is not a new booking).
export function billingCyclesByType(rows: BoardCycleRow[]): Map<string, number> {
  const byType = new Map<string, { duration: number; dates: string[] }>();
  for (const r of rows) {
    const bucket = byType.get(r.board_type);
    if (bucket) {
      bucket.dates.push(r.captured_date);
      bucket.duration = Math.max(bucket.duration, r.duration);
    } else {
      byType.set(r.board_type, { duration: r.duration, dates: [r.captured_date] });
    }
  }
  const cycles = new Map<string, number>();
  for (const [type, { duration, dates }] of byType) {
    cycles.set(type, countBillingCycles(Array.from(new Set(dates)).sort(), duration));
  }
  return cycles;
}

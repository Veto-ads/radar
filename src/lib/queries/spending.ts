import { getDb } from "@/lib/db";
import { estimateSpend } from "@/lib/billing";

type Row = {
  entity: string;
  board_id: string;
  price: number;
  duration: number;
  captured_date: string;
};

function aggregateSpend(rows: Row[]): { entity: string; amount: number }[] {
  const byEntityBoard = new Map<string, { entity: string; price: number; duration: number; dates: string[] }>();
  for (const r of rows) {
    const key = `${r.entity}::${r.board_id}`;
    const bucket = byEntityBoard.get(key);
    if (bucket) bucket.dates.push(r.captured_date);
    else byEntityBoard.set(key, { entity: r.entity, price: r.price, duration: r.duration, dates: [r.captured_date] });
  }

  const totals = new Map<string, number>();
  for (const { entity, price, duration, dates } of byEntityBoard.values()) {
    const amount = estimateSpend(dates, price, duration);
    totals.set(entity, (totals.get(entity) || 0) + amount);
  }

  return Array.from(totals, ([entity, amount]) => ({ entity, amount })).sort((a, b) => b.amount - a.amount);
}

export function getSpendingStats(from: string, to: string) {
  const db = getDb();
  const params = { from, to };

  const companyRows = db
    .prepare(
      `SELECT a.company_name as entity, b.id as board_id, b.price as price,
              b.price_duration_days as duration, s.captured_date as captured_date
       FROM ads a JOIN sightings s ON s.id=a.sighting_id JOIN boards b ON b.id=s.board_id
       WHERE s.status='analyzed' AND s.captured_date BETWEEN @from AND @to`
    )
    .all(params) as Row[];

  const sectorRows = db
    .prepare(
      `SELECT a.sector as entity, b.id as board_id, b.price as price,
              b.price_duration_days as duration, s.captured_date as captured_date
       FROM ads a JOIN sightings s ON s.id=a.sighting_id JOIN boards b ON b.id=s.board_id
       WHERE s.status='analyzed' AND s.captured_date BETWEEN @from AND @to`
    )
    .all(params) as Row[];

  const byCompany = aggregateSpend(companyRows)
    .slice(0, 10)
    .map((r) => ({ company: r.entity, amount: r.amount }));
  const bySector = aggregateSpend(sectorRows)
    .slice(0, 10)
    .map((r) => ({ sector: r.entity, amount: r.amount }));

  return { byCompany, bySector };
}

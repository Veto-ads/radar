import { getDb } from "@/lib/db";
import { spendAmountsByType, applyMultiTypeDiscount } from "@/lib/billing";

type Row = {
  entity: string;
  board_type: string;
  price: number;
  duration: number;
  captured_date: string;
};

// `applyDiscount` is only meaningful for the company breakdown — the
// multi-type package discount is a per-company deal ("a company booking 2+
// board types gets 20% off"), not a property of a sector (which naturally
// spans many companies and types), so the sector breakdown never applies it.
function aggregateSpend(rows: Row[], applyDiscount: boolean): { entity: string; amount: number }[] {
  const byEntity = new Map<string, Row[]>();
  for (const r of rows) {
    const list = byEntity.get(r.entity);
    if (list) list.push(r);
    else byEntity.set(r.entity, [r]);
  }

  const totals = Array.from(byEntity, ([entity, entityRows]) => {
    const typeAmounts = spendAmountsByType(entityRows);
    const amount = applyDiscount
      ? applyMultiTypeDiscount(typeAmounts)
      : typeAmounts.reduce((sum, a) => sum + a, 0);
    return { entity, amount };
  });

  return totals.sort((a, b) => b.amount - a.amount);
}

export function getSpendingStats(from: string, to: string) {
  const db = getDb();
  const params = { from, to };

  const companyRows = db
    .prepare(
      `SELECT a.company_name as entity, b.type as board_type, b.price as price,
              b.price_duration_days as duration, s.captured_date as captured_date
       FROM ads a JOIN sightings s ON s.id=a.sighting_id JOIN boards b ON b.id=s.board_id
       WHERE s.status='analyzed' AND s.captured_date BETWEEN @from AND @to`
    )
    .all(params) as Row[];

  const sectorRows = db
    .prepare(
      `SELECT a.sector as entity, b.type as board_type, b.price as price,
              b.price_duration_days as duration, s.captured_date as captured_date
       FROM ads a JOIN sightings s ON s.id=a.sighting_id JOIN boards b ON b.id=s.board_id
       WHERE s.status='analyzed' AND s.captured_date BETWEEN @from AND @to`
    )
    .all(params) as Row[];

  const byCompany = aggregateSpend(companyRows, true)
    .slice(0, 10)
    .map((r) => ({ company: r.entity, amount: r.amount }));
  const bySector = aggregateSpend(sectorRows, false)
    .slice(0, 10)
    .map((r) => ({ sector: r.entity, amount: r.amount }));

  return { byCompany, bySector };
}

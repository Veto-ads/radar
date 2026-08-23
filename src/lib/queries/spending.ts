import { getDb } from "@/lib/db";
import { spendAmountsByType } from "@/lib/billing";

type Row = {
  entity: string;
  board_type: string;
  price: number;
  duration: number;
  captured_date: string;
};

function aggregateSpend(rows: Row[]): { entity: string; amount: number }[] {
  const byEntity = new Map<string, Row[]>();
  for (const r of rows) {
    const list = byEntity.get(r.entity);
    if (list) list.push(r);
    else byEntity.set(r.entity, [r]);
  }

  const totals = Array.from(byEntity, ([entity, entityRows]) => ({
    entity,
    amount: spendAmountsByType(entityRows).reduce((sum, a) => sum + a, 0),
  }));

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

  const byCompany = aggregateSpend(companyRows)
    .slice(0, 10)
    .map((r) => ({ company: r.entity, amount: r.amount }));
  const bySector = aggregateSpend(sectorRows)
    .slice(0, 10)
    .map((r) => ({ sector: r.entity, amount: r.amount }));

  return { byCompany, bySector };
}

import { getDb } from "@/lib/db";
import { billingCyclesByType } from "@/lib/billing";

export function getDashboardStats(from: string, to: string, category: string) {
  const db = getDb();
  const catClause = category === "all" ? "" : "AND b.category = @category";
  const params = { from, to, category };
  const today = new Date().toISOString().slice(0, 10);

  const totals = db
    .prepare(
      `SELECT COUNT(*) as ads, COUNT(DISTINCT a.company_name) as companies,
              COUNT(DISTINCT a.sector) as sectors, COUNT(DISTINCT b.id) as boards
       FROM ads a JOIN sightings s ON s.id = a.sighting_id JOIN boards b ON b.id = s.board_id
       WHERE s.status='analyzed' AND s.captured_date BETWEEN @from AND @to ${catClause}`
    )
    .get(params);

  // Kept in the payload for the public API; the dashboard now shows latestAds.
  const companiesToday = db
    .prepare(
      `SELECT a.company_name as name, COUNT(DISTINCT b.type) as count
       FROM ads a JOIN sightings s ON s.id=a.sighting_id JOIN boards b ON b.id=s.board_id
       WHERE s.status='analyzed' AND s.captured_date = @today ${catClause}
       GROUP BY a.company_name ORDER BY count DESC LIMIT 8`
    )
    .all({ today, category });

  // "أحدث الإعلانات": companies whose monitoring began most recently, among
  // those with an ad in the last 14 days of the selected period. Ranked by
  // when the company first appeared (not by how often it was sighted), so a
  // company that started today outranks one sighted ten times this fortnight.
  const windowStart = new Date(new Date(to).getTime() - 13 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
  const latestAds = db
    .prepare(
      `SELECT a.company_name as name, MIN(s.captured_date) as first_date, MAX(s.captured_date) as last_date
       FROM ads a JOIN sightings s ON s.id=a.sighting_id JOIN boards b ON b.id=s.board_id
       WHERE s.status='analyzed' AND s.captured_date <= @to ${catClause}
       GROUP BY a.company_name
       HAVING MAX(s.captured_date) >= @windowStart
       ORDER BY first_date DESC, last_date DESC, name ASC LIMIT 8`
    )
    .all({ to, category, windowStart }) as { name: string; first_date: string; last_date: string }[];

  const sectorsDist = db
    .prepare(
      `SELECT a.sector as sector, COUNT(*) as count
       FROM ads a JOIN sightings s ON s.id=a.sighting_id JOIN boards b ON b.id=s.board_id
       WHERE s.status='analyzed' AND s.captured_date BETWEEN @from AND @to ${catClause}
       GROUP BY a.sector ORDER BY count DESC`
    )
    .all(params);

  const sectorByMedia = db
    .prepare(
      `SELECT a.sector as sector, b.type as board_type, COUNT(*) as count
       FROM ads a JOIN sightings s ON s.id=a.sighting_id JOIN boards b ON b.id=s.board_id
       WHERE s.status='analyzed' AND s.captured_date BETWEEN @from AND @to ${catClause}
       GROUP BY a.sector, b.type ORDER BY count DESC`
    )
    .all(params);

  const topSectors = db
    .prepare(
      `SELECT a.sector as sector, COUNT(*) as count
       FROM ads a JOIN sightings s ON s.id=a.sighting_id JOIN boards b ON b.id=s.board_id
       WHERE s.status='analyzed' AND s.captured_date BETWEEN @from AND @to ${catClause}
       GROUP BY a.sector ORDER BY count DESC LIMIT 6`
    )
    .all(params);

  // Booking-cycle basis shared by "أكثر الإعلانات تكراراً" and "أكثر الشركات
  // إعلاناً": a company's sightings are grouped by board TYPE (not individual
  // board) and counted in rental cycles — the type's price_duration_days,
  // two weeks by default — so a re-sighting inside an open cycle isn't a new
  // booking and only a sighting after the cycle ends adds one. Same cycle
  // walk as spending; see billingCyclesByType in billing.ts.
  type CycleSourceRow = {
    company: string;
    sector: string;
    board_type: string;
    duration: number;
    captured_date: string;
  };

  const cycleSourceRows = db
    .prepare(
      `SELECT a.company_name as company, a.sector as sector, b.type as board_type,
              b.price_duration_days as duration, s.captured_date as captured_date
       FROM ads a JOIN sightings s ON s.id=a.sighting_id JOIN boards b ON b.id=s.board_id
       WHERE s.status='analyzed' AND s.captured_date BETWEEN @from AND @to ${catClause}`
    )
    .all(params) as CycleSourceRow[];

  // Booking cycles per board type, for each group key.
  function cyclesByKey(keyOf: (r: CycleSourceRow) => string[]) {
    const byKey = new Map<string, { key: string[]; rows: CycleSourceRow[] }>();
    for (const r of cycleSourceRows) {
      const key = keyOf(r);
      const joined = key.join("::");
      const bucket = byKey.get(joined);
      if (bucket) bucket.rows.push(r);
      else byKey.set(joined, { key, rows: [r] });
    }
    return Array.from(byKey.values(), ({ key, rows }) => ({ key, cycles: billingCyclesByType(rows) }));
  }

  const sumCycles = (cycles: Map<string, number>) =>
    Array.from(cycles.values()).reduce((sum, n) => sum + n, 0);

  // "أكثر الإعلانات تكراراً": media diversity x faces. For every board type a
  // company appeared on it earns that type's total faces (sum of boards.faces
  // over every board of the type, honouring the category filter) once per
  // booking cycle, e.g. a company on "Digital Mezahpole" and "Digital Mupis"
  // scores faces(Mezahpole) + faces(Mupis) per cycle of each.
  const facesByType = new Map(
    (
      db
        .prepare(
          `SELECT b.type as type, COALESCE(SUM(b.faces), 0) as faces
           FROM boards b WHERE 1=1 ${catClause} GROUP BY b.type`
        )
        .all({ category }) as { type: string; faces: number }[]
    ).map((r) => [r.type, r.faces])
  );

  const topRepeatedAds = cyclesByKey((r) => [r.company])
    .map(({ key, cycles }) => ({
      company: key[0],
      board_types: Array.from(cycles.keys()).sort(),
      total_faces: Array.from(cycles, ([type, n]) => n * (facesByType.get(type) || 0)).reduce(
        (sum, v) => sum + v,
        0
      ),
    }))
    .sort((a, b) => b.total_faces - a.total_faces || b.board_types.length - a.board_types.length)
    .slice(0, 10);

  const trend = db
    .prepare(
      `SELECT s.captured_date as date, COUNT(*) as count
       FROM ads a JOIN sightings s ON s.id=a.sighting_id JOIN boards b ON b.id=s.board_id
       WHERE s.status='analyzed' AND s.captured_date BETWEEN @from AND @to ${catClause}
       GROUP BY s.captured_date ORDER BY s.captured_date ASC`
    )
    .all(params);

  // "أكثر الشركات إعلاناً": the board types the company appeared on, each
  // counted once per booking cycle (the sum of its per-type cycles).
  const topCompanies = cyclesByKey((r) => [r.company])
    .map(({ key, cycles }) => ({ company: key[0], count: sumCycles(cycles) }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 8);

  // Backs the "أكثر الشركات إعلاناً" sector filter — one pass over every
  // (sector, company) pair so the frontend can filter without a round-trip.
  const companiesBySector = cyclesByKey((r) => [r.sector, r.company])
    .map(({ key, cycles }) => ({ sector: key[0], company: key[1], count: sumCycles(cycles) }))
    .sort((a, b) => b.count - a.count);

  return {
    totals,
    companiesToday,
    latestAds,
    sectorsDist,
    sectorByMedia,
    topSectors,
    topRepeatedAds,
    trend,
    topCompanies,
    companiesBySector,
  };
}

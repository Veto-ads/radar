import { getDb } from "@/lib/db";
import { repeatsAmountsByType } from "@/lib/billing";

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

  const companiesToday = db
    .prepare(
      `SELECT a.company_name as name, COUNT(DISTINCT b.type) as count
       FROM ads a JOIN sightings s ON s.id=a.sighting_id JOIN boards b ON b.id=s.board_id
       WHERE s.status='analyzed' AND s.captured_date = @today ${catClause}
       GROUP BY a.company_name ORDER BY count DESC LIMIT 8`
    )
    .all({ today, category });

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

  // Backs "أكثر الشركات إعلاناً" (and its sector-filtered variant): repeats_per_day
  // is the AI's per-video estimate of how many times an ad plays per day on
  // one screen, so re-analysis/re-sightings of the same company on the same
  // board type within one rental window (14 days by default, or the board's
  // own price_duration_days) must not be summed as if they were separate
  // repeats — see repeatsAmountsByType in billing.ts.
  // "أكثر الإعلانات تكراراً" is derived from the same rows but ranks by media
  // diversity instead (see below).
  type RepeatSourceRow = {
    company: string;
    sector: string;
    board_type: string;
    repeats_per_day: number;
    duration: number;
    captured_date: string;
  };

  const repeatSourceRows = db
    .prepare(
      `SELECT a.company_name as company, a.sector as sector, b.type as board_type,
              a.repeats_per_day as repeats_per_day, b.price_duration_days as duration,
              s.captured_date as captured_date
       FROM ads a JOIN sightings s ON s.id=a.sighting_id JOIN boards b ON b.id=s.board_id
       WHERE s.status='analyzed' AND s.captured_date BETWEEN @from AND @to ${catClause}`
    )
    .all(params) as RepeatSourceRow[];

  function groupRepeatsByKey(keyOf: (r: RepeatSourceRow) => string[]) {
    const byKey = new Map<string, { key: string[]; rows: RepeatSourceRow[] }>();
    for (const r of repeatSourceRows) {
      const key = keyOf(r);
      const joined = key.join("::");
      const bucket = byKey.get(joined);
      if (bucket) bucket.rows.push(r);
      else byKey.set(joined, { key, rows: [r] });
    }
    return Array.from(byKey.values(), ({ key, rows }) => ({
      key,
      total: repeatsAmountsByType(rows).reduce((sum, v) => sum + v, 0),
    }));
  }

  // "أكثر الإعلانات تكراراً" ranks companies by how widely they are spread
  // across the board catalogue, not by how often they were sighted: for every
  // board type a company appeared on, it earns that type's total number of
  // faces (sum of boards.faces for every board of the type, honouring the
  // dashboard's category filter), and each type counts once however many
  // times it was sighted. E.g. a company on "Digital Mezahpole" and "Digital
  // Mupis" scores faces(Digital Mezahpole) + faces(Digital Mupis).
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

  const typesByCompany = new Map<string, Set<string>>();
  for (const r of repeatSourceRows) {
    const set = typesByCompany.get(r.company);
    if (set) set.add(r.board_type);
    else typesByCompany.set(r.company, new Set([r.board_type]));
  }

  const topRepeatedAds = Array.from(typesByCompany, ([company, types]) => {
    const boardTypes = Array.from(types).sort();
    return {
      company,
      board_types: boardTypes,
      total_faces: boardTypes.reduce((sum, t) => sum + (facesByType.get(t) || 0), 0),
    };
  })
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

  const topCompanies = groupRepeatsByKey((r) => [r.company])
    .sort((a, b) => b.total - a.total)
    .slice(0, 8)
    .map(({ key, total }) => ({ company: key[0], count: total }));

  // Backs the "أكثر الشركات إعلاناً" sector filter — one pass over every
  // (sector, company) pair so the frontend can filter without a round-trip.
  const companiesBySector = groupRepeatsByKey((r) => [r.sector, r.company])
    .sort((a, b) => b.total - a.total)
    .map(({ key, total }) => ({ sector: key[0], company: key[1], count: total }));

  return {
    totals,
    companiesToday,
    sectorsDist,
    sectorByMedia,
    topSectors,
    topRepeatedAds,
    trend,
    topCompanies,
    companiesBySector,
  };
}

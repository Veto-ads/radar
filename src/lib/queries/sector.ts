import { getDb } from "@/lib/db";
import { spendAmountsByType, type BoardSpendRow } from "@/lib/billing";
import { tallyStreets } from "@/lib/streets";

export function getSectorStats(name: string, from: string, to: string) {
  const db = getDb();
  const params = { name, from, to };

  const summary = db
    .prepare(
      `SELECT COUNT(*) as ads_count, COUNT(DISTINCT a.company_name) as companies,
              AVG(a.duration_seconds) as avg_duration, MAX(s.captured_date) as last_ad_date
       FROM ads a JOIN sightings s ON s.id=a.sighting_id
       WHERE s.status='analyzed' AND a.sector=@name AND s.captured_date BETWEEN @from AND @to`
    )
    .get(params);

  const monthsDist = db
    .prepare(
      `SELECT strftime('%Y-%m', s.captured_date) as month, COUNT(*) as count
       FROM ads a JOIN sightings s ON s.id=a.sighting_id
       WHERE s.status='analyzed' AND a.sector=@name AND s.captured_date BETWEEN @from AND @to
       GROUP BY month ORDER BY month ASC`
    )
    .all(params);

  const mediaDist = db
    .prepare(
      `SELECT b.type as type, COUNT(*) as count
       FROM ads a JOIN sightings s ON s.id=a.sighting_id JOIN boards b ON b.id=s.board_id
       WHERE s.status='analyzed' AND a.sector=@name AND s.captured_date BETWEEN @from AND @to
       GROUP BY b.type ORDER BY count DESC`
    )
    .all(params);

  const topCompanies = db
    .prepare(
      `SELECT a.company_name as company, COUNT(*) as count
       FROM ads a JOIN sightings s ON s.id=a.sighting_id
       WHERE s.status='analyzed' AND a.sector=@name AND s.captured_date BETWEEN @from AND @to
       GROUP BY a.company_name ORDER BY count DESC LIMIT 5`
    )
    .all(params);

  const streetsRows = db
    .prepare(
      `SELECT b.streets as streets
       FROM ads a JOIN sightings s ON s.id=a.sighting_id JOIN boards b ON b.id=s.board_id
       WHERE s.status='analyzed' AND a.sector=@name AND s.captured_date BETWEEN @from AND @to`
    )
    .all(params) as { streets: string }[];
  const streetsDist = tallyStreets(streetsRows.map((r) => r.streets));

  const spendRows = db
    .prepare(
      `SELECT b.type as board_type, b.price as price, b.price_duration_days as duration, s.captured_date as captured_date
       FROM ads a JOIN sightings s ON s.id=a.sighting_id JOIN boards b ON b.id=s.board_id
       WHERE s.status='analyzed' AND a.sector=@name AND s.captured_date BETWEEN @from AND @to`
    )
    .all(params) as BoardSpendRow[];

  const spendingTotal = spendAmountsByType(spendRows).reduce((sum, a) => sum + a, 0);

  const archiveRows = db
    .prepare(
      `SELECT strftime('%Y-%m', s.captured_date) as month, a.id, a.frame_image_url, a.objective,
              a.company_name, s.captured_date, b.name as board_name, b.type as board_type
       FROM ads a JOIN sightings s ON s.id=a.sighting_id JOIN boards b ON b.id=s.board_id
       WHERE s.status='analyzed' AND a.sector=@name AND s.captured_date BETWEEN @from AND @to
       ORDER BY s.captured_date DESC`
    )
    .all(params) as {
      month: string;
      id: string;
      frame_image_url: string | null;
      objective: string | null;
      company_name: string;
      captured_date: string;
      board_name: string;
      board_type: string;
    }[];

  const monthlyArchive: Record<string, typeof archiveRows> = {};
  for (const row of archiveRows) {
    if (!monthlyArchive[row.month]) monthlyArchive[row.month] = [];
    monthlyArchive[row.month].push(row);
  }

  return {
    summary,
    monthsDist,
    mediaDist,
    topCompanies,
    streetsDist,
    period_spending: spendingTotal,
    monthlyArchive,
    recentAds: archiveRows.slice(0, 12),
  };
}

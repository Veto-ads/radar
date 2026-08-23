import { getDb } from "@/lib/db";
import { spendAmountsByType, type BoardSpendRow } from "@/lib/billing";
import { tallyStreets } from "@/lib/streets";

export function getCompanyStats(name: string, from: string, to: string) {
  const db = getDb();
  const params = { name, from, to };

  const summary = db
    .prepare(
      `SELECT COUNT(*) as ads_count, AVG(a.duration_seconds) as avg_duration, MAX(s.captured_date) as last_ad_date
       FROM ads a JOIN sightings s ON s.id=a.sighting_id
       WHERE s.status='analyzed' AND a.company_name=@name AND s.captured_date BETWEEN @from AND @to`
    )
    .get(params);

  const topMedia = db
    .prepare(
      `SELECT b.type as type, COUNT(*) as count
       FROM ads a JOIN sightings s ON s.id=a.sighting_id JOIN boards b ON b.id=s.board_id
       WHERE s.status='analyzed' AND a.company_name=@name AND s.captured_date BETWEEN @from AND @to
       GROUP BY b.type ORDER BY count DESC LIMIT 1`
    )
    .get(params);

  const monthsDist = db
    .prepare(
      `SELECT strftime('%Y-%m', s.captured_date) as month, COUNT(*) as count
       FROM ads a JOIN sightings s ON s.id=a.sighting_id
       WHERE s.status='analyzed' AND a.company_name=@name AND s.captured_date BETWEEN @from AND @to
       GROUP BY month ORDER BY month ASC`
    )
    .all(params);

  const mediaDist = db
    .prepare(
      `SELECT b.type as type, COUNT(*) as count
       FROM ads a JOIN sightings s ON s.id=a.sighting_id JOIN boards b ON b.id=s.board_id
       WHERE s.status='analyzed' AND a.company_name=@name AND s.captured_date BETWEEN @from AND @to
       GROUP BY b.type ORDER BY count DESC`
    )
    .all(params);

  const boardsTrend = db
    .prepare(
      `SELECT strftime('%Y-%m', s.captured_date) as month, COUNT(DISTINCT b.id) as count
       FROM ads a JOIN sightings s ON s.id=a.sighting_id JOIN boards b ON b.id=s.board_id
       WHERE s.status='analyzed' AND a.company_name=@name AND s.captured_date BETWEEN @from AND @to
       GROUP BY month ORDER BY month ASC`
    )
    .all(params);

  const spendRows = db
    .prepare(
      `SELECT b.type as board_type, b.price as price, b.price_duration_days as duration, s.captured_date as captured_date
       FROM ads a JOIN sightings s ON s.id=a.sighting_id JOIN boards b ON b.id=s.board_id
       WHERE s.status='analyzed' AND a.company_name=@name AND s.captured_date BETWEEN @from AND @to`
    )
    .all(params) as BoardSpendRow[];

  const typeAmounts = spendAmountsByType(spendRows);
  const spendingTotal = typeAmounts.reduce((sum, a) => sum + a, 0);
  const spendingAvg = typeAmounts.length ? spendingTotal / typeAmounts.length : 0;

  const streetsRows = db
    .prepare(
      `SELECT b.streets as streets
       FROM ads a JOIN sightings s ON s.id=a.sighting_id JOIN boards b ON b.id=s.board_id
       WHERE s.status='analyzed' AND a.company_name=@name AND s.captured_date BETWEEN @from AND @to`
    )
    .all(params) as { streets: string }[];
  const streetsDist = tallyStreets(streetsRows.map((r) => r.streets));

  const archiveRows = db
    .prepare(
      `SELECT strftime('%Y-%m', s.captured_date) as month, a.id, a.frame_image_url, a.objective,
              s.captured_date, b.name as board_name, b.type as board_type
       FROM ads a JOIN sightings s ON s.id=a.sighting_id JOIN boards b ON b.id=s.board_id
       WHERE s.status='analyzed' AND a.company_name=@name AND s.captured_date BETWEEN @from AND @to
       ORDER BY s.captured_date DESC`
    )
    .all(params) as {
      month: string;
      id: string;
      frame_image_url: string | null;
      objective: string | null;
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
    top_media: (topMedia as { type: string } | undefined)?.type || null,
    period_spending: spendingTotal,
    avg_spending: spendingAvg,
    monthsDist,
    mediaDist,
    boardsTrend,
    streetsDist,
    monthlyArchive,
    recentAds: archiveRows.slice(0, 12),
  };
}

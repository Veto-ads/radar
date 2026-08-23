import { getDb } from "@/lib/db";

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

  const topRepeatedAds = db
    .prepare(
      `SELECT a.company_name as company, b.name as board, a.repeats_per_day as repeats_per_day
       FROM ads a JOIN sightings s ON s.id=a.sighting_id JOIN boards b ON b.id=s.board_id
       WHERE s.status='analyzed' AND s.captured_date BETWEEN @from AND @to ${catClause}
       ORDER BY a.repeats_per_day DESC LIMIT 10`
    )
    .all(params);

  const trend = db
    .prepare(
      `SELECT s.captured_date as date, COUNT(*) as count
       FROM ads a JOIN sightings s ON s.id=a.sighting_id JOIN boards b ON b.id=s.board_id
       WHERE s.status='analyzed' AND s.captured_date BETWEEN @from AND @to ${catClause}
       GROUP BY s.captured_date ORDER BY s.captured_date ASC`
    )
    .all(params);

  const topCompanies = db
    .prepare(
      `SELECT a.company_name as company, COUNT(*) as count
       FROM ads a JOIN sightings s ON s.id=a.sighting_id JOIN boards b ON b.id=s.board_id
       WHERE s.status='analyzed' AND s.captured_date BETWEEN @from AND @to ${catClause}
       GROUP BY a.company_name ORDER BY count DESC LIMIT 8`
    )
    .all(params);

  return { totals, companiesToday, sectorsDist, sectorByMedia, topSectors, topRepeatedAds, trend, topCompanies };
}

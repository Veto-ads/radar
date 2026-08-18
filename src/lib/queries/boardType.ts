import { getDb } from "@/lib/db";

export function getBoardTypeStats(type: string, sector: string | null) {
  const db = getDb();
  const params = { type, sector };

  const topSectors = db
    .prepare(
      `SELECT a.sector as sector, COUNT(*) as count
       FROM ads a JOIN sightings s ON s.id=a.sighting_id JOIN boards b ON b.id=s.board_id
       WHERE s.status='analyzed' AND b.type=@type
       GROUP BY a.sector ORDER BY count DESC LIMIT 8`
    )
    .all(params);

  const topCompaniesOverall = db
    .prepare(
      `SELECT a.company_name as company, COUNT(*) as count
       FROM ads a JOIN sightings s ON s.id=a.sighting_id JOIN boards b ON b.id=s.board_id
       WHERE s.status='analyzed' AND b.type=@type
       GROUP BY a.company_name ORDER BY count DESC LIMIT 8`
    )
    .all(params);

  const topCompaniesBySector = sector
    ? db
        .prepare(
          `SELECT a.company_name as company, COUNT(*) as count
           FROM ads a JOIN sightings s ON s.id=a.sighting_id JOIN boards b ON b.id=s.board_id
           WHERE s.status='analyzed' AND b.type=@type AND a.sector=@sector
           GROUP BY a.company_name ORDER BY count DESC LIMIT 8`
        )
        .all(params)
    : [];

  const durationClause = sector ? "AND a.sector=@sector" : "";
  const avgDurationRow = db
    .prepare(
      `SELECT AVG(a.duration_seconds) as avg_duration
       FROM ads a JOIN sightings s ON s.id=a.sighting_id JOIN boards b ON b.id=s.board_id
       WHERE s.status='analyzed' AND b.type=@type ${durationClause}`
    )
    .get(params) as { avg_duration: number | null };

  const boardsRow = db
    .prepare(
      `SELECT COUNT(*) as boards_count, COALESCE(SUM(screens), 0) as screens_count
       FROM boards WHERE type=@type`
    )
    .get({ type }) as { boards_count: number; screens_count: number };

  const today = new Date();
  const monthAgo = new Date(today);
  monthAgo.setDate(monthAgo.getDate() - 29);
  const from = monthAgo.toISOString().slice(0, 10);
  const sectorImgClause = sector ? "AND a.sector=@sector" : "";
  const lastMonthAds = db
    .prepare(
      `SELECT a.id, a.frame_image_url, a.company_name, s.captured_date, b.name as board_name
       FROM ads a JOIN sightings s ON s.id=a.sighting_id JOIN boards b ON b.id=s.board_id
       WHERE s.status='analyzed' AND b.type=@type AND s.captured_date >= @from ${sectorImgClause}
       AND a.frame_image_url IS NOT NULL
       ORDER BY s.captured_date DESC LIMIT 24`
    )
    .all({ ...params, from });

  return {
    topSectors,
    topCompaniesOverall,
    topCompaniesBySector,
    avg_duration: avgDurationRow.avg_duration || 0,
    boards_count: boardsRow.boards_count,
    screens_count: boardsRow.screens_count,
    lastMonthAds,
  };
}

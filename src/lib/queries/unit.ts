import { getDb } from "@/lib/db";
import type { RawTypeCount } from "@/lib/unitMatching";

export function getAllBoardTypesWithCounts(): RawTypeCount[] {
  const db = getDb();
  return db.prepare(`SELECT type, COUNT(*) as count FROM boards GROUP BY type`).all() as RawTypeCount[];
}

export function getUnitAdCountsByType(from: string, to: string): RawTypeCount[] {
  const db = getDb();
  return db
    .prepare(
      `SELECT b.type as type, COUNT(*) as count
       FROM ads a JOIN sightings s ON s.id=a.sighting_id JOIN boards b ON b.id=s.board_id
       WHERE s.status='analyzed' AND s.captured_date BETWEEN ? AND ?
       GROUP BY b.type`
    )
    .all(from, to) as RawTypeCount[];
}

export function getUnitStats(rawTypes: string[], from: string, to: string) {
  const db = getDb();
  const ph = rawTypes.map(() => "?").join(",");

  const topSectors = db
    .prepare(
      `SELECT a.sector as sector, COUNT(*) as count
       FROM ads a JOIN sightings s ON s.id=a.sighting_id JOIN boards b ON b.id=s.board_id
       WHERE s.status='analyzed' AND b.type IN (${ph}) AND s.captured_date BETWEEN ? AND ?
       GROUP BY a.sector ORDER BY count DESC LIMIT 8`
    )
    .all(...rawTypes, from, to);

  const topCompaniesOverall = db
    .prepare(
      `SELECT a.company_name as company, COUNT(*) as count
       FROM ads a JOIN sightings s ON s.id=a.sighting_id JOIN boards b ON b.id=s.board_id
       WHERE s.status='analyzed' AND b.type IN (${ph}) AND s.captured_date BETWEEN ? AND ?
       GROUP BY a.company_name ORDER BY count DESC LIMIT 8`
    )
    .all(...rawTypes, from, to);

  const avgDurationRow = db
    .prepare(
      `SELECT AVG(a.duration_seconds) as avg_duration
       FROM ads a JOIN sightings s ON s.id=a.sighting_id JOIN boards b ON b.id=s.board_id
       WHERE s.status='analyzed' AND b.type IN (${ph}) AND s.captured_date BETWEEN ? AND ?`
    )
    .get(...rawTypes, from, to) as { avg_duration: number | null };

  const boardsRow = db
    .prepare(`SELECT COUNT(*) as boards_count, COALESCE(SUM(screens), 0) as screens_count FROM boards WHERE type IN (${ph})`)
    .get(...rawTypes) as { boards_count: number; screens_count: number };

  const lastMonthAds = db
    .prepare(
      `SELECT a.company_name as advertiser, b.name as board_name, s.captured_date as date, a.frame_image_url as image_url
       FROM ads a JOIN sightings s ON s.id=a.sighting_id JOIN boards b ON b.id=s.board_id
       WHERE s.status='analyzed' AND b.type IN (${ph}) AND s.captured_date BETWEEN ? AND ?
         AND a.frame_image_url IS NOT NULL
       ORDER BY s.captured_date DESC LIMIT 24`
    )
    .all(...rawTypes, from, to) as { advertiser: string; board_name: string; date: string; image_url: string | null }[];

  return {
    boards_count: boardsRow.boards_count,
    screens_count: boardsRow.screens_count,
    avg_duration: avgDurationRow.avg_duration || 0,
    topSectors,
    topCompaniesOverall,
    lastMonthAds,
  };
}

import { getDb } from "@/lib/db";
import type { RawTypeCount } from "@/lib/unitMatching";
import { cityInfoFor } from "@/lib/cityMatching";

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

// Raw `boards.city` values a unit actually has boards in — the source of
// truth for "does this unit cover that city" (used both to resolve the
// public API's `city` query param and to report city coverage on the
// catalog), independent of whether there happen to be any ads in range.
export function getDistinctCitiesForTypes(rawTypes: string[]): string[] {
  const db = getDb();
  const ph = rawTypes.map(() => "?").join(",");
  const rows = db
    .prepare(`SELECT DISTINCT city FROM boards WHERE type IN (${ph}) AND city IS NOT NULL AND city != ''`)
    .all(...rawTypes) as { city: string }[];
  return rows.map((r) => r.city);
}

export function getUnitCities(rawTypes: string[], from: string, to: string) {
  const db = getDb();
  const ph = rawTypes.map(() => "?").join(",");
  const rawCities = getDistinctCitiesForTypes(rawTypes);
  const adCounts = db
    .prepare(
      `SELECT b.city as city, COUNT(*) as count
       FROM ads a JOIN sightings s ON s.id=a.sighting_id JOIN boards b ON b.id=s.board_id
       WHERE s.status='analyzed' AND b.type IN (${ph}) AND s.captured_date BETWEEN ? AND ?
         AND b.city IS NOT NULL AND b.city != ''
       GROUP BY b.city`
    )
    .all(...rawTypes, from, to) as { city: string; count: number }[];
  const countByCity = new Map(adCounts.map((r) => [r.city, r.count]));
  return rawCities.map((raw) => {
    const info = cityInfoFor(raw);
    const ads_count = countByCity.get(raw) || 0;
    return { city_ar: info.ar, city_en: info.en, ads_count, has_stats: ads_count > 0 };
  });
}

export function getUnitStats(rawTypes: string[], from: string, to: string, city?: string | null) {
  const db = getDb();
  const ph = rawTypes.map(() => "?").join(",");
  const cityClause = city ? "AND b.city = ?" : "";
  const cityParams = city ? [city] : [];

  const topSectors = db
    .prepare(
      `SELECT a.sector as sector, COUNT(*) as count
       FROM ads a JOIN sightings s ON s.id=a.sighting_id JOIN boards b ON b.id=s.board_id
       WHERE s.status='analyzed' AND b.type IN (${ph}) AND s.captured_date BETWEEN ? AND ? ${cityClause}
       GROUP BY a.sector ORDER BY count DESC LIMIT 8`
    )
    .all(...rawTypes, from, to, ...cityParams);

  const topCompaniesOverall = db
    .prepare(
      `SELECT a.company_name as company, COUNT(*) as count
       FROM ads a JOIN sightings s ON s.id=a.sighting_id JOIN boards b ON b.id=s.board_id
       WHERE s.status='analyzed' AND b.type IN (${ph}) AND s.captured_date BETWEEN ? AND ? ${cityClause}
       GROUP BY a.company_name ORDER BY count DESC LIMIT 8`
    )
    .all(...rawTypes, from, to, ...cityParams);

  const avgDurationRow = db
    .prepare(
      `SELECT AVG(a.duration_seconds) as avg_duration
       FROM ads a JOIN sightings s ON s.id=a.sighting_id JOIN boards b ON b.id=s.board_id
       WHERE s.status='analyzed' AND b.type IN (${ph}) AND s.captured_date BETWEEN ? AND ? ${cityClause}`
    )
    .get(...rawTypes, from, to, ...cityParams) as { avg_duration: number | null };

  const boardsRow = db
    .prepare(
      `SELECT COUNT(*) as boards_count, COALESCE(SUM(screens), 0) as screens_count
       FROM boards WHERE type IN (${ph}) ${city ? "AND city = ?" : ""}`
    )
    .get(...rawTypes, ...cityParams) as { boards_count: number; screens_count: number };

  const lastMonthAdsRaw = db
    .prepare(
      `SELECT a.company_name as advertiser, b.id as board_id, b.name as board_name, b.city as city,
              s.captured_date as date, a.frame_image_url as image_url
       FROM ads a JOIN sightings s ON s.id=a.sighting_id JOIN boards b ON b.id=s.board_id
       WHERE s.status='analyzed' AND b.type IN (${ph}) AND s.captured_date BETWEEN ? AND ? ${cityClause}
         AND a.frame_image_url IS NOT NULL
       ORDER BY s.captured_date DESC LIMIT 24`
    )
    .all(...rawTypes, from, to, ...cityParams) as {
    advertiser: string;
    board_id: string;
    board_name: string;
    city: string | null;
    date: string;
    image_url: string | null;
  }[];

  const lastMonthAds = lastMonthAdsRaw.map((r) => {
    const info = cityInfoFor(r.city);
    return {
      advertiser: r.advertiser,
      board_id: r.board_id,
      board_name: r.board_name,
      city_ar: info.ar,
      city_en: info.en,
      date: r.date,
      image_url: r.image_url,
    };
  });

  return {
    boards_count: boardsRow.boards_count,
    screens_count: boardsRow.screens_count,
    avg_duration: avgDurationRow.avg_duration || 0,
    topSectors,
    topCompaniesOverall,
    lastMonthAds,
  };
}

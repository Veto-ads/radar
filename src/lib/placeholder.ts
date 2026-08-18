import { randomUUID } from "node:crypto";
import path from "node:path";
import { mkdir, writeFile } from "node:fs/promises";

const SECTOR_COLORS = [
  "#23235A",
  "#50AD68",
  "#00B4D8",
  "#8B8ED5",
  "#409658",
  "#445193",
  "#E04040",
  "#242870",
];

function colorForSector(sector: string): string {
  let hash = 0;
  for (let i = 0; i < sector.length; i++) hash = (hash * 31 + sector.charCodeAt(i)) >>> 0;
  return SECTOR_COLORS[hash % SECTOR_COLORS.length];
}

// Gemini's JSON output cannot carry image bytes; a real captured frame requires
// server-side video decoding (e.g. ffmpeg), unavailable in this environment.
// Emit a sector-colored placeholder instead, matching the design reference's convention.
export async function createSectorFramePlaceholder(
  sector: string,
  companyName: string
): Promise<string> {
  const color = colorForSector(sector);
  const initial = (companyName || sector || "؟").trim().charAt(0);
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="320" height="180" viewBox="0 0 320 180">
    <rect width="320" height="180" fill="${color}"/>
    <text x="160" y="100" font-family="IBM Plex Sans Arabic, sans-serif" font-size="56" fill="white" text-anchor="middle" dominant-baseline="middle">${initial}</text>
  </svg>`;

  const dir = path.join(process.cwd(), "public", "uploads", "frames");
  await mkdir(dir, { recursive: true });
  const fileName = `${randomUUID()}.svg`;
  await writeFile(path.join(dir, fileName), svg, "utf-8");
  return `/uploads/frames/${fileName}`;
}

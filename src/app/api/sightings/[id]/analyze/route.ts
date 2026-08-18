import { NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import path from "node:path";
import { getDb } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { analyzeSightingVideo } from "@/lib/gemini";
import { captureVideoFrame } from "@/lib/frameCapture";
import { createSectorFramePlaceholder } from "@/lib/placeholder";

export async function POST(_request: Request, context: RouteContext<"/api/sightings/[id]/analyze">) {
  const session = await getSession();
  if (!session?.permissions.review) {
    return NextResponse.json({ error: "غير مصرح" }, { status: 403 });
  }

  const { id } = await context.params;
  const db = getDb();
  const sighting = db.prepare("SELECT * FROM sightings WHERE id = ?").get(id) as
    | { id: string; video_url: string; status: string }
    | undefined;
  if (!sighting) return NextResponse.json({ error: "الرصد غير موجود" }, { status: 404 });

  const promptRow = db.prepare("SELECT value FROM settings WHERE key = 'gemini_prompt'").get() as {
    value: string;
  };

  const absoluteVideoPath = path.join(process.cwd(), "public", sighting.video_url.replace(/^\//, ""));

  let ads;
  try {
    ads = await analyzeSightingVideo(absoluteVideoPath, promptRow.value, id);
  } catch (err) {
    const message = err instanceof Error ? err.message : "فشل تحليل الفيديو";
    return NextResponse.json({ error: message }, { status: 502 });
  }

  const insertAd = db.prepare(
    `INSERT INTO ads (id, sighting_id, company_name, sector, duration_seconds, repeats_per_minute, repeats_per_day, frame_image_url, objective)
     VALUES (?,?,?,?,?,?,?,?,?)`
  );

  const savedAds = [];
  for (const ad of ads) {
    let frameUrl: string;
    try {
      frameUrl = await captureVideoFrame(absoluteVideoPath, ad.timestamp_seconds);
    } catch (err) {
      console.error("frame capture failed, using placeholder:", err);
      frameUrl = await createSectorFramePlaceholder(ad.sector, ad.company_name);
    }
    const adId = randomUUID();
    insertAd.run(
      adId,
      id,
      ad.company_name,
      ad.sector,
      ad.duration_seconds,
      ad.repeats_per_minute,
      ad.repeats_per_day,
      frameUrl,
      ad.objective
    );
    savedAds.push({ id: adId, ...ad, frame_image_url: frameUrl });
  }

  db.prepare("UPDATE sightings SET status = 'analyzed' WHERE id = ?").run(id);

  return NextResponse.json({ ads: savedAds });
}

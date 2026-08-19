import { NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import path from "node:path";
import { getDb } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { analyzeSightingVideo } from "@/lib/gemini";
import { captureVideoFrame } from "@/lib/frameCapture";
import { createSectorFramePlaceholder } from "@/lib/placeholder";
import { normalizeAdDuration } from "@/lib/adDuration";

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

  db.prepare("DELETE FROM ads WHERE sighting_id = ?").run(id);

  // Frame extraction is the slow part of analysis (ffmpeg decode per ad); running
  // them concurrently instead of one-by-one cuts wall-clock time roughly by the
  // number of ads detected in the video.
  const frameUrls = await Promise.all(
    ads.map(async (ad) => {
      try {
        return await captureVideoFrame(absoluteVideoPath, ad.timestamp_seconds);
      } catch (err) {
        console.error("frame capture failed, using placeholder:", err);
        return createSectorFramePlaceholder(ad.sector, ad.company_name);
      }
    })
  );

  const insertAd = db.prepare(
    `INSERT INTO ads (id, sighting_id, company_name, sector, duration_seconds, repeats_per_minute, repeats_per_day, frame_image_url, objective)
     VALUES (?,?,?,?,?,?,?,?,?)`
  );

  const savedAds = ads.map((ad, i) => {
    const adId = randomUUID();
    const duration = normalizeAdDuration(ad.duration_seconds);
    const frameUrl = frameUrls[i];
    insertAd.run(
      adId,
      id,
      ad.company_name,
      ad.sector,
      duration,
      ad.repeats_per_minute,
      ad.repeats_per_day,
      frameUrl,
      ad.objective
    );
    return { id: adId, ...ad, duration_seconds: duration, frame_image_url: frameUrl };
  });

  db.prepare("UPDATE sightings SET status = 'analyzed' WHERE id = ?").run(id);

  return NextResponse.json({ ads: savedAds });
}

import { randomUUID } from "node:crypto";
import path from "node:path";
import { mkdir } from "node:fs/promises";
import { spawn } from "node:child_process";
import ffmpegPath from "ffmpeg-static";

function runFfmpeg(args: string[]): Promise<void> {
  return new Promise((resolve, reject) => {
    const proc = spawn(ffmpegPath as string, args);
    let stderr = "";
    proc.stderr.on("data", (chunk) => (stderr += chunk.toString()));
    proc.on("error", reject);

    // A stuck seek on a malformed video would otherwise stall the whole
    // analyze request indefinitely, so bound each extraction explicitly.
    const timer = setTimeout(() => {
      proc.kill("SIGKILL");
      reject(new Error("ffmpeg timed out"));
    }, 20_000);

    proc.on("close", (code) => {
      clearTimeout(timer);
      if (code === 0) resolve();
      else reject(new Error(`ffmpeg exited with code ${code}: ${stderr.slice(-500)}`));
    });
  });
}

export async function captureVideoFrame(
  absoluteVideoPath: string,
  timestampSeconds: number
): Promise<string> {
  const dir = path.join(process.cwd(), "public", "uploads", "frames");
  await mkdir(dir, { recursive: true });
  const fileName = `${randomUUID()}.jpg`;
  const outputPath = path.join(dir, fileName);
  const safeTimestamp = Math.max(0, timestampSeconds || 0);

  await runFfmpeg([
    "-ss",
    String(safeTimestamp),
    "-i",
    absoluteVideoPath,
    "-frames:v",
    "1",
    // Frames are only ever shown as thumbnails or in a ~640px zoom modal;
    // capturing at source resolution (often 1080p+) wastes encode time and
    // produces multi-MB files that are slow to load for no visible benefit.
    "-vf",
    "scale='min(640,iw)':-2",
    "-q:v",
    "3",
    "-y",
    outputPath,
  ]);

  return `/uploads/frames/${fileName}`;
}

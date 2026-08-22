import { GoogleGenerativeAI, SchemaType, type Schema } from "@google/generative-ai";
import { GoogleAIFileManager, FileState } from "@google/generative-ai/server";
import { readFile } from "node:fs/promises";

const INLINE_LIMIT_BYTES = 15 * 1024 * 1024;

const responseSchema: Schema = {
  type: SchemaType.OBJECT,
  properties: {
    ads: {
      type: SchemaType.ARRAY,
      items: {
        type: SchemaType.OBJECT,
        properties: {
          company_name: { type: SchemaType.STRING, description: "اسم الشركة المعلنة" },
          sector: { type: SchemaType.STRING, description: "قطاع الشركة" },
          duration_seconds: { type: SchemaType.NUMBER, description: "مدة ظهور الإعلان الواحد بالثواني" },
          repeats_per_minute: { type: SchemaType.NUMBER, description: "عدد مرات التكرار في الدقيقة" },
          repeats_per_day: { type: SchemaType.NUMBER, description: "عدد مرات التكرار في اليوم" },
          objective: { type: SchemaType.STRING, description: "هدف الإعلان بجملة واحدة" },
          timestamp_seconds: {
            type: SchemaType.NUMBER,
            description: "أفضل ثانية في المقطع لالتقاط صورة واضحة لهذا الإعلان",
          },
        },
        required: [
          "company_name",
          "sector",
          "duration_seconds",
          "repeats_per_minute",
          "repeats_per_day",
          "objective",
          "timestamp_seconds",
        ],
      },
    },
  },
  required: ["ads"],
};

export type GeminiAd = {
  company_name: string;
  sector: string;
  duration_seconds: number;
  repeats_per_minute: number;
  repeats_per_day: number;
  objective: string;
  timestamp_seconds?: number;
};

// Sightings can be submitted as a single photo instead of a video (e.g. when
// recording isn't practical). There's no timeline to pick a capture moment
// from, so timestamp_seconds is dropped, and the wording is adapted for a
// still image rather than a clip.
const imageResponseSchema: Schema = {
  type: SchemaType.OBJECT,
  properties: {
    ads: {
      type: SchemaType.ARRAY,
      items: {
        type: SchemaType.OBJECT,
        properties: {
          company_name: { type: SchemaType.STRING, description: "اسم الشركة المعلنة" },
          sector: { type: SchemaType.STRING, description: "قطاع الشركة" },
          duration_seconds: {
            type: SchemaType.NUMBER,
            description: "المدة التقديرية لظهور الإعلان الواحد بالثواني وفق المعتاد لهذا النوع من اللوحات",
          },
          repeats_per_minute: { type: SchemaType.NUMBER, description: "عدد مرات التكرار التقديرية في الدقيقة" },
          repeats_per_day: { type: SchemaType.NUMBER, description: "عدد مرات التكرار التقديرية في اليوم" },
          objective: { type: SchemaType.STRING, description: "هدف الإعلان بجملة واحدة" },
        },
        required: ["company_name", "sector", "duration_seconds", "repeats_per_minute", "repeats_per_day", "objective"],
      },
    },
  },
  required: ["ads"],
};

function mimeTypeFromExt(filePath: string): string {
  const ext = filePath.split(".").pop()?.toLowerCase();
  const map: Record<string, string> = {
    mp4: "video/mp4",
    mov: "video/quicktime",
    webm: "video/webm",
    avi: "video/x-msvideo",
    mkv: "video/x-matroska",
  };
  return map[ext || ""] || "video/mp4";
}

function mimeTypeFromImageExt(filePath: string): string {
  const ext = filePath.split(".").pop()?.toLowerCase();
  const map: Record<string, string> = {
    jpg: "image/jpeg",
    jpeg: "image/jpeg",
    png: "image/png",
    webp: "image/webp",
    heic: "image/heic",
  };
  return map[ext || ""] || "image/jpeg";
}

export type RetryStatus = { attempt: number; maxAttempts: number; message: string };
const retryStatusByKey = new Map<string, RetryStatus>();

export function getRetryStatus(key: string): RetryStatus | undefined {
  return retryStatusByKey.get(key);
}

export async function analyzeSightingVideo(
  absoluteVideoPath: string,
  prompt: string,
  statusKey?: string
): Promise<GeminiAd[]> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY غير مضبوط في متغيرات البيئة");
  }

  const mimeType = mimeTypeFromExt(absoluteVideoPath);
  const genAI = new GoogleGenerativeAI(apiKey);
  // README specifies the pinned "gemini-2.5-flash", but Google retired that pin for
  // new API keys (404 on generateContent); the "-latest" alias tracks the current flash model.
  const model = genAI.getGenerativeModel({
    model: "gemini-flash-latest",
    generationConfig: {
      responseMimeType: "application/json",
      responseSchema,
    },
  });

  const stat = await import("node:fs/promises").then((fs) => fs.stat(absoluteVideoPath));

  let videoPart: { fileData: { fileUri: string; mimeType: string } } | { inlineData: { data: string; mimeType: string } };

  if (stat.size > INLINE_LIMIT_BYTES) {
    const fileManager = new GoogleAIFileManager(apiKey);
    const uploaded = await fileManager.uploadFile(absoluteVideoPath, { mimeType });
    let file = uploaded.file;
    while (file.state === FileState.PROCESSING) {
      await new Promise((r) => setTimeout(r, 2000));
      file = await fileManager.getFile(file.name);
    }
    if (file.state === FileState.FAILED) {
      throw new Error("فشل معالجة الفيديو على خوادم Gemini");
    }
    videoPart = { fileData: { fileUri: file.uri, mimeType } };
  } else {
    const buffer = await readFile(absoluteVideoPath);
    videoPart = { inlineData: { data: buffer.toString("base64"), mimeType } };
  }

  try {
    const result = await generateContentWithRetry(model, [videoPart, { text: prompt }], statusKey);
    const text = result.response.text();
    const parsed = JSON.parse(text) as { ads: GeminiAd[] };
    return dedupeAdsByCompany(parsed.ads || []);
  } finally {
    if (statusKey) retryStatusByKey.delete(statusKey);
  }
}

export async function analyzeSightingImage(
  absoluteImagePath: string,
  prompt: string,
  statusKey?: string
): Promise<GeminiAd[]> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY غير مضبوط في متغيرات البيئة");
  }

  const mimeType = mimeTypeFromImageExt(absoluteImagePath);
  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({
    model: "gemini-flash-latest",
    generationConfig: {
      responseMimeType: "application/json",
      responseSchema: imageResponseSchema,
    },
  });

  const buffer = await readFile(absoluteImagePath);
  const imagePart = { inlineData: { data: buffer.toString("base64"), mimeType } };

  try {
    const result = await generateContentWithRetry(model, [imagePart, { text: prompt }], statusKey);
    const text = result.response.text();
    const parsed = JSON.parse(text) as { ads: GeminiAd[] };
    return dedupeAdsByCompany(parsed.ads || []);
  } finally {
    if (statusKey) retryStatusByKey.delete(statusKey);
  }
}

function dedupeAdsByCompany(ads: GeminiAd[]): GeminiAd[] {
  const seen = new Set<string>();
  const result: GeminiAd[] = [];
  for (const ad of ads) {
    const key = ad.company_name.trim().toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(ad);
  }
  return result;
}

const RETRYABLE_STATUS = [503, 429];
const RETRY_DELAYS_MS = [2000, 5000, 10000];

async function generateContentWithRetry(
  model: ReturnType<GoogleGenerativeAI["getGenerativeModel"]>,
  parts: Parameters<ReturnType<GoogleGenerativeAI["getGenerativeModel"]>["generateContent"]>[0],
  statusKey?: string
) {
  for (let attempt = 0; ; attempt++) {
    try {
      return await model.generateContent(parts);
    } catch (err) {
      const status = (err as { status?: number })?.status;
      if (!RETRYABLE_STATUS.includes(status ?? 0) || attempt >= RETRY_DELAYS_MS.length) {
        throw err;
      }
      if (statusKey) {
        retryStatusByKey.set(statusKey, {
          attempt: attempt + 1,
          maxAttempts: RETRY_DELAYS_MS.length,
          message: `خادم Gemini مشغول حالياً، إعادة المحاولة (${attempt + 1}/${RETRY_DELAYS_MS.length})...`,
        });
      }
      await new Promise((r) => setTimeout(r, RETRY_DELAYS_MS[attempt]));
    }
  }
}

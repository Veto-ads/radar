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

// Primary key first, then the backup — set GEMINI_API_KEY_BACKUP to enable
// failover. Two analyses running at once (two reviewers, two "تحليل
// بالذكاء الاصطناعي" clicks) can otherwise both land on the primary key's
// rate limit at the same moment; if one gets throttled, it falls over to
// the backup key instead of failing outright.
function getApiKeys(): string[] {
  const keys = [process.env.GEMINI_API_KEY, process.env.GEMINI_API_KEY_BACKUP]
    .map((k) => k?.trim())
    .filter((k): k is string => !!k);
  if (keys.length === 0) {
    throw new Error("GEMINI_API_KEY غير مضبوط في متغيرات البيئة");
  }
  return keys;
}

type ContentPart =
  | { fileData: { fileUri: string; mimeType: string } }
  | { inlineData: { data: string; mimeType: string } };

type ModelConfig = {
  model: string;
  generationConfig: { responseMimeType: string; responseSchema: Schema };
};

export async function analyzeSightingVideo(
  absoluteVideoPath: string,
  prompt: string,
  statusKey?: string
): Promise<GeminiAd[]> {
  const apiKeys = getApiKeys();
  const mimeType = mimeTypeFromExt(absoluteVideoPath);
  const stat = await import("node:fs/promises").then((fs) => fs.stat(absoluteVideoPath));

  // A File API upload (large videos) is scoped to the key/project that
  // created it, so falling back to the backup key means re-uploading under
  // that key — this rebuilds the part per key attempt instead of once.
  // Small videos sent inline don't have that issue; the same bytes work
  // under any key.
  const buildPart = async (apiKey: string): Promise<ContentPart> => {
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
      return { fileData: { fileUri: file.uri, mimeType } };
    }
    const buffer = await readFile(absoluteVideoPath);
    return { inlineData: { data: buffer.toString("base64"), mimeType } };
  };

  // README specifies the pinned "gemini-2.5-flash", but Google retired that pin for
  // new API keys (404 on generateContent); the "-latest" alias tracks the current flash model.
  const modelConfig: ModelConfig = {
    model: "gemini-flash-latest",
    generationConfig: { responseMimeType: "application/json", responseSchema },
  };

  try {
    const result = await generateContentWithFailover(apiKeys, modelConfig, buildPart, prompt, statusKey);
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
  const apiKeys = getApiKeys();
  const mimeType = mimeTypeFromImageExt(absoluteImagePath);
  const buffer = await readFile(absoluteImagePath);
  const inlinePart: ContentPart = { inlineData: { data: buffer.toString("base64"), mimeType } };
  const buildPart = async () => inlinePart;

  const modelConfig: ModelConfig = {
    model: "gemini-flash-latest",
    generationConfig: { responseMimeType: "application/json", responseSchema: imageResponseSchema },
  };

  try {
    const result = await generateContentWithFailover(apiKeys, modelConfig, buildPart, prompt, statusKey);
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

// Tries each configured API key in order. Within a key, retries on 429/503
// with backoff exactly as before; once that key's retries are exhausted (or
// building its part fails, e.g. a video upload error), moves on to the next
// key rather than failing outright — the "backup key" failover.
async function generateContentWithFailover(
  apiKeys: string[],
  modelConfig: ModelConfig,
  buildPart: (apiKey: string) => Promise<ContentPart>,
  prompt: string,
  statusKey?: string
) {
  let lastErr: unknown;

  for (let keyIndex = 0; keyIndex < apiKeys.length; keyIndex++) {
    const apiKey = apiKeys[keyIndex];
    const usingBackup = keyIndex > 0;

    try {
      const part = await buildPart(apiKey);
      const genAI = new GoogleGenerativeAI(apiKey);
      const model = genAI.getGenerativeModel(modelConfig);

      for (let attempt = 0; ; attempt++) {
        try {
          return await model.generateContent([part, { text: prompt }]);
        } catch (err) {
          lastErr = err;
          const status = (err as { status?: number })?.status;
          if (!RETRYABLE_STATUS.includes(status ?? 0) || attempt >= RETRY_DELAYS_MS.length) {
            break;
          }
          if (statusKey) {
            retryStatusByKey.set(statusKey, {
              attempt: attempt + 1,
              maxAttempts: RETRY_DELAYS_MS.length,
              message: usingBackup
                ? `خادم Gemini مشغول (المفتاح الاحتياطي)، إعادة المحاولة (${attempt + 1}/${RETRY_DELAYS_MS.length})...`
                : `خادم Gemini مشغول حالياً، إعادة المحاولة (${attempt + 1}/${RETRY_DELAYS_MS.length})...`,
            });
          }
          await new Promise((r) => setTimeout(r, RETRY_DELAYS_MS[attempt]));
        }
      }
    } catch (err) {
      lastErr = err;
    }

    if (keyIndex + 1 < apiKeys.length && statusKey) {
      retryStatusByKey.set(statusKey, {
        attempt: 0,
        maxAttempts: RETRY_DELAYS_MS.length,
        message: "لا استجابة من المفتاح الأساسي، جارٍ التحويل للمفتاح الاحتياطي...",
      });
    }
  }

  throw lastErr;
}

import { GoogleGenerativeAI, SchemaType } from "@google/generative-ai";
import { GoogleAIFileManager, FileState } from "@google/generative-ai/server";
import { readFile } from "node:fs/promises";

const INLINE_LIMIT_BYTES = 15 * 1024 * 1024;

const responseSchema = {
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
} as const;

export type GeminiAd = {
  company_name: string;
  sector: string;
  duration_seconds: number;
  repeats_per_minute: number;
  repeats_per_day: number;
  objective: string;
  timestamp_seconds: number;
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

export async function analyzeSightingVideo(
  absoluteVideoPath: string,
  prompt: string
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

  const result = await model.generateContent([videoPart, { text: prompt }]);
  const text = result.response.text();
  const parsed = JSON.parse(text) as { ads: GeminiAd[] };
  return parsed.ads || [];
}

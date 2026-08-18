import * as XLSX from "xlsx";

export const BOARD_COLUMNS = [
  "الاسم",
  "النوع",
  "التصنيف",
  "المدينة",
  "الحي",
  "الشوارع",
  "عدد الأوجه",
  "عدد الشبكات",
  "المدة (أيام)",
  "السعر",
  "رابط الموقع",
  "رابط الصورة",
  "الشركة المالكة",
] as const;

export type ParsedBoardRow = {
  name: string;
  type: string;
  category: string;
  city: string;
  district: string;
  streets: string[];
  faces: number;
  screens: number;
  price_duration_days: number;
  price: number;
  location_url: string;
  image_url: string;
  company: string;
};

export type ParseResult = {
  valid: ParsedBoardRow[];
  errors: { row: number; message: string }[];
};

export function downloadBoardTemplate() {
  const sample = [
    "لوحة كورنيش جدة (مثال)",
    "يونيبول",
    "خارجي",
    "جدة",
    "الكورنيش",
    "طريق الكورنيش، طريق الأمير سلطان",
    2,
    0,
    14,
    15000,
    "",
    "",
    "شركة الوسائل الخارجية",
  ];
  const ws = XLSX.utils.aoa_to_sheet([[...BOARD_COLUMNS], sample]);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "اللوحات");
  XLSX.writeFile(wb, "قالب-استيراد-اللوحات.xlsx");
}

export function exportBoardsToExcel(
  boards: { name: string; type: string; category: string; city: string | null; district: string | null; streets: string[]; faces: number; screens: number; price_duration_days: number; price: number; location_url: string | null; image_url: string | null; company: string | null }[]
) {
  const rows = boards.map((b) => [
    b.name,
    b.type,
    b.category,
    b.city || "",
    b.district || "",
    b.streets.join("، "),
    b.faces,
    b.screens,
    b.price_duration_days,
    b.price,
    b.location_url || "",
    b.image_url || "",
    b.company || "",
  ]);
  const ws = XLSX.utils.aoa_to_sheet([[...BOARD_COLUMNS], ...rows]);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "اللوحات");
  XLSX.writeFile(wb, "كتالوج-اللوحات.xlsx");
}

export async function parseBoardsFile(file: File): Promise<ParseResult> {
  const buffer = await file.arrayBuffer();
  const wb = XLSX.read(buffer, { type: "array" });
  const sheet = wb.Sheets[wb.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: "" });

  const valid: ParsedBoardRow[] = [];
  const errors: { row: number; message: string }[] = [];

  rows.forEach((row, i) => {
    const rowNum = i + 2; // header is row 1
    const name = String(row["الاسم"] || "").trim();
    const type = String(row["النوع"] || "").trim();
    const category = String(row["التصنيف"] || "").trim();

    if (!name) {
      errors.push({ row: rowNum, message: "الاسم مفقود" });
      return;
    }
    if (!type) {
      errors.push({ row: rowNum, message: "النوع مفقود" });
      return;
    }
    if (!category) {
      errors.push({ row: rowNum, message: "التصنيف مفقود" });
      return;
    }

    const streetsRaw = String(row["الشوارع"] || "").trim();
    const streets = streetsRaw
      ? streetsRaw.split(/[،,]/).map((s) => s.trim()).filter(Boolean)
      : [];

    valid.push({
      name,
      type,
      category,
      city: String(row["المدينة"] || "").trim(),
      district: String(row["الحي"] || "").trim(),
      streets,
      faces: Number(row["عدد الأوجه"]) || 1,
      screens: Number(row["عدد الشبكات"]) || 0,
      price_duration_days: Number(row["المدة (أيام)"]) || 14,
      price: Number(row["السعر"]) || 0,
      location_url: String(row["رابط الموقع"] || "").trim(),
      image_url: String(row["رابط الصورة"] || "").trim(),
      company: String(row["الشركة المالكة"] || "").trim(),
    });
  });

  return { valid, errors };
}

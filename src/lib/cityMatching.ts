// `boards.city` is admin-entered free text (Arabic), with no separate English
// column. This table lets the public API accept an English or Arabic city
// name in the `city` query param and return both `city_ar`/`city_en` in
// responses, without requiring admins to maintain a second field.

type CityInfo = { ar: string; en: string; aliases?: string[] };

const KNOWN_CITIES: CityInfo[] = [
  { ar: "الرياض", en: "Riyadh" },
  { ar: "جدة", en: "Jeddah", aliases: ["Jedda", "Jiddah"] },
  { ar: "مكة المكرمة", en: "Mecca", aliases: ["Makkah", "Mekkah"] },
  { ar: "المدينة المنورة", en: "Medina", aliases: ["Madinah"] },
  { ar: "الدمام", en: "Dammam" },
  { ar: "الخبر", en: "Khobar", aliases: ["Al Khobar", "Alkhobar"] },
  { ar: "الظهران", en: "Dhahran" },
  { ar: "الطائف", en: "Taif" },
  { ar: "أبها", en: "Abha" },
  { ar: "تبوك", en: "Tabuk" },
  { ar: "بريدة", en: "Buraidah", aliases: ["Buraydah"] },
  { ar: "عنيزة", en: "Unaizah", aliases: ["Unayzah"] },
  { ar: "خميس مشيط", en: "Khamis Mushait" },
  { ar: "حائل", en: "Hail", aliases: ["Ha'il"] },
  { ar: "نجران", en: "Najran" },
  { ar: "الجبيل", en: "Jubail" },
  { ar: "ينبع", en: "Yanbu" },
  { ar: "الأحساء", en: "Al Ahsa", aliases: ["Al-Ahsa", "Hofuf"] },
  { ar: "القطيف", en: "Qatif" },
  { ar: "سكاكا", en: "Sakaka" },
  { ar: "عرعر", en: "Arar" },
  { ar: "جازان", en: "Jazan", aliases: ["Jizan"] },
  { ar: "الباحة", en: "Al Baha", aliases: ["Al-Baha", "Baha"] },
  { ar: "رابغ", en: "Rabigh" },
  { ar: "الخرج", en: "Al Kharj" },
  { ar: "القريات", en: "Al Qurayyat" },
];

function normalizeCityText(s: string): string {
  return s.trim().toLowerCase().replace(/\s+/g, " ");
}

// Best-effort {ar, en} for a raw `boards.city` value. Falls back to the raw
// string on both sides when it isn't one of the known cities above, so
// unrecognized values still round-trip instead of disappearing.
export function cityInfoFor(rawCity: string | null | undefined): { ar: string; en: string } {
  if (!rawCity) return { ar: "", en: "" };
  const norm = normalizeCityText(rawCity);
  const known = KNOWN_CITIES.find(
    (c) => normalizeCityText(c.ar) === norm || normalizeCityText(c.en) === norm || (c.aliases || []).some((a) => normalizeCityText(a) === norm)
  );
  return known ? { ar: known.ar, en: known.en } : { ar: rawCity, en: rawCity };
}

// Resolves a `city` query param (Arabic or English, any casing) against the
// raw `boards.city` values a unit actually has boards in. Returns the
// matching raw value (to filter SQL on) or null if the query doesn't match
// any city this unit covers — the caller should treat that as `found: false`
// rather than falling back to an unfiltered nationwide result.
export function resolveCityAgainstList(query: string, actualRawCities: string[]): string | null {
  const norm = normalizeCityText(query);
  for (const raw of actualRawCities) {
    if (normalizeCityText(raw) === norm) return raw;
    const info = cityInfoFor(raw);
    if (normalizeCityText(info.ar) === norm || normalizeCityText(info.en) === norm) return raw;
  }
  return null;
}

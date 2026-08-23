"use client";

import { useEffect, useState } from "react";
import Modal from "@/components/Modal";
import type { Board } from "@/lib/types";

const DURATIONS = [
  { value: 1, label: "يوم" },
  { value: 2, label: "يومين" },
  { value: 3, label: "ثلاثة أيام" },
  { value: 4, label: "أربعة أيام" },
  { value: 5, label: "خمسة أيام" },
  { value: 6, label: "ستة أيام" },
  { value: 7, label: "أسبوع" },
  { value: 14, label: "أسبوعين" },
  { value: 30, label: "شهر" },
];

export default function BoardModal({
  board,
  duplicateFrom,
  onClose,
  onSaved,
}: {
  board: Board | null;
  duplicateFrom?: Board;
  onClose: () => void;
  onSaved: () => void;
}) {
  // Duplicating pre-fills the form from an existing board but still creates a
  // new one (no id carried over), so the source board is kept as a separate
  // prop from `board` — `board` alone decides PATCH-vs-POST on save.
  const source = board || duplicateFrom || null;
  const [types, setTypes] = useState<{ id: string; name: string }[]>([]);
  const [categories, setCategories] = useState<{ id: string; name: string }[]>([]);

  useEffect(() => {
    fetch("/api/board-types")
      .then((r) => r.json())
      .then((d) => setTypes(d.types || []));
    fetch("/api/board-categories")
      .then((r) => r.json())
      .then((d) => setCategories(d.categories || []));
  }, []);

  const [form, setForm] = useState({
    name: duplicateFrom ? `${duplicateFrom.name} - نسخة` : source?.name || "",
    type: source?.type || "",
    category: source?.category || "",
    city: source?.city || "",
    district: source?.district || "",
    streets: source ? (source.streets as unknown as string[]).join("، ") : "",
    faces: source?.faces ?? 1,
    screens: source?.screens ?? 0,
    price_duration_days: source?.price_duration_days ?? 14,
    price: source?.price ?? 0,
    location_url: source?.location_url || "",
    image_url: source?.image_url || "",
    company: source?.company || "",
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  function set<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  useEffect(() => {
    if (!board && !form.type && types[0]) set("type", types[0].name);
  }, [types, board, form.type]);
  useEffect(() => {
    if (!board && !form.category && categories[0]) set("category", categories[0].name);
  }, [categories, board, form.category]);

  async function save() {
    if (!form.name.trim()) {
      setError("اسم اللوحة مطلوب");
      return;
    }
    setSaving(true);
    setError("");
    try {
      const payload = {
        ...form,
        streets: form.streets
          .split(/[،,]/)
          .map((s) => s.trim())
          .filter(Boolean),
        faces: Number(form.faces),
        screens: Number(form.screens),
        price: Number(form.price),
      };
      const res = await fetch(board ? `/api/boards/${board.id}` : "/api/boards", {
        method: board ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "تعذر الحفظ");
        return;
      }
      onSaved();
      onClose();
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal title={board ? "تعديل لوحة" : duplicateFrom ? "نسخ لوحة" : "إضافة لوحة"} onClose={onClose} width={560}>
      <div className="flex flex-col gap-3">
        <div>
          <label className="field-label">الاسم</label>
          <input className="field-input" value={form.name} onChange={(e) => set("name", e.target.value)} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="field-label">النوع</label>
            <select className="field-input" value={form.type} onChange={(e) => set("type", e.target.value)}>
              {form.type && !types.some((t) => t.name === form.type) && (
                <option value={form.type}>{form.type}</option>
              )}
              {types.map((t) => (
                <option key={t.id} value={t.name}>
                  {t.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="field-label">التصنيف</label>
            <select className="field-input" value={form.category} onChange={(e) => set("category", e.target.value)}>
              {form.category && !categories.some((c) => c.name === form.category) && (
                <option value={form.category}>{form.category}</option>
              )}
              {categories.map((c) => (
                <option key={c.id} value={c.name}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="field-label">المدينة</label>
            <input className="field-input" value={form.city} onChange={(e) => set("city", e.target.value)} />
          </div>
          <div>
            <label className="field-label">الحي</label>
            <input className="field-input" value={form.district} onChange={(e) => set("district", e.target.value)} />
          </div>
        </div>
        <div>
          <label className="field-label">الشوارع (افصل بفاصلة)</label>
          <input className="field-input" value={form.streets} onChange={(e) => set("streets", e.target.value)} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="field-label">عدد الأوجه</label>
            <input
              className="field-input"
              type="number"
              value={form.faces}
              onChange={(e) => set("faces", Number(e.target.value) as never)}
            />
          </div>
          <div>
            <label className="field-label">عدد الشبكات</label>
            <input
              className="field-input"
              type="number"
              value={form.screens}
              onChange={(e) => set("screens", Number(e.target.value) as never)}
            />
          </div>
          <div>
            <label className="field-label">المدة</label>
            <select
              className="field-input"
              value={form.price_duration_days}
              onChange={(e) => set("price_duration_days", Number(e.target.value) as never)}
            >
              {DURATIONS.map((d) => (
                <option key={d.value} value={d.value}>
                  {d.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="field-label">السعر للمدة</label>
            <input
              className="field-input"
              type="number"
              value={form.price}
              onChange={(e) => set("price", Number(e.target.value) as never)}
            />
          </div>
        </div>
        <div>
          <label className="field-label">رابط الموقع</label>
          <input className="field-input" value={form.location_url} onChange={(e) => set("location_url", e.target.value)} />
        </div>
        <div>
          <label className="field-label">رابط الصورة</label>
          <input className="field-input" value={form.image_url} onChange={(e) => set("image_url", e.target.value)} />
        </div>
        <div>
          <label className="field-label">الشركة المالكة</label>
          <input className="field-input" value={form.company} onChange={(e) => set("company", e.target.value)} />
        </div>

        {error && <p style={{ color: "var(--danger-500)", fontSize: 13 }}>{error}</p>}

        <button disabled={saving} onClick={save} className="btn-primary" style={{ padding: "10px 0" }}>
          {saving ? "جاري الحفظ..." : "حفظ"}
        </button>
      </div>
    </Modal>
  );
}

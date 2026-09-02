"use client";

import { useEffect, useRef, useState } from "react";
import Modal from "@/components/Modal";
import BoardCombobox from "@/components/BoardCombobox";
import AutocompleteInput from "@/components/AutocompleteInput";
import type { Board } from "@/lib/types";
import type { AdRow } from "@/lib/reviewTypes";
import { AD_IMAGE_ACCEPT, adImageFileName, uploadAdImage, useAdImagePreview, validateAdImage } from "./adImageClient";

export default function EditAdModal({
  ad,
  onClose,
  onSaved,
}: {
  ad: AdRow;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [sectors, setSectors] = useState<string[]>([]);
  const [companies, setCompanies] = useState<string[]>([]);
  const [newBoard, setNewBoard] = useState<Board | null>(null);
  const [form, setForm] = useState({
    company_name: ad.company_name,
    sector: ad.sector,
    duration_seconds: ad.duration_seconds,
    repeats_per_minute: ad.repeats_per_minute,
    repeats_per_day: ad.repeats_per_day,
    objective: ad.objective || "",
  });
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, previewImage] = useAdImagePreview();
  const [imageCleared, setImageCleared] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/sectors")
      .then((r) => r.json())
      .then((d) => setSectors((d.sectors || []).map((s: { name: string }) => s.name)));
    fetch("/api/companies")
      .then((r) => r.json())
      .then((d) => setCompanies((d.companies || []).map((c: { name: string }) => c.name)));
  }, []);

  const shownImage = imagePreview ?? (imageCleared ? null : ad.frame_image_url);
  const imageChanged = imageFile !== null || imageCleared;

  function set<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function pickImage(file: File | null) {
    if (!file) return;
    const message = validateAdImage(file);
    if (message) {
      setError(message);
      return;
    }
    setError("");
    setImageCleared(false);
    setImageFile(file);
    previewImage(file);
  }

  function resetImage() {
    setImageFile(null);
    previewImage(null);
    setImageCleared(false);
    if (fileRef.current) fileRef.current.value = "";
  }

  async function save() {
    if (!form.company_name.trim()) {
      setError("اسم الشركة مطلوب");
      return;
    }
    setSaving(true);
    setError("");
    try {
      const body: Record<string, unknown> = { ...form };
      if (imageFile) {
        try {
          body.frame_image_url = await uploadAdImage(imageFile);
        } catch (err) {
          setError((err as Error).message);
          return;
        }
      } else if (imageCleared) {
        body.frame_image_url = null;
      }

      const res = await fetch(`/api/ads/${ad.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        setError((await res.json()).error || "تعذر الحفظ");
        return;
      }

      if (newBoard && newBoard.id !== ad.board_id) {
        const boardRes = await fetch(`/api/sightings/${ad.sighting_id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ board_id: newBoard.id }),
        });
        if (!boardRes.ok) {
          setError((await boardRes.json()).error || "تعذر تحديث اللوحة");
          return;
        }
      }

      onSaved();
      onClose();
    } finally {
      setSaving(false);
    }
  }

  async function remove() {
    if (!confirm("هل تريد حذف هذا الإعلان نهائياً؟")) return;
    setDeleting(true);
    setError("");
    try {
      const res = await fetch(`/api/ads/${ad.id}`, { method: "DELETE" });
      if (!res.ok) {
        setError((await res.json()).error || "تعذر الحذف");
        return;
      }
      onSaved();
      onClose();
    } finally {
      setDeleting(false);
    }
  }

  return (
    <Modal title={`تعديل إعلان — ${ad.sighting_code}`} onClose={onClose} width={480}>
      <div className="flex flex-col gap-3">
        <div>
          <label className="field-label">صورة الإعلان</label>
          <div className="flex items-start gap-3">
            <div
              style={{
                width: 120,
                height: 90,
                borderRadius: "var(--radius-md)",
                border: "1px dashed var(--border-default)",
                background: "var(--surface-muted)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                overflow: "hidden",
                flexShrink: 0,
              }}
            >
              {shownImage ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={shownImage}
                  alt={ad.company_name}
                  style={{ width: "100%", height: "100%", objectFit: "cover" }}
                />
              ) : (
                <span style={{ fontSize: "var(--fs-caption)", color: "var(--text-muted)" }}>لا توجد صورة</span>
              )}
            </div>
            <div className="flex flex-col gap-2" style={{ flex: 1 }}>
              <input
                ref={fileRef}
                type="file"
                accept={AD_IMAGE_ACCEPT}
                hidden
                onChange={(e) => pickImage(e.target.files?.[0] || null)}
              />
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                className="btn-secondary"
                style={{ padding: "8px 12px", fontSize: "var(--fs-caption)" }}
              >
                {shownImage ? "تغيير الصورة" : "إضافة صورة"}
              </button>
              {shownImage && (
                <a
                  href={shownImage}
                  download={adImageFileName(
                    imageFile ? imageFile.name : ad.frame_image_url || "",
                    `${ad.sighting_code}-${form.company_name}`
                  )}
                  className="btn-secondary"
                  style={{
                    padding: "8px 12px",
                    fontSize: "var(--fs-caption)",
                    textAlign: "center",
                    textDecoration: "none",
                    display: "block",
                  }}
                >
                  حفظ الصورة
                </a>
              )}
              {shownImage && (
                <button
                  type="button"
                  onClick={() => {
                    setImageFile(null);
                    previewImage(null);
                    setImageCleared(true);
                    if (fileRef.current) fileRef.current.value = "";
                  }}
                  className="btn-danger"
                  style={{ padding: "8px 12px", fontSize: "var(--fs-caption)" }}
                >
                  حذف الصورة
                </button>
              )}
              {imageChanged && (
                <button
                  type="button"
                  onClick={resetImage}
                  style={{ fontSize: "var(--fs-caption)", color: "var(--text-muted)" }}
                >
                  تراجع عن تغيير الصورة
                </button>
              )}
            </div>
          </div>
          {imageChanged && (
            <p style={{ fontSize: "var(--fs-caption)", color: "var(--text-muted)", marginTop: 6 }}>
              {imageFile ? "سيتم رفع الصورة الجديدة عند الحفظ" : "سيتم حذف الصورة عند الحفظ"}
            </p>
          )}
        </div>
        <div>
          <p style={{ fontSize: "var(--fs-xs)", color: "var(--text-muted)", marginBottom: 6 }}>
            اللوحة الحالية: <strong>{ad.board_name}</strong>
          </p>
          <BoardCombobox onSelect={setNewBoard} />
          <p style={{ fontSize: "var(--fs-caption)", color: "var(--text-muted)", marginTop: 4 }}>
            اختر لوحة فقط إذا أردت تغييرها — سيؤثر ذلك على كل الإعلانات المرتبطة بنفس الرصد ({ad.sighting_code})
          </p>
        </div>
        <div>
          <label className="field-label">اسم الشركة</label>
          <AutocompleteInput
            value={form.company_name}
            onChange={(v) => set("company_name", v)}
            options={companies}
            placeholder="ابحث أو اكتب اسم شركة جديدة..."
          />
        </div>
        <div>
          <label className="field-label">القطاع</label>
          <AutocompleteInput
            value={form.sector}
            onChange={(v) => set("sector", v)}
            options={sectors}
            placeholder="ابحث أو اكتب قطاعاً جديداً..."
          />
        </div>
        <div className="grid grid-cols-3 gap-3">
          <div>
            <label className="field-label">مدة الظهور (ث)</label>
            <input
              className="field-input"
              type="number"
              value={form.duration_seconds}
              onChange={(e) => set("duration_seconds", Number(e.target.value))}
            />
          </div>
          <div>
            <label className="field-label">التكرار/الدقيقة</label>
            <input
              className="field-input"
              type="number"
              value={form.repeats_per_minute}
              onChange={(e) => set("repeats_per_minute", Number(e.target.value))}
            />
          </div>
          <div>
            <label className="field-label">التكرار/اليوم</label>
            <input
              className="field-input"
              type="number"
              value={form.repeats_per_day}
              onChange={(e) => set("repeats_per_day", Number(e.target.value))}
            />
          </div>
        </div>
        <div>
          <label className="field-label">هدف الإعلان</label>
          <textarea
            className="field-input"
            rows={3}
            value={form.objective}
            onChange={(e) => set("objective", e.target.value)}
          />
        </div>

        {error && <p style={{ color: "var(--danger-500)", fontSize: 13 }}>{error}</p>}

        <div className="flex gap-2">
          <button
            disabled={saving || deleting}
            onClick={save}
            className="btn-primary"
            style={{ padding: "10px 0", flex: 1 }}
          >
            {saving ? "جاري الحفظ..." : "حفظ التعديل"}
          </button>
          <button
            disabled={saving || deleting}
            onClick={remove}
            className="btn-danger"
            style={{ padding: "10px 16px" }}
          >
            {deleting ? "جاري الحذف..." : "حذف الإعلان"}
          </button>
        </div>
      </div>
    </Modal>
  );
}

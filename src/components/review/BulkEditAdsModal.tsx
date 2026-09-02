"use client";

import { useEffect, useRef, useState } from "react";
import Modal from "@/components/Modal";
import AutocompleteInput from "@/components/AutocompleteInput";
import { AD_IMAGE_ACCEPT, uploadAdImage, useAdImagePreview, validateAdImage } from "./adImageClient";

export default function BulkEditAdsModal({
  adIds,
  onClose,
  onSaved,
}: {
  adIds: string[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const [sectors, setSectors] = useState<string[]>([]);
  const [companies, setCompanies] = useState<string[]>([]);
  const [companyName, setCompanyName] = useState("");
  const [sector, setSector] = useState("");
  const [durationSeconds, setDurationSeconds] = useState("");
  const [repeatsPerMinute, setRepeatsPerMinute] = useState("");
  const [repeatsPerDay, setRepeatsPerDay] = useState("");
  const [objective, setObjective] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, previewImage] = useAdImagePreview();
  const [removeImages, setRemoveImages] = useState(false);
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

  function pickImage(file: File | null) {
    if (!file) return;
    const message = validateAdImage(file);
    if (message) {
      setError(message);
      return;
    }
    setError("");
    setRemoveImages(false);
    setImageFile(file);
    previewImage(file);
  }

  function clearPickedImage() {
    setImageFile(null);
    previewImage(null);
    if (fileRef.current) fileRef.current.value = "";
  }

  async function save() {
    const body: Record<string, string | number | null> = {};
    if (companyName.trim()) body.company_name = companyName.trim();
    if (sector) body.sector = sector;
    if (durationSeconds !== "") body.duration_seconds = Number(durationSeconds);
    if (repeatsPerMinute !== "") body.repeats_per_minute = Number(repeatsPerMinute);
    if (repeatsPerDay !== "") body.repeats_per_day = Number(repeatsPerDay);
    if (objective !== "") body.objective = objective;
    if (removeImages) body.frame_image_url = null;

    if (Object.keys(body).length === 0 && !imageFile) {
      setError("عدّل حقلاً واحداً على الأقل");
      return;
    }

    setSaving(true);
    setError("");
    try {
      // The picked image is uploaded once, then every selected ad is pointed at
      // the same stored file instead of re-sending the bytes per ad.
      if (imageFile) {
        try {
          body.frame_image_url = await uploadAdImage(imageFile);
        } catch (err) {
          setError((err as Error).message);
          return;
        }
      }

      const results = await Promise.all(
        adIds.map((id) =>
          fetch(`/api/ads/${id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body),
          })
        )
      );
      if (results.some((r) => !r.ok)) {
        setError("تعذر تعديل بعض النتائج");
        return;
      }
      onSaved();
      onClose();
    } finally {
      setSaving(false);
    }
  }

  async function removeAll() {
    if (!confirm(`هل تريد حذف ${adIds.length} نتيجة نهائياً؟`)) return;
    setDeleting(true);
    setError("");
    try {
      const results = await Promise.all(adIds.map((id) => fetch(`/api/ads/${id}`, { method: "DELETE" })));
      if (results.some((r) => !r.ok)) {
        setError("تعذر حذف بعض النتائج");
        return;
      }
      onSaved();
      onClose();
    } finally {
      setDeleting(false);
    }
  }

  return (
    <Modal title={`تعديل ${adIds.length} نتيجة محدَّدة`} onClose={onClose} width={480}>
      <div className="flex flex-col gap-3">
        <p style={{ fontSize: "var(--fs-xs)", color: "var(--text-muted)" }}>
          اترك أي حقل فارغاً ليبقى بدون تغيير — الحقول المعبّأة فقط تُطبَّق على كل النتائج المحدَّدة.
        </p>
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
              {imagePreview ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={imagePreview}
                  alt=""
                  style={{ width: "100%", height: "100%", objectFit: "cover" }}
                />
              ) : (
                <span
                  style={{
                    fontSize: "var(--fs-caption)",
                    color: "var(--text-muted)",
                    textAlign: "center",
                    padding: 6,
                  }}
                >
                  {removeImages ? "ستُحذف الصور" : "بدون تغيير"}
                </span>
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
                {imageFile ? "اختيار صورة أخرى" : "صورة واحدة لكل المحدَّد"}
              </button>
              {imageFile && (
                <button
                  type="button"
                  onClick={clearPickedImage}
                  style={{ fontSize: "var(--fs-caption)", color: "var(--text-muted)" }}
                >
                  تراجع عن الصورة المختارة
                </button>
              )}
              <label
                className="flex items-center gap-2"
                style={{ fontSize: "var(--fs-caption)", color: "var(--text-muted)" }}
              >
                <input
                  type="checkbox"
                  checked={removeImages}
                  disabled={imageFile !== null}
                  onChange={(e) => setRemoveImages(e.target.checked)}
                />
                حذف صور النتائج المحدَّدة
              </label>
            </div>
          </div>
        </div>
        <div>
          <label className="field-label">اسم الشركة</label>
          <AutocompleteInput
            value={companyName}
            onChange={setCompanyName}
            options={companies}
            placeholder="بدون تغيير"
          />
        </div>
        <div>
          <label className="field-label">القطاع</label>
          <select className="field-input" value={sector} onChange={(e) => setSector(e.target.value)}>
            <option value="">— بدون تغيير —</option>
            {sectors.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>
        <div className="grid grid-cols-3 gap-3">
          <div>
            <label className="field-label">مدة الظهور (ث)</label>
            <input
              className="field-input"
              type="number"
              placeholder="بدون تغيير"
              value={durationSeconds}
              onChange={(e) => setDurationSeconds(e.target.value)}
            />
          </div>
          <div>
            <label className="field-label">التكرار/الدقيقة</label>
            <input
              className="field-input"
              type="number"
              placeholder="بدون تغيير"
              value={repeatsPerMinute}
              onChange={(e) => setRepeatsPerMinute(e.target.value)}
            />
          </div>
          <div>
            <label className="field-label">التكرار/اليوم</label>
            <input
              className="field-input"
              type="number"
              placeholder="بدون تغيير"
              value={repeatsPerDay}
              onChange={(e) => setRepeatsPerDay(e.target.value)}
            />
          </div>
        </div>
        <div>
          <label className="field-label">هدف الإعلان</label>
          <textarea
            className="field-input"
            rows={3}
            placeholder="بدون تغيير"
            value={objective}
            onChange={(e) => setObjective(e.target.value)}
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
            {saving ? "جاري الحفظ..." : `حفظ التعديل على ${adIds.length} نتيجة`}
          </button>
          <button
            disabled={saving || deleting}
            onClick={removeAll}
            className="btn-danger"
            style={{ padding: "10px 16px" }}
          >
            {deleting ? "جاري الحذف..." : "حذف الكل"}
          </button>
        </div>
      </div>
    </Modal>
  );
}

"use client";

import { useEffect, useState } from "react";
import Modal from "@/components/Modal";

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
  const [sector, setSector] = useState("");
  const [durationSeconds, setDurationSeconds] = useState("");
  const [repeatsPerMinute, setRepeatsPerMinute] = useState("");
  const [repeatsPerDay, setRepeatsPerDay] = useState("");
  const [objective, setObjective] = useState("");
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/sectors")
      .then((r) => r.json())
      .then((d) => setSectors((d.sectors || []).map((s: { name: string }) => s.name)));
  }, []);

  async function save() {
    const body: Record<string, string | number> = {};
    if (sector) body.sector = sector;
    if (durationSeconds !== "") body.duration_seconds = Number(durationSeconds);
    if (repeatsPerMinute !== "") body.repeats_per_minute = Number(repeatsPerMinute);
    if (repeatsPerDay !== "") body.repeats_per_day = Number(repeatsPerDay);
    if (objective !== "") body.objective = objective;

    if (Object.keys(body).length === 0) {
      setError("عدّل حقلاً واحداً على الأقل");
      return;
    }

    setSaving(true);
    setError("");
    try {
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

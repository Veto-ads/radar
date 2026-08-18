"use client";

import { useEffect, useState } from "react";
import Modal from "@/components/Modal";
import BoardCombobox from "@/components/BoardCombobox";
import type { Board } from "@/lib/types";
import type { AdRow } from "@/lib/reviewTypes";

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
  const [newBoard, setNewBoard] = useState<Board | null>(null);
  const [form, setForm] = useState({
    company_name: ad.company_name,
    sector: ad.sector,
    duration_seconds: ad.duration_seconds,
    repeats_per_minute: ad.repeats_per_minute,
    repeats_per_day: ad.repeats_per_day,
    objective: ad.objective || "",
  });
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/sectors")
      .then((r) => r.json())
      .then((d) => setSectors((d.sectors || []).map((s: { name: string }) => s.name)));
  }, []);

  function set<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function save() {
    if (!form.company_name.trim()) {
      setError("اسم الشركة مطلوب");
      return;
    }
    setSaving(true);
    setError("");
    try {
      const res = await fetch(`/api/ads/${ad.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
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
          <input
            className="field-input"
            value={form.company_name}
            onChange={(e) => set("company_name", e.target.value)}
          />
        </div>
        <div>
          <label className="field-label">القطاع</label>
          <select className="field-input" value={form.sector} onChange={(e) => set("sector", e.target.value)}>
            {!sectors.includes(form.sector) && <option value={form.sector}>{form.sector}</option>}
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

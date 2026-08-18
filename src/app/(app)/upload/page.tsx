"use client";

import { useEffect, useState, type FormEvent } from "react";
import BoardCombobox from "@/components/BoardCombobox";
import type { Board } from "@/lib/types";

export default function UploadPage() {
  const [board, setBoard] = useState<Board | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [now, setNow] = useState(new Date());
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [stats, setStats] = useState<{ today: number; month: number }>({ today: 0, month: 0 });

  useEffect(() => {
    setNow(new Date());
    refreshStats();
  }, []);

  function refreshStats() {
    fetch("/api/stats/upload")
      .then((r) => r.json())
      .then((d) => setStats({ today: d.today || 0, month: d.month || 0 }));
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    if (!board) {
      setError("يرجى اختيار اللوحة/الشاشة");
      return;
    }
    if (!file) {
      setError("يرجى إضافة مقطع فيديو");
      return;
    }
    setSubmitting(true);
    setSuccess(false);
    try {
      const fd = new FormData();
      fd.set("board_id", board.id);
      fd.set("video", file);
      const res = await fetch("/api/sightings", { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "تعذر إرسال المقطع");
        return;
      }
      setSuccess(true);
      setBoard(null);
      setFile(null);
      setNow(new Date());
      refreshStats();
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(360px, 1fr))",
        gap: 24,
      }}
    >
      <div className="card" style={{ padding: 32 }}>
        <h1 style={{ font: "var(--text-title)", color: "var(--text-heading)", marginBottom: 6 }}>
          رفع مقطع فيديو لإعلان
        </h1>
        <p style={{ fontSize: "var(--fs-xs)", color: "var(--text-muted)", marginBottom: 24 }}>
          اختر اللوحة أو الشاشة التي رصدتها، ثم ارفع مقطع الفيديو ليصل لمراجعة مشرف الجودة.
        </p>

        <form onSubmit={onSubmit} className="flex flex-col gap-4">
          <BoardCombobox onSelect={setBoard} />

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="field-label">نوع اللوحة</label>
              <input
                className="field-input"
                disabled
                value={board?.type || ""}
              />
            </div>
            <div>
              <label className="field-label">المدينة</label>
              <input className="field-input" disabled value={board?.city || ""} />
            </div>
          </div>

          {board?.location_url && (
            <a
              href={board.location_url}
              target="_blank"
              rel="noopener noreferrer"
              style={{ color: "var(--danger-500)", fontSize: "var(--fs-xs)" }}
            >
              📍 اذهب للموقع
            </a>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="field-label">تاريخ التوثيق</label>
              <input className="field-input" disabled value={now.toISOString().slice(0, 10)} />
            </div>
            <div>
              <label className="field-label">وقت التوثيق</label>
              <input className="field-input" disabled value={now.toTimeString().slice(0, 5)} />
            </div>
          </div>

          <div>
            <label className="field-label">إضافة فيديو</label>
            <input
              className="field-input"
              type="file"
              accept="video/*"
              onChange={(e) => setFile(e.target.files?.[0] || null)}
            />
          </div>

          {error && <p style={{ color: "var(--danger-500)", fontSize: 13 }}>{error}</p>}
          {success && (
            <div
              style={{
                background: "var(--green-100)",
                border: "1px solid var(--veto-green)",
                borderRadius: "var(--radius-md)",
                padding: 12,
                color: "var(--green-600)",
                fontSize: "var(--fs-xs)",
              }}
            >
              تم إرسال المقطع لمراجعة مشرف الجودة بنجاح
            </div>
          )}

          <button type="submit" disabled={submitting} className="btn-primary" style={{ padding: "12px 0" }}>
            {submitting ? "جاري الإرسال..." : "إرسال"}
          </button>
        </form>
      </div>

      <div
        className="card flex flex-col justify-center gap-8"
        style={{ padding: 32, background: "var(--gradient-hero)", border: "none" }}
      >
        <div>
          <p style={{ color: "var(--lavender-200)", fontSize: "var(--fs-xs)", marginBottom: 4 }}>
            اللوحات المرصودة اليوم
          </p>
          <p style={{ color: "white", fontSize: 40, fontWeight: 700 }}>{stats.today}</p>
        </div>
        <div>
          <p style={{ color: "var(--lavender-200)", fontSize: "var(--fs-xs)", marginBottom: 4 }}>
            اللوحات المرصودة هذا الشهر
          </p>
          <p style={{ color: "white", fontSize: 40, fontWeight: 700 }}>{stats.month}</p>
        </div>
      </div>
    </div>
  );
}

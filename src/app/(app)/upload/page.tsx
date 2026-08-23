"use client";

import { useEffect, useState, type FormEvent } from "react";
import BoardCombobox from "@/components/BoardCombobox";
import type { Board } from "@/lib/types";

const MAX_VIDEO_BYTES = 200 * 1024 * 1024;
const MAX_IMAGE_BYTES = 20 * 1024 * 1024;

const STATUS_LABEL: Record<string, string> = {
  pending: "بانتظار المراجعة",
  analyzed: "تم التحليل",
};

function formatMB(bytes: number) {
  return `${(bytes / (1024 * 1024)).toFixed(1)} ميجابايت`;
}

type TodayBoard = {
  code: string;
  captured_time: string;
  status: string;
  board_name: string;
  board_type: string;
};

export default function UploadPage() {
  const [board, setBoard] = useState<Board | null>(null);
  const [mode, setMode] = useState<"video" | "image">("video");
  const [file, setFile] = useState<File | null>(null);
  const [now, setNow] = useState(new Date());
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [stats, setStats] = useState<{ today: number; month: number; todayBoards: TodayBoard[] }>({
    today: 0,
    month: 0,
    todayBoards: [],
  });

  const maxBytes = mode === "video" ? MAX_VIDEO_BYTES : MAX_IMAGE_BYTES;
  const maxLabel = mode === "video" ? "200 ميجابايت" : "20 ميجابايت";

  useEffect(() => {
    setNow(new Date());
    refreshStats();
  }, []);

  function refreshStats() {
    fetch("/api/stats/upload")
      .then((r) => r.json())
      .then((d) => setStats({ today: d.today || 0, month: d.month || 0, todayBoards: d.todayBoards || [] }));
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    if (!board) {
      setError("يرجى اختيار اللوحة/الشاشة");
      return;
    }
    if (!file) {
      setError(mode === "video" ? "يرجى إضافة مقطع فيديو" : "يرجى إضافة صورة");
      return;
    }
    if (file.size > maxBytes) {
      setError(`حجم الملف (${formatMB(file.size)}) يتجاوز الحد الأقصى المسموح (${maxLabel})`);
      return;
    }
    setSubmitting(true);
    setSuccess(false);
    try {
      const fd = new FormData();
      fd.set("board_id", board.id);
      fd.set(mode, file);
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

          {(board?.location_url || board?.image_url) && (
            <div className="flex gap-4">
              {board.location_url && (
                <a
                  href={board.location_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ color: "var(--danger-500)", fontSize: "var(--fs-xs)" }}
                >
                  📍 اذهب للموقع
                </a>
              )}
              {board.image_url && (
                <a
                  href={board.image_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ color: "var(--veto-cyan)", fontSize: "var(--fs-xs)" }}
                >
                  🖼️ صورة اللوحة
                </a>
              )}
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="field-label">تاريخ التوثيق</label>
              <input className="field-input" disabled value={now.toISOString().slice(0, 10)} />
            </div>
            <div>
              <label className="field-label">الشوارع</label>
              <input
                className="field-input"
                disabled
                value={board ? (board.streets as unknown as string[])?.join("، ") || "—" : ""}
              />
            </div>
          </div>

          <div>
            <label className="field-label">طريقة التوثيق</label>
            <div className="flex gap-2" style={{ marginBottom: 8 }}>
              <button
                type="button"
                onClick={() => {
                  setMode("video");
                  setFile(null);
                  setError("");
                }}
                className={mode === "video" ? "btn-primary" : "btn-secondary"}
                style={{ padding: "8px 16px", flex: 1 }}
              >
                🎥 فيديو
              </button>
              <button
                type="button"
                onClick={() => {
                  setMode("image");
                  setFile(null);
                  setError("");
                }}
                className={mode === "image" ? "btn-primary" : "btn-secondary"}
                style={{ padding: "8px 16px", flex: 1 }}
              >
                🖼️ صورة
              </button>
            </div>
            <label className="field-label">
              {mode === "video" ? `إضافة فيديو (الحد الأقصى ${maxLabel})` : `إضافة صورة (الحد الأقصى ${maxLabel})`}
            </label>
            <input
              key={mode}
              className="field-input"
              type="file"
              accept={mode === "video" ? "video/*" : "image/*"}
              onChange={(e) => {
                const f = e.target.files?.[0] || null;
                setFile(f);
                setError(f && f.size > maxBytes ? `حجم الملف (${formatMB(f.size)}) يتجاوز الحد الأقصى المسموح (${maxLabel})` : "");
              }}
            />
            {mode === "image" && (
              <p style={{ fontSize: "var(--fs-caption)", color: "var(--text-muted)", marginTop: 4 }}>
                استخدم الصورة فقط إذا تعذّر تصوير فيديو — التحليل بالذكاء الاصطناعي يعطي تقديرات أقل دقة من الفيديو.
              </p>
            )}
            {file && (
              <p style={{ fontSize: "var(--fs-caption)", color: "var(--text-muted)", marginTop: 4 }}>
                حجم الملف: {formatMB(file.size)}
              </p>
            )}
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

          <button
            type="submit"
            disabled={submitting || !!(file && file.size > maxBytes)}
            className="btn-primary"
            style={{ padding: "12px 0" }}
          >
            {submitting ? "جاري الإرسال..." : "إرسال"}
          </button>
        </form>
      </div>

      <div
        className="card flex flex-col justify-center gap-8"
        style={{ padding: 32, background: "var(--gradient-hero)", border: "none" }}
      >
        <div>
          <p style={{ color: "var(--lavender-200)", fontSize: "var(--fs-xs)", marginBottom: 8 }}>
            ملخص ما رفعته اليوم
          </p>
          {stats.todayBoards.length === 0 ? (
            <p style={{ color: "var(--lavender-200)", fontSize: "var(--fs-xs)" }}>لم ترفع أي مقطع اليوم بعد</p>
          ) : (
            <div className="flex flex-col gap-2" style={{ maxHeight: 240, overflowY: "auto" }}>
              {stats.todayBoards.map((b, i) => (
                <div
                  key={`${b.code}-${i}`}
                  className="flex items-center justify-between"
                  style={{
                    background: "rgba(255,255,255,0.12)",
                    borderRadius: "var(--radius-md)",
                    padding: "8px 12px",
                  }}
                >
                  <div>
                    <p style={{ color: "white", fontSize: "var(--fs-xs)", fontWeight: 600 }}>{b.board_name}</p>
                    <p style={{ color: "var(--lavender-200)", fontSize: "var(--fs-caption)" }}>
                      {b.board_type} · {b.captured_time}
                    </p>
                  </div>
                  <span
                    className="chip"
                    style={{
                      background: b.status === "analyzed" ? "var(--veto-green)" : "rgba(255,255,255,0.2)",
                      color: "white",
                      fontSize: "var(--fs-caption)",
                    }}
                  >
                    {STATUS_LABEL[b.status] || b.status}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
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

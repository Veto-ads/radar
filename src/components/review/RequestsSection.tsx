"use client";

import { useEffect, useState, useCallback } from "react";
import type { SightingRow } from "@/lib/reviewTypes";
import type { GeminiAd } from "@/lib/gemini";
import Modal from "@/components/Modal";
import SearchableSelect from "@/components/SearchableSelect";
import VideoModal from "./VideoModal";
import EditSightingModal from "./EditSightingModal";
import AnalyzeResultModal from "./AnalyzeResultModal";
import ArchiveModal from "./ArchiveModal";
import PreviewAllModal from "./PreviewAllModal";

const STATUS_LABEL: Record<string, string> = {
  pending: "بانتظار المراجعة",
  analyzed: "تم التحليل",
};

const REANALYZE_COOLDOWN_MS = 50_000;
const PAGE_SIZE = 10;

export default function RequestsSection({ onAnalyzed }: { onAnalyzed: () => void }) {
  const [rows, setRows] = useState<SightingRow[]>([]);
  const [rasids, setRasids] = useState<{ id: string; full_name: string }[]>([]);
  const [boardTypes, setBoardTypes] = useState<{ id: string; name: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [rasidId, setRasidId] = useState("");
  const [boardType, setBoardType] = useState("");
  const [videoModal, setVideoModal] = useState<string | null>(null);
  const [imageModal, setImageModal] = useState<string | null>(null);
  const [editModal, setEditModal] = useState<SightingRow | null>(null);
  const [archiveOpen, setArchiveOpen] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [analyzing, setAnalyzing] = useState<string | null>(null);
  const [analyzeResult, setAnalyzeResult] = useState<GeminiAd[] | null>(null);
  const [error, setError] = useState("");
  const [retryMessage, setRetryMessage] = useState("");
  const [cooldownUntil, setCooldownUntil] = useState<Record<string, number>>({});
  const [now, setNow] = useState(() => Date.now());
  const [page, setPage] = useState(1);

  useEffect(() => {
    const hasActiveCooldown = Object.values(cooldownUntil).some((t) => t > now);
    if (!hasActiveCooldown) return;
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, [cooldownUntil, now]);

  const load = useCallback(() => {
    setLoading(true);
    const params = new URLSearchParams();
    if (q) params.set("q", q);
    if (from) params.set("from", from);
    if (to) params.set("to", to);
    if (rasidId) params.set("rasid_id", rasidId);
    if (boardType) params.set("board_type", boardType);
    fetch(`/api/sightings?${params.toString()}`)
      .then((r) => r.json())
      .then((d) => setRows(d.sightings || []))
      .finally(() => setLoading(false));
  }, [q, from, to, rasidId, boardType]);

  useEffect(() => {
    fetch("/api/users?role=rasid")
      .then((r) => r.json())
      .then((d) => setRasids(d.users || []));
    fetch("/api/board-types")
      .then((r) => r.json())
      .then((d) => setBoardTypes(d.types || []));
  }, []);

  useEffect(() => {
    const t = setTimeout(load, 300);
    return () => clearTimeout(t);
  }, [load]);

  useEffect(() => {
    setPage(1);
  }, [q, from, to, rasidId, boardType]);

  const hasFilters = Boolean(q || from || to || rasidId || boardType);

  function resetFilters() {
    setQ("");
    setFrom("");
    setTo("");
    setRasidId("");
    setBoardType("");
  }

  const pageCount = Math.max(1, Math.ceil(rows.length / PAGE_SIZE));
  useEffect(() => {
    if (page > pageCount) setPage(pageCount);
  }, [pageCount, page]);
  const pageRows = rows.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  async function analyze(id: string) {
    setAnalyzing(id);
    setError("");
    setRetryMessage("");
    setCooldownUntil((prev) => ({ ...prev, [id]: Date.now() + REANALYZE_COOLDOWN_MS }));
    const poll = setInterval(() => {
      fetch(`/api/sightings/${id}/analyze-status`)
        .then((r) => r.json())
        .then((d) => setRetryMessage(d.status?.message || ""))
        .catch(() => {});
    }, 1500);
    try {
      const res = await fetch(`/api/sightings/${id}/analyze`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "تعذر تحليل المقطع");
        return;
      }
      setAnalyzeResult(data.ads);
      load();
      onAnalyzed();
    } finally {
      clearInterval(poll);
      setAnalyzing(null);
      setRetryMessage("");
    }
  }

  async function remove(id: string) {
    if (!confirm("هل تريد نقل هذا الرصد لأرشيف الحذف؟")) return;
    await fetch(`/api/sightings/${id}`, { method: "DELETE" });
    load();
  }

  return (
    <div className="card" style={{ padding: 24 }}>
      <div className="flex items-center justify-between flex-wrap gap-3" style={{ marginBottom: 16 }}>
        <h2 style={{ font: "var(--text-subtitle)", color: "var(--text-heading)" }}>طلبات الرصد</h2>
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center gap-2" style={{ flexWrap: "nowrap" }}>
            <input
              className="field-input"
              type="date"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
              style={{ width: 150 }}
            />
            <span style={{ color: "var(--text-muted)" }}>إلى</span>
            <input
              className="field-input"
              type="date"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              style={{ width: 150 }}
            />
          </div>
          <button onClick={() => setPreviewOpen(true)} className="btn-secondary" style={{ padding: "8px 14px" }}>
            معاينة المقاطع
          </button>
          <button onClick={() => setArchiveOpen(true)} className="btn-secondary" style={{ padding: "8px 14px" }}>
            أرشيف الحذف
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3" style={{ marginBottom: 16 }}>
        <input
          className="field-input"
          placeholder="بحث بالكود أو اللوحة أو الراصد..."
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
        <SearchableSelect
          value={rasidId}
          onChange={setRasidId}
          placeholder="كل الراصدين"
          allLabel="كل الراصدين"
          options={rasids.map((r) => ({ value: r.id, label: r.full_name }))}
        />
        <SearchableSelect
          value={boardType}
          onChange={setBoardType}
          placeholder="كل الأنواع"
          allLabel="كل الأنواع"
          options={boardTypes.map((t) => ({ value: t.name, label: t.name }))}
        />
      </div>

      {hasFilters && (
        <div className="flex items-center gap-2 flex-wrap" style={{ marginBottom: 16 }}>
          <span style={{ fontSize: "var(--fs-caption)", color: "var(--text-muted)" }}>
            النتائج: {rows.length}
          </span>
          <button onClick={resetFilters} className="btn-secondary" style={{ padding: "6px 12px" }}>
            مسح كل الفلاتر
          </button>
        </div>
      )}

      {error && <p style={{ color: "var(--danger-500)", fontSize: 13, marginBottom: 8 }}>{error}</p>}

      <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "var(--fs-xs)" }}>
          <thead>
            <tr style={{ background: "var(--surface-muted)" }}>
              {["كود الرصد", "اللوحة", "الراصد", "التاريخ/الوقت", "المرفق", "حجم الملف", "الحالة", "إجراءات"].map((h) => (
                <th key={h} style={{ padding: 10, textAlign: "start", color: "var(--text-heading)" }}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {pageRows.map((r) => (
              <tr key={r.id} style={{ borderBottom: "1px solid var(--border-default)" }}>
                <td style={{ padding: 10 }}>{r.code}</td>
                <td style={{ padding: 10 }}>
                  {r.board_name}{" "}
                  <span className="chip chip-cyan">{r.board_type}</span>
                </td>
                <td style={{ padding: 10 }}>{r.rasid_name}</td>
                <td style={{ padding: 10 }}>
                  {r.captured_date} {r.captured_time}
                </td>
                <td style={{ padding: 10 }}>
                  {r.video_url ? (
                    <button onClick={() => setVideoModal(r.video_url)} style={{ color: "var(--veto-cyan)" }}>
                      ▶ تشغيل
                    </button>
                  ) : r.image_url ? (
                    <button onClick={() => setImageModal(r.image_url)} style={{ color: "var(--veto-cyan)" }}>
                      🖼️ عرض الصورة
                    </button>
                  ) : (
                    "—"
                  )}
                </td>
                <td style={{ padding: 10, color: "var(--text-muted)" }}>
                  {r.video_size_bytes ? `${(r.video_size_bytes / (1024 * 1024)).toFixed(1)} MB` : "—"}
                </td>
                <td style={{ padding: 10 }}>
                  <span className={r.status === "analyzed" ? "chip chip-green" : "chip chip-cyan"}>
                    {STATUS_LABEL[r.status] || r.status}
                  </span>
                </td>
                <td style={{ padding: 10 }}>
                  <div className="flex gap-2">
                    {(() => {
                      const remainingMs = (cooldownUntil[r.id] || 0) - now;
                      const inCooldown = remainingMs > 0;
                      return (
                        <button
                          onClick={() => analyze(r.id)}
                          disabled={analyzing === r.id || inCooldown}
                          className="btn-primary"
                          style={{ padding: "6px 12px", fontSize: "var(--fs-caption)" }}
                        >
                          {analyzing === r.id
                            ? "جاري التحليل..."
                            : inCooldown
                              ? `أعد المحاولة بعد ${Math.ceil(remainingMs / 1000)} ث`
                              : "تحليل بالذكاء الاصطناعي"}
                        </button>
                      );
                    })()}
                    <button
                      onClick={() => setEditModal(r)}
                      className="btn-secondary"
                      style={{ padding: "6px 12px", fontSize: "var(--fs-caption)" }}
                    >
                      تعديل
                    </button>
                    <button
                      onClick={() => remove(r.id)}
                      className="btn-danger"
                      style={{ fontSize: "var(--fs-caption)" }}
                    >
                      حذف
                    </button>
                  </div>
                  {analyzing === r.id && retryMessage && (
                    <div style={{ marginTop: 6, fontSize: "var(--fs-caption)", color: "var(--veto-amber, #b45309)" }}>
                      {retryMessage}
                    </div>
                  )}
                </td>
              </tr>
            ))}
            {!loading && rows.length === 0 && (
              <tr>
                <td colSpan={8} style={{ padding: 20, textAlign: "center", color: "var(--text-muted)" }}>
                  لا توجد طلبات
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {pageCount > 1 && (
        <div className="flex items-center justify-between" style={{ marginTop: 16 }}>
          <span style={{ fontSize: "var(--fs-caption)", color: "var(--text-muted)" }}>
            {rows.length} طلب — صفحة {page} من {pageCount}
          </span>
          <div className="flex gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="btn-secondary"
              style={{ padding: "6px 14px" }}
            >
              السابق
            </button>
            <button
              onClick={() => setPage((p) => Math.min(pageCount, p + 1))}
              disabled={page === pageCount}
              className="btn-secondary"
              style={{ padding: "6px 14px" }}
            >
              التالي
            </button>
          </div>
        </div>
      )}

      {videoModal && <VideoModal src={videoModal} onClose={() => setVideoModal(null)} />}
      {imageModal && (
        <Modal title="صورة الرصد" onClose={() => setImageModal(null)} width={720}>
          <img src={imageModal} alt="صورة الرصد" style={{ width: "100%", borderRadius: "var(--radius-md)" }} />
        </Modal>
      )}
      {editModal && (
        <EditSightingModal sighting={editModal} onClose={() => setEditModal(null)} onSaved={load} />
      )}
      {analyzeResult && (
        <AnalyzeResultModal ads={analyzeResult} onClose={() => setAnalyzeResult(null)} />
      )}
      {archiveOpen && <ArchiveModal onClose={() => setArchiveOpen(false)} onRestored={load} />}
      {previewOpen && <PreviewAllModal sightings={rows} onClose={() => setPreviewOpen(false)} />}
    </div>
  );
}

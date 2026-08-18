"use client";

import { useEffect, useState, useCallback } from "react";
import type { AdRow } from "@/lib/reviewTypes";
import { exportTableToExcel } from "@/lib/exportExcel";
import Modal from "@/components/Modal";
import EditAdModal from "./EditAdModal";

export default function AnalyzedAdsSection({ refreshKey }: { refreshKey: number }) {
  const [rows, setRows] = useState<AdRow[]>([]);
  const [view, setView] = useState<"table" | "grid">("table");
  const [q, setQ] = useState("");
  const [company, setCompany] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [zoomImage, setZoomImage] = useState<string | null>(null);
  const [editingAd, setEditingAd] = useState<AdRow | null>(null);

  const load = useCallback(() => {
    const params = new URLSearchParams();
    if (q) params.set("q", q);
    if (company) params.set("company", company);
    if (from) params.set("from", from);
    if (to) params.set("to", to);
    fetch(`/api/ads?${params.toString()}`)
      .then((r) => r.json())
      .then((d) => setRows(d.ads || []));
  }, [q, company, from, to]);

  useEffect(() => {
    const t = setTimeout(load, 300);
    return () => clearTimeout(t);
  }, [load, refreshKey]);

  const companies = Array.from(new Set(rows.map((r) => r.company_name))).sort();

  function doExport() {
    exportTableToExcel(
      "الإعلانات-المحللة",
      ["كود الرصد", "التاريخ", "اللوحة", "الشركة", "القطاع", "المدة (ث)", "التكرار اليومي", "الشارع"],
      rows.map((r) => [
        r.sighting_code,
        r.captured_date,
        r.board_name,
        r.company_name,
        r.sector,
        r.duration_seconds,
        r.repeats_per_day,
        r.board_streets?.[0] || "",
      ])
    );
  }

  return (
    <div className="card" style={{ padding: 24 }}>
      <div className="flex items-center justify-between flex-wrap gap-3" style={{ marginBottom: 16 }}>
        <h2 style={{ font: "var(--text-subtitle)", color: "var(--text-heading)" }}>الإعلانات المحلَّلة</h2>
        <div className="flex gap-2">
          <button
            onClick={() => setView(view === "table" ? "grid" : "table")}
            className="btn-secondary"
            style={{ padding: "8px 14px" }}
          >
            {view === "table" ? "عرض شبكي" : "عرض جدول"}
          </button>
          <button onClick={doExport} className="btn-primary" style={{ padding: "8px 14px" }}>
            تصدير Excel
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3" style={{ marginBottom: 16 }}>
        <input className="field-input" placeholder="بحث..." value={q} onChange={(e) => setQ(e.target.value)} />
        <select className="field-input" value={company} onChange={(e) => setCompany(e.target.value)}>
          <option value="">كل الشركات</option>
          {companies.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
        <input className="field-input" type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
        <input className="field-input" type="date" value={to} onChange={(e) => setTo(e.target.value)} />
      </div>

      {view === "table" ? (
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "var(--fs-xs)" }}>
            <thead>
              <tr style={{ background: "var(--surface-muted)" }}>
                {["كود الرصد", "التاريخ", "اللوحة", "الشركة", "القطاع", "المدة", "التكرار اليومي", "الشارع", "صورة", ""].map(
                  (h) => (
                    <th key={h} style={{ padding: 10, textAlign: "start", color: "var(--text-heading)" }}>
                      {h}
                    </th>
                  )
                )}
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} style={{ borderBottom: "1px solid var(--border-default)" }}>
                  <td style={{ padding: 10 }}>{r.sighting_code}</td>
                  <td style={{ padding: 10 }}>{r.captured_date}</td>
                  <td style={{ padding: 10 }}>{r.board_name}</td>
                  <td style={{ padding: 10 }}>{r.company_name}</td>
                  <td style={{ padding: 10 }}>
                    <span className="chip chip-cyan">{r.sector}</span>
                  </td>
                  <td style={{ padding: 10 }}>{r.duration_seconds} ث</td>
                  <td style={{ padding: 10 }}>{r.repeats_per_day}</td>
                  <td style={{ padding: 10 }}>{r.board_streets?.[0] || "—"}</td>
                  <td style={{ padding: 10 }}>
                    {r.frame_image_url && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={r.frame_image_url}
                        alt={r.company_name}
                        onClick={() => setZoomImage(r.frame_image_url)}
                        style={{ width: 48, height: 32, objectFit: "cover", borderRadius: 4, cursor: "pointer" }}
                      />
                    )}
                  </td>
                  <td style={{ padding: 10 }}>
                    <button
                      onClick={() => setEditingAd(r)}
                      className="btn-secondary"
                      style={{ padding: "6px 12px", fontSize: "var(--fs-caption)" }}
                    >
                      تعديل
                    </button>
                  </td>
                </tr>
              ))}
              {rows.length === 0 && (
                <tr>
                  <td colSpan={10} style={{ padding: 20, textAlign: "center", color: "var(--text-muted)" }}>
                    لا توجد إعلانات محلَّلة بعد
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {rows.map((r) => (
            <div key={r.id} className="card" style={{ padding: 12 }}>
              {r.frame_image_url && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={r.frame_image_url}
                  alt={r.company_name}
                  onClick={() => setZoomImage(r.frame_image_url)}
                  style={{ width: "100%", height: 100, objectFit: "cover", borderRadius: "var(--radius-sm)", cursor: "pointer" }}
                />
              )}
              <p style={{ fontWeight: 600, marginTop: 8, fontSize: "var(--fs-xs)" }}>{r.company_name}</p>
              <p style={{ fontSize: "var(--fs-caption)", color: "var(--text-muted)" }}>
                {r.board_name} · {r.captured_date}
              </p>
              <div className="flex items-center justify-between" style={{ marginTop: 6 }}>
                <span className="chip chip-cyan">{r.sector}</span>
                <button
                  onClick={() => setEditingAd(r)}
                  className="btn-secondary"
                  style={{ padding: "4px 10px", fontSize: "var(--fs-caption)" }}
                >
                  تعديل
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {zoomImage && (
        <Modal title="صورة الإعلان" onClose={() => setZoomImage(null)} width={640}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={zoomImage} alt="" style={{ width: "100%", borderRadius: "var(--radius-md)" }} />
        </Modal>
      )}
      {editingAd && (
        <EditAdModal ad={editingAd} onClose={() => setEditingAd(null)} onSaved={load} />
      )}
    </div>
  );
}

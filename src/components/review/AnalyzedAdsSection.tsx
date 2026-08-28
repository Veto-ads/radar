"use client";

import { useEffect, useState, useCallback } from "react";
import type { AdRow } from "@/lib/reviewTypes";
import { exportTableToExcel } from "@/lib/exportExcel";
import Modal from "@/components/Modal";
import SearchableSelect from "@/components/SearchableSelect";
import EditAdModal from "./EditAdModal";
import BulkEditAdsModal from "./BulkEditAdsModal";

const PAGE_SIZE = 10;

export default function AnalyzedAdsSection({ refreshKey }: { refreshKey: number }) {
  const [rows, setRows] = useState<AdRow[]>([]);
  const [view, setView] = useState<"table" | "grid">("table");
  const [q, setQ] = useState("");
  const [company, setCompany] = useState("");
  const [sector, setSector] = useState("");
  const [rasidId, setRasidId] = useState("");
  const [boardType, setBoardType] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [rasids, setRasids] = useState<{ id: string; full_name: string }[]>([]);
  const [boardTypes, setBoardTypes] = useState<{ id: string; name: string }[]>([]);
  const [zoomImage, setZoomImage] = useState<string | null>(null);
  const [editingAd, setEditingAd] = useState<AdRow | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulkEditOpen, setBulkEditOpen] = useState(false);
  const [page, setPage] = useState(1);

  const load = useCallback(() => {
    const params = new URLSearchParams();
    if (q) params.set("q", q);
    if (company) params.set("company", company);
    if (sector) params.set("sector", sector);
    if (rasidId) params.set("rasid_id", rasidId);
    if (boardType) params.set("board_type", boardType);
    if (from) params.set("from", from);
    if (to) params.set("to", to);
    fetch(`/api/ads?${params.toString()}`)
      .then((r) => r.json())
      .then((d) => setRows(d.ads || []));
  }, [q, company, sector, rasidId, boardType, from, to]);

  useEffect(() => {
    const t = setTimeout(load, 300);
    return () => clearTimeout(t);
  }, [load, refreshKey]);

  useEffect(() => {
    setSelected(new Set());
  }, [rows]);

  useEffect(() => {
    setPage(1);
  }, [q, company, sector, rasidId, boardType, from, to]);

  useEffect(() => {
    fetch("/api/users?role=rasid")
      .then((r) => r.json())
      .then((d) => setRasids(d.users || []));
    fetch("/api/board-types")
      .then((r) => r.json())
      .then((d) => setBoardTypes(d.types || []));
  }, []);

  const companies = Array.from(new Set(rows.map((r) => r.company_name))).sort();
  const sectors = Array.from(new Set(rows.map((r) => r.sector))).sort();

  const pageCount = Math.max(1, Math.ceil(rows.length / PAGE_SIZE));
  useEffect(() => {
    if (page > pageCount) setPage(pageCount);
  }, [pageCount, page]);
  const pageRows = rows.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  function toggleOne(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleAll() {
    setSelected((prev) => {
      const pageIds = pageRows.map((r) => r.id);
      const allSelected = pageIds.length > 0 && pageIds.every((id) => prev.has(id));
      const next = new Set(prev);
      if (allSelected) pageIds.forEach((id) => next.delete(id));
      else pageIds.forEach((id) => next.add(id));
      return next;
    });
  }

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
          {selected.size > 0 && (
            <button onClick={() => setBulkEditOpen(true)} className="btn-primary" style={{ padding: "8px 14px" }}>
              تعديل الكل ({selected.size})
            </button>
          )}
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
        <SearchableSelect
          value={company}
          onChange={setCompany}
          placeholder="كل الشركات"
          allLabel="كل الشركات"
          options={companies.map((c) => ({ value: c, label: c }))}
        />
        <SearchableSelect
          value={sector}
          onChange={setSector}
          placeholder="كل القطاعات"
          allLabel="كل القطاعات"
          options={sectors.map((s) => ({ value: s, label: s }))}
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
        <input className="field-input" type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
        <input className="field-input" type="date" value={to} onChange={(e) => setTo(e.target.value)} />
      </div>

      {view === "table" ? (
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "var(--fs-xs)" }}>
            <thead>
              <tr style={{ background: "var(--surface-muted)" }}>
                <th style={{ padding: 10 }}>
                  <input
                    type="checkbox"
                    checked={pageRows.length > 0 && pageRows.every((r) => selected.has(r.id))}
                    onChange={toggleAll}
                  />
                </th>
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
              {pageRows.map((r) => (
                <tr key={r.id} style={{ borderBottom: "1px solid var(--border-default)" }}>
                  <td style={{ padding: 10 }}>
                    <input type="checkbox" checked={selected.has(r.id)} onChange={() => toggleOne(r.id)} />
                  </td>
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
                        style={{ width: 40, height: 40, objectFit: "cover", borderRadius: 4, cursor: "pointer" }}
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
                  <td colSpan={11} style={{ padding: 20, textAlign: "center", color: "var(--text-muted)" }}>
                    لا توجد إعلانات محلَّلة بعد
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {pageRows.map((r) => (
            <div key={r.id} className="card" style={{ padding: 12, position: "relative" }}>
              <input
                type="checkbox"
                checked={selected.has(r.id)}
                onChange={() => toggleOne(r.id)}
                style={{ position: "absolute", top: 10, insetInlineStart: 10, zIndex: 1 }}
              />
              {r.frame_image_url && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={r.frame_image_url}
                  alt={r.company_name}
                  onClick={() => setZoomImage(r.frame_image_url)}
                  style={{ width: "100%", aspectRatio: "1", objectFit: "cover", borderRadius: "var(--radius-sm)", cursor: "pointer" }}
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

      {pageCount > 1 && (
        <div className="flex items-center justify-between" style={{ marginTop: 16 }}>
          <span style={{ fontSize: "var(--fs-caption)", color: "var(--text-muted)" }}>
            {rows.length} نتيجة — صفحة {page} من {pageCount}
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

      {zoomImage && (
        <Modal title="صورة الإعلان" onClose={() => setZoomImage(null)} width={640}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={zoomImage} alt="" style={{ width: "100%", borderRadius: "var(--radius-md)" }} />
        </Modal>
      )}
      {editingAd && (
        <EditAdModal ad={editingAd} onClose={() => setEditingAd(null)} onSaved={load} />
      )}
      {bulkEditOpen && (
        <BulkEditAdsModal
          adIds={Array.from(selected)}
          onClose={() => setBulkEditOpen(false)}
          onSaved={load}
        />
      )}
    </div>
  );
}

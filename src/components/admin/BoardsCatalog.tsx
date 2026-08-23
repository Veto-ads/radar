"use client";

import { useEffect, useState } from "react";
import type { Board } from "@/lib/types";
import BoardModal from "./BoardModal";
import ImportBoardsModal from "./ImportBoardsModal";
import { exportBoardsToExcel } from "@/lib/boardExcel";

const DURATION_LABELS: Record<number, string> = {
  1: "يوم",
  2: "يومين",
  3: "ثلاثة أيام",
  4: "أربعة أيام",
  5: "خمسة أيام",
  6: "ستة أيام",
  7: "أسبوع",
  14: "أسبوعين",
  30: "شهر",
};

function StreetsCell({ streets }: { streets: string[] }) {
  const [open, setOpen] = useState(false);
  if (streets.length === 0) return <span>—</span>;
  return (
    <span>
      {streets[0]}
      {streets.length > 1 && (
        <button onClick={() => setOpen((v) => !v)} style={{ color: "var(--veto-cyan)", marginInlineStart: 6 }}>
          +{streets.length - 1} المزيد
        </button>
      )}
      {open && (
        <div style={{ fontSize: "var(--fs-caption)", color: "var(--text-muted)" }}>
          {streets.slice(1).join("، ")}
        </div>
      )}
    </span>
  );
}

const PAGE_SIZE = 10;

export default function BoardsCatalog() {
  const [boards, setBoards] = useState<Board[]>([]);
  const [modalBoard, setModalBoard] = useState<Board | null | "new">(null);
  const [duplicateSource, setDuplicateSource] = useState<Board | null>(null);
  const [importOpen, setImportOpen] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState("");
  const [page, setPage] = useState(1);
  const [q, setQ] = useState("");

  function load() {
    fetch("/api/boards")
      .then((r) => r.json())
      .then((d) => setBoards(d.boards || []));
  }

  useEffect(load, []);

  useEffect(() => {
    setSelected(new Set());
  }, [boards]);

  useEffect(() => {
    setPage(1);
  }, [q]);

  const filteredBoards = boards.filter((b) => {
    const needle = q.trim().toLowerCase();
    if (!needle) return true;
    const streets = ((b.streets as unknown as string[]) || []).join(" ");
    return `${b.name} ${b.city || ""} ${b.type} ${b.company || ""} ${streets}`.toLowerCase().includes(needle);
  });

  const pageCount = Math.max(1, Math.ceil(filteredBoards.length / PAGE_SIZE));
  useEffect(() => {
    if (page > pageCount) setPage(pageCount);
  }, [pageCount, page]);
  const pageBoards = filteredBoards.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

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
      const pageIds = pageBoards.map((b) => b.id);
      const allSelected = pageIds.length > 0 && pageIds.every((id) => prev.has(id));
      const next = new Set(prev);
      if (allSelected) pageIds.forEach((id) => next.delete(id));
      else pageIds.forEach((id) => next.add(id));
      return next;
    });
  }

  async function remove(id: string) {
    if (!confirm("هل تريد حذف هذه اللوحة نهائياً؟")) return;
    setError("");
    const res = await fetch(`/api/boards/${id}`, { method: "DELETE" });
    if (!res.ok) {
      setError((await res.json()).error || "تعذر حذف اللوحة");
      return;
    }
    load();
  }

  async function removeSelected() {
    if (!confirm(`هل تريد حذف ${selected.size} لوحة نهائياً؟`)) return;
    setDeleting(true);
    setError("");
    try {
      const results = await Promise.all(
        Array.from(selected).map((id) => fetch(`/api/boards/${id}`, { method: "DELETE" }))
      );
      const failed = results.filter((r) => !r.ok).length;
      if (failed > 0) {
        setError(`تعذر حذف ${failed} لوحة لوجود عمليات رصد مرتبطة بها`);
      }
      load();
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="card" style={{ padding: 24 }}>
      <div className="flex items-center justify-between" style={{ marginBottom: 16 }}>
        <h2 style={{ font: "var(--text-subtitle)", color: "var(--text-heading)" }}>كتالوج اللوحات والشاشات</h2>
        <div className="flex gap-2">
          {selected.size > 0 && (
            <button
              onClick={removeSelected}
              disabled={deleting}
              className="btn-danger"
              style={{ padding: "8px 16px" }}
            >
              {deleting ? "جاري الحذف..." : `حذف المحدد (${selected.size})`}
            </button>
          )}
          <button
            onClick={() => exportBoardsToExcel(boards.map((b) => ({ ...b, streets: b.streets as unknown as string[] })))}
            className="btn-secondary"
            style={{ padding: "8px 16px" }}
          >
            تصدير Excel
          </button>
          <button onClick={() => setImportOpen(true)} className="btn-secondary" style={{ padding: "8px 16px" }}>
            استيراد من Excel
          </button>
          <button onClick={() => setModalBoard("new")} className="btn-primary" style={{ padding: "8px 16px" }}>
            إضافة لوحة
          </button>
        </div>
      </div>

      {error && <p style={{ color: "var(--danger-500)", fontSize: 13, marginBottom: 12 }}>{error}</p>}

      <input
        className="field-input"
        placeholder="ابحث عن لوحة بالاسم أو المدينة أو النوع أو الشركة أو الشارع..."
        value={q}
        onChange={(e) => setQ(e.target.value)}
        style={{ marginBottom: 16 }}
      />

      <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "var(--fs-xs)" }}>
          <thead>
            <tr style={{ background: "var(--surface-muted)" }}>
                <th style={{ padding: 10 }}>
                  <input
                    type="checkbox"
                    checked={pageBoards.length > 0 && pageBoards.every((b) => selected.has(b.id))}
                    onChange={toggleAll}
                  />
                </th>
              {["الاسم", "النوع", "التصنيف", "المدينة", "الشوارع", "المدة", "السعر", "الشركة", ""].map((h) => (
                <th key={h} style={{ padding: 10, textAlign: "start", color: "var(--text-heading)" }}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {pageBoards.map((b) => (
              <tr key={b.id} style={{ borderBottom: "1px solid var(--border-default)" }}>
                <td style={{ padding: 10 }}>
                  <input type="checkbox" checked={selected.has(b.id)} onChange={() => toggleOne(b.id)} />
                </td>
                <td style={{ padding: 10 }}>{b.name}</td>
                <td style={{ padding: 10 }}>
                  <span className="chip chip-cyan">{b.type}</span>
                </td>
                <td style={{ padding: 10 }}>{b.category}</td>
                <td style={{ padding: 10 }}>{b.city || "—"}</td>
                <td style={{ padding: 10 }}>
                  <StreetsCell streets={b.streets as unknown as string[]} />
                </td>
                <td style={{ padding: 10 }}>{DURATION_LABELS[b.price_duration_days] || `${b.price_duration_days} يوم`}</td>
                <td style={{ padding: 10 }}>{b.price} ر.س</td>
                <td style={{ padding: 10 }}>{b.company || "—"}</td>
                <td style={{ padding: 10 }}>
                  <div className="flex gap-2">
                    <button onClick={() => setModalBoard(b)} className="btn-secondary" style={{ padding: "6px 12px" }}>
                      تعديل
                    </button>
                    <button
                      onClick={() => setDuplicateSource(b)}
                      className="btn-secondary"
                      style={{ padding: "6px 12px" }}
                    >
                      نسخ
                    </button>
                    <button onClick={() => remove(b.id)} className="btn-danger" style={{ fontSize: "var(--fs-caption)" }}>
                      حذف
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {pageBoards.length === 0 && (
              <tr>
                <td colSpan={9} style={{ padding: 20, textAlign: "center", color: "var(--text-muted)" }}>
                  لا توجد لوحات مطابقة
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {pageCount > 1 && (
        <div className="flex items-center justify-between" style={{ marginTop: 16 }}>
          <span style={{ fontSize: "var(--fs-caption)", color: "var(--text-muted)" }}>
            {filteredBoards.length} لوحة — صفحة {page} من {pageCount}
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

      {modalBoard && (
        <BoardModal
          board={modalBoard === "new" ? null : modalBoard}
          onClose={() => setModalBoard(null)}
          onSaved={load}
        />
      )}
      {duplicateSource && (
        <BoardModal
          board={null}
          duplicateFrom={duplicateSource}
          onClose={() => setDuplicateSource(null)}
          onSaved={load}
        />
      )}
      {importOpen && (
        <ImportBoardsModal onClose={() => setImportOpen(false)} onImported={load} />
      )}
    </div>
  );
}

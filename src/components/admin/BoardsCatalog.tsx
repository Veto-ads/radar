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

export default function BoardsCatalog() {
  const [boards, setBoards] = useState<Board[]>([]);
  const [modalBoard, setModalBoard] = useState<Board | null | "new">(null);
  const [importOpen, setImportOpen] = useState(false);

  function load() {
    fetch("/api/boards")
      .then((r) => r.json())
      .then((d) => setBoards(d.boards || []));
  }

  useEffect(load, []);

  async function remove(id: string) {
    if (!confirm("هل تريد حذف هذه اللوحة نهائياً؟")) return;
    await fetch(`/api/boards/${id}`, { method: "DELETE" });
    load();
  }

  return (
    <div className="card" style={{ padding: 24 }}>
      <div className="flex items-center justify-between" style={{ marginBottom: 16 }}>
        <h2 style={{ font: "var(--text-subtitle)", color: "var(--text-heading)" }}>كتالوج اللوحات والشاشات</h2>
        <div className="flex gap-2">
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

      <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "var(--fs-xs)" }}>
          <thead>
            <tr style={{ background: "var(--surface-muted)" }}>
              {["الاسم", "النوع", "التصنيف", "المدينة", "الشوارع", "المدة", "السعر", "الشركة", ""].map((h) => (
                <th key={h} style={{ padding: 10, textAlign: "start", color: "var(--text-heading)" }}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {boards.map((b) => (
              <tr key={b.id} style={{ borderBottom: "1px solid var(--border-default)" }}>
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
                    <button onClick={() => remove(b.id)} className="btn-danger" style={{ fontSize: "var(--fs-caption)" }}>
                      حذف
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {modalBoard && (
        <BoardModal
          board={modalBoard === "new" ? null : modalBoard}
          onClose={() => setModalBoard(null)}
          onSaved={load}
        />
      )}
      {importOpen && (
        <ImportBoardsModal onClose={() => setImportOpen(false)} onImported={load} />
      )}
    </div>
  );
}

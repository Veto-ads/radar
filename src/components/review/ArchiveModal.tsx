"use client";

import { useEffect, useState } from "react";
import Modal from "@/components/Modal";
import type { SightingRow } from "@/lib/reviewTypes";

export default function ArchiveModal({
  onClose,
  onRestored,
}: {
  onClose: () => void;
  onRestored: () => void;
}) {
  const [rows, setRows] = useState<SightingRow[]>([]);
  const [loading, setLoading] = useState(true);

  function load() {
    setLoading(true);
    fetch("/api/sightings?status=deleted")
      .then((r) => r.json())
      .then((d) => setRows(d.sightings || []))
      .finally(() => setLoading(false));
  }

  useEffect(load, []);

  async function restore(id: string) {
    await fetch(`/api/sightings/${id}/restore`, { method: "POST" });
    load();
    onRestored();
  }

  return (
    <Modal title="أرشيف الحذف" onClose={onClose} width={720}>
      {loading && <p style={{ fontSize: "var(--fs-xs)", color: "var(--text-muted)" }}>جاري التحميل...</p>}
      {!loading && rows.length === 0 && (
        <p style={{ fontSize: "var(--fs-xs)", color: "var(--text-muted)" }}>الأرشيف فارغ</p>
      )}
      <div className="flex flex-col gap-2">
        {rows.map((r) => (
          <div
            key={r.id}
            className="flex items-center justify-between"
            style={{ padding: 10, border: "1px solid var(--border-default)", borderRadius: "var(--radius-md)" }}
          >
            <div style={{ fontSize: "var(--fs-xs)" }}>
              <strong>{r.code}</strong> — {r.board_name} — {r.rasid_name} — {r.captured_date}
            </div>
            <button onClick={() => restore(r.id)} className="btn-secondary" style={{ padding: "6px 14px" }}>
              استعادة
            </button>
          </div>
        ))}
      </div>
    </Modal>
  );
}

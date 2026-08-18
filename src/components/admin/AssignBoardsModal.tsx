"use client";

import { useEffect, useState } from "react";
import Modal from "@/components/Modal";
import type { Board } from "@/lib/types";

export default function AssignBoardsModal({
  userId,
  userName,
  onClose,
}: {
  userId: string;
  userName: string;
  onClose: () => void;
}) {
  const [boards, setBoards] = useState<Board[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    Promise.all([
      fetch("/api/boards").then((r) => r.json()),
      fetch(`/api/users/${userId}/boards`).then((r) => r.json()),
    ]).then(([boardsData, assignedData]) => {
      setBoards(boardsData.boards || []);
      setSelected(new Set(assignedData.boardIds || []));
      setLoading(false);
    });
  }, [userId]);

  function toggle(boardId: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(boardId)) next.delete(boardId);
      else next.add(boardId);
      return next;
    });
  }

  async function save() {
    setSaving(true);
    setSaved(false);
    try {
      await fetch(`/api/users/${userId}/boards`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ boardIds: Array.from(selected) }),
      });
      setSaved(true);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal title={`اللوحات المخصصة — ${userName}`} onClose={onClose} width={520}>
      <div className="flex flex-col gap-3">
        <p style={{ fontSize: "var(--fs-caption)", color: "var(--text-muted)" }}>
          {selected.size === 0
            ? "لم تُخصَّص أي لوحة بعد — الراصد يرى كل اللوحات حالياً. اختر لوحة واحدة على الأقل لتقييد الوصول."
            : `${selected.size} لوحة مخصصة — الراصد لا يمكنه رصد غيرها.`}
        </p>

        {loading ? (
          <p style={{ fontSize: "var(--fs-xs)", color: "var(--text-muted)" }}>جاري التحميل...</p>
        ) : (
          <div style={{ maxHeight: 320, overflowY: "auto" }} className="flex flex-col gap-1">
            {boards.map((b) => (
              <label
                key={b.id}
                className="flex items-center gap-2"
                style={{
                  padding: "8px 10px",
                  borderRadius: "var(--radius-sm)",
                  background: selected.has(b.id) ? "var(--green-100)" : "transparent",
                  fontSize: "var(--fs-xs)",
                }}
              >
                <input type="checkbox" checked={selected.has(b.id)} onChange={() => toggle(b.id)} />
                <span>{b.name}</span>
                <span className="chip chip-cyan">{b.type}</span>
              </label>
            ))}
          </div>
        )}

        <button disabled={saving} onClick={save} className="btn-primary" style={{ padding: "10px 0" }}>
          {saving ? "جاري الحفظ..." : "حفظ التخصيص"}
        </button>
        {saved && <p style={{ color: "var(--green-600)", fontSize: 13 }}>تم الحفظ بنجاح</p>}
      </div>
    </Modal>
  );
}

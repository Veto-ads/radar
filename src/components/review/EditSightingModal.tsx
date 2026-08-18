"use client";

import { useState } from "react";
import Modal from "@/components/Modal";
import BoardCombobox from "@/components/BoardCombobox";
import type { Board } from "@/lib/types";
import type { SightingRow } from "@/lib/reviewTypes";

export default function EditSightingModal({
  sighting,
  onClose,
  onSaved,
}: {
  sighting: SightingRow;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [board, setBoard] = useState<Board | null>(null);
  const [saving, setSaving] = useState(false);

  async function save() {
    if (!board) return;
    setSaving(true);
    try {
      await fetch(`/api/sightings/${sighting.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ board_id: board.id }),
      });
      onSaved();
      onClose();
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal title={`تعديل الرصد ${sighting.code}`} onClose={onClose} width={480}>
      <div className="flex flex-col gap-4">
        <p style={{ fontSize: "var(--fs-xs)", color: "var(--text-muted)" }}>
          اللوحة الحالية: {sighting.board_name}
        </p>
        <BoardCombobox onSelect={setBoard} />
        <button
          disabled={!board || saving}
          onClick={save}
          className="btn-primary"
          style={{ padding: "10px 0" }}
        >
          {saving ? "جاري الحفظ..." : "حفظ التعديل"}
        </button>
      </div>
    </Modal>
  );
}

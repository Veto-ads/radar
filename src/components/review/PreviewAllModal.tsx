"use client";

import Modal from "@/components/Modal";
import type { SightingRow } from "@/lib/reviewTypes";

export default function PreviewAllModal({
  sightings,
  onClose,
}: {
  sightings: SightingRow[];
  onClose: () => void;
}) {
  return (
    <Modal title={`معاينة المقاطع (${sightings.length})`} onClose={onClose} width={960}>
      <div className="grid grid-cols-2 gap-4">
        {sightings.map((s) => (
          <div key={s.id} className="flex flex-col gap-2">
            <video src={s.video_url} controls style={{ width: "100%", borderRadius: "var(--radius-md)" }} />
            <div style={{ fontSize: "var(--fs-xs)", color: "var(--text-muted)" }}>
              {s.code} — {s.board_name}
            </div>
          </div>
        ))}
      </div>
    </Modal>
  );
}

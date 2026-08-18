"use client";

import Modal from "@/components/Modal";
import type { GeminiAd } from "@/lib/gemini";

export default function AnalyzeResultModal({
  ads,
  onClose,
}: {
  ads: (GeminiAd & { frame_image_url?: string })[];
  onClose: () => void;
}) {
  return (
    <Modal title="نتيجة التحليل بالذكاء الاصطناعي" onClose={onClose} width={760}>
      <div className="flex flex-col gap-4">
        {ads.length === 0 && (
          <p style={{ color: "var(--text-muted)", fontSize: "var(--fs-xs)" }}>
            لم يتم رصد أي إعلانات في هذا المقطع.
          </p>
        )}
        {ads.map((ad, i) => (
          <div
            key={i}
            className="grid grid-cols-[120px_1fr] gap-4"
            style={{ padding: 12, border: "1px solid var(--border-default)", borderRadius: "var(--radius-md)" }}
          >
            {ad.frame_image_url && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={ad.frame_image_url}
                alt={ad.company_name}
                style={{ width: 120, height: 68, objectFit: "cover", borderRadius: "var(--radius-sm)" }}
              />
            )}
            <div className="flex flex-col gap-1">
              <div className="flex items-center gap-2">
                <strong style={{ color: "var(--text-heading)" }}>{ad.company_name}</strong>
                <span className="chip chip-cyan">{ad.sector}</span>
              </div>
              <p style={{ fontSize: "var(--fs-xs)", color: "var(--text-muted)" }}>{ad.objective}</p>
              <div className="flex gap-4" style={{ fontSize: "var(--fs-xs)", color: "var(--text-body)" }}>
                <span>مدة الظهور: {ad.duration_seconds} ث</span>
                <span>التكرار/الدقيقة: {ad.repeats_per_minute}</span>
                <span>التكرار/اليوم: {ad.repeats_per_day}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </Modal>
  );
}

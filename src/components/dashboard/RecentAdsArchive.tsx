"use client";

import { useState } from "react";
import Modal from "@/components/Modal";

export type ArchiveAdItem = {
  id: string;
  frame_image_url: string | null;
  objective?: string | null;
  captured_date: string;
  board_name: string;
  company_name?: string;
  board_type?: string;
  month?: string;
};

function AdThumb({
  ad,
  showCompany,
  onZoom,
}: {
  ad: ArchiveAdItem;
  showCompany: boolean;
  onZoom: (url: string) => void;
}) {
  if (!ad.frame_image_url) return null;
  return (
    <div style={{ flex: "0 0 120px", width: 120 }}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={ad.frame_image_url}
        alt={ad.company_name || ad.board_name}
        onClick={() => onZoom(ad.frame_image_url!)}
        style={{
          width: "100%",
          aspectRatio: "1",
          objectFit: "cover",
          borderRadius: "var(--radius-sm)",
          cursor: "pointer",
        }}
      />
      {showCompany && ad.company_name && (
        <p style={{ fontSize: "var(--fs-caption)", fontWeight: 600, marginTop: 4 }}>{ad.company_name}</p>
      )}
      <p style={{ fontSize: "var(--fs-caption)", color: "var(--text-muted)" }}>
        {ad.board_name} · {ad.captured_date}
      </p>
    </div>
  );
}

export default function RecentAdsArchive({
  recentAds,
  monthlyArchive,
  showCompany = true,
}: {
  recentAds: ArchiveAdItem[];
  monthlyArchive: Record<string, ArchiveAdItem[]>;
  showCompany?: boolean;
}) {
  const [zoomImage, setZoomImage] = useState<string | null>(null);
  const [openMonth, setOpenMonth] = useState<string | null>(null);
  const months = Object.keys(monthlyArchive).sort().reverse();

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h3 style={{ font: "var(--text-subtitle)", color: "var(--text-heading)", marginBottom: 10 }}>
          أحدث الإعلانات المرصودة
        </h3>
        {recentAds.length === 0 ? (
          <p style={{ fontSize: "var(--fs-xs)", color: "var(--text-muted)" }}>لا توجد إعلانات بعد</p>
        ) : (
          <div className="flex gap-3" style={{ overflowX: "auto", paddingBottom: 4 }}>
            {recentAds.map((ad) => (
              <AdThumb key={ad.id} ad={ad} showCompany={showCompany} onZoom={setZoomImage} />
            ))}
          </div>
        )}
      </div>

      <div>
        <h3 style={{ font: "var(--text-subtitle)", color: "var(--text-heading)", marginBottom: 10 }}>
          الأرشيف الشهري
        </h3>
        {months.length === 0 ? (
          <p style={{ fontSize: "var(--fs-xs)", color: "var(--text-muted)" }}>لا يوجد أرشيف بعد</p>
        ) : (
          <>
            <div className="flex gap-2 flex-wrap" style={{ marginBottom: 12 }}>
              {months.map((m) => (
                <button
                  key={m}
                  onClick={() => setOpenMonth(openMonth === m ? null : m)}
                  className={openMonth === m ? "chip chip-green" : "chip chip-cyan"}
                >
                  {m} ({monthlyArchive[m].length})
                </button>
              ))}
            </div>
            {openMonth && (
              <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
                {monthlyArchive[openMonth].map((ad) => (
                  <AdThumb key={ad.id} ad={ad} showCompany={showCompany} onZoom={setZoomImage} />
                ))}
              </div>
            )}
          </>
        )}
      </div>

      {zoomImage && (
        <Modal title="صورة الإعلان" onClose={() => setZoomImage(null)} width={640}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={zoomImage} alt="" style={{ width: "100%", borderRadius: "var(--radius-md)" }} />
        </Modal>
      )}
    </div>
  );
}

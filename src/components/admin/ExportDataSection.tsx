"use client";

import { useState } from "react";
import { exportTableToExcel } from "@/lib/exportExcel";
import type { AdRow } from "@/lib/reviewTypes";

export default function ExportDataSection() {
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [loading, setLoading] = useState(false);

  async function doExport() {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (from) params.set("from", from);
      if (to) params.set("to", to);
      const res = await fetch(`/api/ads?${params.toString()}`);
      const data = await res.json();
      const ads = (data.ads || []) as AdRow[];
      exportTableToExcel(
        "تصدير-بيانات-الإعلانات",
        ["كود الرصد", "التاريخ", "اللوحة", "التصنيف", "الشركة", "القطاع", "المدة (ث)", "التكرار/اليوم", "رابط صورة الإعلان"],
        ads.map((a) => [
          a.sighting_code,
          a.captured_date,
          a.board_name,
          a.board_category,
          a.company_name,
          a.sector,
          a.duration_seconds,
          a.repeats_per_day,
          a.frame_image_url ? `${location.origin}${a.frame_image_url}` : "",
        ])
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="card" style={{ padding: 24 }}>
      <h2 style={{ font: "var(--text-subtitle)", color: "var(--text-heading)", marginBottom: 16 }}>
        تصدير البيانات
      </h2>
      <div className="flex items-center gap-3 flex-wrap">
        <input className="field-input" type="date" value={from} onChange={(e) => setFrom(e.target.value)} style={{ width: 180 }} />
        <input className="field-input" type="date" value={to} onChange={(e) => setTo(e.target.value)} style={{ width: 180 }} />
        <button onClick={doExport} disabled={loading} className="btn-primary" style={{ padding: "10px 20px" }}>
          {loading ? "جاري التصدير..." : "تصدير Excel"}
        </button>
      </div>
    </div>
  );
}

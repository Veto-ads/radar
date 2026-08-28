"use client";

import { useEffect, useState, useCallback } from "react";
import { exportTableToExcel } from "@/lib/exportExcel";

type Stat = { id: string; full_name: string; today: number; month: number; year: number; custom: number | null };

export default function RasidStatsSection() {
  const [stats, setStats] = useState<Stat[]>([]);
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");

  const load = useCallback(() => {
    const params = new URLSearchParams();
    if (from) params.set("from", from);
    if (to) params.set("to", to);
    fetch(`/api/stats/rasid?${params.toString()}`)
      .then((r) => r.json())
      .then((d) => setStats(d.stats || []));
  }, [from, to]);

  useEffect(() => {
    load();
  }, [load]);

  const hasRange = !!(from && to);

  function doExport() {
    const headers = ["الراصد", "اليوم", "الشهر", "العام"];
    if (hasRange) headers.push(`الفترة المخصصة (${from} - ${to})`);
    const rows = stats.map((s) => {
      const row: (string | number)[] = [s.full_name, s.today, s.month, s.year];
      if (hasRange) row.push(s.custom ?? 0);
      return row;
    });
    exportTableToExcel("إحصائيات-الراصدين", headers, rows);
  }

  return (
    <div className="card" style={{ padding: 24 }}>
      <div className="flex items-center justify-between flex-wrap gap-3" style={{ marginBottom: 16 }}>
        <h2 style={{ font: "var(--text-subtitle)", color: "var(--text-heading)" }}>إحصائيات الراصدين</h2>
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center gap-2" style={{ flexWrap: "nowrap" }}>
            <input
              className="field-input"
              type="date"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
              style={{ width: 150 }}
            />
            <span style={{ color: "var(--text-muted)" }}>إلى</span>
            <input
              className="field-input"
              type="date"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              style={{ width: 150 }}
            />
          </div>
          <button onClick={doExport} className="btn-primary" style={{ padding: "8px 14px" }}>
            تصدير Excel
          </button>
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {stats.map((s) => (
          <div
            key={s.id}
            style={{
              padding: 16,
              borderRadius: "var(--radius-lg)",
              background: "var(--surface-muted)",
              border: "1px solid var(--border-default)",
            }}
          >
            <p style={{ fontWeight: 600, color: "var(--text-heading)", marginBottom: 8 }}>{s.full_name}</p>
            <div className="flex justify-between" style={{ fontSize: "var(--fs-xs)" }}>
              <span>اليوم: <strong>{s.today}</strong></span>
              <span>الشهر: <strong>{s.month}</strong></span>
              <span>العام: <strong>{s.year}</strong></span>
            </div>
            {hasRange && (
              <p style={{ fontSize: "var(--fs-xs)", marginTop: 8, color: "var(--text-muted)" }}>
                الفترة المحددة: <strong style={{ color: "var(--text-heading)" }}>{s.custom ?? 0}</strong>
              </p>
            )}
          </div>
        ))}
        {stats.length === 0 && (
          <p style={{ color: "var(--text-muted)", fontSize: "var(--fs-xs)" }}>لا يوجد راصدون بعد</p>
        )}
      </div>
    </div>
  );
}

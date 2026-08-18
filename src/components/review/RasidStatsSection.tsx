"use client";

import { useEffect, useState } from "react";

type Stat = { id: string; full_name: string; today: number; month: number; year: number };

export default function RasidStatsSection() {
  const [stats, setStats] = useState<Stat[]>([]);

  useEffect(() => {
    fetch("/api/stats/rasid")
      .then((r) => r.json())
      .then((d) => setStats(d.stats || []));
  }, []);

  return (
    <div className="card" style={{ padding: 24 }}>
      <h2 style={{ font: "var(--text-subtitle)", color: "var(--text-heading)", marginBottom: 16 }}>
        إحصائيات الراصدين
      </h2>
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
          </div>
        ))}
        {stats.length === 0 && (
          <p style={{ color: "var(--text-muted)", fontSize: "var(--fs-xs)" }}>لا يوجد راصدون بعد</p>
        )}
      </div>
    </div>
  );
}

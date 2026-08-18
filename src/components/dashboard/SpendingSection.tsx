"use client";

import { useEffect, useState } from "react";
import ChartCanvas from "./ChartCanvas";
import { CHART_PALETTE } from "@/lib/chartColors";
import type { ChartConfiguration } from "chart.js/auto";

export default function SpendingSection({ from, to }: { from: string; to: string }) {
  const [byCompany, setByCompany] = useState<{ company: string; amount: number }[]>([]);
  const [bySector, setBySector] = useState<{ sector: string; amount: number }[]>([]);

  useEffect(() => {
    const params = new URLSearchParams({ from, to });
    fetch(`/api/stats/spending?${params.toString()}`)
      .then((r) => r.json())
      .then((d) => {
        setByCompany(d.byCompany || []);
        setBySector(d.bySector || []);
      });
  }, [from, to]);

  const companyCfg: ChartConfiguration = {
    type: "bar",
    data: {
      labels: byCompany.map((c) => c.company),
      datasets: [{ label: "الإنفاق التقديري (ريال)", data: byCompany.map((c) => c.amount), backgroundColor: CHART_PALETTE[1] }],
    },
    options: { indexAxis: "y", plugins: { legend: { display: false } } },
  };

  const sectorCfg: ChartConfiguration = {
    type: "bar",
    data: {
      labels: bySector.map((c) => c.sector),
      datasets: [{ label: "الإنفاق التقديري (ريال)", data: bySector.map((c) => c.amount), backgroundColor: CHART_PALETTE[2] }],
    },
    options: { indexAxis: "y", plugins: { legend: { display: false } } },
  };

  return (
    <div className="card" style={{ padding: 24 }}>
      <h2 style={{ font: "var(--text-subtitle)", color: "var(--text-heading)", marginBottom: 4 }}>الإنفاق</h2>
      <p style={{ fontSize: "var(--fs-caption)", color: "var(--text-muted)", marginBottom: 16 }}>
        تقدير: سعر اللوحة لمدتها المحددة، يُحتسب مرة واحدة لكل فترة إيجار — لا يتكرر إلا إذا رُصدت اللوحة بعد انتهاء المدة
      </p>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <h3 style={{ font: "var(--text-label)", color: "var(--text-heading)", marginBottom: 12 }}>
            أكثر الشركات إنفاقاً
          </h3>
          <ChartCanvas config={companyCfg} />
        </div>
        <div>
          <h3 style={{ font: "var(--text-label)", color: "var(--text-heading)", marginBottom: 12 }}>
            أكثر القطاعات إنفاقاً
          </h3>
          <ChartCanvas config={sectorCfg} />
        </div>
      </div>
    </div>
  );
}

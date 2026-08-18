"use client";

import ChartCanvas from "./ChartCanvas";
import { CHART_PALETTE } from "@/lib/chartColors";
import type { ChartConfiguration } from "chart.js/auto";

type DashboardData = {
  totals: { ads: number; companies: number; sectors: number; boards: number };
  companiesToday: { name: string; count: number }[];
  sectorsDist: { sector: string; count: number }[];
  sectorByMedia: { sector: string; board_type: string; count: number }[];
  topSectors: { sector: string; count: number }[];
  topRepeatedAds: { company: string; board: string; repeats_per_day: number }[];
  trend: { date: string; count: number }[];
  topCompanies: { company: string; count: number }[];
};

function pieLegendWithPercent(labels: string[], values: number[]) {
  const total = values.reduce((a, b) => a + b, 0) || 1;
  return labels.map((l, i) => `${l} (${Math.round((values[i] / total) * 100)}%)`);
}

export default function DashboardCharts({ data }: { data: DashboardData }) {
  const companiesTodayCfg: ChartConfiguration = {
    type: "bar",
    data: {
      labels: data.companiesToday.map((c) => c.name),
      datasets: [{ label: "الإعلانات", data: data.companiesToday.map((c) => c.count), backgroundColor: CHART_PALETTE[0] }],
    },
    options: { plugins: { legend: { display: false } } },
  };

  const sectorsPieCfg: ChartConfiguration = {
    type: "pie",
    data: {
      labels: pieLegendWithPercent(
        data.sectorsDist.map((s) => s.sector),
        data.sectorsDist.map((s) => s.count)
      ),
      datasets: [{ data: data.sectorsDist.map((s) => s.count), backgroundColor: CHART_PALETTE }],
    },
    options: { plugins: { legend: { position: "bottom" } } },
  };

  const mediaTypes = Array.from(new Set(data.sectorByMedia.map((r) => r.board_type)));
  const sectors = Array.from(new Set(data.sectorByMedia.map((r) => r.sector)));
  const stackedCfg: ChartConfiguration = {
    type: "bar",
    data: {
      labels: sectors,
      datasets: mediaTypes.map((type, i) => ({
        label: type,
        data: sectors.map(
          (sector) => data.sectorByMedia.find((r) => r.sector === sector && r.board_type === type)?.count || 0
        ),
        backgroundColor: CHART_PALETTE[i % CHART_PALETTE.length],
      })),
    },
    options: {
      plugins: { legend: { position: "bottom" } },
      scales: { x: { stacked: true }, y: { stacked: true } },
    },
  };

  const topSectorsCfg: ChartConfiguration = {
    type: "bar",
    data: {
      labels: data.topSectors.map((s) => s.sector),
      datasets: [{ label: "الإعلانات", data: data.topSectors.map((s) => s.count), backgroundColor: CHART_PALETTE[2] }],
    },
    options: { plugins: { legend: { display: false } } },
  };

  const topRepeatedCfg: ChartConfiguration = {
    type: "bar",
    data: {
      labels: data.topRepeatedAds.map((a) => `${a.company} — ${a.board}`),
      datasets: [
        { label: "التكرار اليومي", data: data.topRepeatedAds.map((a) => a.repeats_per_day), backgroundColor: CHART_PALETTE[4] },
      ],
    },
    options: { indexAxis: "y", plugins: { legend: { display: false } } },
  };

  const trendCfg: ChartConfiguration = {
    type: "line",
    data: {
      labels: data.trend.map((t) => t.date),
      datasets: [
        {
          label: "عدد الإعلانات المرصودة",
          data: data.trend.map((t) => t.count),
          borderColor: CHART_PALETTE[0],
          backgroundColor: "rgba(80,173,104,0.15)",
          fill: true,
          tension: 0.3,
        },
      ],
    },
    options: { plugins: { legend: { display: false } } },
  };

  const topCompaniesCfg: ChartConfiguration = {
    type: "pie",
    data: {
      labels: pieLegendWithPercent(
        data.topCompanies.map((c) => c.company),
        data.topCompanies.map((c) => c.count)
      ),
      datasets: [{ data: data.topCompanies.map((c) => c.count), backgroundColor: CHART_PALETTE }],
    },
    options: { plugins: { legend: { position: "bottom" } } },
  };

  const charts: { title: string; cfg: ChartConfiguration }[] = [
    { title: "الشركات المعلنة اليوم", cfg: companiesTodayCfg },
    { title: "القطاعات", cfg: sectorsPieCfg },
    { title: "توزيع القطاعات على الوسائل", cfg: stackedCfg },
    { title: "أكثر القطاعات استحواذاً", cfg: topSectorsCfg },
    { title: "أكثر الإعلانات تكراراً", cfg: topRepeatedCfg },
    { title: "اتجاه الرصد عبر الأيام", cfg: trendCfg },
    { title: "أكثر الشركات إعلاناً", cfg: topCompaniesCfg },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      {charts.map((c) => (
        <div key={c.title} className="card" style={{ padding: 20 }}>
          <h3 style={{ font: "var(--text-label)", color: "var(--text-heading)", marginBottom: 12 }}>{c.title}</h3>
          <ChartCanvas config={c.cfg} />
        </div>
      ))}
    </div>
  );
}

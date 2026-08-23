"use client";

import { useState, type ReactNode } from "react";
import ChartCanvas from "./ChartCanvas";
import RankedShareList from "./RankedShareList";
import { CHART_PALETTE } from "@/lib/chartColors";
import type { ChartConfiguration } from "chart.js/auto";

const OTHER_LABEL = "أخرى";

// Collapses a DESC-sorted count list to its top N entries, folding the rest
// into a single "أخرى" bucket so long tails don't crowd out the chart/list.
function collapseTopN(items: { label: string; count: number }[], n: number) {
  if (items.length <= n) return items;
  const rest = items.slice(n).reduce((sum, i) => sum + i.count, 0);
  return [...items.slice(0, n), { label: OTHER_LABEL, count: rest }];
}

type DashboardData = {
  totals: { ads: number; companies: number; sectors: number; boards: number };
  companiesToday: { name: string; count: number }[];
  sectorsDist: { sector: string; count: number }[];
  sectorByMedia: { sector: string; board_type: string; count: number }[];
  topSectors: { sector: string; count: number }[];
  topRepeatedAds: { company: string; board: string; repeats_per_day: number }[];
  trend: { date: string; count: number }[];
  topCompanies: { company: string; count: number }[];
  companiesBySector: { sector: string; company: string; count: number }[];
};

function pieLegendWithPercent(labels: string[], values: number[]) {
  const total = values.reduce((a, b) => a + b, 0) || 1;
  return labels.map((l, i) => `${l} (${Math.round((values[i] / total) * 100)}%)`);
}

type Tile =
  | { title: string; kind: "chart"; cfg: ChartConfiguration; wide?: boolean }
  | { title: string; kind: "ranked"; items: { label: string; count: number }[]; wide?: boolean; header?: ReactNode };

export default function DashboardCharts({ data }: { data: DashboardData }) {
  const [companySector, setCompanySector] = useState("");

  const companiesTodayRanked = data.companiesToday.map((c) => ({ label: c.name, count: c.count }));

  const sectorsTop5 = collapseTopN(
    data.sectorsDist.map((s) => ({ label: s.sector, count: s.count })),
    5
  );
  const sectorsPieCfg: ChartConfiguration = {
    type: "pie",
    data: {
      labels: pieLegendWithPercent(
        sectorsTop5.map((s) => s.label),
        sectorsTop5.map((s) => s.count)
      ),
      datasets: [{ data: sectorsTop5.map((s) => s.count), backgroundColor: CHART_PALETTE }],
    },
    options: { plugins: { legend: { position: "bottom" } } },
  };

  // Board type (from the boards catalog) is the primary axis here — sectors
  // are the stacked series within each type, capped at the top 7 + "أخرى".
  const boardTypes = Array.from(new Set(data.sectorByMedia.map((r) => r.board_type)));
  const sectorTotals = new Map<string, number>();
  for (const r of data.sectorByMedia) sectorTotals.set(r.sector, (sectorTotals.get(r.sector) || 0) + r.count);
  const sectorsByTotal = Array.from(sectorTotals.entries())
    .sort((a, b) => b[1] - a[1])
    .map(([sector]) => sector);
  const topMediaSectors = sectorsByTotal.slice(0, 7);
  const otherMediaSectors = new Set(sectorsByTotal.slice(7));
  const stackedSeries = otherMediaSectors.size > 0 ? [...topMediaSectors, OTHER_LABEL] : topMediaSectors;
  const stackedCfg: ChartConfiguration = {
    type: "bar",
    data: {
      labels: boardTypes,
      datasets: stackedSeries.map((sector, i) => ({
        label: sector,
        data: boardTypes.map((type) =>
          sector === OTHER_LABEL
            ? data.sectorByMedia
                .filter((r) => otherMediaSectors.has(r.sector) && r.board_type === type)
                .reduce((sum, r) => sum + r.count, 0)
            : data.sectorByMedia.find((r) => r.sector === sector && r.board_type === type)?.count || 0
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

  // RankedShareList keys rows by label — dedupe same company/board pairs
  // (re-analysis can leave more than one) rather than letting them collide.
  // topRepeatedAds is already ordered DESC, so the first occurrence kept is
  // the highest one.
  const topRepeatedRanked = Array.from(
    new Map(
      data.topRepeatedAds.map((a) => [`${a.company} — ${a.board}`, a.repeats_per_day])
    )
  ).map(([label, count]) => ({ label, count }));

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

  const sectorOptions = Array.from(new Set(data.sectorsDist.map((s) => s.sector)));
  const topCompaniesSource = companySector
    ? data.companiesBySector
        .filter((r) => r.sector === companySector)
        .map((r) => ({ label: r.company, count: r.count }))
    : data.topCompanies.map((c) => ({ label: c.company, count: c.count }));
  const topCompaniesTop7 = collapseTopN(topCompaniesSource, 7);

  const tiles: Tile[] = [
    { title: "الشركات المعلنة اليوم", kind: "ranked", items: companiesTodayRanked },
    { title: "القطاعات", kind: "chart", cfg: sectorsPieCfg },
    { title: "توزيع القطاعات على الوسائل", kind: "chart", cfg: stackedCfg, wide: true },
    { title: "أكثر القطاعات استحواذاً", kind: "chart", cfg: topSectorsCfg },
    { title: "أكثر الإعلانات تكراراً", kind: "ranked", items: topRepeatedRanked },
    { title: "اتجاه الرصد عبر الأيام", kind: "chart", cfg: trendCfg },
    {
      title: "أكثر الشركات إعلاناً",
      kind: "ranked",
      items: topCompaniesTop7,
      header: (
        <select
          className="field-input"
          value={companySector}
          onChange={(e) => setCompanySector(e.target.value)}
          style={{ marginBottom: 12 }}
        >
          <option value="">كل القطاعات</option>
          {sectorOptions.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
      ),
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      {tiles.map((t) => (
        <div
          key={t.title}
          className="card"
          style={{ padding: 20, ...(t.wide ? { gridColumn: "1 / -1" } : {}) }}
        >
          <h3 style={{ font: "var(--text-label)", color: "var(--text-heading)", marginBottom: 12 }}>{t.title}</h3>
          {t.kind === "ranked" && t.header}
          {t.kind === "chart" ? (
            <ChartCanvas config={t.cfg} height={t.wide ? 340 : 260} />
          ) : (
            <RankedShareList items={t.items} />
          )}
        </div>
      ))}
    </div>
  );
}

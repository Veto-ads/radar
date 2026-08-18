"use client";

import { useEffect, useState } from "react";
import SearchSelect from "@/components/SearchSelect";
import ChartCanvas from "./ChartCanvas";
import RankedShareList from "./RankedShareList";
import { CHART_PALETTE } from "@/lib/chartColors";
import type { ChartConfiguration } from "chart.js/auto";

type ArchiveAd = {
  id: string;
  frame_image_url: string | null;
  objective: string | null;
  captured_date: string;
  board_name: string;
  board_type: string;
};

type CompanyStats = {
  summary: { ads_count: number; avg_duration: number | null; last_ad_date: string | null };
  top_media: string | null;
  period_spending: number;
  avg_spending: number;
  monthsDist: { month: string; count: number }[];
  mediaDist: { type: string; count: number }[];
  boardsTrend: { month: string; count: number }[];
  streetsDist: { street: string; count: number }[];
  monthlyArchive: Record<string, ArchiveAd[]>;
};

export default function CompanyAnalysis() {
  const [companies, setCompanies] = useState<string[]>([]);
  const [company, setCompany] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [stats, setStats] = useState<CompanyStats | null>(null);
  const [openMonth, setOpenMonth] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/companies")
      .then((r) => r.json())
      .then((d) => setCompanies((d.companies || []).map((c: { name: string }) => c.name)));
  }, []);

  useEffect(() => {
    if (!company) {
      setStats(null);
      return;
    }
    const params = new URLSearchParams({ name: company });
    if (from) params.set("from", from);
    if (to) params.set("to", to);
    fetch(`/api/stats/company?${params.toString()}`)
      .then((r) => r.json())
      .then(setStats);
  }, [company, from, to]);

  const boardsCfg: ChartConfiguration = {
    type: "line",
    data: {
      labels: stats?.boardsTrend.map((m) => m.month) || [],
      datasets: [
        {
          label: "عدد اللوحات",
          data: stats?.boardsTrend.map((m) => m.count) || [],
          borderColor: CHART_PALETTE[0],
          tension: 0.3,
        },
      ],
    },
    options: { plugins: { legend: { display: false } } },
  };

  return (
    <div className="card" style={{ padding: 24 }}>
      <h2 style={{ font: "var(--text-subtitle)", color: "var(--text-heading)", marginBottom: 16 }}>
        تحليل شركة معلنة
      </h2>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3" style={{ marginBottom: 20 }}>
        <SearchSelect options={companies} placeholder="ابحث عن شركة..." onSelect={setCompany} />
        <input className="field-input" type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
        <input className="field-input" type="date" value={to} onChange={(e) => setTo(e.target.value)} />
      </div>

      {!company && (
        <p style={{ color: "var(--text-muted)", fontSize: "var(--fs-xs)" }}>اختر شركة لعرض تحليلها</p>
      )}

      {stats && (
        <div className="flex flex-col gap-6">
          <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
            {[
              ["عدد الإعلانات", stats.summary.ads_count],
              ["أكثر الوسائل", stats.top_media || "—"],
              ["متوسط الزمن", `${Math.round(stats.summary.avg_duration || 0)} ث`],
              ["متوسط الإنفاق", `${Math.round(stats.avg_spending)} ر.س`],
              ["إنفاق الفترة", `${Math.round(stats.period_spending)} ر.س`],
              ["آخر إعلان", stats.summary.last_ad_date || "—"],
            ].map(([label, value]) => (
              <div key={label as string} style={{ padding: 12, background: "var(--surface-muted)", borderRadius: "var(--radius-md)" }}>
                <p style={{ fontSize: "var(--fs-caption)", color: "var(--text-muted)" }}>{label}</p>
                <p style={{ fontWeight: 700, color: "var(--text-heading)" }}>{value}</p>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <h4 style={{ font: "var(--text-label)", marginBottom: 8 }}>توزيع الأشهر</h4>
              <RankedShareList items={stats.monthsDist.map((m) => ({ label: m.month, count: m.count }))} />
            </div>
            <div>
              <h4 style={{ font: "var(--text-label)", marginBottom: 8 }}>أكثر الوسائل</h4>
              <RankedShareList items={stats.mediaDist.map((m) => ({ label: m.type, count: m.count }))} />
            </div>
            <div>
              <h4 style={{ font: "var(--text-label)", marginBottom: 8 }}>عدد اللوحات</h4>
              <ChartCanvas config={boardsCfg} height={220} />
            </div>
          </div>

          <div>
            <h4 style={{ font: "var(--text-label)", marginBottom: 8 }}>أكثر الشوارع والطرق تكراراً</h4>
            <RankedShareList items={stats.streetsDist.map((s) => ({ label: s.street, count: s.count }))} />
          </div>

          <div>
            <h4 style={{ font: "var(--text-label)", marginBottom: 8 }}>الأرشيف الشهري</h4>
            <div className="flex flex-wrap gap-2" style={{ marginBottom: 12 }}>
              {Object.keys(stats.monthlyArchive).map((month) => (
                <button
                  key={month}
                  onClick={() => setOpenMonth(month === openMonth ? null : month)}
                  className="chip"
                  style={{
                    background: openMonth === month ? "var(--veto-green)" : "var(--surface-muted)",
                    color: openMonth === month ? "white" : "var(--text-heading)",
                    padding: "6px 14px",
                  }}
                >
                  {month}
                </button>
              ))}
            </div>
            {openMonth && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {stats.monthlyArchive[openMonth].map((ad) => (
                  <div key={ad.id} className="card" style={{ padding: 10 }}>
                    {ad.frame_image_url && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={ad.frame_image_url} alt="" style={{ width: "100%", height: 80, objectFit: "cover", borderRadius: 6 }} />
                    )}
                    <p style={{ fontSize: "var(--fs-caption)", marginTop: 6 }}>{ad.board_name}</p>
                    <p style={{ fontSize: "var(--fs-caption)", color: "var(--text-muted)" }}>{ad.captured_date}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

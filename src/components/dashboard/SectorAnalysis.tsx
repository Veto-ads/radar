"use client";

import { useEffect, useState } from "react";
import SearchSelect from "@/components/SearchSelect";
import RankedShareList from "./RankedShareList";
import RecentAdsArchive, { type ArchiveAdItem } from "./RecentAdsArchive";

type SectorStats = {
  summary: { ads_count: number; companies: number; avg_duration: number | null; last_ad_date: string | null };
  monthsDist: { month: string; count: number }[];
  mediaDist: { type: string; count: number }[];
  topCompanies: { company: string; count: number }[];
  streetsDist: { street: string; count: number }[];
  period_spending: number;
  monthlyArchive: Record<string, ArchiveAdItem[]>;
  recentAds: ArchiveAdItem[];
};

export default function SectorAnalysis() {
  const [sectors, setSectors] = useState<string[]>([]);
  const [sector, setSector] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [stats, setStats] = useState<SectorStats | null>(null);

  useEffect(() => {
    fetch("/api/sectors")
      .then((r) => r.json())
      .then((d) => setSectors((d.sectors || []).map((s: { name: string }) => s.name)));
  }, []);

  useEffect(() => {
    if (!sector) {
      setStats(null);
      return;
    }
    const params = new URLSearchParams({ name: sector });
    if (from) params.set("from", from);
    if (to) params.set("to", to);
    fetch(`/api/stats/sector?${params.toString()}`)
      .then((r) => r.json())
      .then(setStats);
  }, [sector, from, to]);

  return (
    <div className="card" style={{ padding: 24 }}>
      <h2 style={{ font: "var(--text-subtitle)", color: "var(--text-heading)", marginBottom: 16 }}>
        تحليل إعلانات القطاعات
      </h2>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3" style={{ marginBottom: 20 }}>
        <SearchSelect options={sectors} placeholder="ابحث عن قطاع..." onSelect={setSector} />
        <input className="field-input" type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
        <input className="field-input" type="date" value={to} onChange={(e) => setTo(e.target.value)} />
      </div>

      {!sector && <p style={{ color: "var(--text-muted)", fontSize: "var(--fs-xs)" }}>اختر قطاعاً لعرض تحليله</p>}

      {stats && (
        <div className="flex flex-col gap-6">
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            {[
              ["عدد الإعلانات", stats.summary.ads_count],
              ["عدد الشركات", stats.summary.companies],
              ["متوسط الزمن", `${Math.round(stats.summary.avg_duration || 0)} ث`],
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
              <h4 style={{ font: "var(--text-label)", marginBottom: 8 }}>أكثر 5 شركات إعلاناً</h4>
              <RankedShareList items={stats.topCompanies.map((c) => ({ label: c.company, count: c.count }))} />
            </div>
          </div>

          <div>
            <h4 style={{ font: "var(--text-label)", marginBottom: 8 }}>أكثر الشوارع والطرق تكراراً</h4>
            <RankedShareList items={stats.streetsDist.map((s) => ({ label: s.street, count: s.count }))} />
          </div>

          <RecentAdsArchive recentAds={stats.recentAds} monthlyArchive={stats.monthlyArchive} showCompany />
        </div>
      )}
    </div>
  );
}

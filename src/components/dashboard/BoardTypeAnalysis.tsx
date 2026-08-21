"use client";

import { useEffect, useState } from "react";
import SearchSelect from "@/components/SearchSelect";
import RankedShareList from "./RankedShareList";
import RecentAdsArchive, { type ArchiveAdItem } from "./RecentAdsArchive";

type BoardTypeStats = {
  topSectors: { sector: string; count: number }[];
  topCompaniesOverall: { company: string; count: number }[];
  topCompaniesBySector: { company: string; count: number }[];
  avg_duration: number;
  boards_count: number;
  screens_count: number;
  lastMonthAds: ArchiveAdItem[];
  monthlyArchive: Record<string, ArchiveAdItem[]>;
};

export default function BoardTypeAnalysis() {
  const [types, setTypes] = useState<string[]>([]);
  const [sectors, setSectors] = useState<string[]>([]);
  const [type, setType] = useState("");
  const [sector, setSector] = useState("");
  const [stats, setStats] = useState<BoardTypeStats | null>(null);

  useEffect(() => {
    fetch("/api/board-types")
      .then((r) => r.json())
      .then((d) => setTypes((d.types || []).map((t: { name: string }) => t.name)));
    fetch("/api/sectors")
      .then((r) => r.json())
      .then((d) => setSectors((d.sectors || []).map((s: { name: string }) => s.name)));
  }, []);

  useEffect(() => {
    if (!type) {
      setStats(null);
      return;
    }
    const params = new URLSearchParams({ type });
    if (sector) params.set("sector", sector);
    fetch(`/api/stats/board-type?${params.toString()}`)
      .then((r) => r.json())
      .then(setStats);
  }, [type, sector]);

  return (
    <div className="card" style={{ padding: 24 }}>
      <h2 style={{ font: "var(--text-subtitle)", color: "var(--text-heading)", marginBottom: 16 }}>
        تحليل اللوحات
      </h2>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3" style={{ marginBottom: 20 }}>
        <SearchSelect options={types} placeholder="ابحث عن نوع اللوحة..." onSelect={setType} />
        <SearchSelect options={sectors} placeholder="ابحث عن قطاع (اختياري)..." onSelect={setSector} />
      </div>

      {!type && <p style={{ color: "var(--text-muted)", fontSize: "var(--fs-xs)" }}>اختر نوع لوحة لعرض تحليله</p>}

      {stats && (
        <div className="flex flex-col gap-6">
          <div className="grid grid-cols-2 md:grid-cols-2 gap-3">
            <div style={{ padding: 12, background: "var(--surface-muted)", borderRadius: "var(--radius-md)" }}>
              <p style={{ fontSize: "var(--fs-caption)", color: "var(--text-muted)" }}>متوسط مدة ظهور الإعلان</p>
              <p style={{ fontWeight: 700, color: "var(--text-heading)" }}>{Math.round(stats.avg_duration)} ث</p>
            </div>
            <div style={{ padding: 12, background: "var(--surface-muted)", borderRadius: "var(--radius-md)" }}>
              <p style={{ fontSize: "var(--fs-caption)", color: "var(--text-muted)" }}>عدد الشبكات الإعلانية</p>
              <p style={{ fontWeight: 700, color: "var(--text-heading)" }}>{stats.screens_count}</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h4 style={{ font: "var(--text-label)", marginBottom: 8 }}>أبرز القطاعات المستحوذة</h4>
              <RankedShareList items={stats.topSectors.map((s) => ({ label: s.sector, count: s.count }))} />
            </div>
            <div>
              <h4 style={{ font: "var(--text-label)", marginBottom: 8 }}>أبرز الشركات المعلنة</h4>
              <RankedShareList items={stats.topCompaniesOverall.map((c) => ({ label: c.company, count: c.count }))} />
            </div>
          </div>

          {sector && (
            <div>
              <h4 style={{ font: "var(--text-label)", marginBottom: 8 }}>أبرز الشركات المعلنة وفق القطاع ({sector})</h4>
              <RankedShareList items={stats.topCompaniesBySector.map((c) => ({ label: c.company, count: c.count }))} />
            </div>
          )}

          <RecentAdsArchive
            recentAds={stats.lastMonthAds.slice(0, 12)}
            monthlyArchive={stats.monthlyArchive}
            showCompany
          />
        </div>
      )}
    </div>
  );
}

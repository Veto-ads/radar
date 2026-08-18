"use client";

import { useEffect, useMemo, useState } from "react";
import StatCard from "@/components/dashboard/StatCard";
import DashboardCharts from "@/components/dashboard/DashboardCharts";
import SpendingSection from "@/components/dashboard/SpendingSection";
import CompanyAnalysis from "@/components/dashboard/CompanyAnalysis";
import SectorAnalysis from "@/components/dashboard/SectorAnalysis";
import BoardTypeAnalysis from "@/components/dashboard/BoardTypeAnalysis";
import { exportTableToExcel } from "@/lib/exportExcel";

type Period = "today" | "7" | "30" | "custom";

function computeRange(period: Period, customFrom: string, customTo: string) {
  const today = new Date();
  const toStr = today.toISOString().slice(0, 10);
  if (period === "today") return { from: toStr, to: toStr };
  if (period === "7") {
    const d = new Date(today);
    d.setDate(d.getDate() - 6);
    return { from: d.toISOString().slice(0, 10), to: toStr };
  }
  if (period === "30") {
    const d = new Date(today);
    d.setDate(d.getDate() - 29);
    return { from: d.toISOString().slice(0, 10), to: toStr };
  }
  return { from: customFrom || toStr, to: customTo || toStr };
}

export default function DashboardPage() {
  const [period, setPeriod] = useState<Period>("30");
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");
  const [category, setCategory] = useState("all");
  const [categories, setCategories] = useState<{ id: string; name: string }[]>([]);
  const [data, setData] = useState<null | Record<string, unknown>>(null);

  const range = useMemo(() => computeRange(period, customFrom, customTo), [period, customFrom, customTo]);

  useEffect(() => {
    fetch("/api/board-categories")
      .then((r) => r.json())
      .then((d) => setCategories(d.categories || []));
  }, []);

  useEffect(() => {
    const params = new URLSearchParams({ from: range.from, to: range.to, category });
    fetch(`/api/stats/dashboard?${params.toString()}`)
      .then((r) => r.json())
      .then(setData);
  }, [range, category]);

  function exportStats() {
    if (!data) return;
    const totals = data.totals as Record<string, number>;
    exportTableToExcel(
      "احصائيات-لوحة-التحكم",
      ["المؤشر", "القيمة"],
      [
        ["إجمالي الإعلانات", totals.ads],
        ["الشركات", totals.companies],
        ["القطاعات", totals.sectors],
        ["الوسائل المغطاة", totals.boards],
      ]
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="card flex items-center justify-between flex-wrap gap-3" style={{ padding: 20 }}>
        <div className="flex items-center gap-2 flex-wrap">
          {(["today", "7", "30", "custom"] as Period[]).map((p) => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className="chip"
              style={{
                padding: "8px 16px",
                background: period === p ? "var(--veto-green)" : "var(--surface-muted)",
                color: period === p ? "white" : "var(--text-heading)",
              }}
            >
              {p === "today" ? "اليوم" : p === "7" ? "٧ أيام" : p === "30" ? "٣٠ يوم" : "مخصص"}
            </button>
          ))}
          {period === "custom" && (
            <>
              <input className="field-input" type="date" value={customFrom} onChange={(e) => setCustomFrom(e.target.value)} />
              <input className="field-input" type="date" value={customTo} onChange={(e) => setCustomTo(e.target.value)} />
            </>
          )}
          <select className="field-input" value={category} onChange={(e) => setCategory(e.target.value)} style={{ width: 140 }}>
            <option value="all">كل التصنيفات</option>
            {categories.map((c) => (
              <option key={c.id} value={c.name}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
        <button onClick={exportStats} className="btn-primary" style={{ padding: "10px 18px" }}>
          تصدير الإحصائيات (Excel)
        </button>
      </div>

      {data && (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <StatCard label="إجمالي الإعلانات" value={(data.totals as Record<string, number>).ads} />
            <StatCard label="الشركات" value={(data.totals as Record<string, number>).companies} />
            <StatCard label="القطاعات" value={(data.totals as Record<string, number>).sectors} />
            <StatCard label="الوسائل المغطاة" value={(data.totals as Record<string, number>).boards} />
          </div>

          {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
          <DashboardCharts data={data as any} />
        </>
      )}

      <SpendingSection from={range.from} to={range.to} />
      <CompanyAnalysis />
      <SectorAnalysis />
      <BoardTypeAnalysis />
    </div>
  );
}

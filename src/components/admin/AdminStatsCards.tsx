"use client";

import { useEffect, useState } from "react";
import StatCard from "@/components/dashboard/StatCard";

export default function AdminStatsCards() {
  const [stats, setStats] = useState({ rasids: 0, quality: 0, sightings: 0, boards: 0 });

  useEffect(() => {
    fetch("/api/stats/admin")
      .then((r) => r.json())
      .then(setStats);
  }, []);

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      <StatCard label="عدد الراصدين" value={stats.rasids} />
      <StatCard label="مشرفو الجودة" value={stats.quality} />
      <StatCard label="إجمالي الرصد" value={stats.sightings} />
      <StatCard label="عدد الوسائل" value={stats.boards} />
    </div>
  );
}

"use client";

import { useState } from "react";
import RequestsSection from "@/components/review/RequestsSection";
import AnalyzedAdsSection from "@/components/review/AnalyzedAdsSection";
import RasidStatsSection from "@/components/review/RasidStatsSection";

export default function ReviewPage() {
  const [refreshKey, setRefreshKey] = useState(0);

  return (
    <div className="flex flex-col gap-6">
      <RequestsSection onAnalyzed={() => setRefreshKey((k) => k + 1)} />
      <AnalyzedAdsSection refreshKey={refreshKey} />
      <RasidStatsSection />
    </div>
  );
}

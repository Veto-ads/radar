import { CHART_PALETTE } from "@/lib/chartColors";

// `valueLabel` swaps the share-of-total percentage and bar for a plain text
// value (used by lists ranked by something other than a count, e.g. recency).
type Item = { label: string; count: number; valueLabel?: string };

export default function RankedShareList({ items }: { items: Item[] }) {
  const total = items.reduce((sum, i) => sum + i.count, 0) || 1;
  if (items.length === 0) {
    return <p style={{ color: "var(--text-muted)", fontSize: "var(--fs-xs)" }}>لا توجد بيانات</p>;
  }
  return (
    <div className="flex flex-col gap-2">
      {items.map((item, i) => {
        const percent = Math.round((item.count / total) * 100);
        const plain = item.valueLabel !== undefined;
        return (
          <div key={item.label} className="flex items-center gap-3">
            <span style={{ fontSize: "var(--fs-caption)", color: "var(--text-muted)", width: 18 }}>{i + 1}</span>
            <div style={{ flex: 1 }}>
              <div className="flex items-center justify-between" style={{ marginBottom: plain ? 0 : 2 }}>
                <span style={{ fontSize: "var(--fs-xs)", color: "var(--text-heading)" }}>{item.label}</span>
                <span style={{ fontSize: "var(--fs-caption)", color: "var(--text-muted)" }}>
                  {plain ? item.valueLabel : `${percent}%`}
                </span>
              </div>
              {!plain && (
                <div style={{ height: 6, background: "var(--surface-muted)", borderRadius: "var(--radius-pill)" }}>
                  <div
                    style={{
                      height: 6,
                      width: `${percent}%`,
                      background: CHART_PALETTE[i % CHART_PALETTE.length],
                      borderRadius: "var(--radius-pill)",
                    }}
                  />
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

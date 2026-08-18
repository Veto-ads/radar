export default function StatCard({ label, value }: { label: string; value: number | string }) {
  return (
    <div
      className="card"
      style={{ padding: 20, background: "var(--gradient-stat)", border: "none" }}
    >
      <p style={{ color: "var(--lavender-200)", fontSize: "var(--fs-xs)", marginBottom: 8 }}>{label}</p>
      <p style={{ color: "white", fontSize: 28, fontWeight: 700 }}>{value}</p>
    </div>
  );
}

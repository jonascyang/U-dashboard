type KpiCardProps = {
  title: string;
  value: string;
  delta24h: string;
  baselineDev: string;
  tone?: "ok" | "warn" | "critical" | "info";
};

export function KpiCard({ title, value, delta24h, baselineDev, tone = "ok" }: KpiCardProps) {
  const toneColor = {
    ok: "var(--ok)",
    warn: "var(--warn)",
    critical: "var(--critical)",
    info: "var(--info)"
  }[tone];

  return (
    <article className="panel" aria-label={title}>
      <p style={{ margin: "0 0 8px", fontSize: 13, color: "#667085" }}>{title}</p>
      <p style={{ margin: "0 0 10px", fontSize: 28, fontWeight: 700 }}>{value}</p>
      <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
        <span style={{ color: toneColor, fontWeight: 600 }}>{delta24h}</span>
        <span style={{ color: "#667085" }}>{baselineDev}</span>
      </div>
    </article>
  );
}

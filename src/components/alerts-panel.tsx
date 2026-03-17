import type { AlertRow } from "@/server/dashboard-service";

type AlertsPanelProps = {
  alerts: AlertRow[];
};

export function AlertsPanel({ alerts }: AlertsPanelProps) {
  return (
    <section className="panel">
      <h3 style={{ marginTop: 0 }}>Alerts</h3>
      {alerts.length === 0 ? (
        <p style={{ color: "#667085" }}>No active alerts.</p>
      ) : (
        <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "grid", gap: 10 }}>
          {alerts.map((alert) => (
            <li key={alert.id} style={{ border: "1px solid var(--line)", borderRadius: 10, padding: 10 }}>
              <strong>{alert.level.toUpperCase()}</strong> {alert.ruleCode}
              <div style={{ fontSize: 13, color: "#667085" }}>
                {alert.marketId ?? "protocol"} · {alert.metricKey}: {alert.currentValue}
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

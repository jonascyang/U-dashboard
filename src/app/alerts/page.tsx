import { AlertsPanel } from "@/components/alerts-panel";
import { queryAlerts } from "@/server/dashboard-service";

export default async function AlertsPage() {
  const alerts = await queryAlerts();
  return (
    <div className="grid">
      <h1 style={{ marginBottom: 0 }}>Alerts Center</h1>
      <p style={{ marginTop: 0, color: "#667085" }}>Filter by severity and status in API query params.</p>
      <AlertsPanel alerts={alerts} />
    </div>
  );
}

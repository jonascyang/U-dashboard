import { MarketsTable } from "@/components/markets-table";
import { queryMarkets } from "@/server/dashboard-service";

export default async function MarketsPage() {
  const markets = await queryMarkets();
  return (
    <div className="grid">
      <h1 style={{ marginBottom: 0 }}>Markets</h1>
      <p style={{ marginTop: 0, color: "#667085" }}>Sorted for risk operations.</p>
      <MarketsTable
        rows={[...markets].sort((a, b) => {
          if (b.atRiskDebtRatio !== a.atRiskDebtRatio) return b.atRiskDebtRatio - a.atRiskDebtRatio;
          return b.utilization - a.utilization;
        })}
      />
    </div>
  );
}

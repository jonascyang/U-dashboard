import type { MarketRow } from "@/server/dashboard-service";

type MarketsTableProps = {
  rows: MarketRow[];
};

export function MarketsTable({ rows }: MarketsTableProps) {
  return (
    <section className="panel">
      <h3 style={{ marginTop: 0 }}>Markets</h3>
      <table className="table">
        <thead>
          <tr>
            <th>Market</th>
            <th>TVL</th>
            <th>Borrow</th>
            <th>Utilization</th>
            <th>Liquidation 24h</th>
            <th>At-Risk Ratio</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.marketId}>
              <td>{row.marketId}</td>
              <td>${row.tvlUsd.toLocaleString()}</td>
              <td>${row.borrowUsd.toLocaleString()}</td>
              <td>{(row.utilization * 100).toFixed(2)}%</td>
              <td>${row.liquidationUsd24h.toLocaleString()}</td>
              <td>{(row.atRiskDebtRatio * 100).toFixed(2)}%</td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}

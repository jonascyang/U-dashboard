import type { UPriceSource } from "@/server/u-monitor-service";

type SourceTableProps = {
  rows: UPriceSource[];
};

export function SourceTable({ rows }: SourceTableProps) {
  return (
    <section className="panel">
      <div className="panel-heading">
        <div>
          <h3 style={{ margin: 0 }}>Price Sources</h3>
          <p className="panel-subtitle">Volume-weighted U/USDT venues for the current monitor basket.</p>
        </div>
      </div>
      <table className="table">
        <thead>
          <tr>
            <th>Venue</th>
            <th>Type</th>
            <th>Pair</th>
            <th>Latest Price</th>
            <th>24h Quote Volume</th>
            <th>Weight</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.venue}>
              <td>{row.venue}</td>
              <td>{row.sourceType}</td>
              <td>{row.pair}</td>
              <td>${row.latestPrice.toFixed(6)}</td>
              <td>${row.quoteVolume24h.toLocaleString()}</td>
              <td>{row.weightPercent.toFixed(2)}%</td>
              <td>{row.status}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}

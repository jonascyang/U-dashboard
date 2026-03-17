import type { USupplyDelta } from "@/server/u-monitor-service";

type SupplyCardProps = {
  totalSupply: number;
  supplyDeltas: USupplyDelta[];
};

export function SupplyCard({ totalSupply, supplyDeltas }: SupplyCardProps) {
  return (
    <section className="panel monitor-card">
      <div className="monitor-card__eyebrow">Total Supply</div>
      <div className="monitor-card__value">{totalSupply.toLocaleString()}</div>
      <div className="monitor-delta-grid">
        {supplyDeltas.map((delta) => (
          <div key={delta.window} className="monitor-delta">
            <div className="monitor-stat__label">{delta.window}</div>
            <div className="monitor-stat__value">{delta.value.toLocaleString()}</div>
          </div>
        ))}
      </div>
    </section>
  );
}

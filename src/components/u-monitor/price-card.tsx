import type { UPriceSource } from "@/server/u-monitor-service";

type PriceCardProps = {
  updatedAt: string;
  weightedPrice: number;
  priceSources: UPriceSource[];
};

function formatPrice(value: number) {
  return `$${value.toFixed(6)}`;
}

export function PriceCard({ updatedAt, weightedPrice, priceSources }: PriceCardProps) {
  return (
    <section className="panel monitor-card">
      <div className="monitor-card__eyebrow">Latest Weighted Price</div>
      <div className="monitor-card__value">{formatPrice(weightedPrice)}</div>
      <div className="monitor-card__meta">Updated {new Date(updatedAt).toLocaleString("en-US", { hour12: false })}</div>
      <div className="monitor-chip-row">
        {priceSources.map((source) => (
          <span key={source.venue} className="monitor-chip">
            {source.venue} {source.weightPercent.toFixed(2)}%
          </span>
        ))}
      </div>
    </section>
  );
}

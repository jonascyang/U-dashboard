import type { UDepegPoint } from "@/server/u-monitor-service";

type DepegChartProps = {
  maxDeviationAt30d: string;
  maxDeviationPercent30d: number;
  maxDeviationValue30d: number;
  series: UDepegPoint[];
};

function buildPath(series: UDepegPoint[]) {
  const min = Math.min(...series.map((point) => point.price));
  const max = Math.max(...series.map((point) => point.price));
  const width = 100;
  const height = 44;
  const range = max - min || 1;

  return series
    .map((point, index) => {
      const x = (index / (series.length - 1)) * width;
      const y = height - ((point.price - min) / range) * height;
      return `${index === 0 ? "M" : "L"} ${x.toFixed(2)} ${y.toFixed(2)}`;
    })
    .join(" ");
}

export function DepegChart({
  maxDeviationAt30d,
  maxDeviationPercent30d,
  maxDeviationValue30d,
  series
}: DepegChartProps) {
  return (
    <section className="panel monitor-card">
      <div className="monitor-card__eyebrow">30D Depeg</div>
      <svg className="depeg-chart" viewBox="0 0 100 52" role="img" aria-label="30 day depeg chart">
        <line x1="0" y1="26" x2="100" y2="26" className="depeg-chart__baseline" />
        <path d={buildPath(series)} className="depeg-chart__line" />
      </svg>
      <div className="monitor-stat-row">
        <div>
          <div className="monitor-stat__label">Max deviation</div>
          <div className="monitor-stat__value">${maxDeviationValue30d.toFixed(4)}</div>
        </div>
        <div>
          <div className="monitor-stat__label">Deviation %</div>
          <div className="monitor-stat__value">{maxDeviationPercent30d.toFixed(2)}%</div>
        </div>
      </div>
      <div className="monitor-card__meta">Peak move at {new Date(maxDeviationAt30d).toLocaleDateString("en-US")}</div>
    </section>
  );
}

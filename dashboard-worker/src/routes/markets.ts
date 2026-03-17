import { getLatestMarketMetrics } from "@worker/repositories/metrics.repository";
import type { WorkerEnv } from "@worker/types";

function num(value: unknown): number {
  if (typeof value === "number") return value;
  if (typeof value === "string") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }
  return 0;
}

export async function handleMarkets(_request: Request, env: WorkerEnv): Promise<Response> {
  const rows = await getLatestMarketMetrics(env.DB);
  return Response.json({
    rows: rows.map((row) => {
      const tvlUsd = num(row.tvlUsd);
      const utilization = num(row.utilization);
      return {
        marketId: row.marketId,
        tvlUsd,
        borrowUsd: tvlUsd * utilization,
        utilization,
        liquidationUsd24h: num(row.liquidationUsd24h),
        atRiskDebtRatio: num(row.atRiskDebtRatio)
      };
    })
  });
}

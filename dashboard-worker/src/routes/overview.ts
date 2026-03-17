import { getLatestProtocolMetric } from "@worker/repositories/metrics.repository";
import type { WorkerEnv } from "@worker/types";

function num(value: unknown): number {
  if (typeof value === "number") return value;
  if (typeof value === "string") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }
  return 0;
}

export async function handleOverview(_request: Request, env: WorkerEnv): Promise<Response> {
  const row = await getLatestProtocolMetric(env.DB);
  if (!row) {
    return Response.json({
      tvl: 0,
      netFlow24h: 0,
      revenue24h: 0,
      activeUsers24h: 0,
      utilization: 0,
      liquidation24h: 0,
      atRiskDebtRatio: 0,
      securityEvents24h: 0,
      updatedAt: new Date(0).toISOString()
    });
  }

  return Response.json({
    tvl: num(row.tvlUsd),
    netFlow24h: num(row.netFlowUsd24h),
    revenue24h: num(row.revenueUsd24h),
    activeUsers24h: row.activeUsers24h,
    utilization: num(row.utilizationWeighted),
    liquidation24h: num(row.liquidationUsd24h),
    atRiskDebtRatio: num(row.atRiskDebtRatio),
    securityEvents24h: row.securityEvents24h,
    updatedAt: row.hourTs
  });
}

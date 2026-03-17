import { getProtocolTimeseries } from "@worker/repositories/metrics.repository";
import type { WorkerEnv } from "@worker/types";

const metricColumnMap: Record<string, Parameters<typeof getProtocolTimeseries>[1]> = {
  tvl_usd: "tvl_usd",
  net_flow_usd_24h: "net_flow_usd_24h",
  revenue_usd_24h: "revenue_usd_24h",
  utilization_weighted: "utilization_weighted",
  liquidation_usd_24h: "liquidation_usd_24h",
  at_risk_debt_ratio: "at_risk_debt_ratio"
};

export async function handleTimeseries(request: Request, env: WorkerEnv): Promise<Response> {
  const url = new URL(request.url);
  const metric = url.searchParams.get("metric") ?? "tvl_usd";
  const column = metricColumnMap[metric] ?? "tvl_usd";
  const points = await getProtocolTimeseries(env.DB, column, 24);
  return Response.json({
    metric,
    points
  });
}

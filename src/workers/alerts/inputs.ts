import type { AlertMetricInput } from "@/workers/alerts/rules";

type ProtocolMetricRow = {
  hourTs: Date;
  utilizationWeighted: string;
  atRiskDebtRatio: string;
  liquidationUsd24h: string;
  netFlowUsd24h: string;
  tvlUsd: string;
  revenueUsd24h: string;
  activeUsers24h: number;
  securityEvents24h: number;
};

type MarketMetricRow = {
  hourTs: Date;
  marketId: string;
  utilization: string;
  atRiskDebtRatio: string;
  liquidationUsd24h: string;
  netFlowUsd24h: string;
  tvlUsd: string;
  revenueUsd24h: string;
  activeUsers24h: number;
};

function toNum(value: string): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

export function buildAlertInputs(protocol: ProtocolMetricRow | null, markets: MarketMetricRow[]): AlertMetricInput[] {
  const inputs: AlertMetricInput[] = [];

  if (protocol) {
    inputs.push({
      hourTs: protocol.hourTs.toISOString(),
      utilization: toNum(protocol.utilizationWeighted),
      atRiskDebtRatio: toNum(protocol.atRiskDebtRatio),
      liquidationUsd24h: toNum(protocol.liquidationUsd24h),
      netFlowUsd24h: toNum(protocol.netFlowUsd24h),
      tvlUsd: toNum(protocol.tvlUsd),
      revenueUsd24h: toNum(protocol.revenueUsd24h),
      activeUsers24h: protocol.activeUsers24h,
      securityEventLevel: protocol.securityEvents24h > 0 ? "low" : "none"
    });
  }

  for (const market of markets) {
    inputs.push({
      hourTs: market.hourTs.toISOString(),
      marketId: market.marketId,
      utilization: toNum(market.utilization),
      atRiskDebtRatio: toNum(market.atRiskDebtRatio),
      liquidationUsd24h: toNum(market.liquidationUsd24h),
      netFlowUsd24h: toNum(market.netFlowUsd24h),
      tvlUsd: toNum(market.tvlUsd),
      revenueUsd24h: toNum(market.revenueUsd24h),
      activeUsers24h: market.activeUsers24h,
      securityEventLevel: "none"
    });
  }

  return inputs;
}

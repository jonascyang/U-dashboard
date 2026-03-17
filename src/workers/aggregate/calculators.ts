export type RawEvent = {
  marketId: string;
  eventType: "Deposit" | "Withdraw" | "Borrow" | "Repay" | "Liquidation";
  payloadJson: {
    user?: string;
    amountUsd?: number;
  };
};

export type ProtocolHourlyMetric = {
  tvlUsd: number;
  netFlowUsd24h: number;
  revenueUsd24h: number;
  activeUsers24h: number;
  utilizationWeighted: number;
  liquidationUsd24h: number;
  atRiskDebtRatio: number;
};

export type MarketHourlyMetric = {
  marketId: string;
  tvlUsd: number;
  netFlowUsd24h: number;
  revenueUsd24h: number;
  activeUsers24h: number;
  utilization: number;
  liquidationUsd24h: number;
  atRiskDebtRatio: number;
};

function num(value: unknown): number {
  if (typeof value !== "number" || Number.isNaN(value)) return 0;
  return value;
}

function uniqueUsers(events: RawEvent[]): number {
  return new Set(events.map((event) => event.payloadJson.user).filter((v): v is string => Boolean(v))).size;
}

export function computeMarketMetrics(events: RawEvent[]): MarketHourlyMetric[] {
  const groups = new Map<string, RawEvent[]>();
  for (const event of events) {
    groups.set(event.marketId, [...(groups.get(event.marketId) ?? []), event]);
  }

  return [...groups.entries()].map(([marketId, marketEvents]) => {
    const deposits = marketEvents
      .filter((event) => event.eventType === "Deposit")
      .reduce((sum, event) => sum + num(event.payloadJson.amountUsd), 0);
    const withdrawals = marketEvents
      .filter((event) => event.eventType === "Withdraw")
      .reduce((sum, event) => sum + num(event.payloadJson.amountUsd), 0);
    const borrows = marketEvents
      .filter((event) => event.eventType === "Borrow")
      .reduce((sum, event) => sum + num(event.payloadJson.amountUsd), 0);
    const repayments = marketEvents
      .filter((event) => event.eventType === "Repay")
      .reduce((sum, event) => sum + num(event.payloadJson.amountUsd), 0);
    const liquidations = marketEvents
      .filter((event) => event.eventType === "Liquidation")
      .reduce((sum, event) => sum + num(event.payloadJson.amountUsd), 0);

    const tvlUsd = Math.max(deposits - withdrawals, 0);
    const utilization = tvlUsd > 0 ? Math.min(borrows / tvlUsd, 1) : 0;
    const revenueUsd24h = (borrows - repayments) * 0.0025;
    const atRiskDebtRatio = liquidations > 0 && borrows > 0 ? Math.min(liquidations / borrows, 1) : 0;

    return {
      marketId,
      tvlUsd,
      netFlowUsd24h: deposits - withdrawals,
      revenueUsd24h: Math.max(revenueUsd24h, 0),
      activeUsers24h: uniqueUsers(marketEvents),
      utilization,
      liquidationUsd24h: liquidations,
      atRiskDebtRatio
    };
  });
}

export function computeProtocolMetrics(events: RawEvent[]): ProtocolHourlyMetric {
  const marketMetrics = computeMarketMetrics(events);
  const tvlUsd = marketMetrics.reduce((sum, metric) => sum + metric.tvlUsd, 0);
  const borrowProxy = marketMetrics.reduce((sum, metric) => sum + metric.utilization * metric.tvlUsd, 0);
  const weightedUtilization = tvlUsd > 0 ? borrowProxy / tvlUsd : 0;
  const atRiskDebtRatio = borrowProxy > 0
    ? marketMetrics.reduce((sum, metric) => sum + metric.atRiskDebtRatio * metric.utilization * metric.tvlUsd, 0) / borrowProxy
    : 0;

  return {
    tvlUsd,
    netFlowUsd24h: marketMetrics.reduce((sum, metric) => sum + metric.netFlowUsd24h, 0),
    revenueUsd24h: marketMetrics.reduce((sum, metric) => sum + metric.revenueUsd24h, 0),
    activeUsers24h: uniqueUsers(events),
    utilizationWeighted: weightedUtilization,
    liquidationUsd24h: marketMetrics.reduce((sum, metric) => sum + metric.liquidationUsd24h, 0),
    atRiskDebtRatio
  };
}

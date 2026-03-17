import { db } from "@/db/client";
import { metricHourlyMarket, metricHourlyProtocol, rawEvents } from "@/db/schema";
import { and, eq, gte, lt, sql } from "drizzle-orm";
import type { MarketHourlyMetric, ProtocolHourlyMetric } from "@/workers/aggregate/calculators";
import { mapRawEventRowsToAggregateEvents } from "@/workers/aggregate/event-loader";

export async function fetchEventsForAggregationWindow(hourStart: Date) {
  const windowStart = new Date(hourStart.getTime() - 24 * 60 * 60 * 1000);
  const windowEndExclusive = new Date(hourStart.getTime() + 60 * 60 * 1000);

  const rows = await db
    .select({
      marketId: rawEvents.marketId,
      eventType: rawEvents.eventType,
      payloadJson: rawEvents.payloadJson
    })
    .from(rawEvents)
    .where(and(gte(rawEvents.blockTime, windowStart), lt(rawEvents.blockTime, windowEndExclusive)));

  return mapRawEventRowsToAggregateEvents(rows);
}

export async function getMarketMetricsForHour(hourTs: Date) {
  return db
    .select()
    .from(metricHourlyMarket)
    .where(eq(metricHourlyMarket.hourTs, hourTs));
}

export async function getProtocolMetricForHour(hourTs: Date) {
  const rows = await db
    .select()
    .from(metricHourlyProtocol)
    .where(eq(metricHourlyProtocol.hourTs, hourTs))
    .limit(1);

  return rows[0] ?? null;
}

export async function upsertMarketMetrics(hourTs: Date, metrics: MarketHourlyMetric[]): Promise<number> {
  if (metrics.length === 0) return 0;
  await db
    .insert(metricHourlyMarket)
    .values(
      metrics.map((metric) => ({
        hourTs,
        marketId: metric.marketId,
        tvlUsd: metric.tvlUsd.toString(),
        netFlowUsd24h: metric.netFlowUsd24h.toString(),
        revenueUsd24h: metric.revenueUsd24h.toString(),
        activeUsers24h: metric.activeUsers24h,
        utilization: metric.utilization.toString(),
        liquidationUsd24h: metric.liquidationUsd24h.toString(),
        atRiskDebtRatio: metric.atRiskDebtRatio.toString()
      }))
    )
    .onConflictDoUpdate({
      target: [metricHourlyMarket.hourTs, metricHourlyMarket.marketId],
      set: {
        tvlUsd: sql`excluded.tvl_usd`,
        netFlowUsd24h: sql`excluded.net_flow_usd_24h`,
        revenueUsd24h: sql`excluded.revenue_usd_24h`,
        activeUsers24h: sql`excluded.active_users_24h`,
        utilization: sql`excluded.utilization`,
        liquidationUsd24h: sql`excluded.liquidation_usd_24h`,
        atRiskDebtRatio: sql`excluded.at_risk_debt_ratio`
      }
    });

  return metrics.length;
}

export async function upsertProtocolMetrics(hourTs: Date, metric: ProtocolHourlyMetric): Promise<void> {
  await db
    .insert(metricHourlyProtocol)
    .values({
      hourTs,
      tvlUsd: metric.tvlUsd.toString(),
      netFlowUsd24h: metric.netFlowUsd24h.toString(),
      revenueUsd24h: metric.revenueUsd24h.toString(),
      activeUsers24h: metric.activeUsers24h,
      utilizationWeighted: metric.utilizationWeighted.toString(),
      liquidationUsd24h: metric.liquidationUsd24h.toString(),
      atRiskDebtRatio: metric.atRiskDebtRatio.toString(),
      securityEvents24h: 0
    })
    .onConflictDoUpdate({
      target: metricHourlyProtocol.hourTs,
      set: {
        tvlUsd: sql`excluded.tvl_usd`,
        netFlowUsd24h: sql`excluded.net_flow_usd_24h`,
        revenueUsd24h: sql`excluded.revenue_usd_24h`,
        activeUsers24h: sql`excluded.active_users_24h`,
        utilizationWeighted: sql`excluded.utilization_weighted`,
        liquidationUsd24h: sql`excluded.liquidation_usd_24h`,
        atRiskDebtRatio: sql`excluded.at_risk_debt_ratio`
      }
    });
}

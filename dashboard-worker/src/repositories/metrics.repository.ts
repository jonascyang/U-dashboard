import type { MarketHourlyMetric, ProtocolHourlyMetric } from "@/workers/aggregate/calculators";
import { mapRawEventRowsToAggregateEvents } from "@/workers/aggregate/event-loader";

import type { D1DatabaseLike } from "@worker/types";

export type MetricHourlyMarketRow = {
  hourTs: string;
  marketId: string;
  tvlUsd: string;
  netFlowUsd24h: string;
  revenueUsd24h: string;
  activeUsers24h: number;
  utilization: string;
  liquidationUsd24h: string;
  atRiskDebtRatio: string;
};

export type MetricHourlyProtocolRow = {
  hourTs: string;
  tvlUsd: string;
  netFlowUsd24h: string;
  revenueUsd24h: string;
  activeUsers24h: number;
  utilizationWeighted: string;
  liquidationUsd24h: string;
  atRiskDebtRatio: string;
  securityEvents24h: number;
};

export async function fetchRawEventsForWindow(db: D1DatabaseLike, fromIso: string, toIso: string) {
  const { results } = await db
    .prepare(
      "SELECT market_id as marketId, event_type as eventType, payload_json as payloadJson FROM raw_events WHERE block_time >= ? AND block_time < ?"
    )
    .bind(fromIso, toIso)
    .all<{ marketId: string; eventType: string; payloadJson: string }>();

  return mapRawEventRowsToAggregateEvents(
    results.map((row) => ({
      marketId: row.marketId,
      eventType: row.eventType,
      payloadJson: safeJsonParse(row.payloadJson)
    }))
  );
}

function safeJsonParse(input: string): unknown {
  try {
    return JSON.parse(input);
  } catch {
    return {};
  }
}

export async function upsertMarketMetrics(
  db: D1DatabaseLike,
  hourTs: string,
  rows: MarketHourlyMetric[]
): Promise<number> {
  for (const row of rows) {
    await db
      .prepare(
        "INSERT INTO metric_hourly_market (hour_ts, market_id, tvl_usd, net_flow_usd_24h, revenue_usd_24h, active_users_24h, utilization, liquidation_usd_24h, at_risk_debt_ratio) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?) ON CONFLICT(hour_ts, market_id) DO UPDATE SET tvl_usd = excluded.tvl_usd, net_flow_usd_24h = excluded.net_flow_usd_24h, revenue_usd_24h = excluded.revenue_usd_24h, active_users_24h = excluded.active_users_24h, utilization = excluded.utilization, liquidation_usd_24h = excluded.liquidation_usd_24h, at_risk_debt_ratio = excluded.at_risk_debt_ratio"
      )
      .bind(
        hourTs,
        row.marketId,
        row.tvlUsd,
        row.netFlowUsd24h,
        row.revenueUsd24h,
        row.activeUsers24h,
        row.utilization,
        row.liquidationUsd24h,
        row.atRiskDebtRatio
      )
      .run();
  }

  return rows.length;
}

export async function upsertProtocolMetric(
  db: D1DatabaseLike,
  hourTs: string,
  row: ProtocolHourlyMetric
): Promise<void> {
  await db
    .prepare(
      "INSERT INTO metric_hourly_protocol (hour_ts, tvl_usd, net_flow_usd_24h, revenue_usd_24h, active_users_24h, utilization_weighted, liquidation_usd_24h, at_risk_debt_ratio, security_events_24h) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?) ON CONFLICT(hour_ts) DO UPDATE SET tvl_usd = excluded.tvl_usd, net_flow_usd_24h = excluded.net_flow_usd_24h, revenue_usd_24h = excluded.revenue_usd_24h, active_users_24h = excluded.active_users_24h, utilization_weighted = excluded.utilization_weighted, liquidation_usd_24h = excluded.liquidation_usd_24h, at_risk_debt_ratio = excluded.at_risk_debt_ratio, security_events_24h = excluded.security_events_24h"
    )
    .bind(
      hourTs,
      row.tvlUsd,
      row.netFlowUsd24h,
      row.revenueUsd24h,
      row.activeUsers24h,
      row.utilizationWeighted,
      row.liquidationUsd24h,
      row.atRiskDebtRatio,
      0
    )
    .run();
}

export async function getProtocolMetricForHour(
  db: D1DatabaseLike,
  hourTs: string
): Promise<MetricHourlyProtocolRow | null> {
  return (
    (await db
      .prepare(
        "SELECT hour_ts as hourTs, tvl_usd as tvlUsd, net_flow_usd_24h as netFlowUsd24h, revenue_usd_24h as revenueUsd24h, active_users_24h as activeUsers24h, utilization_weighted as utilizationWeighted, liquidation_usd_24h as liquidationUsd24h, at_risk_debt_ratio as atRiskDebtRatio, security_events_24h as securityEvents24h FROM metric_hourly_protocol WHERE hour_ts = ? LIMIT 1"
      )
      .bind(hourTs)
      .first<MetricHourlyProtocolRow>()) ?? null
  );
}

export async function getMarketMetricsForHour(
  db: D1DatabaseLike,
  hourTs: string
): Promise<MetricHourlyMarketRow[]> {
  const { results } = await db
    .prepare(
      "SELECT hour_ts as hourTs, market_id as marketId, tvl_usd as tvlUsd, net_flow_usd_24h as netFlowUsd24h, revenue_usd_24h as revenueUsd24h, active_users_24h as activeUsers24h, utilization, liquidation_usd_24h as liquidationUsd24h, at_risk_debt_ratio as atRiskDebtRatio FROM metric_hourly_market WHERE hour_ts = ?"
    )
    .bind(hourTs)
    .all<MetricHourlyMarketRow>();

  return results;
}

export async function getLatestProtocolMetric(db: D1DatabaseLike): Promise<MetricHourlyProtocolRow | null> {
  return (
    (await db
      .prepare(
        "SELECT hour_ts as hourTs, tvl_usd as tvlUsd, net_flow_usd_24h as netFlowUsd24h, revenue_usd_24h as revenueUsd24h, active_users_24h as activeUsers24h, utilization_weighted as utilizationWeighted, liquidation_usd_24h as liquidationUsd24h, at_risk_debt_ratio as atRiskDebtRatio, security_events_24h as securityEvents24h FROM metric_hourly_protocol ORDER BY hour_ts DESC LIMIT 1"
      )
      .first<MetricHourlyProtocolRow>()) ?? null
  );
}

export async function getLatestMarketMetrics(db: D1DatabaseLike): Promise<MetricHourlyMarketRow[]> {
  const latest = await db
    .prepare("SELECT hour_ts as hourTs FROM metric_hourly_market ORDER BY hour_ts DESC LIMIT 1")
    .first<{ hourTs: string }>();
  if (!latest?.hourTs) return [];
  return getMarketMetricsForHour(db, latest.hourTs);
}

export async function getProtocolTimeseries(
  db: D1DatabaseLike,
  metricColumn:
    | "tvl_usd"
    | "net_flow_usd_24h"
    | "revenue_usd_24h"
    | "utilization_weighted"
    | "liquidation_usd_24h"
    | "at_risk_debt_ratio",
  limit = 24
): Promise<Array<{ ts: string; value: number }>> {
  const { results } = await db
    .prepare(`SELECT hour_ts as ts, ${metricColumn} as value FROM metric_hourly_protocol ORDER BY hour_ts DESC LIMIT ?`)
    .bind(limit)
    .all<{ ts: string; value: number }>();

  return results.reverse();
}

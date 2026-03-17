import {
  bigint,
  index,
  integer,
  jsonb,
  numeric,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
  uuid
} from "drizzle-orm/pg-core";

export const rawEvents = pgTable(
  "raw_events",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    chainId: integer("chain_id").notNull(),
    blockNumber: bigint("block_number", { mode: "number" }).notNull(),
    blockTime: timestamp("block_time", { withTimezone: true }).notNull(),
    txHash: text("tx_hash").notNull(),
    logIndex: integer("log_index").notNull(),
    marketId: text("market_id").notNull(),
    eventType: text("event_type").notNull(),
    payloadJson: jsonb("payload_json").notNull(),
    ingestedAt: timestamp("ingested_at", { withTimezone: true }).notNull().defaultNow()
  },
  (table) => [
    uniqueIndex("raw_events_tx_hash_log_index_idx").on(table.txHash, table.logIndex),
    index("raw_events_block_time_idx").on(table.blockTime),
    index("raw_events_market_id_idx").on(table.marketId)
  ]
);

export const metricHourlyMarket = pgTable(
  "metric_hourly_market",
  {
    hourTs: timestamp("hour_ts", { withTimezone: true }).notNull(),
    marketId: text("market_id").notNull(),
    tvlUsd: numeric("tvl_usd", { precision: 30, scale: 8 }).notNull(),
    netFlowUsd24h: numeric("net_flow_usd_24h", { precision: 30, scale: 8 }).notNull(),
    revenueUsd24h: numeric("revenue_usd_24h", { precision: 30, scale: 8 }).notNull(),
    activeUsers24h: integer("active_users_24h").notNull(),
    utilization: numeric("utilization", { precision: 12, scale: 8 }).notNull(),
    liquidationUsd24h: numeric("liquidation_usd_24h", { precision: 30, scale: 8 }).notNull(),
    atRiskDebtRatio: numeric("at_risk_debt_ratio", { precision: 12, scale: 8 }).notNull()
  },
  (table) => [
    primaryKey({ columns: [table.hourTs, table.marketId], name: "metric_hourly_market_pk" }),
    index("metric_hourly_market_risk_idx").on(table.atRiskDebtRatio),
    index("metric_hourly_market_utilization_idx").on(table.utilization)
  ]
);

export const metricHourlyProtocol = pgTable(
  "metric_hourly_protocol",
  {
    hourTs: timestamp("hour_ts", { withTimezone: true }).notNull().primaryKey(),
    tvlUsd: numeric("tvl_usd", { precision: 30, scale: 8 }).notNull(),
    netFlowUsd24h: numeric("net_flow_usd_24h", { precision: 30, scale: 8 }).notNull(),
    revenueUsd24h: numeric("revenue_usd_24h", { precision: 30, scale: 8 }).notNull(),
    activeUsers24h: integer("active_users_24h").notNull(),
    utilizationWeighted: numeric("utilization_weighted", { precision: 12, scale: 8 }).notNull(),
    liquidationUsd24h: numeric("liquidation_usd_24h", { precision: 30, scale: 8 }).notNull(),
    atRiskDebtRatio: numeric("at_risk_debt_ratio", { precision: 12, scale: 8 }).notNull(),
    securityEvents24h: integer("security_events_24h").notNull().default(0)
  },
  (table) => [index("metric_hourly_protocol_hour_idx").on(table.hourTs)]
);

export const alerts = pgTable(
  "alerts",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    hourTs: timestamp("hour_ts", { withTimezone: true }).notNull(),
    level: text("level").notNull(),
    ruleCode: text("rule_code").notNull(),
    marketId: text("market_id"),
    metricKey: text("metric_key").notNull(),
    currentValue: numeric("current_value", { precision: 30, scale: 8 }).notNull(),
    thresholdValue: numeric("threshold_value", { precision: 30, scale: 8 }),
    baselineValue: numeric("baseline_value", { precision: 30, scale: 8 }),
    status: text("status").notNull().default("active"),
    dedupKey: text("dedup_key").notNull(),
    firstSeenAt: timestamp("first_seen_at", { withTimezone: true }).notNull(),
    lastSeenAt: timestamp("last_seen_at", { withTimezone: true }).notNull(),
    assignee: text("assignee"),
    note: text("note")
  },
  (table) => [
    index("alerts_status_level_idx").on(table.status, table.level),
    uniqueIndex("alerts_dedup_key_first_seen_idx").on(table.dedupKey, table.firstSeenAt)
  ]
);

export const tables = {
  rawEvents,
  metricHourlyMarket,
  metricHourlyProtocol,
  alerts
};

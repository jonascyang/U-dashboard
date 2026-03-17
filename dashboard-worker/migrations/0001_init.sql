CREATE TABLE IF NOT EXISTS raw_events (
  id TEXT PRIMARY KEY,
  chain_id INTEGER NOT NULL,
  block_number INTEGER NOT NULL,
  block_time TEXT NOT NULL,
  tx_hash TEXT NOT NULL,
  log_index INTEGER NOT NULL,
  market_id TEXT NOT NULL,
  event_type TEXT NOT NULL,
  payload_json TEXT NOT NULL,
  ingested_at TEXT NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS raw_events_tx_log_idx
  ON raw_events (tx_hash, log_index);

CREATE INDEX IF NOT EXISTS raw_events_block_time_idx
  ON raw_events (block_time);

CREATE INDEX IF NOT EXISTS raw_events_market_id_idx
  ON raw_events (market_id);

CREATE TABLE IF NOT EXISTS metric_hourly_market (
  hour_ts TEXT NOT NULL,
  market_id TEXT NOT NULL,
  tvl_usd REAL NOT NULL,
  net_flow_usd_24h REAL NOT NULL,
  revenue_usd_24h REAL NOT NULL,
  active_users_24h INTEGER NOT NULL,
  utilization REAL NOT NULL,
  liquidation_usd_24h REAL NOT NULL,
  at_risk_debt_ratio REAL NOT NULL,
  PRIMARY KEY (hour_ts, market_id)
);

CREATE TABLE IF NOT EXISTS metric_hourly_protocol (
  hour_ts TEXT PRIMARY KEY,
  tvl_usd REAL NOT NULL,
  net_flow_usd_24h REAL NOT NULL,
  revenue_usd_24h REAL NOT NULL,
  active_users_24h INTEGER NOT NULL,
  utilization_weighted REAL NOT NULL,
  liquidation_usd_24h REAL NOT NULL,
  at_risk_debt_ratio REAL NOT NULL,
  security_events_24h INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS alerts (
  id TEXT PRIMARY KEY,
  hour_ts TEXT NOT NULL,
  level TEXT NOT NULL,
  rule_code TEXT NOT NULL,
  market_id TEXT,
  metric_key TEXT NOT NULL,
  current_value REAL NOT NULL,
  threshold_value REAL,
  baseline_value REAL,
  status TEXT NOT NULL DEFAULT 'active',
  dedup_key TEXT NOT NULL,
  first_seen_at TEXT NOT NULL,
  last_seen_at TEXT NOT NULL,
  assignee TEXT,
  note TEXT
);

CREATE UNIQUE INDEX IF NOT EXISTS alerts_dedup_first_seen_idx
  ON alerts (dedup_key, first_seen_at);

CREATE INDEX IF NOT EXISTS alerts_status_level_idx
  ON alerts (status, level);

CREATE TABLE IF NOT EXISTS ingestion_state (
  chain_id INTEGER NOT NULL,
  market_id TEXT NOT NULL,
  last_synced_block INTEGER NOT NULL,
  updated_at TEXT NOT NULL,
  PRIMARY KEY (chain_id, market_id)
);

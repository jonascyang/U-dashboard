CREATE TABLE IF NOT EXISTS raw_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  chain_id integer NOT NULL,
  block_number bigint NOT NULL,
  block_time timestamptz NOT NULL,
  tx_hash text NOT NULL,
  log_index integer NOT NULL,
  market_id text NOT NULL,
  event_type text NOT NULL,
  payload_json jsonb NOT NULL,
  ingested_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS raw_events_tx_hash_log_index_idx
  ON raw_events (tx_hash, log_index);

CREATE INDEX IF NOT EXISTS raw_events_block_time_idx ON raw_events (block_time);
CREATE INDEX IF NOT EXISTS raw_events_market_id_idx ON raw_events (market_id);

CREATE TABLE IF NOT EXISTS metric_hourly_market (
  hour_ts timestamptz NOT NULL,
  market_id text NOT NULL,
  tvl_usd numeric(30, 8) NOT NULL,
  net_flow_usd_24h numeric(30, 8) NOT NULL,
  revenue_usd_24h numeric(30, 8) NOT NULL,
  active_users_24h integer NOT NULL,
  utilization numeric(12, 8) NOT NULL,
  liquidation_usd_24h numeric(30, 8) NOT NULL,
  at_risk_debt_ratio numeric(12, 8) NOT NULL,
  CONSTRAINT metric_hourly_market_pk PRIMARY KEY (hour_ts, market_id)
);

CREATE INDEX IF NOT EXISTS metric_hourly_market_risk_idx ON metric_hourly_market (at_risk_debt_ratio);
CREATE INDEX IF NOT EXISTS metric_hourly_market_utilization_idx ON metric_hourly_market (utilization);

CREATE TABLE IF NOT EXISTS metric_hourly_protocol (
  hour_ts timestamptz PRIMARY KEY,
  tvl_usd numeric(30, 8) NOT NULL,
  net_flow_usd_24h numeric(30, 8) NOT NULL,
  revenue_usd_24h numeric(30, 8) NOT NULL,
  active_users_24h integer NOT NULL,
  utilization_weighted numeric(12, 8) NOT NULL,
  liquidation_usd_24h numeric(30, 8) NOT NULL,
  at_risk_debt_ratio numeric(12, 8) NOT NULL,
  security_events_24h integer NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS metric_hourly_protocol_hour_idx ON metric_hourly_protocol (hour_ts);

CREATE TABLE IF NOT EXISTS alerts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  hour_ts timestamptz NOT NULL,
  level text NOT NULL,
  rule_code text NOT NULL,
  market_id text,
  metric_key text NOT NULL,
  current_value numeric(30, 8) NOT NULL,
  threshold_value numeric(30, 8),
  baseline_value numeric(30, 8),
  status text NOT NULL DEFAULT 'active',
  dedup_key text NOT NULL,
  first_seen_at timestamptz NOT NULL,
  last_seen_at timestamptz NOT NULL,
  assignee text,
  note text
);

CREATE INDEX IF NOT EXISTS alerts_status_level_idx ON alerts (status, level);
CREATE UNIQUE INDEX IF NOT EXISTS alerts_dedup_key_first_seen_idx ON alerts (dedup_key, first_seen_at);

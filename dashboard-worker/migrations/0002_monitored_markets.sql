CREATE TABLE IF NOT EXISTS monitored_markets (
  market_address TEXT PRIMARY KEY,
  chain_id INTEGER NOT NULL DEFAULT 1,
  enabled INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS monitored_markets_enabled_idx
  ON monitored_markets (enabled, chain_id);

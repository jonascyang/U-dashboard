CREATE TABLE IF NOT EXISTS u_monitor_price_source_snapshots (
  captured_at TEXT NOT NULL,
  venue TEXT NOT NULL,
  pair TEXT NOT NULL,
  source_type TEXT NOT NULL,
  latest_price REAL NOT NULL,
  bid REAL,
  ask REAL,
  quote_volume_24h REAL NOT NULL,
  weight_percent REAL NOT NULL,
  status TEXT NOT NULL,
  PRIMARY KEY (captured_at, venue)
);

CREATE INDEX IF NOT EXISTS u_monitor_price_sources_venue_idx
  ON u_monitor_price_source_snapshots (venue, captured_at DESC);

CREATE TABLE IF NOT EXISTS u_monitor_weighted_price_snapshots (
  captured_at TEXT PRIMARY KEY,
  weighted_price REAL NOT NULL,
  baseline_price REAL NOT NULL,
  source_count INTEGER NOT NULL,
  components_json TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS u_monitor_supply_snapshots (
  captured_at TEXT NOT NULL,
  contract_address TEXT NOT NULL,
  chain_id INTEGER NOT NULL,
  total_supply REAL NOT NULL,
  PRIMARY KEY (captured_at, contract_address)
);

CREATE INDEX IF NOT EXISTS u_monitor_supply_chain_idx
  ON u_monitor_supply_snapshots (chain_id, captured_at DESC);

import type { D1DatabaseLike } from "@worker/types";

export type UMonitorPriceSourceSnapshotInsert = {
  venue: string;
  pair: string;
  sourceType: "CEX" | "DEX";
  latestPrice: number;
  bid?: number;
  ask?: number;
  quoteVolume24h: number;
  weightPercent: number;
  status: "live" | "stale" | "error";
};

export type UMonitorWeightedPriceSnapshotInsert = {
  capturedAt: string;
  weightedPrice: number;
  baselinePrice: number;
  sourceCount: number;
  componentsJson: string;
};

export type UMonitorSupplySnapshotInsert = {
  capturedAt: string;
  contractAddress: string;
  chainId: number;
  totalSupply: number;
};

export type UMonitorPriceSourceSnapshotRow = UMonitorPriceSourceSnapshotInsert & {
  capturedAt: string;
};

export type UMonitorWeightedPriceSnapshotRow = UMonitorWeightedPriceSnapshotInsert;

export type UMonitorSupplySnapshotRow = UMonitorSupplySnapshotInsert;

export async function insertPriceSourceSnapshots(
  db: D1DatabaseLike,
  capturedAt: string,
  rows: UMonitorPriceSourceSnapshotInsert[]
): Promise<number> {
  for (const row of rows) {
    await db
      .prepare(
        "INSERT INTO u_monitor_price_source_snapshots (captured_at, venue, pair, source_type, latest_price, bid, ask, quote_volume_24h, weight_percent, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?) ON CONFLICT(captured_at, venue) DO UPDATE SET pair = excluded.pair, source_type = excluded.source_type, latest_price = excluded.latest_price, bid = excluded.bid, ask = excluded.ask, quote_volume_24h = excluded.quote_volume_24h, weight_percent = excluded.weight_percent, status = excluded.status"
      )
      .bind(
        capturedAt,
        row.venue,
        row.pair,
        row.sourceType,
        row.latestPrice,
        row.bid ?? null,
        row.ask ?? null,
        row.quoteVolume24h,
        row.weightPercent,
        row.status
      )
      .run();
  }

  return rows.length;
}

export async function insertWeightedPriceSnapshot(
  db: D1DatabaseLike,
  row: UMonitorWeightedPriceSnapshotInsert
): Promise<void> {
  await db
    .prepare(
      "INSERT INTO u_monitor_weighted_price_snapshots (captured_at, weighted_price, baseline_price, source_count, components_json) VALUES (?, ?, ?, ?, ?) ON CONFLICT(captured_at) DO UPDATE SET weighted_price = excluded.weighted_price, baseline_price = excluded.baseline_price, source_count = excluded.source_count, components_json = excluded.components_json"
    )
    .bind(row.capturedAt, row.weightedPrice, row.baselinePrice, row.sourceCount, row.componentsJson)
    .run();
}

export async function insertSupplySnapshot(db: D1DatabaseLike, row: UMonitorSupplySnapshotInsert): Promise<void> {
  await db
    .prepare(
      "INSERT INTO u_monitor_supply_snapshots (captured_at, contract_address, chain_id, total_supply) VALUES (?, ?, ?, ?) ON CONFLICT(captured_at, contract_address) DO UPDATE SET chain_id = excluded.chain_id, total_supply = excluded.total_supply"
    )
    .bind(row.capturedAt, row.contractAddress, row.chainId, row.totalSupply)
    .run();
}

export async function getLatestWeightedPriceSnapshot(db: D1DatabaseLike) {
  return (
    (await db
      .prepare(
        "SELECT captured_at as capturedAt, weighted_price as weightedPrice, baseline_price as baselinePrice, source_count as sourceCount, components_json as componentsJson FROM u_monitor_weighted_price_snapshots ORDER BY captured_at DESC LIMIT 1"
      )
      .first<UMonitorWeightedPriceSnapshotRow>()) ?? null
  );
}

export async function getPriceSourceSnapshotsForCapture(
  db: D1DatabaseLike,
  capturedAt: string
): Promise<UMonitorPriceSourceSnapshotRow[]> {
  const { results } = await db
    .prepare(
      "SELECT captured_at as capturedAt, venue, pair, source_type as sourceType, latest_price as latestPrice, bid, ask, quote_volume_24h as quoteVolume24h, weight_percent as weightPercent, status FROM u_monitor_price_source_snapshots WHERE captured_at = ? ORDER BY quote_volume_24h DESC"
    )
    .bind(capturedAt)
    .all<UMonitorPriceSourceSnapshotRow>();

  return results;
}

export async function listLatestPriceSourceSnapshots(db: D1DatabaseLike): Promise<UMonitorPriceSourceSnapshotRow[]> {
  const { results } = await db
    .prepare(
      `SELECT
         latest.captured_at as capturedAt,
         latest.venue,
         latest.pair,
         latest.source_type as sourceType,
         latest.latest_price as latestPrice,
         latest.bid,
         latest.ask,
         latest.quote_volume_24h as quoteVolume24h,
         latest.weight_percent as weightPercent,
         latest.status
       FROM u_monitor_price_source_snapshots latest
       INNER JOIN (
         SELECT venue, MAX(captured_at) AS captured_at
         FROM u_monitor_price_source_snapshots
         GROUP BY venue
       ) current
       ON latest.venue = current.venue AND latest.captured_at = current.captured_at
       ORDER BY latest.quote_volume_24h DESC`
    )
    .all<UMonitorPriceSourceSnapshotRow>();

  return results;
}

export async function listWeightedPriceSnapshots(
  db: D1DatabaseLike,
  limit: number
): Promise<Array<{ capturedAt: string; weightedPrice: number }>> {
  const { results } = await db
    .prepare(
      "SELECT captured_at as capturedAt, weighted_price as weightedPrice FROM u_monitor_weighted_price_snapshots ORDER BY captured_at DESC LIMIT ?"
    )
    .bind(limit)
    .all<{ capturedAt: string; weightedPrice: number }>();

  return results.reverse();
}

export async function getLatestSupplySnapshotAtOrBefore(
  db: D1DatabaseLike,
  contractAddress: string,
  capturedAt: string
) {
  return (
    (await db
      .prepare(
        "SELECT captured_at as capturedAt, contract_address as contractAddress, chain_id as chainId, total_supply as totalSupply FROM u_monitor_supply_snapshots WHERE contract_address = ? AND captured_at <= ? ORDER BY captured_at DESC LIMIT 1"
      )
      .bind(contractAddress, capturedAt)
      .first<UMonitorSupplySnapshotRow>()) ?? null
  );
}

export async function getLatestSupplySnapshot(db: D1DatabaseLike) {
  return (
    (await db
      .prepare(
        "SELECT captured_at as capturedAt, contract_address as contractAddress, chain_id as chainId, total_supply as totalSupply FROM u_monitor_supply_snapshots ORDER BY captured_at DESC LIMIT 1"
      )
      .first<UMonitorSupplySnapshotRow>()) ?? null
  );
}

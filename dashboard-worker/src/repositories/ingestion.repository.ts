import type { RawEventInsert } from "@/workers/ingest/decoder";

import type { D1DatabaseLike } from "@worker/types";

export type IngestionStateRow = {
  chainId: number;
  marketId: string;
  lastSyncedBlock: number;
  updatedAt: string;
};

export async function getIngestionState(
  db: D1DatabaseLike,
  chainId: number,
  marketId: string
): Promise<IngestionStateRow | null> {
  const row = await db
    .prepare(
      "SELECT chain_id as chainId, market_id as marketId, last_synced_block as lastSyncedBlock, updated_at as updatedAt FROM ingestion_state WHERE chain_id = ? AND market_id = ?"
    )
    .bind(chainId, marketId)
    .first<IngestionStateRow>();

  return row ?? null;
}

export async function upsertIngestionState(db: D1DatabaseLike, input: IngestionStateRow): Promise<void> {
  await db
    .prepare(
      "INSERT INTO ingestion_state (chain_id, market_id, last_synced_block, updated_at) VALUES (?, ?, ?, ?) ON CONFLICT(chain_id, market_id) DO UPDATE SET last_synced_block = excluded.last_synced_block, updated_at = excluded.updated_at"
    )
    .bind(input.chainId, input.marketId, input.lastSyncedBlock, input.updatedAt)
    .run();
}

export async function insertRawEvents(db: D1DatabaseLike, events: RawEventInsert[]): Promise<number> {
  if (events.length === 0) return 0;

  for (const event of events) {
    await db
      .prepare(
        "INSERT INTO raw_events (id, chain_id, block_number, block_time, tx_hash, log_index, market_id, event_type, payload_json, ingested_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?) ON CONFLICT(tx_hash, log_index) DO UPDATE SET payload_json = excluded.payload_json, ingested_at = excluded.ingested_at"
      )
      .bind(
        `${event.txHash}:${event.logIndex}`,
        event.chainId,
        event.blockNumber,
        event.blockTime.toISOString(),
        event.txHash,
        event.logIndex,
        event.marketId,
        event.eventType,
        JSON.stringify(event.payloadJson),
        new Date().toISOString()
      )
      .run();
  }

  return events.length;
}

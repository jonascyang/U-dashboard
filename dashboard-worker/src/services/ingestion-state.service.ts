import { upsertIngestionState } from "@worker/repositories/ingestion.repository";
import type { D1DatabaseLike } from "@worker/types";

export async function updateIngestionStateAfterInsert(
  db: D1DatabaseLike,
  chainId: number,
  maxSyncedBlockByMarket: Record<string, number>
): Promise<number> {
  const now = new Date().toISOString();
  const markets = Object.keys(maxSyncedBlockByMarket);
  for (const marketId of markets) {
    await upsertIngestionState(db, {
      chainId,
      marketId,
      lastSyncedBlock: maxSyncedBlockByMarket[marketId],
      updatedAt: now
    });
  }

  return markets.length;
}

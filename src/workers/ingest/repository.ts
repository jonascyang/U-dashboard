import { db } from "@/db/client";
import { rawEvents } from "@/db/schema";
import type { RawEventInsert } from "@/workers/ingest/decoder";

export async function insertRawEvents(events: RawEventInsert[]): Promise<number> {
  if (events.length === 0) return 0;

  await db.insert(rawEvents).values(
    events.map((event) => ({
      chainId: event.chainId,
      blockNumber: event.blockNumber,
      blockTime: event.blockTime,
      txHash: event.txHash,
      logIndex: event.logIndex,
      marketId: event.marketId,
      eventType: event.eventType,
      payloadJson: event.payloadJson
    }))
  );
  return events.length;
}

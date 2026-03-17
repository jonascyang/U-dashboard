import { decodeLogToRawEvent, type ChainLog } from "@/workers/ingest/decoder";
import type { RawEventInsert } from "@/workers/ingest/decoder";

export type IngestInput = {
  logs: ChainLog[];
};

export type IngestDependencies = {
  insertRawEvents: (events: RawEventInsert[]) => Promise<number>;
};

export async function runIngestion(input: IngestInput, deps: IngestDependencies): Promise<{ inserted: number }> {
  const events = input.logs
    .map((log) => decodeLogToRawEvent(log))
    .filter((event): event is NonNullable<typeof event> => Boolean(event));

  const inserted = await deps.insertRawEvents(events);
  return { inserted };
}

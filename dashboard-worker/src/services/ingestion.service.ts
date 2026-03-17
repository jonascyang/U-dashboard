import { decodeLogToRawEvent } from "@/workers/ingest/decoder";
import { createEthereumClient, fetchLendingLogsForHour, parseMarketAddresses } from "@/workers/ingest/chain-source";

import { insertRawEvents } from "@worker/repositories/ingestion.repository";
import { listEnabledMarketAddresses } from "@worker/repositories/markets.repository";
import { updateIngestionStateAfterInsert } from "@worker/services/ingestion-state.service";
import type { WorkerEnv } from "@worker/types";

type FetchLogsFn = (input: {
  hourStart: Date;
  chainId: number;
  rpcUrl: string;
  marketAddresses: `0x${string}`[];
}) => ReturnType<typeof fetchLendingLogsForHour>;

async function loadMarketAddresses(env: WorkerEnv): Promise<`0x${string}`[]> {
  try {
    const d1Addresses = await listEnabledMarketAddresses(env.DB);
    if (d1Addresses.length > 0) {
      return d1Addresses;
    }
  } catch (error) {
    console.warn("Failed to load monitored_markets from D1, falling back to env list", error);
  }

  if (!env.LENDING_MARKET_ADDRESSES) return [];
  return parseMarketAddresses(env.LENDING_MARKET_ADDRESSES);
}

export type IngestionResult = {
  inserted: number;
  updatedState: number;
};

export async function runIngestionStage(
  env: WorkerEnv,
  hourStart: Date,
  fetchLogs: FetchLogsFn = async ({ hourStart: inputHour, chainId, rpcUrl, marketAddresses }) => {
    const client = createEthereumClient(rpcUrl);
    return fetchLendingLogsForHour(client as never, {
      hourStart: inputHour,
      chainId,
      marketAddresses
    });
  }
): Promise<IngestionResult> {
  const marketAddresses = await loadMarketAddresses(env);
  if (marketAddresses.length === 0) {
    return { inserted: 0, updatedState: 0 };
  }

  const chainId = Number(env.ETH_CHAIN_ID ?? "1");
  const logs = await fetchLogs({
    hourStart,
    chainId,
    rpcUrl: env.ETH_RPC_URL,
    marketAddresses
  });
  const events = logs
    .map((log) => decodeLogToRawEvent(log))
    .filter((event): event is NonNullable<typeof event> => Boolean(event));

  const inserted = await insertRawEvents(env.DB, events);
  if (inserted === 0) {
    return { inserted: 0, updatedState: 0 };
  }

  const maxSyncedBlockByMarket: Record<string, number> = {};
  for (const event of events) {
    maxSyncedBlockByMarket[event.marketId] = Math.max(maxSyncedBlockByMarket[event.marketId] ?? 0, event.blockNumber);
  }

  const updatedState = await updateIngestionStateAfterInsert(env.DB, chainId, maxSyncedBlockByMarket);
  return {
    inserted,
    updatedState
  };
}

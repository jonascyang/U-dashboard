import { lendingEventSignatures, type LendingEventType } from "@/workers/ingest/abi";

export type ChainLog = {
  chainId: number;
  blockNumber: number;
  blockTime: string;
  transactionHash: string;
  logIndex: number;
  address: string;
  topics: string[];
  data: string;
};

export type RawEventInsert = {
  chainId: number;
  blockNumber: number;
  blockTime: Date;
  txHash: string;
  logIndex: number;
  marketId: string;
  eventType: LendingEventType;
  payloadJson: Record<string, unknown>;
};

function signatureToType(signature: string): LendingEventType | null {
  const entry = Object.entries(lendingEventSignatures).find(([, value]) => value.toLowerCase() === signature.toLowerCase());
  if (!entry) return null;
  return entry[0] as LendingEventType;
}

export function decodeLogToRawEvent(log: ChainLog): RawEventInsert | null {
  if (!log.topics?.[0]) return null;
  const eventType = signatureToType(log.topics[0]);
  if (!eventType) return null;

  return {
    chainId: log.chainId,
    blockNumber: log.blockNumber,
    blockTime: new Date(log.blockTime),
    txHash: log.transactionHash,
    logIndex: log.logIndex,
    marketId: log.address.toLowerCase(),
    eventType,
    payloadJson: {
      topics: log.topics,
      data: log.data
    }
  };
}

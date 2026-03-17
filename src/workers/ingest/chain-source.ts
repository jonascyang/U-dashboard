import { createPublicClient, http, type PublicClient } from "viem";
import { mainnet } from "viem/chains";

import { lendingEventSignatures } from "@/workers/ingest/abi";
import type { ChainLog } from "@/workers/ingest/decoder";

type BlockClient = {
  getBlockNumber: () => Promise<bigint>;
  getBlock: (args: { blockNumber: bigint }) => Promise<{ number: bigint; timestamp: bigint }>;
};

type LogClient = BlockClient & {
  getLogs: (args: {
    address: `0x${string}`[];
    fromBlock: bigint;
    toBlock: bigint;
    topics: [readonly string[]];
  }) => Promise<
    Array<{
      address: string;
      blockNumber: bigint | null;
      transactionHash: string | null;
      logIndex: number | bigint | null;
      data: string;
      topics: readonly string[];
    }>
  >;
};

export type LendingLogFetchInput = {
  chainId: number;
  marketAddresses: `0x${string}`[];
  hourStart: Date;
};

export function parseMarketAddresses(input: string): `0x${string}`[] {
  return input
    .split(",")
    .map((item) => item.trim().toLowerCase())
    .filter(Boolean)
    .map((address) => {
      if (!/^0x[0-9a-f]{40}$/.test(address)) {
        throw new Error(`Invalid market address: ${address}`);
      }
      return address as `0x${string}`;
    });
}

async function firstBlockAtOrAfter(client: BlockClient, targetTimestampSec: bigint): Promise<bigint> {
  let left = 0n;
  let right = await client.getBlockNumber();
  let result = right;

  while (left <= right) {
    const mid = (left + right) / 2n;
    const block = await client.getBlock({ blockNumber: mid });
    if (block.timestamp >= targetTimestampSec) {
      result = mid;
      if (mid === 0n) break;
      right = mid - 1n;
    } else {
      left = mid + 1n;
    }
  }

  return result;
}

async function lastBlockAtOrBefore(client: BlockClient, targetTimestampSec: bigint): Promise<bigint> {
  let left = 0n;
  let right = await client.getBlockNumber();
  let result = 0n;

  while (left <= right) {
    const mid = (left + right) / 2n;
    const block = await client.getBlock({ blockNumber: mid });
    if (block.timestamp <= targetTimestampSec) {
      result = mid;
      left = mid + 1n;
    } else {
      if (mid === 0n) break;
      right = mid - 1n;
    }
  }

  return result;
}

export async function resolveBlockRangeForHour(
  client: BlockClient,
  hourStart: Date,
  hourEnd: Date
): Promise<{ fromBlock: bigint; toBlock: bigint }> {
  const fromBlock = await firstBlockAtOrAfter(client, BigInt(Math.floor(hourStart.getTime() / 1000)));
  const toBlock = await lastBlockAtOrBefore(client, BigInt(Math.floor(hourEnd.getTime() / 1000)));
  return { fromBlock, toBlock };
}

function toHourEnd(hourStart: Date): Date {
  return new Date(hourStart.getTime() + 60 * 60 * 1000 - 1);
}

export async function fetchLendingLogsForHour(client: LogClient, input: LendingLogFetchInput): Promise<ChainLog[]> {
  if (input.marketAddresses.length === 0) return [];
  const hourEnd = toHourEnd(input.hourStart);
  const { fromBlock, toBlock } = await resolveBlockRangeForHour(client, input.hourStart, hourEnd);
  if (fromBlock > toBlock) return [];

  const logs = await client.getLogs({
    address: input.marketAddresses,
    fromBlock,
    toBlock,
    topics: [Object.values(lendingEventSignatures)]
  });

  const blockTimes = new Map<bigint, string>();
  for (const log of logs) {
    if (log.blockNumber === null || blockTimes.has(log.blockNumber)) continue;
    const block = await client.getBlock({ blockNumber: log.blockNumber });
    blockTimes.set(log.blockNumber, new Date(Number(block.timestamp) * 1000).toISOString());
  }

  return logs
    .filter((log) => log.blockNumber !== null && log.transactionHash !== null && log.logIndex !== null)
    .map((log) => ({
      chainId: input.chainId,
      blockNumber: Number(log.blockNumber),
      blockTime: blockTimes.get(log.blockNumber!) ?? new Date(0).toISOString(),
      transactionHash: log.transactionHash!,
      logIndex: Number(log.logIndex),
      address: log.address,
      topics: [...log.topics],
      data: log.data
    }));
}

export function createEthereumClient(rpcUrl: string): PublicClient {
  return createPublicClient({
    chain: mainnet,
    transport: http(rpcUrl)
  });
}

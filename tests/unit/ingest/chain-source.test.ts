import { describe, expect, it, vi } from "vitest";

import { lendingEventSignatures } from "@/workers/ingest/abi";
import { fetchLendingLogsForHour, parseMarketAddresses, resolveBlockRangeForHour } from "@/workers/ingest/chain-source";

describe("parseMarketAddresses", () => {
  it("parses and normalizes comma-separated addresses", () => {
    const out = parseMarketAddresses(
      "0x0000000000000000000000000000000000000001, 0x0000000000000000000000000000000000000002"
    );
    expect(out).toEqual([
      "0x0000000000000000000000000000000000000001",
      "0x0000000000000000000000000000000000000002"
    ]);
  });
});

describe("resolveBlockRangeForHour", () => {
  it("returns inclusive block range for the hour window", async () => {
    const blocks = new Map<bigint, bigint>([
      [1n, 100n],
      [2n, 200n],
      [3n, 300n],
      [4n, 400n],
      [5n, 500n]
    ]);
    const client = {
      getBlockNumber: vi.fn().mockResolvedValue(5n),
      getBlock: vi.fn().mockImplementation(({ blockNumber }: { blockNumber: bigint }) =>
        Promise.resolve({ number: blockNumber, timestamp: blocks.get(blockNumber) })
      )
    };

    const out = await resolveBlockRangeForHour(client, new Date(250_000), new Date(450_000));
    expect(out).toEqual({ fromBlock: 3n, toBlock: 4n });
  });
});

describe("fetchLendingLogsForHour", () => {
  it("fetches filtered logs and maps to ChainLog", async () => {
    const getBlock = vi.fn().mockImplementation(({ blockNumber }: { blockNumber: bigint }) => {
      const ts = blockNumber === 3n ? 300n : 360n;
      return Promise.resolve({ number: blockNumber, timestamp: ts });
    });
    const getLogs = vi.fn().mockResolvedValue([
      {
        address: "0x0000000000000000000000000000000000000001",
        blockNumber: 3n,
        transactionHash: "0xabc",
        logIndex: 1n,
        data: "0x00",
        topics: [lendingEventSignatures.Deposit]
      }
    ]);
    const client = {
      getBlockNumber: vi.fn().mockResolvedValue(4n),
      getBlock,
      getLogs
    };

    const logs = await fetchLendingLogsForHour(client, {
      chainId: 1,
      marketAddresses: ["0x0000000000000000000000000000000000000001"],
      hourStart: new Date(250_000)
    });

    expect(logs).toHaveLength(1);
    expect(logs[0]).toMatchObject({
      chainId: 1,
      transactionHash: "0xabc",
      logIndex: 1,
      address: "0x0000000000000000000000000000000000000001"
    });
    expect(getLogs).toHaveBeenCalledWith(
      expect.objectContaining({
        address: ["0x0000000000000000000000000000000000000001"],
        topics: [Object.values(lendingEventSignatures)]
      })
    );
  });
});

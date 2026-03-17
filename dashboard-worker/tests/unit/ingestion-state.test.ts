import { describe, expect, it } from "vitest";

import { lendingEventSignatures } from "@/workers/ingest/abi";
import { runIngestionStage } from "../../src/services/ingestion.service";

function createMockEnv() {
  const queries: string[] = [];
  const db = {
    prepare: (query: string) => {
      queries.push(query);
      const statement = {
        bind: () => statement,
        run: async () => ({ success: true }),
        first: async () => null,
        all: async () => ({ results: [] })
      };
      return statement;
    }
  };

  return {
    env: {
      DB: db,
      ETH_RPC_URL: "https://rpc.example",
      ETH_CHAIN_ID: "1",
      LENDING_MARKET_ADDRESSES: "0x0000000000000000000000000000000000000001"
    },
    queries
  };
}

describe("runIngestionStage", () => {
  it("loads market addresses from D1 when env list is empty", async () => {
    const calls: Array<{ marketAddresses: `0x${string}`[] }> = [];
    const db = {
      prepare: (query: string) => {
        const statement = {
          bind: () => statement,
          run: async () => ({ success: true }),
          first: async () => null,
          all: async () => ({
            results: query.includes("FROM monitored_markets")
              ? [{ marketAddress: "0x00000000000000000000000000000000000000AA" }]
              : []
          })
        };
        return statement;
      }
    };

    await runIngestionStage(
      {
        DB: db,
        ETH_RPC_URL: "https://rpc.example",
        ETH_CHAIN_ID: "1",
        LENDING_MARKET_ADDRESSES: ""
      } as any,
      new Date("2026-02-25T10:00:00.000Z"),
      async ({ marketAddresses }) => {
        calls.push({ marketAddresses });
        return [] as any;
      }
    );

    expect(calls).toEqual([
      {
        marketAddresses: ["0x00000000000000000000000000000000000000aa"]
      }
    ]);
  });

  it("updates ingestion_state only after insert succeeds", async () => {
    const { env, queries } = createMockEnv();

    const result = await runIngestionStage(
      env as any,
      new Date("2026-02-25T10:00:00.000Z"),
      async () => [
        {
          chainId: 1,
          blockNumber: 100,
          blockTime: "2026-02-25T10:00:01.000Z",
          transactionHash: "0xabc",
          logIndex: 2,
          address: "0x0000000000000000000000000000000000000001",
          topics: [lendingEventSignatures.Deposit],
          data: "0x00"
        }
      ] as any
    );

    expect(result.updatedState).toBe(1);
    expect(queries.some((query) => query.includes("INSERT INTO ingestion_state"))).toBe(true);
  });
});

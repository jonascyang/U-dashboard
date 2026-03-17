import { describe, expect, it, vi } from "vitest";

import { lendingEventSignatures } from "@/workers/ingest/abi";
import { runIngestion } from "@/workers/ingest/runner";

describe("runIngestion", () => {
  it("inserts only known events", async () => {
    const insertRawEvents = vi.fn().mockResolvedValue(1);

    const out = await runIngestion(
      {
        logs: [
          {
            chainId: 1,
            blockNumber: 10,
            blockTime: "2026-02-25T00:00:00.000Z",
            transactionHash: "0x1",
            logIndex: 0,
            address: "0xMarketA",
            topics: [lendingEventSignatures.Deposit],
            data: "0x0"
          },
          {
            chainId: 1,
            blockNumber: 10,
            blockTime: "2026-02-25T00:00:00.000Z",
            transactionHash: "0x2",
            logIndex: 1,
            address: "0xMarketA",
            topics: ["0xdeadbeef"],
            data: "0x0"
          }
        ]
      },
      { insertRawEvents }
    );

    expect(insertRawEvents).toHaveBeenCalledTimes(1);
    expect(out.inserted).toBe(1);
  });
});

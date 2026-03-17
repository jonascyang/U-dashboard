import { describe, expect, it } from "vitest";

import { lendingEventSignatures } from "@/workers/ingest/abi";
import { decodeLogToRawEvent } from "@/workers/ingest/decoder";

describe("decodeLogToRawEvent", () => {
  it("maps deposit log into raw event payload", () => {
    const event = decodeLogToRawEvent({
      chainId: 1,
      blockNumber: 100,
      blockTime: "2026-02-25T00:00:00.000Z",
      transactionHash: "0xabc",
      logIndex: 3,
      address: "0xMarket",
      topics: [lendingEventSignatures.Deposit],
      data: "0x0"
    });

    expect(event?.eventType).toBe("Deposit");
    expect(event?.marketId).toBe("0xmarket");
  });

  it("returns null for unknown events", () => {
    const event = decodeLogToRawEvent({
      chainId: 1,
      blockNumber: 100,
      blockTime: "2026-02-25T00:00:00.000Z",
      transactionHash: "0xabc",
      logIndex: 3,
      address: "0xMarket",
      topics: ["0xdeadbeef"],
      data: "0x0"
    });
    expect(event).toBeNull();
  });
});

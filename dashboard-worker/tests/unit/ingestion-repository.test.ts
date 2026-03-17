import { describe, expect, it, vi } from "vitest";

import { insertRawEvents, upsertIngestionState } from "../../src/repositories/ingestion.repository";

describe("ingestion repository", () => {
  it("uses upsert query for ingestion_state", async () => {
    const run = vi.fn().mockResolvedValue({ success: true });
    const bind = vi.fn().mockReturnValue({ run });
    const prepare = vi.fn().mockReturnValue({ bind });

    await upsertIngestionState({ prepare } as any, {
      chainId: 1,
      marketId: "0xmarket",
      lastSyncedBlock: 123,
      updatedAt: "2026-02-25T00:00:00.000Z"
    });

    expect(prepare).toHaveBeenCalledWith(expect.stringContaining("ON CONFLICT(chain_id, market_id)"));
    expect(run).toHaveBeenCalled();
  });

  it("writes raw events with conflict protection", async () => {
    const run = vi.fn().mockResolvedValue({ success: true });
    const bind = vi.fn().mockReturnValue({ run });
    const prepare = vi.fn().mockReturnValue({ bind });

    const inserted = await insertRawEvents(
      { prepare } as any,
      [
        {
          chainId: 1,
          blockNumber: 10,
          blockTime: new Date("2026-02-25T00:00:00.000Z"),
          txHash: "0xabc",
          logIndex: 1,
          marketId: "0xmarket",
          eventType: "Deposit",
          payloadJson: { x: 1 }
        }
      ] as any
    );

    expect(inserted).toBe(1);
    expect(prepare).toHaveBeenCalledWith(expect.stringContaining("ON CONFLICT(tx_hash, log_index)"));
  });
});

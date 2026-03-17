import { describe, expect, it, vi } from "vitest";

import {
  getLatestSupplySnapshotAtOrBefore,
  insertPriceSourceSnapshots,
  insertSupplySnapshot,
  insertWeightedPriceSnapshot
} from "../../src/repositories/u-monitor.repository";

describe("u-monitor repository", () => {
  it("inserts source snapshots with captured_at and venue key", async () => {
    const run = vi.fn().mockResolvedValue({ success: true });
    const bind = vi.fn().mockReturnValue({ run });
    const prepare = vi.fn().mockReturnValue({ bind });

    await insertPriceSourceSnapshots(
      { prepare } as any,
      "2026-03-13T08:30:00.000Z",
      [
        {
          venue: "Binance",
          pair: "U/USDT",
          sourceType: "CEX",
          latestPrice: 0.9999,
          bid: 0.9998,
          ask: 1,
          quoteVolume24h: 25_650_000,
          weightPercent: 80.68,
          status: "live"
        }
      ]
    );

    expect(prepare).toHaveBeenCalledWith(expect.stringContaining("u_monitor_price_source_snapshots"));
    expect(run).toHaveBeenCalled();
  });

  it("upserts weighted price snapshots by captured_at", async () => {
    const run = vi.fn().mockResolvedValue({ success: true });
    const bind = vi.fn().mockReturnValue({ run });
    const prepare = vi.fn().mockReturnValue({ bind });

    await insertWeightedPriceSnapshot({ prepare } as any, {
      capturedAt: "2026-03-13T08:30:00.000Z",
      weightedPrice: 0.99991,
      baselinePrice: 1,
      sourceCount: 4,
      componentsJson: JSON.stringify([{ venue: "Binance", weightPercent: 80.68 }])
    });

    expect(prepare).toHaveBeenCalledWith(expect.stringContaining("ON CONFLICT(captured_at)"));
    expect(run).toHaveBeenCalled();
  });

  it("upserts supply snapshots by captured_at and contract", async () => {
    const run = vi.fn().mockResolvedValue({ success: true });
    const bind = vi.fn().mockReturnValue({ run });
    const prepare = vi.fn().mockReturnValue({ bind });

    await insertSupplySnapshot({ prepare } as any, {
      capturedAt: "2026-03-13T08:30:00.000Z",
      contractAddress: "0xcE24439F2D9C6a2289F741120FE202248B666666",
      chainId: 56,
      totalSupply: 122_040_000
    });

    expect(prepare).toHaveBeenCalledWith(expect.stringContaining("u_monitor_supply_snapshots"));
    expect(run).toHaveBeenCalled();
  });

  it("looks up the latest supply snapshot at or before a timestamp", async () => {
    const first = vi.fn().mockResolvedValue({
      capturedAt: "2026-03-13T08:00:00.000Z",
      contractAddress: "0xcE24439F2D9C6a2289F741120FE202248B666666",
      chainId: 56,
      totalSupply: 122_020_000
    });
    const bind = vi.fn().mockReturnValue({ first });
    const prepare = vi.fn().mockReturnValue({ bind });

    const row = await getLatestSupplySnapshotAtOrBefore(
      { prepare } as any,
      "0xcE24439F2D9C6a2289F741120FE202248B666666",
      "2026-03-13T08:00:00.000Z"
    );

    expect(prepare).toHaveBeenCalledWith(expect.stringContaining("captured_at <= ?"));
    expect(row?.totalSupply).toBe(122_020_000);
  });
});

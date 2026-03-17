import { describe, expect, it, vi } from "vitest";

import { snapshotUMonitorSupply } from "../../src/services/u-monitor-scheduler.service";

describe("snapshotUMonitorSupply", () => {
  it("reads BSC total supply and persists a D1 supply snapshot", async () => {
    const prepare = vi.fn().mockReturnValue({
      bind: vi.fn().mockReturnValue({
        run: vi.fn().mockResolvedValue({ success: true })
      })
    });

    const result = await snapshotUMonitorSupply(
      {
        DB: { prepare } as any,
        ETH_RPC_URL: "https://rpc.example",
        U_MONITOR_BSC_HTTP_URL: "https://bnb-mainnet.g.alchemy.com/v2/example",
        U_MONITOR_BSC_CHAIN_ID: "56"
      } as any,
      "2026-03-13T10:05:00.000Z",
      {
        readSupplyFromRpc: vi.fn().mockResolvedValue(122_040_000)
      }
    );

    expect(result).toEqual({
      capturedAt: "2026-03-13T10:05:00.000Z",
      totalSupply: 122_040_000,
      written: true
    });
    expect(prepare).toHaveBeenCalledWith(expect.stringContaining("u_monitor_supply_snapshots"));
  });
});

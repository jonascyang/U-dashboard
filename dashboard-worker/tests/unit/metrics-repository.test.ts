import { describe, expect, it, vi } from "vitest";

import { upsertMarketMetrics } from "../../src/repositories/metrics.repository";

describe("metrics repository", () => {
  it("upserts metric_hourly_market by (hour_ts, market_id)", async () => {
    const run = vi.fn().mockResolvedValue({ success: true });
    const bind = vi.fn().mockReturnValue({ run });
    const prepare = vi.fn().mockReturnValue({ bind });

    await upsertMarketMetrics(
      { prepare } as any,
      "2026-02-25T10:00:00.000Z",
      [
        {
          marketId: "eth-usdc",
          tvlUsd: 100,
          netFlowUsd24h: 10,
          revenueUsd24h: 1,
          activeUsers24h: 8,
          utilization: 0.8,
          liquidationUsd24h: 2,
          atRiskDebtRatio: 0.07
        }
      ]
    );

    expect(prepare).toHaveBeenCalledWith(expect.stringContaining("ON CONFLICT(hour_ts, market_id)"));
    expect(run).toHaveBeenCalled();
  });
});

import { describe, expect, it, vi } from "vitest";

import { insertAlerts } from "../../src/repositories/alerts.repository";

describe("alerts repository", () => {
  it("inserts evaluated alerts", async () => {
    const run = vi.fn().mockResolvedValue({ success: true });
    const bind = vi.fn().mockReturnValue({ run });
    const prepare = vi.fn().mockReturnValue({ bind });

    const inserted = await insertAlerts(
      { prepare } as any,
      [
        {
          level: "critical",
          ruleCode: "RISK_DEBT_RATIO_HIGH",
          metricKey: "atRiskDebtRatio",
          currentValue: 0.13,
          thresholdValue: 0.12,
          dedupKey: "RISK_DEBT_RATIO_HIGH:eth-usdc",
          marketId: "eth-usdc"
        }
      ],
      "2026-02-25T10:00:00.000Z"
    );

    expect(inserted).toBe(1);
    expect(prepare).toHaveBeenCalledWith(expect.stringContaining("INSERT INTO alerts"));
  });
});

import { describe, expect, it } from "vitest";

import { buildAlertInputs } from "@/workers/alerts/inputs";

describe("buildAlertInputs", () => {
  it("builds protocol + market alert inputs", () => {
    const inputs = buildAlertInputs(
      {
        hourTs: new Date("2026-02-25T10:00:00.000Z"),
        utilizationWeighted: "0.9",
        atRiskDebtRatio: "0.11",
        liquidationUsd24h: "120000",
        netFlowUsd24h: "10000",
        tvlUsd: "5000000",
        revenueUsd24h: "1200",
        activeUsers24h: 120,
        securityEvents24h: 0
      },
      [
        {
          hourTs: new Date("2026-02-25T10:00:00.000Z"),
          marketId: "eth-usdc",
          utilization: "0.91",
          atRiskDebtRatio: "0.07",
          liquidationUsd24h: "50000",
          netFlowUsd24h: "2200",
          tvlUsd: "2100000",
          revenueUsd24h: "450",
          activeUsers24h: 50
        }
      ]
    );

    expect(inputs).toHaveLength(2);
    expect(inputs[0].marketId).toBeUndefined();
    expect(inputs[1].marketId).toBe("eth-usdc");
    expect(inputs[1].utilization).toBe(0.91);
  });
});

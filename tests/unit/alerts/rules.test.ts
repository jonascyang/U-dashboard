import { describe, expect, it } from "vitest";

import { evaluateRules } from "@/workers/alerts/rules";

describe("evaluateRules", () => {
  it("emits critical alert when atRiskDebtRatio exceeds 12%", () => {
    const alerts = evaluateRules({
      hourTs: "2026-02-25T10:00:00.000Z",
      atRiskDebtRatio: 0.13,
      utilization: 0.7,
      liquidationUsd24h: 0
    });

    expect(alerts[0].level).toBe("critical");
    expect(alerts[0].ruleCode).toBe("RISK_DEBT_RATIO_HIGH");
  });
});

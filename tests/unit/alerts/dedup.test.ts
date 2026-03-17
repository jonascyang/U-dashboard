import { describe, expect, it } from "vitest";

import { applyDedup } from "@/workers/alerts/dedup";

describe("applyDedup", () => {
  it("suppresses warning alerts within 6h dedup window", () => {
    const now = new Date("2026-02-25T10:00:00.000Z");
    const out = applyDedup(
      [
        {
          level: "warning",
          ruleCode: "UTILIZATION_WARNING",
          metricKey: "utilization",
          currentValue: 0.9,
          dedupKey: "UTILIZATION_WARNING:eth-usdc",
          marketId: "eth-usdc"
        }
      ],
      [
        {
          dedupKey: "UTILIZATION_WARNING:eth-usdc",
          level: "warning",
          status: "active",
          lastSeenAt: new Date("2026-02-25T08:00:00.000Z")
        }
      ],
      now
    );

    expect(out).toHaveLength(0);
  });
});

import { describe, expect, it } from "vitest";

import { computeMarketMetrics, computeProtocolMetrics, type RawEvent } from "@/workers/aggregate/calculators";

const mockEvents24h: RawEvent[] = [
  { marketId: "eth-usdc", eventType: "Deposit", payloadJson: { user: "0xa", amountUsd: 1_000_000 } },
  { marketId: "eth-usdc", eventType: "Borrow", payloadJson: { user: "0xb", amountUsd: 810_000 } },
  { marketId: "eth-usdc", eventType: "Repay", payloadJson: { user: "0xb", amountUsd: 10_000 } },
  { marketId: "eth-usdc", eventType: "Liquidation", payloadJson: { user: "0xc", amountUsd: 20_000 } },
  { marketId: "eth-usdc", eventType: "Deposit", payloadJson: { user: "0xd", amountUsd: 300_000 } },
  { marketId: "eth-usdc", eventType: "Withdraw", payloadJson: { user: "0xd", amountUsd: 50_000 } }
];

describe("computeMarketMetrics", () => {
  it("computes market net flow and utilization for 24h window", () => {
    const [metric] = computeMarketMetrics(mockEvents24h);
    expect(metric.netFlowUsd24h).toBe(1_250_000);
    expect(metric.utilization).toBeCloseTo(0.648, 3);
  });
});

describe("computeProtocolMetrics", () => {
  it("computes protocol net flow and utilization for 24h window", () => {
    const out = computeProtocolMetrics(mockEvents24h);
    expect(out.netFlowUsd24h).toBe(1_250_000);
    expect(out.utilizationWeighted).toBeCloseTo(0.648, 3);
  });
});

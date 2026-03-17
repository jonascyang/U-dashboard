import { describe, expect, it } from "vitest";

import worker from "../../src/index";
import { createMockD1 } from "../helpers/mock-d1";

describe("worker routes: overview", () => {
  it("returns overview payload with 8 kpis", async () => {
    const { db } = createMockD1({
      first(query) {
        if (query.includes("FROM metric_hourly_protocol ORDER BY")) {
          return {
            hourTs: "2026-02-25T10:00:00.000Z",
            tvlUsd: "100",
            netFlowUsd24h: "10",
            revenueUsd24h: "2",
            activeUsers24h: 9,
            utilizationWeighted: "0.8",
            liquidationUsd24h: "3",
            atRiskDebtRatio: "0.07",
            securityEvents24h: 0
          };
        }
        return null;
      }
    });

    const res = await worker.fetch(new Request("https://example.com/api/v1/overview?window=24h"), {
      DB: db as any,
      ETH_RPC_URL: "https://rpc.example"
    });
    const body = (await res.json()) as Record<string, unknown>;

    expect(res.status).toBe(200);
    expect(body).toEqual(
      expect.objectContaining({
        tvl: expect.any(Number),
        netFlow24h: expect.any(Number),
        revenue24h: expect.any(Number),
        activeUsers24h: expect.any(Number),
        utilization: expect.any(Number),
        liquidation24h: expect.any(Number),
        atRiskDebtRatio: expect.any(Number),
        securityEvents24h: expect.any(Number)
      })
    );
  });
});

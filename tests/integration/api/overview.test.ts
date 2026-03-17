import { describe, expect, it } from "vitest";

import { GET as GET_overview } from "@/app/api/v1/overview/route";

describe("GET /api/v1/overview", () => {
  it("returns 8 KPI fields in overview payload", async () => {
    const res = await GET_overview();
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(Object.keys(body)).toEqual(
      expect.arrayContaining([
        "tvl",
        "netFlow24h",
        "revenue24h",
        "activeUsers24h",
        "utilization",
        "liquidation24h",
        "atRiskDebtRatio",
        "securityEvents24h"
      ])
    );
  });
});

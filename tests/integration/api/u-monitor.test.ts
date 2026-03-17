import { describe, expect, it } from "vitest";

import { GET as GET_depeg } from "@/app/api/v1/u-monitor/depeg/route";
import { GET as GET_overview } from "@/app/api/v1/u-monitor/overview/route";
import { GET as GET_supply } from "@/app/api/v1/u-monitor/supply/route";

describe("U monitor API", () => {
  it("returns overview, depeg, and supply payloads", async () => {
    const [overview, depeg, supply] = await Promise.all([GET_overview(), GET_depeg(), GET_supply()]);

    expect(overview.status).toBe(200);
    expect(depeg.status).toBe(200);
    expect(supply.status).toBe(200);

    expect(await overview.json()).toEqual(
      expect.objectContaining({
        symbol: "U",
        chain: "BSC",
        weightedPrice: expect.any(Number)
      })
    );
    expect(await depeg.json()).toEqual(
      expect.objectContaining({
        maxDeviationPercent30d: expect.any(Number),
        series: expect.any(Array)
      })
    );
    expect(await supply.json()).toEqual(
      expect.objectContaining({
        contractAddress: expect.stringMatching(/^0x/),
        totalSupply: expect.any(Number),
        supplyDeltas: expect.any(Array)
      })
    );
  });
});

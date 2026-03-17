import { describe, expect, it } from "vitest";

import { computePancakeV3PriceFromSlot0, readPancakeV3PoolSnapshot } from "@/server/u-monitor/pancake";

describe("pancake price calculation", () => {
  it("derives a 1.0 price when sqrtPriceX96 is 2^96 and U is token0", () => {
    const price = computePancakeV3PriceFromSlot0({
      sqrtPriceX96: 2n ** 96n,
      token0Address: "0xcE24439F2D9C6a2289F741120FE202248B666666",
      token1Address: "0x55d398326f99059ff775485246999027b3197955",
      token0Decimals: 18,
      token1Decimals: 18,
      baseTokenAddress: "0xcE24439F2D9C6a2289F741120FE202248B666666"
    });

    expect(price).toBeCloseTo(1, 8);
  });

  it("reads pool state and computes the latest price", async () => {
    const calls: string[] = [];
    const client = {
      readContract: async ({ address, functionName }: { address: string; functionName: string }) => {
        calls.push(`${address}:${functionName}`);
        if (functionName === "token0") return "0xcE24439F2D9C6a2289F741120FE202248B666666";
        if (functionName === "token1") return "0x55d398326f99059ff775485246999027b3197955";
        if (functionName === "slot0") return { sqrtPriceX96: 2n ** 96n };
        if (functionName === "decimals") return 18;
        throw new Error(`Unexpected function ${functionName}`);
      }
    };

    const snapshot = await readPancakeV3PoolSnapshot(client as never, {
      poolAddress: "0xa0909f81785f87f3e79309f0e73a7d82208094e4",
      baseTokenAddress: "0xcE24439F2D9C6a2289F741120FE202248B666666",
      quoteVolume24h: 275670
    });

    expect(snapshot.latestPrice).toBeCloseTo(1, 8);
    expect(snapshot.quoteVolume24h).toBe(275670);
    expect(calls).toContain("0xa0909f81785f87f3e79309f0e73a7d82208094e4:slot0");
  });
});

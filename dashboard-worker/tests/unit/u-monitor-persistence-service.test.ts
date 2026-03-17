import { describe, expect, it } from "vitest";

import { createMockD1 } from "../helpers/mock-d1";
import { persistUMonitorSnapshot } from "../../src/services/u-monitor-persistence.service";

describe("persistUMonitorSnapshot", () => {
  it("writes source, weighted price, and supply snapshots in one call", async () => {
    const { db, history } = createMockD1();

    const result = await persistUMonitorSnapshot(db, {
      capturedAt: "2026-03-13T08:30:00.000Z",
      weightedPrice: {
        weightedPrice: 0.99991,
        baselinePrice: 1,
        sourceCount: 4,
        componentsJson: JSON.stringify([{ venue: "Binance", weightPercent: 80.68 }])
      },
      priceSources: [
        {
          venue: "Binance",
          pair: "U/USDT",
          sourceType: "CEX",
          latestPrice: 0.9999,
          bid: 0.9998,
          ask: 1,
          quoteVolume24h: 25_650_000,
          weightPercent: 80.68,
          status: "live"
        }
      ],
      supply: {
        contractAddress: "0xcE24439F2D9C6a2289F741120FE202248B666666",
        chainId: 56,
        totalSupply: 122_040_000
      }
    });

    expect(result).toEqual({ priceSourcesInserted: 1, weightedPriceWritten: true, supplyWritten: true });
    expect(history).toHaveLength(3);
  });
});

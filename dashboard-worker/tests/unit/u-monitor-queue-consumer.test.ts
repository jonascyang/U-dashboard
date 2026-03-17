import { describe, expect, it } from "vitest";

import { createMockD1 } from "../helpers/mock-d1";
import { consumeUMonitorVenueEvents } from "../../src/services/u-monitor-queue-consumer.service";

describe("consumeUMonitorVenueEvents", () => {
  it("writes price source rows and a weighted price snapshot from venue events", async () => {
    const { db, history } = createMockD1();

    const result = await consumeUMonitorVenueEvents(db, [
      {
        venue: "Binance",
        pair: "U/USDT",
        sourceType: "CEX",
        latestPrice: 0.9999,
        bid: 0.9998,
        ask: 1,
        quoteVolume24h: 25_650_000,
        updatedAt: "2026-03-13T10:00:00.000Z",
        status: "live"
      },
      {
        venue: "LBank",
        pair: "U/USDT",
        sourceType: "CEX",
        latestPrice: 1,
        quoteVolume24h: 5_400_000,
        updatedAt: "2026-03-13T10:00:00.000Z",
        status: "live"
      }
    ]);

    expect(result.priceSourcesInserted).toBe(2);
    expect(result.weightedPriceWritten).toBe(true);
    expect(result.weightedPrice).toBeCloseTo(0.999917, 6);
    expect(history).toHaveLength(4);
  });

  it("deduplicates multiple events from the same venue within one batch", async () => {
    const { db, history } = createMockD1();

    const result = await consumeUMonitorVenueEvents(db, [
      {
        venue: "LBank",
        pair: "U/USDT",
        sourceType: "CEX",
        latestPrice: 0.9996,
        quoteVolume24h: 5_000_000,
        updatedAt: "2026-03-13T10:00:00.000Z",
        status: "live"
      },
      {
        venue: "LBank",
        pair: "U/USDT",
        sourceType: "CEX",
        latestPrice: 0.9997,
        quoteVolume24h: 5_100_000,
        updatedAt: "2026-03-13T10:00:02.000Z",
        status: "live"
      }
    ]);

    expect(result.priceSourcesInserted).toBe(1);
    expect(result.weightedPrice).toBe(0.9997);
    expect(history).toHaveLength(3);
  });

  it("merges the current batch with the last known snapshots for venues missing from the batch", async () => {
    const { db } = createMockD1({
      all(query) {
        if (query.includes("FROM u_monitor_price_source_snapshots latest")) {
          return [
            {
              capturedAt: "2026-03-13T09:59:00.000Z",
              venue: "PancakeSwap V3",
              pair: "U/USDT",
              sourceType: "DEX",
              latestPrice: 0.9996,
              bid: null,
              ask: null,
              quoteVolume24h: 275670,
              weightPercent: 7.2,
              status: "live"
            }
          ];
        }
        return [];
      }
    });

    const result = await consumeUMonitorVenueEvents(db, [
      {
        venue: "LBank",
        pair: "U/USDT",
        sourceType: "CEX",
        latestPrice: 0.9998,
        quoteVolume24h: 3_500_000,
        updatedAt: "2026-03-13T10:00:00.000Z",
        status: "live"
      }
    ]);

    expect(result.priceSourcesInserted).toBe(2);
    expect(result.weightedPrice).toBeCloseTo(0.999785, 6);
  });
});

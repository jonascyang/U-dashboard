import { afterEach, describe, expect, it } from "vitest";

import { uMonitorRuntimeStore } from "@/server/u-monitor/runtime-store";
import { getUMonitorOverview } from "@/server/u-monitor-service";

describe("getUMonitorOverview", () => {
  afterEach(() => {
    uMonitorRuntimeStore.clear();
  });

  it("computes a weighted price and source weights from approved venues", async () => {
    const overview = await getUMonitorOverview();

    expect(overview.weightedPrice).toBeCloseTo(0.9999, 4);
    expect(overview.priceSources).toHaveLength(4);
    expect(overview.priceSources.reduce((sum, row) => sum + row.weightPercent, 0)).toBeCloseTo(100, 6);
  });

  it("prefers live runtime snapshots over seed prices when available", async () => {
    uMonitorRuntimeStore.upsert("Binance", {
      latestPrice: 1.0004,
      quoteVolume24h: 30_000_000,
      bid: 1.0003,
      ask: 1.0005,
      updatedAt: "2026-03-13T08:00:00.000Z",
      status: "live"
    });

    const overview = await getUMonitorOverview();
    const binance = overview.priceSources.find((row) => row.venue === "Binance");

    expect(binance?.latestPrice).toBe(1.0004);
    expect(binance?.quoteVolume24h).toBe(30_000_000);
    expect(overview.weightedPrice).toBeGreaterThan(0.9999);
  });
});

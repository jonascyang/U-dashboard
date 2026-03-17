import { describe, expect, it } from "vitest";

import { U_MONITOR_BSC_CHAIN, U_MONITOR_CONTRACT_ADDRESS, uMonitorSources } from "@/server/u-monitor/registry";

describe("uMonitorSources", () => {
  it("defines the approved U/USDT basket with websocket-first transports", () => {
    expect(U_MONITOR_BSC_CHAIN).toBe("BSC");
    expect(U_MONITOR_CONTRACT_ADDRESS).toBe("0xcE24439F2D9C6a2289F741120FE202248B666666");
    expect(uMonitorSources.map((source) => source.venue)).toEqual(["Binance", "LBank", "HTX", "PancakeSwap V3"]);
    expect(uMonitorSources.every((source) => source.transport === "websocket-first")).toBe(true);
  });

  it("uses production-safe websocket endpoints and keeps a fallback quote volume for Pancake", () => {
    const binance = uMonitorSources.find((source) => source.venue === "Binance");
    const htx = uMonitorSources.find((source) => source.venue === "HTX");
    const pancake = uMonitorSources.find((source) => source.venue === "PancakeSwap V3");

    expect(binance?.websocketUrl).toBe("wss://data-stream.binance.vision/ws");
    expect(htx?.websocketUrl).toBe("wss://api-aws.huobi.pro/ws");
    expect(pancake).toEqual(expect.objectContaining({ fallbackQuoteVolume24h: expect.any(Number) }));
  });
});

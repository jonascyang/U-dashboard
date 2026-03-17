// @vitest-environment jsdom
import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { UMonitorDashboard } from "@/components/u-monitor/dashboard";

const overview = {
  stablecoinName: "United Stables",
  symbol: "U",
  chain: "BSC",
  contractAddress: "0xcE24439F2D9C6a2289F741120FE202248B666666",
  updatedAt: "2026-03-14T06:00:00.000Z",
  weightedPrice: 0.99991,
  totalSupply: 1004899973.0484672,
  maxDeviationValue30d: 0.0016,
  maxDeviationPercent30d: 0.16,
  maxDeviationAt30d: "2026-03-13T06:00:00.000Z",
  priceSources: [
    {
      venue: "Binance",
      pair: "U/USDT",
      sourceType: "CEX" as const,
      latestPrice: 0.99991,
      quoteVolume24h: 25_650_000,
      updatedAt: "2026-03-14T06:00:00.000Z",
      status: "live" as const,
      weightPercent: 82.4
    }
  ],
  supplyDeltas: [{ window: "1h" as const, value: 12_000 }]
};

const depeg = {
  updatedAt: "2026-03-14T06:00:00.000Z",
  baselinePrice: 1,
  maxDeviationValue30d: 0.0016,
  maxDeviationPercent30d: 0.16,
  maxDeviationAt30d: "2026-03-13T06:00:00.000Z",
  series: [{ ts: "2026-03-14T06:00:00.000Z", price: 0.99991, deviationValue: 0.00009 }]
};

describe("UMonitorDashboard", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("loads overview and depeg data from the local api routes", async () => {
    const fetchMock = vi.fn().mockImplementation(async (input: string) => {
      if (input.endsWith("/overview")) {
        return new Response(JSON.stringify(overview), { status: 200 });
      }

      return new Response(JSON.stringify(depeg), { status: 200 });
    });

    vi.stubGlobal("fetch", fetchMock);

    render(<UMonitorDashboard />);

    expect(screen.getByText("Loading monitor...")).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText("Latest Weighted Price")).toBeInTheDocument();
    });

    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining("/api/v1/u-monitor/overview"),
      expect.objectContaining({ cache: "no-store" })
    );
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining("/api/v1/u-monitor/depeg"),
      expect.objectContaining({ cache: "no-store" })
    );
    expect(screen.getByText("U Stablecoin Monitor")).toBeInTheDocument();
    expect(screen.getByText("Price Sources")).toBeInTheDocument();
  });
});

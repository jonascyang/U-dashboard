import { describe, expect, it, vi } from "vitest";

import { queryUMonitorDepeg, queryUMonitorOverview, queryUMonitorSupply } from "@/server/u-monitor-query";

const localOverview = {
  stablecoinName: "United Stables",
  symbol: "U",
  chain: "BSC",
  contractAddress: "0xcE24439F2D9C6a2289F741120FE202248B666666",
  updatedAt: "2026-03-13T09:00:00.000Z",
  weightedPrice: 0.99991,
  totalSupply: 122_040_000,
  maxDeviationValue30d: 0.0016,
  maxDeviationPercent30d: 0.16,
  maxDeviationAt30d: "2026-03-12T09:00:00.000Z",
  priceSources: [],
  supplyDeltas: []
};

describe("u-monitor query", () => {
  it("prefers worker api when configured", async () => {
    const fetchImpl = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        ...localOverview,
        weightedPrice: 1.0002
      })
    });

    const overview = await queryUMonitorOverview({
      workerUrl: "https://worker.example",
      fetchImpl: fetchImpl as never,
      local: {
        getOverview: async () => localOverview,
        getDepeg: async () => ({
          updatedAt: "",
          baselinePrice: 1,
          maxDeviationValue30d: 0,
          maxDeviationPercent30d: 0,
          maxDeviationAt30d: "",
          series: []
        }),
        getSupply: async () => ({ updatedAt: "", contractAddress: localOverview.contractAddress, totalSupply: localOverview.totalSupply, supplyDeltas: [] })
      }
    });

    expect(fetchImpl).toHaveBeenCalledWith(
      "https://worker.example/api/v1/u-monitor/overview",
      expect.objectContaining({ cache: "no-store" })
    );
    expect(overview.weightedPrice).toBe(1.0002);
  });

  it("falls back to local data when worker query fails", async () => {
    const fetchImpl = vi.fn().mockResolvedValue({
      ok: false,
      status: 503
    });

    const overview = await queryUMonitorOverview({
      workerUrl: "https://worker.example",
      fetchImpl: fetchImpl as never,
      local: {
        getOverview: async () => localOverview,
        getDepeg: async () => ({
          updatedAt: "",
          baselinePrice: 1,
          maxDeviationValue30d: 0,
          maxDeviationPercent30d: 0,
          maxDeviationAt30d: "",
          series: []
        }),
        getSupply: async () => ({ updatedAt: "", contractAddress: localOverview.contractAddress, totalSupply: localOverview.totalSupply, supplyDeltas: [] })
      }
    });

    expect(overview.weightedPrice).toBe(localOverview.weightedPrice);
  });

  it("falls back to local data when worker fetch throws", async () => {
    const fetchImpl = vi.fn().mockRejectedValue(new Error("network down"));

    const overview = await queryUMonitorOverview({
      workerUrl: "https://worker.example",
      fetchImpl: fetchImpl as never,
      local: {
        getOverview: async () => localOverview,
        getDepeg: async () => ({
          updatedAt: "",
          baselinePrice: 1,
          maxDeviationValue30d: 0,
          maxDeviationPercent30d: 0,
          maxDeviationAt30d: "",
          series: []
        }),
        getSupply: async () => ({
          updatedAt: "",
          contractAddress: localOverview.contractAddress,
          totalSupply: localOverview.totalSupply,
          supplyDeltas: []
        })
      }
    });

    expect(overview.weightedPrice).toBe(localOverview.weightedPrice);
  });

  it("queries depeg and supply endpoints from worker", async () => {
    const fetchImpl = vi.fn().mockImplementation(async (input: string) => {
      if (input.endsWith("/depeg")) {
        return {
          ok: true,
          json: async () => ({
            baselinePrice: 1,
            maxDeviationValue30d: 0.0016,
            maxDeviationPercent30d: 0.16,
            maxDeviationAt30d: "2026-03-12T09:00:00.000Z",
            series: [{ ts: "2026-03-13T09:00:00.000Z", price: 0.99991, deviationValue: 0.00009 }]
          })
        };
      }

      return {
        ok: true,
        json: async () => ({
          updatedAt: "2026-03-13T09:00:00.000Z",
          contractAddress: localOverview.contractAddress,
          totalSupply: localOverview.totalSupply,
          supplyDeltas: []
        })
      };
    });

    const [depeg, supply] = await Promise.all([
      queryUMonitorDepeg({
        workerUrl: "https://worker.example",
        fetchImpl: fetchImpl as never,
        local: {
          getOverview: async () => localOverview,
          getDepeg: async () => ({
            updatedAt: "",
            baselinePrice: 1,
            maxDeviationValue30d: 0,
            maxDeviationPercent30d: 0,
            maxDeviationAt30d: "",
            series: []
          }),
          getSupply: async () => ({ updatedAt: "", contractAddress: localOverview.contractAddress, totalSupply: localOverview.totalSupply, supplyDeltas: [] })
        }
      }),
      queryUMonitorSupply({
        workerUrl: "https://worker.example",
        fetchImpl: fetchImpl as never,
        local: {
          getOverview: async () => localOverview,
          getDepeg: async () => ({
            updatedAt: "",
            baselinePrice: 1,
            maxDeviationValue30d: 0,
            maxDeviationPercent30d: 0,
            maxDeviationAt30d: "",
            series: []
          }),
          getSupply: async () => ({ updatedAt: "", contractAddress: localOverview.contractAddress, totalSupply: localOverview.totalSupply, supplyDeltas: [] })
        }
      })
    ]);

    expect(depeg.maxDeviationPercent30d).toBe(0.16);
    expect(supply.totalSupply).toBe(localOverview.totalSupply);
  });
});

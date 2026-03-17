import { describe, expect, it, vi } from "vitest";

import worker from "../../src/index";
import { createMockD1 } from "../helpers/mock-d1";

describe("worker routes: u-monitor", () => {
  it("persists a runtime snapshot payload", async () => {
    const { db, history } = createMockD1();

    const res = await worker.fetch(
      new Request("https://example.com/api/v1/u-monitor/persist", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          capturedAt: "2026-03-13T09:00:00.000Z",
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
        })
      }),
      {
        DB: db as any,
        ETH_RPC_URL: "https://rpc.example"
      }
    );

    const body = (await res.json()) as Record<string, unknown>;

    expect(res.status).toBe(200);
    expect(body).toEqual(
      expect.objectContaining({
        priceSourcesInserted: 1,
        weightedPriceWritten: true,
        supplyWritten: true
      })
    );
    expect(history).toHaveLength(3);
  });

  it("rejects persist requests when the configured token is missing", async () => {
    const { db } = createMockD1();

    const res = await worker.fetch(
      new Request("https://example.com/api/v1/u-monitor/persist", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          capturedAt: "2026-03-13T09:00:00.000Z",
          weightedPrice: {
            weightedPrice: 0.99991,
            baselinePrice: 1,
            sourceCount: 4,
            componentsJson: "[]"
          },
          priceSources: [],
          supply: {
            contractAddress: "0xcE24439F2D9C6a2289F741120FE202248B666666",
            chainId: 56,
            totalSupply: 122_040_000
          }
        })
      }),
      {
        DB: db as any,
        ETH_RPC_URL: "https://rpc.example",
        U_MONITOR_API_TOKEN: "secret-token"
      } as any
    );

    expect(res.status).toBe(401);
  });

  it("returns latest overview from D1 u-monitor snapshots", async () => {
    const { db } = createMockD1({
      first(query, args) {
        if (query.includes("FROM u_monitor_weighted_price_snapshots ORDER BY")) {
          return {
            capturedAt: "2026-03-13T09:00:00.000Z",
            weightedPrice: 0.99991,
            baselinePrice: 1,
            sourceCount: 4,
            componentsJson: JSON.stringify([{ venue: "Binance", weightPercent: 80.68 }])
          };
        }
        if (query.includes("FROM u_monitor_supply_snapshots ORDER BY")) {
          return {
            capturedAt: "2026-03-13T09:00:00.000Z",
            contractAddress: "0xcE24439F2D9C6a2289F741120FE202248B666666",
            chainId: 56,
            totalSupply: 122040000
          };
        }
        if (query.includes("FROM u_monitor_supply_snapshots WHERE contract_address = ? AND captured_at <= ?")) {
          const target = String(args[1] ?? "");
          if (target === "2026-03-13T08:00:00.000Z") {
            return {
              capturedAt: "2026-03-13T08:00:00.000Z",
              contractAddress: "0xcE24439F2D9C6a2289F741120FE202248B666666",
              chainId: 56,
              totalSupply: 122020000
            };
          }
          if (target === "2026-03-13T05:00:00.000Z") {
            return {
              capturedAt: "2026-03-13T05:00:00.000Z",
              contractAddress: "0xcE24439F2D9C6a2289F741120FE202248B666666",
              chainId: 56,
              totalSupply: 121980000
            };
          }
          if (target === "2026-03-12T09:00:00.000Z") {
            return {
              capturedAt: "2026-03-12T09:00:00.000Z",
              contractAddress: "0xcE24439F2D9C6a2289F741120FE202248B666666",
              chainId: 56,
              totalSupply: 121840000
            };
          }
          if (target === "2026-03-06T09:00:00.000Z") {
            return {
              capturedAt: "2026-03-06T09:00:00.000Z",
              contractAddress: "0xcE24439F2D9C6a2289F741120FE202248B666666",
              chainId: 56,
              totalSupply: 121050000
            };
          }
          if (target === "2026-02-11T09:00:00.000Z") {
            return {
              capturedAt: "2026-02-11T09:00:00.000Z",
              contractAddress: "0xcE24439F2D9C6a2289F741120FE202248B666666",
              chainId: 56,
              totalSupply: 119200000
            };
          }
          return null;
        }
        return null;
      },
      all(query, args) {
        if (query.includes("FROM u_monitor_price_source_snapshots WHERE captured_at = ?")) {
          return [
            {
              capturedAt: "2026-03-13T09:00:00.000Z",
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
          ];
        }
        if (query.includes("FROM u_monitor_weighted_price_snapshots ORDER BY captured_at DESC LIMIT ?")) {
          return [
            {
              capturedAt: "2026-03-12T09:00:00.000Z",
              weightedPrice: 0.9984
            },
            {
              capturedAt: "2026-03-13T09:00:00.000Z",
              weightedPrice: 0.99991
            }
          ];
        }
        return [];
      }
    });

    const res = await worker.fetch(new Request("https://example.com/api/v1/u-monitor/overview"), {
      DB: db as any,
      ETH_RPC_URL: "https://rpc.example"
    });
    const body = (await res.json()) as Record<string, unknown>;

    expect(res.status).toBe(200);
    expect(body).toEqual(
      expect.objectContaining({
        stablecoinName: "United Stables",
        symbol: "U",
        chain: "BSC",
        contractAddress: "0xcE24439F2D9C6a2289F741120FE202248B666666",
        weightedPrice: 0.99991,
        totalSupply: 122040000,
        maxDeviationPercent30d: expect.any(Number),
        priceSources: expect.any(Array),
        supplyDeltas: expect.any(Array)
      })
    );
    expect(res.headers.get("access-control-allow-origin")).toBe("*");
  });

  it("returns 30 day depeg payload from weighted price history", async () => {
    const { db } = createMockD1({
      all(query) {
        if (query.includes("FROM u_monitor_weighted_price_snapshots ORDER BY captured_at DESC LIMIT ?")) {
          return [
            {
              capturedAt: "2026-03-13T09:00:00.000Z",
              weightedPrice: 0.99991
            },
            {
              capturedAt: "2026-03-12T09:00:00.000Z",
              weightedPrice: 0.9984
            }
          ];
        }
        return [];
      }
    });

    const res = await worker.fetch(new Request("https://example.com/api/v1/u-monitor/depeg"), {
      DB: db as any,
      ETH_RPC_URL: "https://rpc.example"
    });
    const body = (await res.json()) as Record<string, unknown>;

    expect(res.status).toBe(200);
    expect(body).toEqual(
      expect.objectContaining({
        updatedAt: "2026-03-13T09:00:00.000Z",
        baselinePrice: 1,
        maxDeviationPercent30d: expect.any(Number),
        series: expect.any(Array)
      })
    );
  });

  it("returns supply payload with multi-window deltas", async () => {
    const latestCapturedAt = "2026-03-13T09:00:00.000Z";
    const contractAddress = "0xcE24439F2D9C6a2289F741120FE202248B666666";
    const snapshotsByTarget = new Map<string, { capturedAt: string; contractAddress: string; chainId: number; totalSupply: number }>([
      ["2026-03-13T08:00:00.000Z", { capturedAt: "2026-03-13T08:00:00.000Z", contractAddress, chainId: 56, totalSupply: 122020000 }],
      ["2026-03-13T05:00:00.000Z", { capturedAt: "2026-03-13T05:00:00.000Z", contractAddress, chainId: 56, totalSupply: 121980000 }],
      ["2026-03-12T09:00:00.000Z", { capturedAt: "2026-03-12T09:00:00.000Z", contractAddress, chainId: 56, totalSupply: 121840000 }],
      ["2026-03-06T09:00:00.000Z", { capturedAt: "2026-03-06T09:00:00.000Z", contractAddress, chainId: 56, totalSupply: 121050000 }],
      ["2026-02-11T09:00:00.000Z", { capturedAt: "2026-02-11T09:00:00.000Z", contractAddress, chainId: 56, totalSupply: 119200000 }]
    ]);

    const { db } = createMockD1({
      first(query, args) {
        if (query.includes("FROM u_monitor_supply_snapshots ORDER BY")) {
          return {
            capturedAt: latestCapturedAt,
            contractAddress,
            chainId: 56,
            totalSupply: 122040000
          };
        }
        if (query.includes("FROM u_monitor_supply_snapshots WHERE contract_address = ? AND captured_at <= ?")) {
          return snapshotsByTarget.get(String(args[1])) ?? null;
        }
        return null;
      }
    });

    const res = await worker.fetch(new Request("https://example.com/api/v1/u-monitor/supply"), {
      DB: db as any,
      ETH_RPC_URL: "https://rpc.example"
    });
    const body = (await res.json()) as Record<string, unknown>;

    expect(res.status).toBe(200);
    expect(body).toEqual(
      expect.objectContaining({
        updatedAt: latestCapturedAt,
        contractAddress,
        totalSupply: 122040000,
        supplyDeltas: [
          { window: "1h", value: 20000 },
          { window: "4h", value: 60000 },
          { window: "1d", value: 200000 },
          { window: "7d", value: 990000 },
          { window: "30d", value: 2840000 }
        ]
      })
    );
  });

  it("starts all venue agents through durable object stubs", async () => {
    const fetch = vi.fn().mockResolvedValue(new Response(JSON.stringify({ ok: true }), { status: 200 }));
    const namespace = {
      idFromName: vi.fn().mockReturnValue("agent-id"),
      get: vi.fn().mockReturnValue({ fetch })
    };

    const res = await worker.fetch(new Request("https://example.com/api/v1/u-monitor/start", { method: "POST" }), {
      DB: createMockD1().db as any,
      ETH_RPC_URL: "https://rpc.example",
      BINANCE_U_MONITOR: namespace as any,
      LBANK_U_MONITOR: namespace as any,
      HTX_U_MONITOR: namespace as any,
      PANCAKE_U_MONITOR: namespace as any
    } as any);
    const body = (await res.json()) as Record<string, unknown>;

    expect(res.status).toBe(200);
    expect(body).toEqual(
      expect.objectContaining({
        started: ["Binance", "LBank", "HTX", "PancakeSwap V3"]
      })
    );
    expect(fetch).toHaveBeenCalled();
  });
});

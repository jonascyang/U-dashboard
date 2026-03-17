import { describe, expect, it, vi } from "vitest";

import { postUMonitorPersistencePayload } from "@/server/u-monitor/persistence-client";

describe("postUMonitorPersistencePayload", () => {
  it("posts the runtime payload to the worker persist endpoint", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ priceSourcesInserted: 1, weightedPriceWritten: true, supplyWritten: true })
    });

    const result = await postUMonitorPersistencePayload(
      "https://worker.example/api/v1/u-monitor/persist",
      {
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
      },
      {
        fetchImpl: fetchMock as never
      }
    );

    expect(fetchMock).toHaveBeenCalledWith(
      "https://worker.example/api/v1/u-monitor/persist",
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({
          "content-type": "application/json"
        })
      })
    );
    expect(result).toEqual({
      priceSourcesInserted: 1,
      weightedPriceWritten: true,
      supplyWritten: true
    });
  });

  it("sends the optional auth token header", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ ok: true })
    });

    await postUMonitorPersistencePayload(
      "https://worker.example/api/v1/u-monitor/persist",
      {
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
      },
      {
        fetchImpl: fetchMock as never,
        authToken: "secret-token"
      }
    );

    expect(fetchMock).toHaveBeenCalledWith(
      "https://worker.example/api/v1/u-monitor/persist",
      expect.objectContaining({
        headers: expect.objectContaining({
          "x-u-monitor-token": "secret-token"
        })
      })
    );
  });
});

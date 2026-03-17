import { Buffer } from "node:buffer";
import { gzipSync } from "node:zlib";
import { describe, expect, it, vi } from "vitest";

import {
  buildVenueAgentSubscriptions,
  createVenueAgentRuntime,
  fetchVenueRestSnapshot,
  type VenueAgentSource
} from "../../src/durable-objects/venue-agent";

function createSource(overrides: Partial<VenueAgentSource> = {}): VenueAgentSource {
  return {
    venue: "Binance",
    pair: "U/USDT",
    sourceType: "CEX",
    marketSymbol: "UUSDT",
    websocketUrl: "wss://stream.binance.com:9443/ws",
    ...overrides
  };
}

describe("venue agent runtime", () => {
  it("builds Binance subscription payloads", () => {
    expect(buildVenueAgentSubscriptions(createSource())).toEqual([
      { method: "SUBSCRIBE", params: ["uusdt@bookTicker", "uusdt@ticker"], id: 1 }
    ]);
  });

  it("responds to HTX heartbeat messages", async () => {
    const send = vi.fn();
    const queue = { send: vi.fn() };
    const runtime = createVenueAgentRuntime({
      source: createSource({
        venue: "HTX",
        marketSymbol: "uusdt",
        websocketUrl: "wss://api-aws.huobi.pro/ws",
        sourceType: "CEX"
      }),
      queue,
      socket: { send }
    });

    await runtime.handleMessage(gzipSync(Buffer.from(JSON.stringify({ ping: 123456 }))));

    expect(send).toHaveBeenCalledWith(JSON.stringify({ pong: 123456 }));
    expect(queue.send).not.toHaveBeenCalled();
  });

  it("responds to LBank heartbeat messages", async () => {
    const send = vi.fn();
    const queue = { send: vi.fn() };
    const runtime = createVenueAgentRuntime({
      source: createSource({
        venue: "LBank",
        marketSymbol: "u_usdt",
        websocketUrl: "wss://www.lbkex.net/ws/V2/",
        sourceType: "CEX"
      }),
      queue,
      socket: { send }
    });

    await runtime.handleMessage(JSON.stringify({ action: "ping", ping: "abc-123" }));

    expect(send).toHaveBeenCalledWith(JSON.stringify({ action: "pong", pong: "abc-123" }));
    expect(queue.send).not.toHaveBeenCalled();
  });

  it("builds Pancake subscriptions and emits normalized snapshots to the queue", async () => {
    const queue = { send: vi.fn() };
    const runtime = createVenueAgentRuntime({
      source: createSource({
        venue: "PancakeSwap V3",
        pair: "U/USDT",
        sourceType: "DEX",
        marketSymbol: "0xa0909f81785f87f3e79309f0e73a7d82208094e4",
        websocketUrl: "wss://bnb-mainnet.g.alchemy.com/v2/example"
      }),
      queue,
      fetchPancakeSnapshot: vi.fn().mockResolvedValue({
        latestPrice: 0.9997,
        quoteVolume24h: 275670,
        updatedAt: "2026-03-13T10:00:00.000Z"
      })
    });

    expect(buildVenueAgentSubscriptions(runtime.source)).toEqual([
      { method: "eth_subscribe", params: ["newHeads"], id: 1 },
      {
        method: "eth_subscribe",
        params: ["logs", { address: "0xa0909f81785f87f3e79309f0e73a7d82208094e4" }],
        id: 2
      }
    ]);

    await runtime.handleMessage(JSON.stringify({ method: "eth_subscription", params: { result: { number: "0x1" } } }));

    expect(queue.send).toHaveBeenCalledWith(
      expect.objectContaining({
        venue: "PancakeSwap V3",
        pair: "U/USDT",
        sourceType: "DEX",
        latestPrice: 0.9997,
        quoteVolume24h: 275670
      })
    );
  });

  it("uses the source fallback volume when Pancake snapshot volume is unavailable", async () => {
    const queue = { send: vi.fn() };
    const runtime = createVenueAgentRuntime({
      source: createSource({
        venue: "PancakeSwap V3",
        pair: "U/USDT",
        sourceType: "DEX",
        marketSymbol: "0xa0909f81785f87f3e79309f0e73a7d82208094e4",
        websocketUrl: "wss://bnb-mainnet.g.alchemy.com/v2/example",
        fallbackQuoteVolume24h: 275670
      } as VenueAgentSource),
      queue,
      fetchPancakeSnapshot: vi.fn().mockResolvedValue({
        latestPrice: 0.9997,
        updatedAt: "2026-03-13T10:00:00.000Z"
      })
    });

    await runtime.handleMessage(JSON.stringify({ method: "eth_subscription", params: { result: { number: "0x1" } } }));

    expect(queue.send).toHaveBeenCalledWith(
      expect.objectContaining({
        venue: "PancakeSwap V3",
        latestPrice: 0.9997,
        quoteVolume24h: 275670
      })
    );
  });

  it("fetches and normalizes Binance REST fallback snapshots", async () => {
    const fetchImpl = vi.fn().mockImplementation(async (input: string) => {
      if (input.includes("bookTicker")) {
        return new Response(
          JSON.stringify({
            symbol: "UUSDT",
            bidPrice: "0.9997",
            askPrice: "0.9998"
          }),
          { status: 200 }
        );
      }

      return new Response(
        JSON.stringify({
          symbol: "UUSDT",
          lastPrice: "0.9998",
          quoteVolume: "18578171.4457",
          closeTime: 1773474804199
        }),
        { status: 200 }
      );
    });

    const snapshot = await fetchVenueRestSnapshot(
      createSource({
        venue: "Binance",
        marketSymbol: "UUSDT",
        restUrl: "https://api.binance.com"
      }),
      fetchImpl as typeof fetch
    );

    expect(snapshot).toEqual(
      expect.objectContaining({
        bid: 0.9997,
        ask: 0.9998,
        latestPrice: 0.9998,
        quoteVolume24h: 18578171.4457
      })
    );
  });

  it("fetches and normalizes HTX REST fallback snapshots", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          ts: 1773474819135,
          tick: {
            close: 0.9996,
            vol: 2932682.55317215,
            bid: [0.9996, 69161.5157],
            ask: [0.9997, 169319.1034]
          }
        }),
        { status: 200 }
      )
    );

    const snapshot = await fetchVenueRestSnapshot(
      createSource({
        venue: "HTX",
        marketSymbol: "uusdt",
        websocketUrl: "wss://api-aws.huobi.pro/ws",
        restUrl: "https://api.huobi.pro"
      }),
      fetchImpl as typeof fetch
    );

    expect(snapshot).toEqual(
      expect.objectContaining({
        bid: 0.9996,
        ask: 0.9997,
        latestPrice: 0.9996,
        quoteVolume24h: 2932682.55317215
      })
    );
  });
});

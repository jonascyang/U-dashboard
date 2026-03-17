import { describe, expect, it } from "vitest";

import {
  applyBinanceBookTicker,
  applyBinanceTicker,
  applyHtxBbo,
  applyHtxDetail,
  applyLBankDepth,
  applyLBankTick,
  buildBinanceStreams,
  buildHtxSubscriptions,
  buildLBankSubscriptions,
  buildPancakeSubscriptions
} from "@/server/u-monitor/connectors";

describe("u-monitor connectors", () => {
  it("builds websocket subscriptions for all venues", () => {
    expect(buildBinanceStreams("UUSDT")).toEqual(["uusdt@bookTicker", "uusdt@ticker"]);
    expect(buildLBankSubscriptions("u_usdt")).toEqual([
      { action: "subscribe", subscribe: "tick", pair: "u_usdt" },
      { action: "subscribe", subscribe: "depth", pair: "u_usdt", depth: "10" }
    ]);
    expect(buildHtxSubscriptions("uusdt")).toEqual([
      { sub: "market.uusdt.detail", id: "uusdt-detail" },
      { sub: "market.uusdt.bbo", id: "uusdt-bbo" }
    ]);
    expect(buildPancakeSubscriptions("0xa0909f81785f87f3e79309f0e73a7d82208094e4")).toEqual([
      { method: "eth_subscribe", params: ["newHeads"] },
      {
        method: "eth_subscribe",
        params: ["logs", { address: "0xa0909f81785f87f3e79309f0e73a7d82208094e4" }]
      }
    ]);
  });

  it("normalizes binance book ticker and ticker payloads", () => {
    const fromBook = applyBinanceBookTicker({
      E: 1672515782136,
      s: "UUSDT",
      b: "0.9998",
      a: "1.0000"
    });
    const snapshot = applyBinanceTicker(fromBook, {
      E: 1672515782137,
      s: "UUSDT",
      c: "0.9999",
      q: "25650000"
    });

    expect(snapshot.bid).toBe(0.9998);
    expect(snapshot.ask).toBe(1);
    expect(snapshot.latestPrice).toBe(0.9999);
    expect(snapshot.quoteVolume24h).toBe(25_650_000);
  });

  it("normalizes lbank tick and depth payloads", () => {
    const fromTick = applyLBankTick({
      pair: "u_usdt",
      tick: {
        latest: "0.9999",
        turnover: "5400000"
      },
      TS: "2019-06-28T17:49:22.722"
    });
    const snapshot = applyLBankDepth(fromTick, {
      pair: "u_usdt",
      depth: {
        bids: [["0.9998", "1000"]],
        asks: [["1.0000", "1200"]]
      },
      TS: "2019-06-28T17:49:22.722"
    });

    expect(snapshot.latestPrice).toBe(0.9999);
    expect(snapshot.bid).toBe(0.9998);
    expect(snapshot.ask).toBe(1);
    expect(snapshot.quoteVolume24h).toBe(5_400_000);
  });

  it("normalizes htx detail and bbo payloads", () => {
    const fromDetail = applyHtxDetail({
      ch: "market.uusdt.detail",
      ts: 1672515782136,
      tick: {
        close: 0.9999,
        vol: 470000
      }
    });
    const snapshot = applyHtxBbo(fromDetail, {
      ch: "market.uusdt.bbo",
      ts: 1672515783136,
      tick: {
        bid: [0.9998, 3000],
        ask: [1.0, 2500]
      }
    });

    expect(snapshot.latestPrice).toBe(0.9999);
    expect(snapshot.bid).toBe(0.9998);
    expect(snapshot.ask).toBe(1);
    expect(snapshot.quoteVolume24h).toBe(470_000);
  });

  it("normalizes htx bbo payloads when bid and ask are scalar prices", () => {
    const fromDetail = applyHtxDetail({
      ch: "market.uusdt.detail",
      ts: 1672515782136,
      tick: {
        close: 0.9999,
        vol: 470000
      }
    });
    const snapshot = applyHtxBbo(fromDetail, {
      ch: "market.uusdt.bbo",
      ts: 1672515783136,
      tick: {
        bid: 0.9996,
        ask: 0.9997
      }
    } as never);

    expect(snapshot.bid).toBe(0.9996);
    expect(snapshot.ask).toBe(0.9997);
    expect(snapshot.quoteVolume24h).toBe(470_000);
  });
});

import { describe, expect, it, vi } from "vitest";
import { gzipSync } from "node:zlib";

import { UMonitorVenueAgent } from "@/server/u-monitor/agent";
import { uMonitorSources } from "@/server/u-monitor/registry";

class FakeSocket {
  sent: string[] = [];
  listeners = new Map<string, Array<(event?: MessageEvent) => void>>();

  addEventListener(type: string, handler: (event?: MessageEvent) => void) {
    this.listeners.set(type, [...(this.listeners.get(type) ?? []), handler]);
  }

  send(payload: string) {
    this.sent.push(payload);
  }

  close() {}

  emit(type: string, data?: unknown) {
    for (const handler of this.listeners.get(type) ?? []) {
      handler(data !== undefined ? ({ data } as MessageEvent) : undefined);
    }
  }
}

describe("UMonitorVenueAgent", () => {
  it("subscribes to binance streams and emits normalized snapshots", () => {
    const socket = new FakeSocket();
    const snapshots: Array<Record<string, unknown>> = [];
    const agent = new UMonitorVenueAgent(uMonitorSources[0], {
      createSocket: () => socket as unknown as WebSocket,
      onSnapshot: (snapshot) => snapshots.push(snapshot)
    });

    agent.start();
    socket.emit("open");
    socket.emit("message", JSON.stringify({ E: 1672515782136, s: "UUSDT", b: "0.9998", a: "1.0000" }));
    socket.emit("message", JSON.stringify({ E: 1672515782137, s: "UUSDT", c: "0.9999", q: "25650000" }));

    expect(socket.sent).toEqual([JSON.stringify({ method: "SUBSCRIBE", params: ["uusdt@bookTicker", "uusdt@ticker"], id: 1 })]);
    expect(snapshots.at(-1)).toEqual(
      expect.objectContaining({
        venue: "Binance",
        pair: "U/USDT",
        latestPrice: 0.9999,
        quoteVolume24h: 25_650_000
      })
    );
  });

  it("responds to lbank ping and keeps parsing tick/depth payloads", () => {
    const socket = new FakeSocket();
    const snapshots: Array<Record<string, unknown>> = [];
    const agent = new UMonitorVenueAgent(uMonitorSources[1], {
      createSocket: () => socket as unknown as WebSocket,
      onSnapshot: (snapshot) => snapshots.push(snapshot)
    });

    agent.start();
    socket.emit("open");
    socket.emit("message", JSON.stringify({ action: "ping", ping: "heartbeat-1" }));
    socket.emit(
      "message",
      JSON.stringify({
        pair: "u_usdt",
        tick: { latest: "0.9999", turnover: "5400000" },
        TS: "2019-06-28T17:49:22.722"
      })
    );
    socket.emit(
      "message",
      JSON.stringify({
        pair: "u_usdt",
        depth: { bids: [["0.9998", "1000"]], asks: [["1.0000", "1200"]] },
        TS: "2019-06-28T17:49:22.722"
      })
    );

    expect(socket.sent[0]).toContain("\"subscribe\":\"tick\"");
    expect(socket.sent[1]).toContain("\"subscribe\":\"depth\"");
    expect(socket.sent[2]).toBe(JSON.stringify({ action: "pong", pong: "heartbeat-1" }));
    expect(snapshots.at(-1)).toEqual(expect.objectContaining({ latestPrice: 0.9999, bid: 0.9998, ask: 1 }));
  });

  it("handles htx gzip payloads and responds to heartbeat", () => {
    const socket = new FakeSocket();
    const snapshots: Array<Record<string, unknown>> = [];
    const agent = new UMonitorVenueAgent(uMonitorSources[2], {
      createSocket: () => socket as unknown as WebSocket,
      onSnapshot: (snapshot) => snapshots.push(snapshot)
    });

    agent.start();
    socket.emit("open");
    socket.emit("message", gzipSync(JSON.stringify({ ping: 18212558000 })));
    socket.emit(
      "message",
      gzipSync(JSON.stringify({ ch: "market.uusdt.detail", ts: 1672515782136, tick: { close: 0.9999, vol: 470000 } }))
    );
    socket.emit(
      "message",
      gzipSync(
        JSON.stringify({
          ch: "market.uusdt.bbo",
          ts: 1672515783136,
          tick: { bid: [0.9998, 3000], ask: [1.0, 2500] }
        })
      )
    );

    expect(socket.sent[0]).toContain("\"sub\":\"market.uusdt.detail\"");
    expect(socket.sent[1]).toContain("\"sub\":\"market.uusdt.bbo\"");
    expect(socket.sent[2]).toBe(JSON.stringify({ pong: 18212558000 }));
    expect(snapshots.at(-1)).toEqual(expect.objectContaining({ latestPrice: 0.9999, bid: 0.9998, ask: 1 }));
  });

  it("refreshes pancake pool price on rpc subscription events", async () => {
    const socket = new FakeSocket();
    const snapshots: Array<Record<string, unknown>> = [];
    const agent = new UMonitorVenueAgent(uMonitorSources[3], {
      createSocket: () => socket as unknown as WebSocket,
      fetchPancakeSnapshot: async () => ({
        latestPrice: 0.9997,
        quoteVolume24h: 275670,
        updatedAt: "2026-03-13T08:05:00.000Z"
      }),
      onSnapshot: (snapshot) => snapshots.push(snapshot)
    });

    agent.start();
    socket.emit("open");
    socket.emit(
      "message",
      JSON.stringify({
        method: "eth_subscription",
        params: { subscription: "0x1", result: { number: "0x1" } }
      })
    );

    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(socket.sent[0]).toContain("\"newHeads\"");
    expect(socket.sent[1]).toContain("\"logs\"");
    expect(snapshots.at(-1)).toEqual(expect.objectContaining({ venue: "PancakeSwap V3", latestPrice: 0.9997 }));
  });

  it("emits health changes and reconnects after close", async () => {
    vi.useFakeTimers();
    const sockets: FakeSocket[] = [];
    const health: string[] = [];
    const agent = new UMonitorVenueAgent(uMonitorSources[0], {
      createSocket: () => {
        const socket = new FakeSocket();
        sockets.push(socket);
        return socket as unknown as WebSocket;
      },
      reconnectDelayMs: 50,
      onHealthChange: (next) => health.push(next.status),
      onSnapshot: () => {}
    });

    agent.start();
    expect(health[0]).toBe("connecting");
    sockets[0].emit("open");
    expect(health).toContain("live");

    sockets[0].emit("close");
    expect(health.at(-1)).toBe("reconnecting");

    await vi.advanceTimersByTimeAsync(50);
    expect(sockets).toHaveLength(2);
    expect(health.at(-1)).toBe("connecting");

    agent.stop();
    vi.useRealTimers();
  });
});

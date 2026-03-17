import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { startUMonitorRuntime } from "@/server/u-monitor/runtime-bootstrap";
import { uMonitorRuntimeStore } from "@/server/u-monitor/runtime-store";

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

  emit(type: string, data?: string) {
    for (const handler of this.listeners.get(type) ?? []) {
      handler(data ? ({ data } as MessageEvent) : undefined);
    }
  }
}

describe("startUMonitorRuntime", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    uMonitorRuntimeStore.clear();
    vi.useRealTimers();
  });

  it("wires venue agents into the runtime store", () => {
    const sockets = new Map<string, FakeSocket>();
    const runtime = startUMonitorRuntime({
      venues: ["Binance"],
      createSocket: (url) => {
        const socket = new FakeSocket();
        sockets.set(url, socket);
        return socket as unknown as WebSocket;
      }
    });

    const socket = [...sockets.values()][0];
    socket.emit("open");
    socket.emit("message", JSON.stringify({ E: 1672515782136, s: "UUSDT", b: "0.9998", a: "1.0000" }));
    socket.emit("message", JSON.stringify({ E: 1672515782137, s: "UUSDT", c: "0.9999", q: "25650000" }));

    expect(uMonitorRuntimeStore.get("Binance")).toEqual(
      expect.objectContaining({
        latestPrice: 0.9999,
        quoteVolume24h: 25_650_000,
        status: "live"
      })
    );

    runtime.stop();
  });

  it("passes pancake fetcher through to the pancake venue agent", async () => {
    const sockets = new Map<string, FakeSocket>();
    const runtime = startUMonitorRuntime({
      venues: ["PancakeSwap V3"],
      createSocket: (url) => {
        const socket = new FakeSocket();
        sockets.set(url, socket);
        return socket as unknown as WebSocket;
      },
      fetchPancakeSnapshot: async () => ({
        latestPrice: 0.9997,
        quoteVolume24h: 275670,
        updatedAt: "2026-03-13T08:05:00.000Z"
      })
    });

    const socket = [...sockets.values()][0];
    socket.emit("open");
    socket.emit(
      "message",
      JSON.stringify({
        method: "eth_subscription",
        params: { subscription: "0x1", result: { number: "0x1" } }
      })
    );

    await vi.runAllTimersAsync();

    expect(uMonitorRuntimeStore.get("PancakeSwap V3")).toEqual(
      expect.objectContaining({
        latestPrice: 0.9997,
        quoteVolume24h: 275670,
        status: "live"
      })
    );

    runtime.stop();
  });

  it("builds a persistence payload and passes it to the persistence callback", async () => {
    const sockets = new Map<string, FakeSocket>();
    const persisted: Array<Record<string, unknown>> = [];
    const runtime = startUMonitorRuntime({
      venues: ["Binance"],
      createSocket: (url) => {
        const socket = new FakeSocket();
        sockets.set(url, socket);
        return socket as unknown as WebSocket;
      },
      persistDebounceMs: 50,
      persistSnapshot: async (payload) => {
        persisted.push(payload as Record<string, unknown>);
      }
    });

    const socket = [...sockets.values()][0];
    socket.emit("open");
    socket.emit("message", JSON.stringify({ E: 1672515782136, s: "UUSDT", b: "0.9998", a: "1.0000" }));
    socket.emit("message", JSON.stringify({ E: 1672515782137, s: "UUSDT", c: "0.9999", q: "25650000" }));

    await vi.advanceTimersByTimeAsync(60);

    expect(persisted.at(-1)).toEqual(
      expect.objectContaining({
        capturedAt: expect.any(String),
        weightedPrice: expect.objectContaining({
          weightedPrice: expect.any(Number),
          sourceCount: 4
        }),
        priceSources: expect.any(Array),
        supply: expect.objectContaining({
          chainId: 56
        })
      })
    );

    runtime.stop();
  });

  it("coalesces rapid updates into one persisted flush", async () => {
    const sockets = new Map<string, FakeSocket>();
    const persisted: Array<Record<string, unknown>> = [];
    const runtime = startUMonitorRuntime({
      venues: ["Binance"],
      createSocket: (url) => {
        const socket = new FakeSocket();
        sockets.set(url, socket);
        return socket as unknown as WebSocket;
      },
      persistDebounceMs: 100,
      persistSnapshot: async (payload) => {
        persisted.push(payload as Record<string, unknown>);
      }
    });

    const socket = [...sockets.values()][0];
    socket.emit("open");
    socket.emit("message", JSON.stringify({ E: 1672515782136, s: "UUSDT", b: "0.9998", a: "1.0000" }));
    socket.emit("message", JSON.stringify({ E: 1672515782137, s: "UUSDT", c: "0.9999", q: "25650000" }));
    socket.emit("message", JSON.stringify({ E: 1672515782237, s: "UUSDT", c: "1.0001", q: "26000000" }));

    await vi.advanceTimersByTimeAsync(99);
    expect(persisted).toHaveLength(0);

    await vi.advanceTimersByTimeAsync(1);
    expect(persisted).toHaveLength(1);
    expect(persisted[0]).toEqual(
      expect.objectContaining({
        weightedPrice: expect.objectContaining({
          weightedPrice: expect.any(Number)
        })
      })
    );

    runtime.stop();
  });

  it("tracks venue and persistence health in the runtime store", async () => {
    const sockets = new Map<string, FakeSocket>();
    const runtime = startUMonitorRuntime({
      venues: ["Binance"],
      createSocket: (url) => {
        const socket = new FakeSocket();
        sockets.set(url, socket);
        return socket as unknown as WebSocket;
      },
      persistDebounceMs: 10,
      persistSnapshot: async () => {}
    });

    const socket = [...sockets.values()][0];
    expect(uMonitorRuntimeStore.getVenueHealth("Binance")?.status).toBe("connecting");

    socket.emit("open");
    expect(uMonitorRuntimeStore.getVenueHealth("Binance")?.status).toBe("live");

    socket.emit("message", JSON.stringify({ E: 1672515782137, s: "UUSDT", c: "0.9999", q: "25650000" }));
    await vi.advanceTimersByTimeAsync(10);

    expect(uMonitorRuntimeStore.getPersistenceHealth()).toEqual(
      expect.objectContaining({
        status: "ok",
        lastSuccessAt: expect.any(String)
      })
    );

    runtime.stop();
  });
});

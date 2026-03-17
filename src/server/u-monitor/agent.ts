import { gunzipSync } from "node:zlib";

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
  buildPancakeSubscriptions,
  type UMonitorMarketSnapshot
} from "@/server/u-monitor/connectors";
import { readPancakeV3PoolSnapshot } from "@/server/u-monitor/pancake";
import type { UMonitorSource } from "@/server/u-monitor/registry";

type AgentSnapshot = UMonitorMarketSnapshot & {
  venue: UMonitorSource["venue"];
  pair: UMonitorSource["pair"];
  sourceType: UMonitorSource["sourceType"];
  status: "live" | "stale";
};

type AgentOptions = {
  createSocket?: (url: string) => WebSocket;
  fetchPancakeSnapshot?: (poolAddress: string) => Promise<UMonitorMarketSnapshot | null>;
  reconnectDelayMs?: number;
  onHealthChange?: (health: {
    status: "connecting" | "live" | "reconnecting" | "stopped" | "error";
    updatedAt: string;
    detail?: string;
  }) => void;
  onSnapshot: (snapshot: AgentSnapshot) => void;
};

export class UMonitorVenueAgent {
  private socket: WebSocket | null = null;
  private current: Partial<UMonitorMarketSnapshot> | undefined;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private stopped = false;

  constructor(
    private readonly source: UMonitorSource,
    private readonly options: AgentOptions
  ) {}

  start() {
    this.stopped = false;
    this.emitHealth("connecting");
    this.connect();
  }

  private connect() {
    const createSocket = this.options.createSocket ?? ((url: string) => new WebSocket(url));
    this.socket = createSocket(this.source.websocketUrl);
    this.socket.addEventListener("open", () => {
      this.emitHealth("live");
      for (const payload of this.buildSubscriptionPayloads()) {
        this.socket?.send(JSON.stringify(payload));
      }
    });
    this.socket.addEventListener("message", (event) => {
      void this.handleMessage(event.data);
    });
    this.socket.addEventListener("error", () => {
      this.emitHealth("error");
    });
    this.socket.addEventListener("close", () => {
      if (this.stopped) return;
      this.emitHealth("reconnecting");
      this.scheduleReconnect();
    });
  }

  stop() {
    this.stopped = true;
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    this.socket?.close();
    this.socket = null;
    this.emitHealth("stopped");
  }

  private buildSubscriptionPayloads() {
    switch (this.source.venue) {
      case "Binance":
        return [{ method: "SUBSCRIBE", params: buildBinanceStreams(this.source.marketSymbol), id: 1 }];
      case "LBank":
        return buildLBankSubscriptions(this.source.marketSymbol);
      case "HTX":
        return buildHtxSubscriptions(this.source.marketSymbol);
      case "PancakeSwap V3":
        return buildPancakeSubscriptions(this.source.marketSymbol).map((payload, index) => ({ ...payload, id: index + 1 }));
    }
  }

  private async handleMessage(rawData: unknown) {
    const payload = this.decodePayload(rawData);
    if (!payload) return;

    switch (this.source.venue) {
      case "Binance":
        this.emitSnapshot(this.parseBinancePayload(payload));
        return;
      case "LBank":
        if ("action" in payload && payload.action === "ping") {
          this.socket?.send(JSON.stringify({ action: "pong", pong: payload.ping }));
          return;
        }
        this.emitSnapshot(this.parseLBankPayload(payload));
        return;
      case "HTX":
        if ("ping" in payload) {
          this.socket?.send(JSON.stringify({ pong: payload.ping }));
          return;
        }
        this.emitSnapshot(this.parseHtxPayload(payload));
        return;
      case "PancakeSwap V3":
        if ("method" in payload && payload.method === "eth_subscription") {
          const next = await this.refreshPancakeSnapshot();
          this.emitSnapshot(next);
        }
        return;
    }
  }

  private emitSnapshot(next: UMonitorMarketSnapshot | null) {
    if (!next) return;
    const quoteVolume24h = next.quoteVolume24h ?? this.current?.quoteVolume24h ?? this.source.fallbackQuoteVolume24h;
    this.current = {
      ...this.current,
      ...next,
      updatedAt: next.updatedAt ?? this.current?.updatedAt ?? new Date(0).toISOString(),
      quoteVolume24h
    };
    const snapshot: AgentSnapshot = {
      ...this.current,
      updatedAt: this.current.updatedAt ?? new Date(0).toISOString(),
      venue: this.source.venue,
      pair: this.source.pair,
      sourceType: this.source.sourceType,
      status: "live"
    };
    this.options.onSnapshot(snapshot);
  }

  private parseBinancePayload(payload: Record<string, unknown>) {
    if ("b" in payload && "a" in payload) return applyBinanceBookTicker(payload as never);
    if ("c" in payload && "q" in payload) return applyBinanceTicker(this.current, payload as never);
    return null;
  }

  private parseLBankPayload(payload: Record<string, unknown>) {
    if ("tick" in payload && payload.tick && typeof payload.tick === "object" && "latest" in payload.tick) {
      return applyLBankTick(payload as never);
    }
    if ("depth" in payload) return applyLBankDepth(this.current, payload as never);
    return null;
  }

  private parseHtxPayload(payload: Record<string, unknown>) {
    if (typeof payload.ch === "string" && payload.ch.endsWith(".detail")) return applyHtxDetail(payload as never);
    if (typeof payload.ch === "string" && payload.ch.endsWith(".bbo")) return applyHtxBbo(this.current, payload as never);
    return null;
  }

  private decodePayload(rawData: unknown): Record<string, unknown> | null {
    if (typeof rawData === "string") {
      return JSON.parse(rawData);
    }

    if (Buffer.isBuffer(rawData)) {
      const text = this.source.venue === "HTX" ? gunzipSync(rawData).toString("utf8") : rawData.toString("utf8");
      return JSON.parse(text);
    }

    if (rawData instanceof ArrayBuffer) {
      return this.decodePayload(Buffer.from(rawData));
    }

    if (ArrayBuffer.isView(rawData)) {
      return this.decodePayload(Buffer.from(rawData.buffer, rawData.byteOffset, rawData.byteLength));
    }

    return null;
  }

  private async refreshPancakeSnapshot() {
    if (this.options.fetchPancakeSnapshot) {
      return this.options.fetchPancakeSnapshot(this.source.marketSymbol);
    }

    const rpcUrl = process.env.U_MONITOR_BSC_RPC_URL;
    if (!rpcUrl) return null;
    return readPancakeV3PoolSnapshot(rpcUrl, {
      poolAddress: this.source.marketSymbol,
      baseTokenAddress: "0xcE24439F2D9C6a2289F741120FE202248B666666",
      quoteVolume24h: this.current?.quoteVolume24h
    });
  }

  private scheduleReconnect() {
    if (this.reconnectTimer) return;
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      if (this.stopped) return;
      this.emitHealth("connecting");
      this.connect();
    }, this.options.reconnectDelayMs ?? 1000);
  }

  private emitHealth(
    status: "connecting" | "live" | "reconnecting" | "stopped" | "error",
    detail?: string
  ) {
    this.options.onHealthChange?.({
      status,
      updatedAt: new Date().toISOString(),
      detail
    });
  }
}

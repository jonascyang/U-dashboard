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
import { U_MONITOR_CONTRACT_ADDRESS, uMonitorSources } from "@/server/u-monitor/registry";
import type { WorkerEnv } from "@worker/types";

import type { VenueAgentQueueMessage, VenueAgentSocket, VenueAgentSource } from "./venue-agent-types";

type VenueAgentRuntimeOptions = {
  source: VenueAgentSource;
  queue: { send: (message: VenueAgentQueueMessage) => Promise<void> | void };
  socket?: VenueAgentSocket;
  fetchPancakeSnapshot?: (poolAddress: string) => Promise<UMonitorMarketSnapshot | null>;
  fetchRestSnapshot?: (source: VenueAgentSource) => Promise<UMonitorMarketSnapshot | null>;
  rpcHttpUrl?: string;
  onSnapshotEmitted?: (snapshot: VenueAgentQueueMessage) => void;
};

type DurableObjectStateLike = {
  storage?: {
    put?: (key: string, value: unknown) => Promise<void>;
    get?: <T = unknown>(key: string) => Promise<T | undefined>;
  };
};

export function buildVenueAgentSubscriptions(source: VenueAgentSource) {
  switch (source.venue) {
    case "Binance":
      return [{ method: "SUBSCRIBE", params: buildBinanceStreams(source.marketSymbol), id: 1 }];
    case "LBank":
      return buildLBankSubscriptions(source.marketSymbol);
    case "HTX":
      return buildHtxSubscriptions(source.marketSymbol);
    case "PancakeSwap V3":
      return buildPancakeSubscriptions(source.marketSymbol).map((payload, index) => ({ ...payload, id: index + 1 }));
  }
}

export function createVenueAgentRuntime(options: VenueAgentRuntimeOptions) {
  let current: Partial<UMonitorMarketSnapshot> | undefined;

  async function handleMessage(rawData: unknown) {
    const payload = await decodePayload(options.source.venue, rawData);
    if (!payload) return;

    switch (options.source.venue) {
      case "Binance":
        await emitSnapshot(parseBinancePayload(payload));
        return;
      case "LBank":
        if ("action" in payload && payload.action === "ping") {
          options.socket?.send(JSON.stringify({ action: "pong", pong: payload.ping }));
          return;
        }
        await emitSnapshot(parseLBankPayload(payload));
        return;
      case "HTX":
        if ("ping" in payload) {
          options.socket?.send(JSON.stringify({ pong: payload.ping }));
          return;
        }
        await emitSnapshot(parseHtxPayload(payload));
        return;
      case "PancakeSwap V3":
        if ("method" in payload && payload.method === "eth_subscription") {
          const next =
            (await options.fetchPancakeSnapshot?.(options.source.marketSymbol)) ??
            (await readPancakeSnapshotFromRpc(options.source.marketSymbol, options.rpcHttpUrl));
          await emitSnapshot(next);
        }
    }
  }

  async function emitSnapshot(next: UMonitorMarketSnapshot | null) {
    if (!next) return;
    const quoteVolume24h = next.quoteVolume24h ?? current?.quoteVolume24h ?? options.source.fallbackQuoteVolume24h;
    current = {
      ...current,
      ...next,
      quoteVolume24h,
      updatedAt: next.updatedAt
    };
    if (current.latestPrice == null || current.quoteVolume24h == null) {
      return;
    }
    await options.queue.send({
      bid: current.bid,
      ask: current.ask,
      latestPrice: current.latestPrice,
      quoteVolume24h: current.quoteVolume24h,
      updatedAt: current.updatedAt ?? next.updatedAt,
      venue: options.source.venue,
      pair: options.source.pair,
      sourceType: options.source.sourceType,
      status: "live"
    });
    options.onSnapshotEmitted?.({
      bid: current.bid,
      ask: current.ask,
      latestPrice: current.latestPrice,
      quoteVolume24h: current.quoteVolume24h,
      updatedAt: current.updatedAt ?? next.updatedAt,
      venue: options.source.venue,
      pair: options.source.pair,
      sourceType: options.source.sourceType,
      status: "live"
    });
  }

  function parseBinancePayload(payload: Record<string, unknown>) {
    if ("b" in payload && "a" in payload) return applyBinanceBookTicker(payload as never);
    if ("c" in payload && "q" in payload) return applyBinanceTicker(current, payload as never);
    return null;
  }

  function parseLBankPayload(payload: Record<string, unknown>) {
    if ("tick" in payload && payload.tick && typeof payload.tick === "object" && "latest" in payload.tick) {
      return applyLBankTick(payload as never);
    }
    if ("depth" in payload) return applyLBankDepth(current, payload as never);
    return null;
  }

  function parseHtxPayload(payload: Record<string, unknown>) {
    if (typeof payload.ch === "string" && payload.ch.endsWith(".detail")) return applyHtxDetail(payload as never);
    if (typeof payload.ch === "string" && payload.ch.endsWith(".bbo")) return applyHtxBbo(current, payload as never);
    return null;
  }

  return {
    source: options.source,
    handleMessage,
    refreshFromRest: async () => {
      if (!options.fetchRestSnapshot) return;
      await emitSnapshot(await options.fetchRestSnapshot(options.source));
    }
  };
}

async function decodePayload(venue: VenueAgentSource["venue"], rawData: unknown): Promise<Record<string, unknown> | null> {
  if (typeof rawData === "string") {
    return JSON.parse(rawData);
  }
  if (rawData instanceof ArrayBuffer) {
    const text = await decodeBytes(venue, new Uint8Array(rawData));
    return JSON.parse(text);
  }
  if (ArrayBuffer.isView(rawData)) {
    const text = await decodeBytes(venue, new Uint8Array(rawData.buffer, rawData.byteOffset, rawData.byteLength));
    return JSON.parse(text);
  }
  return null;
}

async function decodeBytes(venue: VenueAgentSource["venue"], bytes: Uint8Array) {
  if (venue !== "HTX") {
    return new TextDecoder().decode(bytes);
  }

  const arrayBuffer = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;
  const decompressed = new Response(new Blob([arrayBuffer]).stream().pipeThrough(new DecompressionStream("gzip")));
  return decompressed.text();
}

async function readPancakeSnapshotFromRpc(poolAddress: string, rpcHttpUrl?: string) {
  const rpcUrl = rpcHttpUrl;
  if (!rpcUrl) return null;

  return readPancakeV3PoolSnapshot(rpcUrl, {
    poolAddress,
    baseTokenAddress: U_MONITOR_CONTRACT_ADDRESS
  });
}

class BaseVenueMonitor {
  protected runtime;
  protected socket: WebSocket | null = null;
  protected hasLoggedFirstMessage = false;
  protected hasLoggedFirstSnapshot = false;
  protected restPollTimer: ReturnType<typeof setInterval> | null = null;

  constructor(
    protected readonly state: DurableObjectStateLike,
    protected readonly env: WorkerEnv,
    source: VenueAgentSource
  ) {
    this.runtime = createVenueAgentRuntime({
      source,
      queue: env.U_MONITOR_EVENTS ?? { send: async () => undefined },
      fetchRestSnapshot: (nextSource) => fetchVenueRestSnapshot(nextSource),
      rpcHttpUrl: env.U_MONITOR_BSC_HTTP_URL,
      onSnapshotEmitted: (snapshot) => {
        if (this.hasLoggedFirstSnapshot) return;
        this.hasLoggedFirstSnapshot = true;
        console.warn(`[u-monitor:${source.venue}] first snapshot ${JSON.stringify(snapshot)}`);
      }
    });
  }

  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);

    if (request.method === "POST" && url.pathname === "/start") {
      this.ensureSocket();
      this.ensureRestPoll();
      void this.runtime.refreshFromRest?.();
      return Response.json({ ok: true, started: true, venue: this.runtime.source.venue });
    }

    if (request.method === "POST") {
      const body = await request.text();
      await this.runtime.handleMessage(body);
      return Response.json({ ok: true });
    }

    return Response.json({
      venue: this.runtime.source.venue,
      pair: this.runtime.source.pair,
      subscriptions: buildVenueAgentSubscriptions(this.runtime.source)
    });
  }

  protected ensureSocket() {
    if (this.socket && (this.socket.readyState === WebSocket.OPEN || this.socket.readyState === WebSocket.CONNECTING)) {
      return;
    }

    const websocketUrl =
      this.runtime.source.venue === "PancakeSwap V3" ? this.env.U_MONITOR_BSC_WS_URL ?? this.runtime.source.websocketUrl : this.runtime.source.websocketUrl;

    this.socket = new WebSocket(websocketUrl);
    this.socket.addEventListener("open", () => {
      this.hasLoggedFirstMessage = false;
      this.hasLoggedFirstSnapshot = false;
      console.warn(`[u-monitor:${this.runtime.source.venue}] socket open ${websocketUrl}`);
      for (const payload of buildVenueAgentSubscriptions(this.runtime.source)) {
        this.socket?.send(JSON.stringify(payload));
      }
    });
    this.socket.addEventListener("message", (event) => {
      if (!this.hasLoggedFirstMessage) {
        this.hasLoggedFirstMessage = true;
        const raw = typeof event.data === "string" ? event.data : `[binary:${event.data?.constructor?.name ?? "unknown"}]`;
        console.warn(`[u-monitor:${this.runtime.source.venue}] first message ${raw.slice(0, 300)}`);
      }
      void this.runtime.handleMessage(event.data);
    });
    this.socket.addEventListener("close", (event) => {
      console.warn(
        `[u-monitor:${this.runtime.source.venue}] socket close code=${"code" in event ? event.code : "unknown"} reason=${"reason" in event ? event.reason : ""}`
      );
      this.socket = null;
    });
    this.socket.addEventListener("error", (event) => {
      console.error(`[u-monitor:${this.runtime.source.venue}] socket error`, JSON.stringify(event));
      this.socket = null;
    });
  }

  protected ensureRestPoll() {
    if (!this.runtime.source.restUrl || this.restPollTimer) return;

    this.restPollTimer = setInterval(() => {
      void this.runtime.refreshFromRest?.();
    }, 30_000);
  }
}

export class BinanceUMonitor extends BaseVenueMonitor {
  constructor(state: DurableObjectStateLike, env: WorkerEnv) {
    super(state, env, mustFindSource("Binance"));
  }
}

export class LBankUMonitor extends BaseVenueMonitor {
  constructor(state: DurableObjectStateLike, env: WorkerEnv) {
    super(state, env, mustFindSource("LBank"));
  }
}

export class HtxUMonitor extends BaseVenueMonitor {
  constructor(state: DurableObjectStateLike, env: WorkerEnv) {
    super(state, env, mustFindSource("HTX"));
  }
}

export class PancakeUMonitor extends BaseVenueMonitor {
  constructor(state: DurableObjectStateLike, env: WorkerEnv) {
    super(state, env, mustFindSource("PancakeSwap V3"));
  }
}

function mustFindSource(venue: VenueAgentSource["venue"]): VenueAgentSource {
  const source = uMonitorSources.find((candidate) => candidate.venue === venue);
  if (!source) {
    throw new Error(`Missing source for ${venue}`);
  }
  return source;
}

export async function fetchVenueRestSnapshot(source: VenueAgentSource, fetchImpl: typeof fetch = fetch) {
  if (!source.restUrl) return null;

  switch (source.venue) {
    case "Binance": {
      const [bookTickerResponse, tickerResponse] = await Promise.all([
        fetchImpl(`${source.restUrl}/api/v3/ticker/bookTicker?symbol=${source.marketSymbol}`),
        fetchImpl(`${source.restUrl}/api/v3/ticker/24hr?symbol=${source.marketSymbol}`)
      ]);
      if (!bookTickerResponse.ok || !tickerResponse.ok) return null;

      const [bookTicker, ticker] = await Promise.all([bookTickerResponse.json(), tickerResponse.json()]) as [
        { bidPrice: string; askPrice: string },
        { lastPrice: string; quoteVolume: string; closeTime: number }
      ];

      return {
        bid: Number(bookTicker.bidPrice),
        ask: Number(bookTicker.askPrice),
        latestPrice: Number(ticker.lastPrice),
        quoteVolume24h: Number(ticker.quoteVolume),
        updatedAt: new Date(ticker.closeTime).toISOString()
      };
    }
    case "HTX": {
      const response = await fetchImpl(`${source.restUrl}/market/detail/merged?symbol=${source.marketSymbol}`);
      if (!response.ok) return null;

      const payload = (await response.json()) as {
        ts: number;
        tick: {
          close: number;
          vol: number;
          bid: [number, number];
          ask: [number, number];
        };
      };

      return {
        bid: payload.tick.bid[0],
        ask: payload.tick.ask[0],
        latestPrice: payload.tick.close,
        quoteVolume24h: payload.tick.vol,
        updatedAt: new Date(payload.ts).toISOString()
      };
    }
    default:
      return null;
  }
}

export type { VenueAgentSource } from "./venue-agent-types";

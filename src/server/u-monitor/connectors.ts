export type UMonitorMarketSnapshot = {
  bid?: number;
  ask?: number;
  latestPrice?: number;
  quoteVolume24h?: number;
  updatedAt: string;
};

type BinanceBookTickerPayload = {
  E: number;
  s: string;
  b: string;
  a: string;
};

type BinanceTickerPayload = {
  E: number;
  s: string;
  c: string;
  q: string;
};

type LBankTickPayload = {
  pair: string;
  tick: {
    latest: string;
    turnover: string;
  };
  ts?: string;
  TS?: string;
};

type LBankDepthPayload = {
  pair: string;
  depth: {
    bids: [string, string][];
    asks: [string, string][];
  };
  ts?: string;
  TS?: string;
};

type HtxDetailPayload = {
  ch: string;
  ts: number;
  tick: {
    close: number;
    vol: number;
  };
};

type HtxBboPayload = {
  ch: string;
  ts: number;
  tick: {
    bid: number | [number, number];
    ask: number | [number, number];
  };
};

function extractTopOfBookPrice(value: number | [number, number]) {
  return Array.isArray(value) ? value[0] : value;
}

function mergeSnapshot(
  current: Partial<UMonitorMarketSnapshot> | undefined,
  patch: Partial<UMonitorMarketSnapshot> & { updatedAt: string }
): UMonitorMarketSnapshot {
  return {
    ...current,
    ...patch,
    updatedAt: patch.updatedAt
  };
}

function toIsoTimestamp(value: string | number | undefined) {
  if (typeof value === "number") return new Date(value).toISOString();
  if (!value) return new Date(0).toISOString();
  const numeric = Number(value);
  return Number.isFinite(numeric) && value.trim() !== "" ? new Date(numeric).toISOString() : new Date(value).toISOString();
}

export function buildBinanceStreams(symbol: string) {
  const lower = symbol.toLowerCase();
  return [`${lower}@bookTicker`, `${lower}@ticker`];
}

export function buildLBankSubscriptions(pair: string) {
  return [
    { action: "subscribe", subscribe: "tick", pair },
    { action: "subscribe", subscribe: "depth", pair, depth: "10" }
  ];
}

export function buildHtxSubscriptions(symbol: string) {
  return [
    { sub: `market.${symbol}.detail`, id: `${symbol}-detail` },
    { sub: `market.${symbol}.bbo`, id: `${symbol}-bbo` }
  ];
}

export function buildPancakeSubscriptions(poolAddress: string) {
  return [
    { method: "eth_subscribe", params: ["newHeads"] },
    { method: "eth_subscribe", params: ["logs", { address: poolAddress }] }
  ];
}

export function applyBinanceBookTicker(payload: BinanceBookTickerPayload): UMonitorMarketSnapshot {
  return {
    bid: Number(payload.b),
    ask: Number(payload.a),
    updatedAt: new Date(payload.E).toISOString()
  };
}

export function applyBinanceTicker(
  current: Partial<UMonitorMarketSnapshot> | undefined,
  payload: BinanceTickerPayload
): UMonitorMarketSnapshot {
  return mergeSnapshot(current, {
    latestPrice: Number(payload.c),
    quoteVolume24h: Number(payload.q),
    updatedAt: new Date(payload.E).toISOString()
  });
}

export function applyLBankTick(payload: LBankTickPayload): UMonitorMarketSnapshot {
  return {
    latestPrice: Number(payload.tick.latest),
    quoteVolume24h: Number(payload.tick.turnover),
    updatedAt: toIsoTimestamp(payload.ts ?? payload.TS)
  };
}

export function applyLBankDepth(
  current: Partial<UMonitorMarketSnapshot> | undefined,
  payload: LBankDepthPayload
): UMonitorMarketSnapshot {
  return mergeSnapshot(current, {
    bid: Number(payload.depth.bids[0]?.[0] ?? 0),
    ask: Number(payload.depth.asks[0]?.[0] ?? 0),
    updatedAt: toIsoTimestamp(payload.ts ?? payload.TS)
  });
}

export function applyHtxDetail(payload: HtxDetailPayload): UMonitorMarketSnapshot {
  return {
    latestPrice: payload.tick.close,
    quoteVolume24h: payload.tick.vol,
    updatedAt: new Date(payload.ts).toISOString()
  };
}

export function applyHtxBbo(
  current: Partial<UMonitorMarketSnapshot> | undefined,
  payload: HtxBboPayload
): UMonitorMarketSnapshot {
  return mergeSnapshot(current, {
    bid: extractTopOfBookPrice(payload.tick.bid),
    ask: extractTopOfBookPrice(payload.tick.ask),
    updatedAt: new Date(payload.ts).toISOString()
  });
}

export type D1RunResult = {
  success?: boolean;
  meta?: Record<string, unknown>;
};

export type D1AllResult<T> = {
  results: T[];
};

export type D1PreparedStatement = {
  bind: (...args: unknown[]) => D1PreparedStatement;
  run: () => Promise<D1RunResult>;
  first: <T = unknown>() => Promise<T | null>;
  all: <T = unknown>() => Promise<D1AllResult<T>>;
};

export type D1DatabaseLike = {
  prepare: (query: string) => D1PreparedStatement;
};

export type QueueLike = {
  send: (message: unknown) => Promise<void> | void;
};

export type DurableObjectNamespaceLike = {
  idFromName: (name: string) => unknown;
  get?: (id: unknown) => { fetch: (request: Request | string, init?: RequestInit) => Promise<Response> };
};

export type WorkerEnv = {
  DB: D1DatabaseLike;
  ETH_RPC_URL: string;
  ETH_CHAIN_ID?: string;
  LENDING_MARKET_ADDRESSES?: string;
  LENDING_MARKET_ADDRESSES_FILE?: string;
  U_MONITOR_BSC_CHAIN_ID?: string;
  U_MONITOR_BSC_HTTP_URL?: string;
  U_MONITOR_BSC_WS_URL?: string;
  U_MONITOR_API_TOKEN?: string;
  U_MONITOR_EVENTS?: QueueLike;
  U_MONITOR_EVENTS_DLQ?: QueueLike;
  BINANCE_U_MONITOR?: DurableObjectNamespaceLike;
  LBANK_U_MONITOR?: DurableObjectNamespaceLike;
  HTX_U_MONITOR?: DurableObjectNamespaceLike;
  PANCAKE_U_MONITOR?: DurableObjectNamespaceLike;
};

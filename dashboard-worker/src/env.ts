import type { WorkerEnv } from "@worker/types";

export function validateEnv(input: Partial<WorkerEnv>): WorkerEnv {
  if (!input.DB) {
    throw new Error("DB binding is required");
  }
  if (!input.ETH_RPC_URL) {
    throw new Error("ETH_RPC_URL is required");
  }

  return {
    DB: input.DB,
    ETH_RPC_URL: input.ETH_RPC_URL,
    ETH_CHAIN_ID: input.ETH_CHAIN_ID ?? "1",
    LENDING_MARKET_ADDRESSES: input.LENDING_MARKET_ADDRESSES ?? "",
    LENDING_MARKET_ADDRESSES_FILE: input.LENDING_MARKET_ADDRESSES_FILE,
    U_MONITOR_BSC_CHAIN_ID: input.U_MONITOR_BSC_CHAIN_ID ?? "56",
    U_MONITOR_BSC_HTTP_URL: input.U_MONITOR_BSC_HTTP_URL,
    U_MONITOR_BSC_WS_URL: input.U_MONITOR_BSC_WS_URL,
    U_MONITOR_API_TOKEN: input.U_MONITOR_API_TOKEN,
    U_MONITOR_EVENTS: input.U_MONITOR_EVENTS,
    U_MONITOR_EVENTS_DLQ: input.U_MONITOR_EVENTS_DLQ,
    BINANCE_U_MONITOR: input.BINANCE_U_MONITOR,
    LBANK_U_MONITOR: input.LBANK_U_MONITOR,
    HTX_U_MONITOR: input.HTX_U_MONITOR,
    PANCAKE_U_MONITOR: input.PANCAKE_U_MONITOR
  };
}

import { describe, expect, it, vi } from "vitest";

import { validateEnv } from "../../src/env";

describe("validateEnv", () => {
  it("requires DB binding and ETH_RPC_URL", () => {
    expect(() => validateEnv({})).toThrow("DB");
    expect(() => validateEnv({ DB: { prepare: vi.fn() } as any })).toThrow("ETH_RPC_URL");
  });

  it("returns normalized env", () => {
    const env = validateEnv({
      DB: { prepare: vi.fn() } as any,
      ETH_RPC_URL: "https://mainnet.infura.io/v3/example",
      U_MONITOR_BSC_HTTP_URL: "https://bnb-mainnet.g.alchemy.com/v2/example",
      U_MONITOR_BSC_WS_URL: "wss://bnb-mainnet.g.alchemy.com/v2/example",
      U_MONITOR_EVENTS: { send: vi.fn() } as any,
      U_MONITOR_EVENTS_DLQ: { send: vi.fn() } as any,
      BINANCE_U_MONITOR: { idFromName: vi.fn() } as any,
      LBANK_U_MONITOR: { idFromName: vi.fn() } as any,
      HTX_U_MONITOR: { idFromName: vi.fn() } as any,
      PANCAKE_U_MONITOR: { idFromName: vi.fn() } as any
    });

    expect(env.ETH_CHAIN_ID).toBe("1");
    expect(env.U_MONITOR_BSC_CHAIN_ID).toBe("56");
    expect(env.U_MONITOR_BSC_HTTP_URL).toContain("alchemy.com");
    expect(env.U_MONITOR_BSC_WS_URL).toContain("alchemy.com");
    expect(env.U_MONITOR_EVENTS).toBeTruthy();
    expect(env.U_MONITOR_EVENTS_DLQ).toBeTruthy();
    expect(env.BINANCE_U_MONITOR).toBeTruthy();
    expect(env.LBANK_U_MONITOR).toBeTruthy();
    expect(env.HTX_U_MONITOR).toBeTruthy();
    expect(env.PANCAKE_U_MONITOR).toBeTruthy();
  });
});

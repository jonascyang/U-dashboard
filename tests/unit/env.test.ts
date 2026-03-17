import { describe, expect, it } from "vitest";
import { loadDbEnv, loadEnv } from "@/lib/env";

describe("loadEnv", () => {
  it("throws when DATABASE_URL is missing", () => {
    expect(() => loadEnv({ REDIS_URL: "redis://localhost", ETH_RPC_URL: "http://localhost:8545" })).toThrow(
      "DATABASE_URL"
    );
  });

  it("throws when REDIS_URL is missing", () => {
    expect(() => loadEnv({ DATABASE_URL: "postgres://db", ETH_RPC_URL: "http://localhost:8545" })).toThrow(
      "REDIS_URL"
    );
  });

  it("throws when ETH_RPC_URL is missing", () => {
    expect(() => loadEnv({ DATABASE_URL: "postgres://db", REDIS_URL: "redis://localhost" })).toThrow("ETH_RPC_URL");
  });

  it("returns validated env values", () => {
    const env = loadEnv({
      DATABASE_URL: "postgres://db",
      REDIS_URL: "redis://localhost",
      ETH_RPC_URL: "http://localhost:8545"
    });

    expect(env.DATABASE_URL).toBe("postgres://db");
  });

  it("loads db env without redis/rpc", () => {
    const env = loadDbEnv({
      DATABASE_URL: "postgres://db"
    });
    expect(env.DATABASE_URL).toBe("postgres://db");
  });
});

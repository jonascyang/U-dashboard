import { describe, expect, it } from "vitest";

import { resolveUMonitorWorkerUrl, U_MONITOR_WORKER_FALLBACK_URL } from "@/server/u-monitor-config";

describe("u-monitor config", () => {
  it("returns the explicit worker url when provided", () => {
    expect(resolveUMonitorWorkerUrl("https://worker.example")).toBe("https://worker.example");
  });

  it("falls back to the deployed worker url when no env is available", () => {
    expect(resolveUMonitorWorkerUrl()).toBe(U_MONITOR_WORKER_FALLBACK_URL);
  });
});

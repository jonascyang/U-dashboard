import { describe, expect, it } from "vitest";

import { runHourlyCycle } from "@/workers/scheduler";

describe("runHourlyCycle", () => {
  it("runs ingest -> aggregate -> alerts in order for one hour window", async () => {
    const out = await runHourlyCycle(
      { hour: "2026-02-25T10:00:00.000Z" },
      {
        fetchLogs: async () => [],
        insertRawEvents: async () => 0,
        fetchEventsForHour: async () => [],
        upsertMarketMetrics: async () => 0,
        upsertProtocolMetrics: async () => undefined,
        fetchAlertInputs: async () => [],
        getExistingAlerts: async () => [],
        insertAlerts: async () => 0
      }
    );

    expect(out.steps).toEqual(["ingest", "aggregate", "alerts"]);
  });
});

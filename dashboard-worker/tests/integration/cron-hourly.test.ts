import { describe, expect, it, vi } from "vitest";

import { runHourlyPipeline } from "../../src/cron/hourly";

describe("runHourlyPipeline", () => {
  it("runs ingest -> aggregate -> alerts on scheduled event", async () => {
    const deps = {
      runIngestionStage: vi.fn().mockResolvedValue({ inserted: 1, updatedState: 1 }),
      runAggregationStage: vi.fn().mockResolvedValue({ marketRows: 1 }),
      runAlertsStage: vi.fn().mockResolvedValue({ proposed: 1, inserted: 1 })
    };

    const out = await runHourlyPipeline(
      {
        DB: {
          prepare: vi.fn()
        } as any,
        ETH_RPC_URL: "https://rpc.example"
      } as any,
      "2026-02-25T10:00:00.000Z",
      deps as any
    );

    expect(out.steps).toEqual(["ingest", "aggregate", "alerts"]);
    expect(deps.runIngestionStage).toHaveBeenCalled();
    expect(deps.runAggregationStage).toHaveBeenCalled();
    expect(deps.runAlertsStage).toHaveBeenCalled();
  });
});

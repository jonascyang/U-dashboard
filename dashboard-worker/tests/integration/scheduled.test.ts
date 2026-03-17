import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  runHourlyPipeline: vi.fn().mockResolvedValue({ steps: ["ingest", "aggregate", "alerts"] }),
  snapshotUMonitorSupply: vi.fn().mockResolvedValue({ written: true })
}));

vi.mock("../../src/cron/hourly", () => ({
  runHourlyPipeline: mocks.runHourlyPipeline
}));

vi.mock("../../src/services/u-monitor-scheduler.service", () => ({
  snapshotUMonitorSupply: mocks.snapshotUMonitorSupply
}));

describe("worker scheduled handler", () => {
  beforeEach(() => {
    mocks.runHourlyPipeline.mockClear();
    mocks.snapshotUMonitorSupply.mockClear();
  });

  it("does not run hourly jobs outside the top of the hour", async () => {
    const { default: worker } = await import("../../src/index");
    const waitUntil = vi.fn();

    await worker.scheduled(
      {
        scheduledTime: Date.parse("2026-03-15T10:15:00.000Z")
      } as any,
      {
        DB: { prepare: vi.fn() } as any,
        ETH_RPC_URL: "https://rpc.example"
      },
      { waitUntil } as any
    );

    expect(mocks.runHourlyPipeline).not.toHaveBeenCalled();
    expect(mocks.snapshotUMonitorSupply).not.toHaveBeenCalled();
    expect(waitUntil).not.toHaveBeenCalled();
  });

  it("runs hourly jobs at the top of the hour", async () => {
    const { default: worker } = await import("../../src/index");
    const waitUntil = vi.fn();

    await worker.scheduled(
      {
        scheduledTime: Date.parse("2026-03-15T11:00:00.000Z")
      } as any,
      {
        DB: { prepare: vi.fn() } as any,
        ETH_RPC_URL: "https://rpc.example"
      },
      { waitUntil } as any
    );

    expect(mocks.runHourlyPipeline).toHaveBeenCalledTimes(1);
    expect(mocks.snapshotUMonitorSupply).toHaveBeenCalledTimes(1);
    expect(waitUntil).toHaveBeenCalledTimes(2);
  });
});

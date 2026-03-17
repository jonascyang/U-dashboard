import { describe, expect, it, vi } from "vitest";

import { runMigrations } from "../../src/db/migrate";
import { INIT_SQL } from "../../src/db/schema.sql";

describe("d1 schema", () => {
  it("contains ingestion_state table", () => {
    expect(INIT_SQL).toContain("CREATE TABLE IF NOT EXISTS ingestion_state");
  });

  it("contains monitored_markets table", () => {
    expect(INIT_SQL).toContain("CREATE TABLE IF NOT EXISTS monitored_markets");
  });

  it("contains u-monitor tables", () => {
    expect(INIT_SQL).toContain("CREATE TABLE IF NOT EXISTS u_monitor_price_source_snapshots");
    expect(INIT_SQL).toContain("CREATE TABLE IF NOT EXISTS u_monitor_weighted_price_snapshots");
    expect(INIT_SQL).toContain("CREATE TABLE IF NOT EXISTS u_monitor_supply_snapshots");
  });
});

describe("runMigrations", () => {
  it("runs statements sequentially", async () => {
    const run = vi.fn().mockResolvedValue({ success: true });
    const prepare = vi.fn().mockReturnValue({ run });
    const count = await runMigrations({ prepare } as any);

    expect(count).toBeGreaterThan(1);
    expect(prepare).toHaveBeenCalled();
    expect(run).toHaveBeenCalled();
  });
});

import { describe, expect, it } from "vitest";

import { INIT_SQL } from "../../src/db/schema.sql";

describe("u-monitor schema", () => {
  it("defines the U monitor snapshot tables", () => {
    expect(INIT_SQL).toContain("CREATE TABLE IF NOT EXISTS u_monitor_price_source_snapshots");
    expect(INIT_SQL).toContain("CREATE TABLE IF NOT EXISTS u_monitor_weighted_price_snapshots");
    expect(INIT_SQL).toContain("CREATE TABLE IF NOT EXISTS u_monitor_supply_snapshots");
  });
});

import { describe, expect, it } from "vitest";

import { tables } from "@/db/schema";

describe("schema", () => {
  it("defines required tables", () => {
    expect(Object.keys(tables)).toEqual(
      expect.arrayContaining(["rawEvents", "metricHourlyMarket", "metricHourlyProtocol", "alerts"])
    );
  });
});

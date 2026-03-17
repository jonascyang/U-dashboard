import { describe, expect, it } from "vitest";

import { createMockD1 } from "../helpers/mock-d1";
import { listEnabledMarketAddresses } from "../../src/repositories/markets.repository";

describe("markets repository", () => {
  it("reads enabled addresses from monitored_markets", async () => {
    const { db, history } = createMockD1({
      all: () => [
        { marketAddress: "0x00000000000000000000000000000000000000Aa" },
        { marketAddress: "0x00000000000000000000000000000000000000bB" }
      ]
    });

    const addresses = await listEnabledMarketAddresses(db as any);

    expect(addresses).toEqual([
      "0x00000000000000000000000000000000000000aa",
      "0x00000000000000000000000000000000000000bb"
    ]);
    expect(history[0]?.query).toContain("FROM monitored_markets");
  });
});

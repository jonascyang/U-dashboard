import { describe, expect, it } from "vitest";

import { mapRawEventRowsToAggregateEvents } from "@/workers/aggregate/event-loader";

describe("mapRawEventRowsToAggregateEvents", () => {
  it("maps raw rows into aggregate event shape", () => {
    const events = mapRawEventRowsToAggregateEvents([
      {
        marketId: "eth-usdc",
        eventType: "Deposit",
        payloadJson: {
          user: "0xabc",
          amountUsd: 1234.5
        }
      }
    ]);

    expect(events).toEqual([
      {
        marketId: "eth-usdc",
        eventType: "Deposit",
        payloadJson: {
          user: "0xabc",
          amountUsd: 1234.5
        }
      }
    ]);
  });

  it("drops unknown event types and invalid amounts", () => {
    const events = mapRawEventRowsToAggregateEvents([
      {
        marketId: "eth-usdc",
        eventType: "UnknownEvent",
        payloadJson: { amountUsd: "bad" }
      }
    ]);

    expect(events).toEqual([]);
  });
});

import type { RawEvent } from "@/workers/aggregate/calculators";

type RawEventRow = {
  marketId: string;
  eventType: string;
  payloadJson: unknown;
};

const allowedEventTypes = new Set<RawEvent["eventType"]>(["Deposit", "Withdraw", "Borrow", "Repay", "Liquidation"]);

function asNumber(input: unknown): number | undefined {
  if (typeof input === "number" && Number.isFinite(input)) return input;
  if (typeof input === "string") {
    const parsed = Number(input);
    if (Number.isFinite(parsed)) return parsed;
  }
  return undefined;
}

export function mapRawEventRowsToAggregateEvents(rows: RawEventRow[]): RawEvent[] {
  return rows
    .filter((row): row is RawEventRow & { eventType: RawEvent["eventType"] } => allowedEventTypes.has(row.eventType as RawEvent["eventType"]))
    .map((row) => {
      const payload = (typeof row.payloadJson === "object" && row.payloadJson !== null ? row.payloadJson : {}) as Record<
        string,
        unknown
      >;
      const amountUsd = asNumber(payload.amountUsd);
      const user = typeof payload.user === "string" ? payload.user : undefined;

      return {
        marketId: row.marketId,
        eventType: row.eventType,
        payloadJson: {
          user,
          amountUsd
        }
      };
    });
}

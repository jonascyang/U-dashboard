import { computeMarketMetrics, computeProtocolMetrics, type RawEvent } from "@/workers/aggregate/calculators";

export type AggregateDeps = {
  upsertMarketMetrics: (hourTs: Date, metrics: ReturnType<typeof computeMarketMetrics>) => Promise<number>;
  upsertProtocolMetrics: (hourTs: Date, metric: ReturnType<typeof computeProtocolMetrics>) => Promise<void>;
};

export async function runAggregation(input: { hourTs: Date; events: RawEvent[] }, deps: AggregateDeps) {
  const marketMetrics = computeMarketMetrics(input.events);
  const protocolMetric = computeProtocolMetrics(input.events);

  const marketRows = await deps.upsertMarketMetrics(input.hourTs, marketMetrics);
  await deps.upsertProtocolMetrics(input.hourTs, protocolMetric);

  return {
    marketRows,
    protocolMetric
  };
}

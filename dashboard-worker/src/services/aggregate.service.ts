import { computeMarketMetrics, computeProtocolMetrics } from "@/workers/aggregate/calculators";

import {
  fetchRawEventsForWindow,
  upsertMarketMetrics,
  upsertProtocolMetric
} from "@worker/repositories/metrics.repository";
import type { D1DatabaseLike } from "@worker/types";

export async function runAggregationStage(
  db: D1DatabaseLike,
  hourTs: Date
): Promise<{ marketRows: number }> {
  const fromIso = new Date(hourTs.getTime() - 24 * 60 * 60 * 1000).toISOString();
  const toIso = new Date(hourTs.getTime() + 60 * 60 * 1000).toISOString();
  const events = await fetchRawEventsForWindow(db, fromIso, toIso);
  const marketMetrics = computeMarketMetrics(events);
  const protocolMetric = computeProtocolMetrics(events);

  const marketRows = await upsertMarketMetrics(db, hourTs.toISOString(), marketMetrics);
  await upsertProtocolMetric(db, hourTs.toISOString(), protocolMetric);
  return { marketRows };
}

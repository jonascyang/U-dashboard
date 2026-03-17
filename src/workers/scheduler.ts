import type { AlertMetricInput } from "@/workers/alerts/rules";
import { runAlerts } from "@/workers/alerts/runner";
import type { RawEvent } from "@/workers/aggregate/calculators";
import { runAggregation } from "@/workers/aggregate/runner";
import type { ChainLog } from "@/workers/ingest/decoder";
import { runIngestion } from "@/workers/ingest/runner";

export type HourlyCycleDeps = {
  fetchLogs: (hour: string) => Promise<ChainLog[]>;
  insertRawEvents: Parameters<typeof runIngestion>[1]["insertRawEvents"];
  fetchEventsForHour: (hour: string) => Promise<RawEvent[]>;
  upsertMarketMetrics: Parameters<typeof runAggregation>[1]["upsertMarketMetrics"];
  upsertProtocolMetrics: Parameters<typeof runAggregation>[1]["upsertProtocolMetrics"];
  fetchAlertInputs: (hour: string) => Promise<AlertMetricInput[]>;
  getExistingAlerts: Parameters<typeof runAlerts>[1]["getExistingAlerts"];
  insertAlerts: Parameters<typeof runAlerts>[1]["insertAlerts"];
};

export async function runHourlyCycle(input: { hour: string }, deps: HourlyCycleDeps) {
  const logs = await deps.fetchLogs(input.hour);
  await runIngestion({ logs }, { insertRawEvents: deps.insertRawEvents });

  const events = await deps.fetchEventsForHour(input.hour);
  await runAggregation({ hourTs: new Date(input.hour), events }, {
    upsertMarketMetrics: deps.upsertMarketMetrics,
    upsertProtocolMetrics: deps.upsertProtocolMetrics
  });

  const metrics = await deps.fetchAlertInputs(input.hour);
  await runAlerts({ hourTs: new Date(input.hour), metrics }, {
    getExistingAlerts: deps.getExistingAlerts,
    insertAlerts: deps.insertAlerts
  });

  return { steps: ["ingest", "aggregate", "alerts"] as const };
}

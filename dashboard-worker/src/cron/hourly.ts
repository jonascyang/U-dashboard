import { runAggregationStage } from "@worker/services/aggregate.service";
import { runAlertsStage } from "@worker/services/alerts.service";
import { runIngestionStage } from "@worker/services/ingestion.service";
import type { WorkerEnv } from "@worker/types";

export type HourlyPipelineDeps = {
  runIngestionStage: typeof runIngestionStage;
  runAggregationStage: typeof runAggregationStage;
  runAlertsStage: typeof runAlertsStage;
};

const defaultDeps: HourlyPipelineDeps = {
  runIngestionStage,
  runAggregationStage,
  runAlertsStage
};

export async function runHourlyPipeline(
  env: WorkerEnv,
  hourIso: string,
  deps: HourlyPipelineDeps = defaultDeps
): Promise<{ steps: ["ingest", "aggregate", "alerts"] }> {
  const hourTs = new Date(hourIso);
  await deps.runIngestionStage(env, hourTs);
  await deps.runAggregationStage(env.DB, hourTs);
  await deps.runAlertsStage(env.DB, hourTs);
  return {
    steps: ["ingest", "aggregate", "alerts"]
  };
}

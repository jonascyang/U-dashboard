import { applyDedup, type ExistingAlert } from "@/workers/alerts/dedup";
import { evaluateRules, type AlertMetricInput } from "@/workers/alerts/rules";

export type AlertRunnerDeps = {
  getExistingAlerts: () => Promise<ExistingAlert[]>;
  insertAlerts: (alerts: ReturnType<typeof evaluateRules>, hourTs: Date) => Promise<number>;
};

export async function runAlerts(input: { hourTs: Date; metrics: AlertMetricInput[] }, deps: AlertRunnerDeps) {
  const proposed = input.metrics.flatMap((metric) => evaluateRules(metric));
  const existing = await deps.getExistingAlerts();
  const deduped = applyDedup(proposed, existing, input.hourTs);
  const inserted = await deps.insertAlerts(deduped, input.hourTs);
  return { proposed: proposed.length, inserted };
}

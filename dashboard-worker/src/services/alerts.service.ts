import { applyDedup } from "@/workers/alerts/dedup";
import { buildAlertInputs } from "@/workers/alerts/inputs";
import { evaluateRules } from "@/workers/alerts/rules";

import { getExistingAlerts, insertAlerts } from "@worker/repositories/alerts.repository";
import { getMarketMetricsForHour, getProtocolMetricForHour } from "@worker/repositories/metrics.repository";
import type { D1DatabaseLike } from "@worker/types";

export async function runAlertsStage(
  db: D1DatabaseLike,
  hourTs: Date
): Promise<{ proposed: number; inserted: number }> {
  const hourIso = hourTs.toISOString();
  const [protocol, markets] = await Promise.all([
    getProtocolMetricForHour(db, hourIso),
    getMarketMetricsForHour(db, hourIso)
  ]);

  const inputs = buildAlertInputs(
    protocol
      ? {
          ...protocol,
          hourTs: new Date(protocol.hourTs)
        }
      : null,
    markets.map((market) => ({
      ...market,
      hourTs: new Date(market.hourTs)
    }))
  );
  const proposed = inputs.flatMap((input) => evaluateRules(input));
  const existing = await getExistingAlerts(db, hourTs);
  const deduped = applyDedup(proposed, existing, hourTs);
  const inserted = await insertAlerts(db, deduped, hourIso);
  return {
    proposed: proposed.length,
    inserted
  };
}

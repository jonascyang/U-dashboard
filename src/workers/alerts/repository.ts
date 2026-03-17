import { and, desc, eq, gte, inArray } from "drizzle-orm";

import { db } from "@/db/client";
import { alerts } from "@/db/schema";
import type { ExistingAlert } from "@/workers/alerts/dedup";
import { buildAlertInputs } from "@/workers/alerts/inputs";
import type { ProposedAlert } from "@/workers/alerts/rules";
import { getMarketMetricsForHour, getProtocolMetricForHour } from "@/workers/aggregate/repository";

export async function fetchAlertInputsForHour(hourTs: Date) {
  const [protocol, markets] = await Promise.all([getProtocolMetricForHour(hourTs), getMarketMetricsForHour(hourTs)]);
  return buildAlertInputs(protocol, markets);
}

export async function getExistingAlerts(now: Date): Promise<ExistingAlert[]> {
  const lookback = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const rows = await db
    .select({
      dedupKey: alerts.dedupKey,
      level: alerts.level,
      status: alerts.status,
      lastSeenAt: alerts.lastSeenAt
    })
    .from(alerts)
    .where(
      and(
        gte(alerts.lastSeenAt, lookback),
        inArray(alerts.status, ["active", "acknowledged"])
      )
    )
    .orderBy(desc(alerts.lastSeenAt));

  return rows.map((row) => ({
    dedupKey: row.dedupKey,
    level: row.level as ExistingAlert["level"],
    status: row.status as ExistingAlert["status"],
    lastSeenAt: row.lastSeenAt
  }));
}

export async function insertAlerts(proposed: ProposedAlert[], hourTs: Date): Promise<number> {
  if (proposed.length === 0) return 0;

  await db.insert(alerts).values(
    proposed.map((alert) => ({
      hourTs,
      level: alert.level,
      ruleCode: alert.ruleCode,
      marketId: alert.marketId ?? null,
      metricKey: alert.metricKey,
      currentValue: alert.currentValue.toString(),
      thresholdValue: alert.thresholdValue?.toString() ?? null,
      baselineValue: alert.baselineValue?.toString() ?? null,
      status: "active",
      dedupKey: alert.dedupKey,
      firstSeenAt: hourTs,
      lastSeenAt: hourTs,
      assignee: null,
      note: null
    }))
  );

  return proposed.length;
}

export async function markAlertStatus(id: string, status: "active" | "acknowledged" | "resolved" | "silenced", note?: string) {
  await db
    .update(alerts)
    .set({
      status,
      note: note ?? null,
      lastSeenAt: new Date()
    })
    .where(eq(alerts.id, id));
}

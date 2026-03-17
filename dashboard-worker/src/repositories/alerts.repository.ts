import type { ExistingAlert } from "@/workers/alerts/dedup";
import type { ProposedAlert } from "@/workers/alerts/rules";

import type { D1DatabaseLike } from "@worker/types";

export type AlertRecord = {
  id: string;
  hourTs: string;
  level: "critical" | "warning" | "info";
  ruleCode: string;
  marketId?: string;
  metricKey: string;
  currentValue: number;
  thresholdValue?: number;
  baselineValue?: number;
  status: "active" | "acknowledged" | "resolved" | "silenced";
  dedupKey: string;
  firstSeenAt: string;
  lastSeenAt: string;
  assignee?: string;
  note?: string;
};

export type NewAlertRecord = {
  id: string;
  hourTs: string;
  level: AlertRecord["level"];
  ruleCode: string;
  marketId?: string;
  metricKey: string;
  currentValue: number;
  thresholdValue?: number;
  baselineValue?: number;
  status?: AlertRecord["status"];
  dedupKey: string;
  firstSeenAt: string;
  lastSeenAt: string;
  assignee?: string | null;
  note?: string | null;
};

export async function getExistingAlerts(db: D1DatabaseLike, now: Date): Promise<ExistingAlert[]> {
  const lookbackIso = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString();
  const { results } = await db
    .prepare(
      "SELECT dedup_key as dedupKey, level, status, last_seen_at as lastSeenAt FROM alerts WHERE last_seen_at >= ? AND status IN ('active', 'acknowledged') ORDER BY last_seen_at DESC"
    )
    .bind(lookbackIso)
    .all<{ dedupKey: string; level: string; status: string; lastSeenAt: string }>();

  return results.map((row) => ({
    dedupKey: row.dedupKey,
    level: row.level as ExistingAlert["level"],
    status: row.status as ExistingAlert["status"],
    lastSeenAt: new Date(row.lastSeenAt)
  }));
}

export async function insertAlerts(db: D1DatabaseLike, alerts: ProposedAlert[], hourTs: string): Promise<number> {
  return insertAlertRecords(
    db,
    alerts.map((alert) => ({
      id: `${alert.dedupKey}:${hourTs}`,
      hourTs,
      level: alert.level,
      ruleCode: alert.ruleCode,
      marketId: alert.marketId,
      metricKey: alert.metricKey,
      currentValue: alert.currentValue,
      thresholdValue: alert.thresholdValue,
      baselineValue: alert.baselineValue,
      status: "active",
      dedupKey: alert.dedupKey,
      firstSeenAt: hourTs,
      lastSeenAt: hourTs
    }))
  );
}

export async function insertAlertRecords(db: D1DatabaseLike, alerts: NewAlertRecord[]): Promise<number> {
  for (const alert of alerts) {
    await db
      .prepare(
        "INSERT INTO alerts (id, hour_ts, level, rule_code, market_id, metric_key, current_value, threshold_value, baseline_value, status, dedup_key, first_seen_at, last_seen_at, assignee, note) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)"
      )
      .bind(
        alert.id,
        alert.hourTs,
        alert.level,
        alert.ruleCode,
        alert.marketId ?? null,
        alert.metricKey,
        alert.currentValue,
        alert.thresholdValue ?? null,
        alert.baselineValue ?? null,
        alert.status ?? "active",
        alert.dedupKey,
        alert.firstSeenAt,
        alert.lastSeenAt,
        alert.assignee ?? null,
        alert.note ?? null
      )
      .run();
  }
  return alerts.length;
}

export async function listAlerts(
  db: D1DatabaseLike,
  filters?: {
    status?: string;
    levels?: string[];
  }
): Promise<AlertRecord[]> {
  const binds: unknown[] = [];
  const clauses: string[] = [];
  if (filters?.status) {
    clauses.push("status = ?");
    binds.push(filters.status);
  }
  if (filters?.levels?.length) {
    clauses.push(`level IN (${filters.levels.map(() => "?").join(", ")})`);
    binds.push(...filters.levels);
  }

  const whereClause = clauses.length ? `WHERE ${clauses.join(" AND ")}` : "";
  const query = `SELECT id, hour_ts as hourTs, level, rule_code as ruleCode, market_id as marketId, metric_key as metricKey, current_value as currentValue, threshold_value as thresholdValue, baseline_value as baselineValue, status, dedup_key as dedupKey, first_seen_at as firstSeenAt, last_seen_at as lastSeenAt, assignee, note FROM alerts ${whereClause} ORDER BY last_seen_at DESC LIMIT 200`;
  const { results } = await db.prepare(query).bind(...binds).all<AlertRecord>();
  return results;
}

export async function updateAlertStatus(
  db: D1DatabaseLike,
  id: string,
  patch: {
    status?: "active" | "acknowledged" | "resolved" | "silenced";
    note?: string;
  }
): Promise<AlertRecord | null> {
  await db
    .prepare("UPDATE alerts SET status = COALESCE(?, status), note = COALESCE(?, note), last_seen_at = ? WHERE id = ?")
    .bind(patch.status ?? null, patch.note ?? null, new Date().toISOString(), id)
    .run();

  return (
    (await db
      .prepare(
        "SELECT id, hour_ts as hourTs, level, rule_code as ruleCode, market_id as marketId, metric_key as metricKey, current_value as currentValue, threshold_value as thresholdValue, baseline_value as baselineValue, status, dedup_key as dedupKey, first_seen_at as firstSeenAt, last_seen_at as lastSeenAt, assignee, note FROM alerts WHERE id = ? LIMIT 1"
      )
      .bind(id)
      .first<AlertRecord>()) ?? null
  );
}

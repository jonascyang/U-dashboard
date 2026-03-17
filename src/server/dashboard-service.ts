type OverviewPayload = {
  tvl: number;
  netFlow24h: number;
  revenue24h: number;
  activeUsers24h: number;
  utilization: number;
  liquidation24h: number;
  atRiskDebtRatio: number;
  securityEvents24h: number;
  updatedAt: string;
};

export type TimeseriesPoint = {
  ts: string;
  value: number;
};

export type MarketRow = {
  marketId: string;
  tvlUsd: number;
  borrowUsd: number;
  utilization: number;
  liquidationUsd24h: number;
  atRiskDebtRatio: number;
};

export type AlertRow = {
  id: string;
  level: "critical" | "warning" | "info";
  status: "active" | "acknowledged" | "resolved" | "silenced";
  ruleCode: string;
  marketId?: string;
  metricKey: string;
  currentValue: number;
  thresholdValue?: number;
  baselineValue?: number;
  firstSeenAt: string;
  lastSeenAt: string;
  note?: string;
};

const nowIso = () => new Date().toISOString();

const overviewSeed: OverviewPayload = {
  tvl: 124_000_000,
  netFlow24h: 2_100_000,
  revenue24h: 83_000,
  activeUsers24h: 1842,
  utilization: 0.83,
  liquidation24h: 390_000,
  atRiskDebtRatio: 0.071,
  securityEvents24h: 0,
  updatedAt: nowIso()
};

const marketSeed: MarketRow[] = [
  {
    marketId: "eth-usdc",
    tvlUsd: 76_000_000,
    borrowUsd: 61_000_000,
    utilization: 0.8026,
    liquidationUsd24h: 230_000,
    atRiskDebtRatio: 0.062
  },
  {
    marketId: "wbtc-usdc",
    tvlUsd: 48_000_000,
    borrowUsd: 42_000_000,
    utilization: 0.875,
    liquidationUsd24h: 160_000,
    atRiskDebtRatio: 0.081
  }
];

const alertsStore: AlertRow[] = [];

function num(value: unknown): number {
  if (typeof value === "number") return value;
  if (typeof value === "string") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }
  return 0;
}

async function getDbDeps() {
  if (!process.env.DATABASE_URL) return null;
  const [{ db }, schema, operators] = await Promise.all([
    import("@/db/client"),
    import("@/db/schema"),
    import("drizzle-orm")
  ]);
  return { db, schema, operators };
}

export async function queryOverview24h(): Promise<OverviewPayload> {
  const deps = await getDbDeps();
  if (deps) {
    const { metricHourlyProtocol } = deps.schema;
    const { desc } = deps.operators;
    const rows = await deps.db.select().from(metricHourlyProtocol).orderBy(desc(metricHourlyProtocol.hourTs)).limit(1);
    const row = rows[0];
    if (row) {
      return {
        tvl: num(row.tvlUsd),
        netFlow24h: num(row.netFlowUsd24h),
        revenue24h: num(row.revenueUsd24h),
        activeUsers24h: row.activeUsers24h,
        utilization: num(row.utilizationWeighted),
        liquidation24h: num(row.liquidationUsd24h),
        atRiskDebtRatio: num(row.atRiskDebtRatio),
        securityEvents24h: row.securityEvents24h,
        updatedAt: row.hourTs.toISOString()
      };
    }
  }
  return overviewSeed;
}

export async function queryTimeseries(metric: string): Promise<TimeseriesPoint[]> {
  const deps = await getDbDeps();
  if (deps) {
    const { metricHourlyProtocol } = deps.schema;
    const { desc } = deps.operators;
    const metricColumn = {
      tvl_usd: metricHourlyProtocol.tvlUsd,
      net_flow_usd_24h: metricHourlyProtocol.netFlowUsd24h,
      revenue_usd_24h: metricHourlyProtocol.revenueUsd24h,
      utilization_weighted: metricHourlyProtocol.utilizationWeighted,
      liquidation_usd_24h: metricHourlyProtocol.liquidationUsd24h,
      at_risk_debt_ratio: metricHourlyProtocol.atRiskDebtRatio
    }[metric] ?? metricHourlyProtocol.tvlUsd;

    const rows = await deps.db
      .select({
        ts: metricHourlyProtocol.hourTs,
        value: metricColumn
      })
      .from(metricHourlyProtocol)
      .orderBy(desc(metricHourlyProtocol.hourTs))
      .limit(24);

    return rows
      .reverse()
      .map((row) => ({ ts: row.ts.toISOString(), value: num(row.value) }));
  }

  return Array.from({ length: 24 }, (_, index) => ({
    ts: new Date(Date.now() - (23 - index) * 60 * 60 * 1000).toISOString(),
    value: metric === "tvl_usd" ? 120_000_000 + index * 100_000 : 0.8 + index * 0.001
  }));
}

export async function queryMarkets(): Promise<MarketRow[]> {
  const deps = await getDbDeps();
  if (deps) {
    const { metricHourlyMarket } = deps.schema;
    const { desc, eq } = deps.operators;
    const latest = await deps.db
      .select({ hourTs: metricHourlyMarket.hourTs })
      .from(metricHourlyMarket)
      .orderBy(desc(metricHourlyMarket.hourTs))
      .limit(1);

    if (latest[0]) {
      const rows = await deps.db
        .select()
        .from(metricHourlyMarket)
        .where(eq(metricHourlyMarket.hourTs, latest[0].hourTs));

      return rows.map((row) => {
        const tvlUsd = num(row.tvlUsd);
        const utilization = num(row.utilization);
        return {
          marketId: row.marketId,
          tvlUsd,
          borrowUsd: tvlUsd * utilization,
          utilization,
          liquidationUsd24h: num(row.liquidationUsd24h),
          atRiskDebtRatio: num(row.atRiskDebtRatio)
        };
      });
    }
  }

  return marketSeed;
}

export async function queryAlerts(filters?: { status?: string; levels?: string[] }): Promise<AlertRow[]> {
  const deps = await getDbDeps();
  if (deps) {
    const { alerts } = deps.schema;
    const { and, desc, eq, inArray } = deps.operators;

    const conditions = [];
    if (filters?.status) {
      conditions.push(eq(alerts.status, filters.status));
    }
    if (filters?.levels?.length) {
      conditions.push(inArray(alerts.level, filters.levels));
    }
    const whereExpr =
      conditions.length === 0 ? undefined : conditions.length === 1 ? conditions[0] : and(...conditions);

    const query = deps.db.select().from(alerts);
    const rows = whereExpr
      ? await query.where(whereExpr).orderBy(desc(alerts.lastSeenAt)).limit(200)
      : await query.orderBy(desc(alerts.lastSeenAt)).limit(200);

    return rows.map((row) => ({
      id: row.id,
      level: row.level as AlertRow["level"],
      status: row.status as AlertRow["status"],
      ruleCode: row.ruleCode,
      marketId: row.marketId ?? undefined,
      metricKey: row.metricKey,
      currentValue: num(row.currentValue),
      thresholdValue: row.thresholdValue ? num(row.thresholdValue) : undefined,
      baselineValue: row.baselineValue ? num(row.baselineValue) : undefined,
      firstSeenAt: row.firstSeenAt.toISOString(),
      lastSeenAt: row.lastSeenAt.toISOString(),
      note: row.note ?? undefined
    }));
  }

  return alertsStore.filter((alert) => {
    const statusOk = filters?.status ? alert.status === filters.status : true;
    const levelOk = filters?.levels?.length ? filters.levels.includes(alert.level) : true;
    return statusOk && levelOk;
  });
}

export async function updateAlertStatus(
  id: string,
  patch: Partial<Pick<AlertRow, "status" | "note">>
): Promise<AlertRow | null> {
  const deps = await getDbDeps();
  if (deps) {
    const { alerts } = deps.schema;
    const { eq } = deps.operators;
    const rows = await deps.db
      .update(alerts)
      .set({
        status: patch.status ?? "active",
        note: patch.note ?? null,
        lastSeenAt: new Date()
      })
      .where(eq(alerts.id, id))
      .returning();

    const row = rows[0];
    if (!row) return null;
    return {
      id: row.id,
      level: row.level as AlertRow["level"],
      status: row.status as AlertRow["status"],
      ruleCode: row.ruleCode,
      marketId: row.marketId ?? undefined,
      metricKey: row.metricKey,
      currentValue: num(row.currentValue),
      thresholdValue: row.thresholdValue ? num(row.thresholdValue) : undefined,
      baselineValue: row.baselineValue ? num(row.baselineValue) : undefined,
      firstSeenAt: row.firstSeenAt.toISOString(),
      lastSeenAt: row.lastSeenAt.toISOString(),
      note: row.note ?? undefined
    };
  }

  const idx = alertsStore.findIndex((alert) => alert.id === id);
  if (idx < 0) return null;
  alertsStore[idx] = { ...alertsStore[idx], ...patch, lastSeenAt: nowIso() };
  return alertsStore[idx];
}

export function seedAlert(alert: AlertRow) {
  alertsStore.push(alert);
}

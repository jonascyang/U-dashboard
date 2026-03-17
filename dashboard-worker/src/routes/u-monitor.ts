import {
  getLatestSupplySnapshotAtOrBefore,
  getLatestSupplySnapshot,
  getLatestWeightedPriceSnapshot,
  getPriceSourceSnapshotsForCapture,
  listWeightedPriceSnapshots
} from "@worker/repositories/u-monitor.repository";
import { snapshotUMonitorSupply } from "@worker/services/u-monitor-scheduler.service";
import { persistUMonitorSnapshot } from "@worker/services/u-monitor-persistence.service";
import type { WorkerEnv } from "@worker/types";

const U_MONITOR_METADATA = {
  stablecoinName: "United Stables",
  symbol: "U",
  chain: "BSC",
  contractAddress: "0xcE24439F2D9C6a2289F741120FE202248B666666",
  baselinePrice: 1
} as const;

const SUPPLY_WINDOWS = [
  { window: "1h", ms: 60 * 60 * 1000 },
  { window: "4h", ms: 4 * 60 * 60 * 1000 },
  { window: "1d", ms: 24 * 60 * 60 * 1000 },
  { window: "7d", ms: 7 * 24 * 60 * 60 * 1000 },
  { window: "30d", ms: 30 * 24 * 60 * 60 * 1000 }
] as const;

type PersistBody = {
  capturedAt: string;
  weightedPrice: {
    weightedPrice: number;
    baselinePrice: number;
    sourceCount: number;
    componentsJson: string;
  };
  priceSources: Array<{
    venue: string;
    pair: string;
    sourceType: "CEX" | "DEX";
    latestPrice: number;
    bid?: number;
    ask?: number;
    quoteVolume24h: number;
    weightPercent: number;
    status: "live" | "stale" | "error";
  }>;
  supply: {
    contractAddress: string;
    chainId: number;
    totalSupply: number;
  };
};

const U_MONITOR_CORS_HEADERS = {
  "access-control-allow-origin": "*",
  "access-control-allow-methods": "GET,POST,OPTIONS",
  "access-control-allow-headers": "content-type,x-u-monitor-token"
} as const;

function corsJson(body: unknown, init?: ResponseInit) {
  const headers = new Headers(init?.headers);

  for (const [key, value] of Object.entries(U_MONITOR_CORS_HEADERS)) {
    headers.set(key, value);
  }

  return Response.json(body, {
    ...init,
    headers
  });
}

export async function handleUMonitorPersist(request: Request, env: WorkerEnv): Promise<Response> {
  if (env.U_MONITOR_API_TOKEN) {
    const token = request.headers.get("x-u-monitor-token");
    if (token !== env.U_MONITOR_API_TOKEN) {
      return corsJson({ error: "unauthorized" }, { status: 401 });
    }
  }
  const body = (await request.json()) as PersistBody;
  const result = await persistUMonitorSnapshot(env.DB, body);
  return corsJson(result);
}

export async function handleUMonitorStart(_request: Request, env: WorkerEnv): Promise<Response> {
  const bindings = [
    { venue: "Binance", namespace: env.BINANCE_U_MONITOR },
    { venue: "LBank", namespace: env.LBANK_U_MONITOR },
    { venue: "HTX", namespace: env.HTX_U_MONITOR },
    { venue: "PancakeSwap V3", namespace: env.PANCAKE_U_MONITOR }
  ] as const;

  const started: string[] = [];

  for (const binding of bindings) {
    if (!binding.namespace?.get) continue;
    const stub = binding.namespace.get(binding.namespace.idFromName("primary"));
    await stub.fetch("https://internal/start", { method: "POST" });
    started.push(binding.venue);
  }

  const supplySnapshot = await snapshotUMonitorSupply(env, new Date().toISOString());

  return corsJson({ started, supplySnapshot });
}

export async function handleUMonitorOverview(_request: Request, env: WorkerEnv): Promise<Response> {
  const weighted = await getLatestWeightedPriceSnapshot(env.DB);
  if (!weighted) {
    return corsJson({
      stablecoinName: U_MONITOR_METADATA.stablecoinName,
      symbol: U_MONITOR_METADATA.symbol,
      chain: U_MONITOR_METADATA.chain,
      contractAddress: U_MONITOR_METADATA.contractAddress,
      weightedPrice: 0,
      totalSupply: 0,
      updatedAt: new Date(0).toISOString(),
      maxDeviationValue30d: 0,
      maxDeviationPercent30d: 0,
      maxDeviationAt30d: new Date(0).toISOString(),
      priceSources: [],
      supplyDeltas: buildEmptySupplyDeltas()
    });
  }

  const [priceSources, supply, series] = await Promise.all([
    getPriceSourceSnapshotsForCapture(env.DB, weighted.capturedAt),
    getLatestSupplySnapshot(env.DB),
    listWeightedPriceSnapshots(env.DB, 30)
  ]);
  const maxDeviation = computeMaxDeviation(series);
  const supplyDeltas = supply ? await buildSupplyDeltas(env.DB, supply) : buildEmptySupplyDeltas();

  return corsJson({
    stablecoinName: U_MONITOR_METADATA.stablecoinName,
    symbol: U_MONITOR_METADATA.symbol,
    chain: U_MONITOR_METADATA.chain,
    contractAddress: supply?.contractAddress ?? U_MONITOR_METADATA.contractAddress,
    weightedPrice: weighted.weightedPrice,
    updatedAt: weighted.capturedAt,
    totalSupply: supply?.totalSupply ?? 0,
    maxDeviationValue30d: maxDeviation.deviationValue,
    maxDeviationPercent30d: maxDeviation.deviationValue * 100,
    maxDeviationAt30d: maxDeviation.ts,
    priceSources: priceSources.map((row) => ({
      venue: row.venue,
      pair: row.pair,
      sourceType: row.sourceType,
      latestPrice: row.latestPrice,
      quoteVolume24h: row.quoteVolume24h,
      updatedAt: row.capturedAt,
      status: row.status === "live" ? "live" : "stale",
      weightPercent: row.weightPercent
    })),
    supplyDeltas
  });
}

export async function handleUMonitorDepeg(_request: Request, env: WorkerEnv): Promise<Response> {
  const series = await listWeightedPriceSnapshots(env.DB, 30);
  const mapped = series.map((point) => ({
    ts: point.capturedAt,
    price: point.weightedPrice,
    deviationValue: Math.abs(point.weightedPrice - 1)
  }));
  const maxDeviation = mapped.reduce(
    (max, point) => (point.deviationValue > max.deviationValue ? point : max),
    mapped[0] ?? { ts: new Date(0).toISOString(), price: 1, deviationValue: 0 }
  );

  return corsJson({
    updatedAt: mapped.at(-1)?.ts ?? new Date(0).toISOString(),
    baselinePrice: U_MONITOR_METADATA.baselinePrice,
    maxDeviationValue30d: maxDeviation.deviationValue,
    maxDeviationPercent30d: maxDeviation.deviationValue * 100,
    maxDeviationAt30d: maxDeviation.ts,
    series: mapped
  });
}

export async function handleUMonitorSupply(_request: Request, env: WorkerEnv): Promise<Response> {
  const supply = await getLatestSupplySnapshot(env.DB);
  if (!supply) {
    return corsJson({
      contractAddress: U_MONITOR_METADATA.contractAddress,
      chainId: 56,
      totalSupply: 0,
      updatedAt: new Date(0).toISOString(),
      supplyDeltas: buildEmptySupplyDeltas()
    });
  }

  return corsJson({
    contractAddress: supply.contractAddress,
    chainId: supply.chainId,
    totalSupply: supply.totalSupply,
    updatedAt: supply.capturedAt,
    supplyDeltas: await buildSupplyDeltas(env.DB, supply)
  });
}

function computeMaxDeviation(series: Array<{ capturedAt: string; weightedPrice: number }>) {
  return series.reduce(
    (max, point) => {
      const deviationValue = Math.abs(point.weightedPrice - U_MONITOR_METADATA.baselinePrice);
      if (deviationValue > max.deviationValue) {
        return {
          ts: point.capturedAt,
          deviationValue
        };
      }
      return max;
    },
    { ts: new Date(0).toISOString(), deviationValue: 0 }
  );
}

function buildEmptySupplyDeltas() {
  return SUPPLY_WINDOWS.map(({ window }) => ({
    window,
    value: 0
  }));
}

async function buildSupplyDeltas(
  db: WorkerEnv["DB"],
  latest: { capturedAt: string; contractAddress: string; totalSupply: number }
) {
  const latestTs = new Date(latest.capturedAt).getTime();
  const historicalSnapshots = await Promise.all(
    SUPPLY_WINDOWS.map(({ ms }) =>
      getLatestSupplySnapshotAtOrBefore(db, latest.contractAddress, new Date(latestTs - ms).toISOString())
    )
  );

  return SUPPLY_WINDOWS.map(({ window }, index) => ({
    window,
    value: latest.totalSupply - (historicalSnapshots[index]?.totalSupply ?? latest.totalSupply)
  }));
}

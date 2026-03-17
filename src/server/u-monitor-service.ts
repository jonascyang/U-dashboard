import { U_MONITOR_BSC_CHAIN, U_MONITOR_BSC_CHAIN_ID, U_MONITOR_CONTRACT_ADDRESS } from "@/server/u-monitor/registry";
import { uMonitorRuntimeStore } from "@/server/u-monitor/runtime-store";
import { readBscUMonitorTotalSupplyFromRpc } from "@/server/u-monitor/supply-reader";

export type UPriceSource = {
  venue: string;
  pair: string;
  sourceType: "CEX" | "DEX";
  latestPrice: number;
  quoteVolume24h: number;
  updatedAt: string;
  status: "live" | "stale";
  weightPercent: number;
};

export type UDepegPoint = {
  ts: string;
  price: number;
  deviationValue: number;
};

export type USupplyDelta = {
  window: "1h" | "4h" | "1d" | "7d" | "30d";
  value: number;
};

export type UMonitorOverview = {
  stablecoinName: string;
  symbol: string;
  chain: string;
  contractAddress: string;
  updatedAt: string;
  weightedPrice: number;
  totalSupply: number;
  maxDeviationValue30d: number;
  maxDeviationPercent30d: number;
  maxDeviationAt30d: string;
  priceSources: UPriceSource[];
  supplyDeltas: USupplyDelta[];
};

export type UMonitorPersistencePayload = {
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
    status: "live" | "stale";
  }>;
  supply: {
    contractAddress: string;
    chainId: number;
    totalSupply: number;
  };
};

type SeedPriceSource = Omit<UPriceSource, "weightPercent">;
type SupplySnapshot = { ts: string; totalSupply: number };

const MONITOR_UPDATED_AT = "2026-03-13T07:30:00.000Z";

const seedPriceSources: SeedPriceSource[] = [
  {
    venue: "Binance",
    pair: "U/USDT",
    sourceType: "CEX",
    latestPrice: 0.999905,
    quoteVolume24h: 25_650_000,
    updatedAt: MONITOR_UPDATED_AT,
    status: "live"
  },
  {
    venue: "LBank",
    pair: "U/USDT",
    sourceType: "CEX",
    latestPrice: 0.999905,
    quoteVolume24h: 5_400_000,
    updatedAt: MONITOR_UPDATED_AT,
    status: "live"
  },
  {
    venue: "HTX",
    pair: "U/USDT",
    sourceType: "CEX",
    latestPrice: 0.999805,
    quoteVolume24h: 470_000,
    updatedAt: MONITOR_UPDATED_AT,
    status: "live"
  },
  {
    venue: "PancakeSwap V3",
    pair: "U/USDT",
    sourceType: "DEX",
    latestPrice: 0.99971,
    quoteVolume24h: 275_670,
    updatedAt: MONITOR_UPDATED_AT,
    status: "live"
  }
];

const seedDepegSeries: UDepegPoint[] = Array.from({ length: 30 }, (_, index) => {
  const price = [
    1.0001, 0.9998, 0.9996, 0.9994, 0.9992, 0.9989, 0.9991, 0.9997, 0.9999, 1.0002, 1.0003, 1.0001, 0.9997,
    0.9993, 0.9991, 0.9988, 0.9986, 0.9984, 0.9985, 0.9989, 0.9992, 0.9994, 0.9996, 0.9997, 0.9998, 0.9999,
    0.99985, 0.99988, 0.9999, 0.999902
  ][index];

  return {
    ts: new Date(Date.UTC(2026, 1, 12 + index, 0, 0, 0)).toISOString(),
    price,
    deviationValue: Math.abs(price - 1)
  };
});

const seedSupplySnapshots: SupplySnapshot[] = [
  { ts: "2026-02-11T07:30:00.000Z", totalSupply: 119_200_000 },
  { ts: "2026-03-06T07:30:00.000Z", totalSupply: 121_050_000 },
  { ts: "2026-03-12T07:30:00.000Z", totalSupply: 121_840_000 },
  { ts: "2026-03-13T03:30:00.000Z", totalSupply: 121_970_000 },
  { ts: "2026-03-13T06:30:00.000Z", totalSupply: 122_015_000 },
  { ts: MONITOR_UPDATED_AT, totalSupply: 122_040_000 }
];

function sumQuoteVolume(rows: SeedPriceSource[]) {
  return rows.reduce((sum, row) => sum + row.quoteVolume24h, 0);
}

function computeWeightedPrice(rows: SeedPriceSource[]) {
  const totalVolume = sumQuoteVolume(rows);
  return rows.reduce((sum, row) => sum + row.latestPrice * row.quoteVolume24h, 0) / totalVolume;
}

function withWeights(rows: SeedPriceSource[]): UPriceSource[] {
  const totalVolume = sumQuoteVolume(rows);
  return rows.map((row) => ({
    ...row,
    weightPercent: (row.quoteVolume24h / totalVolume) * 100
  }));
}

function latestSupplySnapshot() {
  return seedSupplySnapshots.at(-1)!;
}

function findSupplySnapshot(ts: string) {
  return seedSupplySnapshots.find((snapshot) => snapshot.ts === ts)!;
}

export async function getUMonitorOverview(): Promise<UMonitorOverview> {
  const currentPriceSources = uMonitorRuntimeStore.materialize(seedPriceSources);
  const weightedPrice = computeWeightedPrice(currentPriceSources);
  const priceSources = withWeights(currentPriceSources);
  const maxDeviationPoint = seedDepegSeries.reduce((max, point) =>
    point.deviationValue > max.deviationValue ? point : max
  );
  const currentSupply = latestSupplySnapshot();
  const liveTotalSupply = await resolveLiveTotalSupply(currentSupply.totalSupply);

  return {
    stablecoinName: "United Stables",
    symbol: "U",
    chain: U_MONITOR_BSC_CHAIN,
    contractAddress: U_MONITOR_CONTRACT_ADDRESS,
    updatedAt: MONITOR_UPDATED_AT,
    weightedPrice,
    totalSupply: liveTotalSupply,
    maxDeviationValue30d: maxDeviationPoint.deviationValue,
    maxDeviationPercent30d: maxDeviationPoint.deviationValue * 100,
    maxDeviationAt30d: maxDeviationPoint.ts,
    priceSources,
    supplyDeltas: [
      { window: "1h", value: liveTotalSupply - findSupplySnapshot("2026-03-13T06:30:00.000Z").totalSupply },
      { window: "4h", value: liveTotalSupply - findSupplySnapshot("2026-03-13T03:30:00.000Z").totalSupply },
      { window: "1d", value: liveTotalSupply - findSupplySnapshot("2026-03-12T07:30:00.000Z").totalSupply },
      { window: "7d", value: liveTotalSupply - findSupplySnapshot("2026-03-06T07:30:00.000Z").totalSupply },
      { window: "30d", value: liveTotalSupply - findSupplySnapshot("2026-02-11T07:30:00.000Z").totalSupply }
    ]
  };
}

async function resolveLiveTotalSupply(fallbackTotalSupply: number) {
  const rpcUrl = process.env.U_MONITOR_BSC_RPC_URL;
  if (!rpcUrl) return fallbackTotalSupply;

  try {
    return await readBscUMonitorTotalSupplyFromRpc(rpcUrl, "http");
  } catch {
    return fallbackTotalSupply;
  }
}

export async function getUMonitorDepegSeries(): Promise<UDepegPoint[]> {
  return seedDepegSeries;
}

export async function getUMonitorDepeg() {
  const overview = await getUMonitorOverview();
  return {
    updatedAt: overview.updatedAt,
    baselinePrice: 1,
    maxDeviationValue30d: overview.maxDeviationValue30d,
    maxDeviationPercent30d: overview.maxDeviationPercent30d,
    maxDeviationAt30d: overview.maxDeviationAt30d,
    series: await getUMonitorDepegSeries()
  };
}

export async function getUMonitorSupply() {
  const overview = await getUMonitorOverview();
  return {
    updatedAt: overview.updatedAt,
    contractAddress: overview.contractAddress,
    totalSupply: overview.totalSupply,
    supplyDeltas: overview.supplyDeltas
  };
}

export async function getUMonitorPersistencePayload(capturedAt = new Date().toISOString()): Promise<UMonitorPersistencePayload> {
  const overview = await getUMonitorOverview();

  return {
    capturedAt,
    weightedPrice: {
      weightedPrice: overview.weightedPrice,
      baselinePrice: 1,
      sourceCount: overview.priceSources.length,
      componentsJson: JSON.stringify(
        overview.priceSources.map((source) => ({
          venue: source.venue,
          latestPrice: source.latestPrice,
          quoteVolume24h: source.quoteVolume24h,
          weightPercent: source.weightPercent,
          status: source.status
        }))
      )
    },
    priceSources: overview.priceSources.map((source) => ({
      venue: source.venue,
      pair: source.pair,
      sourceType: source.sourceType,
      latestPrice: source.latestPrice,
      bid: uMonitorRuntimeStore.get(source.venue)?.bid,
      ask: uMonitorRuntimeStore.get(source.venue)?.ask,
      quoteVolume24h: source.quoteVolume24h,
      weightPercent: source.weightPercent,
      status: source.status
    })),
    supply: {
      contractAddress: overview.contractAddress,
      chainId: U_MONITOR_BSC_CHAIN_ID,
      totalSupply: overview.totalSupply
    }
  };
}

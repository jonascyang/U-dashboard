import type { D1DatabaseLike } from "@worker/types";

type MonitoredMarketRow = {
  marketAddress: string;
};

export async function listEnabledMarketAddresses(db: D1DatabaseLike): Promise<`0x${string}`[]> {
  const rows = await db
    .prepare("SELECT market_address as marketAddress FROM monitored_markets WHERE enabled = 1 ORDER BY market_address ASC")
    .all<MonitoredMarketRow>();

  return rows.results
    .map((row) => row.marketAddress.toLowerCase())
    .filter((address) => /^0x[0-9a-f]{40}$/.test(address))
    .map((address) => address as `0x${string}`);
}

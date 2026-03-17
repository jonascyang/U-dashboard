import { runHourlyCycle } from "@/workers/scheduler";
import { createEthereumClient, fetchLendingLogsForHour, parseMarketAddresses } from "@/workers/ingest/chain-source";
import { readFileSync } from "node:fs";

function readAddressesFromFile(path: string): string {
  return readFileSync(path, "utf-8")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .join(",");
}

async function main() {
  const hour = process.argv[2] ?? new Date().toISOString();
  const chainId = Number(process.env.ETH_CHAIN_ID ?? "1");
  const rpcUrl = process.env.ETH_RPC_URL;
  const marketAddressesRaw =
    process.env.LENDING_MARKET_ADDRESSES ||
    (process.env.LENDING_MARKET_ADDRESSES_FILE ? readAddressesFromFile(process.env.LENDING_MARKET_ADDRESSES_FILE) : "");
  const marketAddresses = marketAddressesRaw ? parseMarketAddresses(marketAddressesRaw) : [];
  const client = rpcUrl ? createEthereumClient(rpcUrl) : null;
  const hourDate = new Date(hour);

  const ingestRepository = process.env.DATABASE_URL ? await import("@/workers/ingest/repository") : null;
  const aggregateRepository = process.env.DATABASE_URL ? await import("@/workers/aggregate/repository") : null;
  const alertRepository = process.env.DATABASE_URL ? await import("@/workers/alerts/repository") : null;

  if (!client) {
    console.warn("ETH_RPC_URL is not set. Ingestion fetch is disabled.");
  }
  if (marketAddresses.length === 0) {
    console.warn("LENDING_MARKET_ADDRESSES is not set. Ingestion fetch is disabled.");
  }
  if (!process.env.DATABASE_URL) {
    console.warn("DATABASE_URL is not set. Pipeline will run without persistence.");
  }

  const result = await runHourlyCycle(
    { hour },
    {
      fetchLogs: async (hourValue) => {
        if (!client || marketAddresses.length === 0) return [];
        return fetchLendingLogsForHour(client, {
          chainId,
          marketAddresses,
          hourStart: new Date(hourValue)
        });
      },
      insertRawEvents: async (events) => (ingestRepository ? ingestRepository.insertRawEvents(events) : 0),
      fetchEventsForHour: async (hourValue) =>
        aggregateRepository ? aggregateRepository.fetchEventsForAggregationWindow(new Date(hourValue)) : [],
      upsertMarketMetrics: async (hourTs, metrics) =>
        aggregateRepository ? aggregateRepository.upsertMarketMetrics(hourTs, metrics) : 0,
      upsertProtocolMetrics: async (hourTs, metric) =>
        aggregateRepository ? aggregateRepository.upsertProtocolMetrics(hourTs, metric) : undefined,
      fetchAlertInputs: async (hourValue) =>
        alertRepository ? alertRepository.fetchAlertInputsForHour(new Date(hourValue)) : [],
      getExistingAlerts: async () => (alertRepository ? alertRepository.getExistingAlerts(hourDate) : []),
      insertAlerts: async (alerts, hourTs) => (alertRepository ? alertRepository.insertAlerts(alerts, hourTs) : 0)
    }
  );
  console.log(JSON.stringify(result));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

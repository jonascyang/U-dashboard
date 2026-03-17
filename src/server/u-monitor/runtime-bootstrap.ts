import { UMonitorVenueAgent } from "@/server/u-monitor/agent";
import { readPancakeV3PoolSnapshot } from "@/server/u-monitor/pancake";
import { U_MONITOR_CONTRACT_ADDRESS, uMonitorSources } from "@/server/u-monitor/registry";
import { getUMonitorPersistencePayload, type UMonitorPersistencePayload } from "@/server/u-monitor-service";
import { uMonitorRuntimeStore } from "@/server/u-monitor/runtime-store";

type RuntimeBootstrapOptions = {
  venues?: Array<(typeof uMonitorSources)[number]["venue"]>;
  createSocket?: (url: string) => WebSocket;
  fetchPancakeSnapshot?: (poolAddress: string) => Promise<{
    latestPrice?: number;
    quoteVolume24h?: number;
    updatedAt: string;
  } | null>;
  persistSnapshot?: (payload: UMonitorPersistencePayload) => Promise<void>;
  persistDebounceMs?: number;
};

export function startUMonitorRuntime(options: RuntimeBootstrapOptions = {}) {
  let persistTimer: ReturnType<typeof setTimeout> | null = null;
  let pendingCapturedAt: string | null = null;
  const selectedVenues = options.venues?.length
    ? new Set(options.venues)
    : new Set(uMonitorSources.map((source) => source.venue));

  const agents = uMonitorSources
    .filter((source) => selectedVenues.has(source.venue))
    .map(
      (source) =>
        new UMonitorVenueAgent(source, {
          createSocket: options.createSocket,
          reconnectDelayMs: 1000,
          fetchPancakeSnapshot:
            source.venue === "PancakeSwap V3"
              ? (options.fetchPancakeSnapshot ?? createDefaultPancakeFetcher())
              : undefined,
          onHealthChange: (health) => {
            uMonitorRuntimeStore.setVenueHealth(source.venue, health);
          },
          onSnapshot: (snapshot) => {
            uMonitorRuntimeStore.upsert(source.venue, {
              latestPrice: snapshot.latestPrice,
              quoteVolume24h: snapshot.quoteVolume24h,
              bid: snapshot.bid,
              ask: snapshot.ask,
              updatedAt: snapshot.updatedAt,
              status: snapshot.status
            });
            if (options.persistSnapshot) {
              pendingCapturedAt = snapshot.updatedAt;
              if (persistTimer) {
                clearTimeout(persistTimer);
              }
              persistTimer = setTimeout(() => {
                const capturedAt = pendingCapturedAt ?? new Date().toISOString();
                uMonitorRuntimeStore.setPersistencePending(capturedAt);
                void getUMonitorPersistencePayload(capturedAt)
                  .then((payload) => options.persistSnapshot?.(payload))
                  .then(() => {
                    uMonitorRuntimeStore.setPersistenceSuccess(capturedAt);
                  })
                  .catch((error: unknown) => {
                    uMonitorRuntimeStore.setPersistenceError(
                      capturedAt,
                      error instanceof Error ? error.message : String(error)
                    );
                  });
              }, options.persistDebounceMs ?? 250);
            }
          }
        })
    );

  for (const agent of agents) {
    agent.start();
  }

  return {
    stop() {
      if (persistTimer) {
        clearTimeout(persistTimer);
        persistTimer = null;
      }
      for (const agent of agents) {
        agent.stop();
      }
    }
  };
}

function createDefaultPancakeFetcher() {
  const rpcUrl = process.env.U_MONITOR_BSC_RPC_URL;
  if (!rpcUrl) return undefined;

  return (poolAddress: string) =>
    readPancakeV3PoolSnapshot(rpcUrl, {
      poolAddress,
      baseTokenAddress: U_MONITOR_CONTRACT_ADDRESS,
      quoteVolume24h: uMonitorRuntimeStore.get("PancakeSwap V3")?.quoteVolume24h
    });
}

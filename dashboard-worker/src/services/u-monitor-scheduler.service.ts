import { U_MONITOR_CONTRACT_ADDRESS } from "@/server/u-monitor/registry";
import { readBscUMonitorTotalSupplyFromRpc } from "@/server/u-monitor/supply-reader";
import { insertSupplySnapshot } from "@worker/repositories/u-monitor.repository";
import type { WorkerEnv } from "@worker/types";

type UMonitorSchedulerDeps = {
  readSupplyFromRpc: typeof readBscUMonitorTotalSupplyFromRpc;
};

const defaultDeps: UMonitorSchedulerDeps = {
  readSupplyFromRpc: readBscUMonitorTotalSupplyFromRpc
};

export async function snapshotUMonitorSupply(
  env: WorkerEnv,
  capturedAt: string,
  deps: UMonitorSchedulerDeps = defaultDeps
) {
  if (!env.U_MONITOR_BSC_HTTP_URL) {
    return {
      capturedAt,
      totalSupply: 0,
      written: false
    };
  }

  const totalSupply = await deps.readSupplyFromRpc(env.U_MONITOR_BSC_HTTP_URL, "http");
  await insertSupplySnapshot(env.DB, {
    capturedAt,
    contractAddress: U_MONITOR_CONTRACT_ADDRESS,
    chainId: Number(env.U_MONITOR_BSC_CHAIN_ID ?? "56"),
    totalSupply
  });

  return {
    capturedAt,
    totalSupply,
    written: true
  };
}

import {
  getUMonitorDepeg,
  getUMonitorOverview,
  getUMonitorSupply,
  type UMonitorOverview
} from "@/server/u-monitor-service";
import { resolveUMonitorWorkerUrl } from "@/server/u-monitor-config";

type LocalQueryDeps = {
  getOverview: typeof getUMonitorOverview;
  getDepeg: typeof getUMonitorDepeg;
  getSupply: typeof getUMonitorSupply;
};

type QueryOptions = {
  workerUrl?: string;
  fetchImpl?: typeof fetch;
  local?: LocalQueryDeps;
};

type UMonitorDepegResponse = Awaited<ReturnType<typeof getUMonitorDepeg>>;
type UMonitorSupplyResponse = Awaited<ReturnType<typeof getUMonitorSupply>>;

const defaultLocal: LocalQueryDeps = {
  getOverview: getUMonitorOverview,
  getDepeg: getUMonitorDepeg,
  getSupply: getUMonitorSupply
};

function resolveWorkerUrl(explicit?: string) {
  return resolveUMonitorWorkerUrl(explicit);
}

async function fetchWorkerJson<T>(path: string, options: QueryOptions): Promise<T | null> {
  const workerUrl = resolveWorkerUrl(options.workerUrl);
  if (!workerUrl) return null;

  const fetchImpl = options.fetchImpl ?? fetch;
  let response: Response;

  try {
    response = await fetchImpl(`${workerUrl}${path}`, {
      cache: "no-store"
    });
  } catch {
    return null;
  }

  if (!response.ok) {
    return null;
  }

  return (await response.json()) as T;
}

export async function queryUMonitorOverview(options: QueryOptions = {}): Promise<UMonitorOverview> {
  const remote = await fetchWorkerJson<UMonitorOverview>("/api/v1/u-monitor/overview", options);
  if (remote) return remote;
  return (options.local ?? defaultLocal).getOverview();
}

export async function queryUMonitorDepeg(options: QueryOptions = {}): Promise<UMonitorDepegResponse> {
  const remote = await fetchWorkerJson<UMonitorDepegResponse>("/api/v1/u-monitor/depeg", options);
  if (remote) return remote;
  return (options.local ?? defaultLocal).getDepeg();
}

export async function queryUMonitorSupply(options: QueryOptions = {}): Promise<UMonitorSupplyResponse> {
  const remote = await fetchWorkerJson<UMonitorSupplyResponse>("/api/v1/u-monitor/supply", options);
  if (remote) return remote;
  return (options.local ?? defaultLocal).getSupply();
}

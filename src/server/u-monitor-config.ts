export const U_MONITOR_WORKER_FALLBACK_URL = "https://u-dashboard.ccczyyyyyy.workers.dev";

export function resolveUMonitorWorkerUrl(explicit?: string) {
  return explicit ?? process.env.U_MONITOR_WORKER_URL ?? process.env.NEXT_PUBLIC_API_BASE_URL ?? U_MONITOR_WORKER_FALLBACK_URL;
}

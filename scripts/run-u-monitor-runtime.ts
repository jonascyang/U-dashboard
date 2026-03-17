import { postUMonitorPersistencePayload } from "@/server/u-monitor/persistence-client";
import { startUMonitorRuntime } from "@/server/u-monitor/runtime-bootstrap";
import { uMonitorSources } from "@/server/u-monitor/registry";
import { uMonitorRuntimeStore } from "@/server/u-monitor/runtime-store";

const requestedVenues = process.env.U_MONITOR_VENUES
  ? process.env.U_MONITOR_VENUES.split(",").map((venue) => venue.trim()).filter(Boolean)
  : uMonitorSources.map((source) => source.venue);
const persistUrl = process.env.U_MONITOR_PERSIST_URL;
const persistToken = process.env.U_MONITOR_PERSIST_TOKEN;

const runtime = startUMonitorRuntime({
  venues: requestedVenues.filter((venue): venue is (typeof uMonitorSources)[number]["venue"] =>
    uMonitorSources.some((source) => source.venue === venue)
  ),
  persistSnapshot: persistUrl
    ? async (payload) => {
        await postUMonitorPersistencePayload(persistUrl, payload, {
          authToken: persistToken
        });
      }
    : undefined
});

console.log("U monitor runtime started for venues:", requestedVenues.join(", "));

const interval = setInterval(() => {
  const rows = uMonitorSources
    .filter((source) => requestedVenues.includes(source.venue))
    .map((source) => ({
      venue: source.venue,
      snapshot: uMonitorRuntimeStore.get(source.venue) ?? null
    }));

  console.log(JSON.stringify({ ts: new Date().toISOString(), rows }, null, 2));
}, 15_000);

for (const signal of ["SIGINT", "SIGTERM"] as const) {
  process.on(signal, () => {
    clearInterval(interval);
    runtime.stop();
    process.exit(0);
  });
}

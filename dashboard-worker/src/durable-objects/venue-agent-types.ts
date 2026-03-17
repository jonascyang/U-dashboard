import type { UMonitorMarketSnapshot } from "@/server/u-monitor/connectors";
import type { UMonitorSource } from "@/server/u-monitor/registry";

export type VenueAgentSource = Pick<
  UMonitorSource,
  "venue" | "pair" | "sourceType" | "marketSymbol" | "websocketUrl" | "restUrl" | "fallbackQuoteVolume24h"
>;

export type VenueAgentQueueMessage = UMonitorMarketSnapshot & {
  venue: VenueAgentSource["venue"];
  pair: VenueAgentSource["pair"];
  sourceType: VenueAgentSource["sourceType"];
  status: "live";
};

export type VenueAgentSocket = {
  send: (payload: string) => void;
};

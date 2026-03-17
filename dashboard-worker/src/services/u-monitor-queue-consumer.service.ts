import {
  insertPriceSourceSnapshots,
  insertWeightedPriceSnapshot,
  listLatestPriceSourceSnapshots,
  type UMonitorPriceSourceSnapshotInsert
} from "@worker/repositories/u-monitor.repository";
import type { D1DatabaseLike } from "@worker/types";

type VenueEvent = {
  venue: string;
  pair: string;
  sourceType: "CEX" | "DEX";
  latestPrice: number;
  bid?: number;
  ask?: number;
  quoteVolume24h: number;
  updatedAt: string;
  status: "live" | "stale" | "error";
};

export async function consumeUMonitorVenueEvents(db: D1DatabaseLike, events: VenueEvent[]) {
  const validEvents = events.filter(
    (event): event is VenueEvent =>
      typeof event.latestPrice === "number" &&
      Number.isFinite(event.latestPrice) &&
      typeof event.quoteVolume24h === "number" &&
      Number.isFinite(event.quoteVolume24h)
  );
  const latestEvents = Array.from(
    validEvents
      .reduce((map, event) => {
        const current = map.get(event.venue);
        if (!current || event.updatedAt > current.updatedAt) {
          map.set(event.venue, event);
        }
        return map;
      }, new Map<string, VenueEvent>())
      .values()
  );

  if (latestEvents.length === 0) {
    return {
      capturedAt: new Date(0).toISOString(),
      priceSourcesInserted: 0,
      weightedPriceWritten: false,
      weightedPrice: 0
    };
  }

  const persistedLatestEvents = await listLatestPriceSourceSnapshots(db);
  const mergedEvents = persistedLatestEvents.reduce((map, event) => {
    map.set(event.venue, {
      venue: event.venue,
      pair: event.pair,
      sourceType: event.sourceType,
      latestPrice: event.latestPrice,
      bid: event.bid,
      ask: event.ask,
      quoteVolume24h: event.quoteVolume24h,
      updatedAt: event.capturedAt,
      status: event.status
    });
    return map;
  }, new Map<string, VenueEvent>());
  for (const event of latestEvents) {
    mergedEvents.set(event.venue, event);
  }
  const effectiveEvents = Array.from(mergedEvents.values());

  const capturedAt = effectiveEvents.reduce(
    (latest, event) => (event.updatedAt > latest ? event.updatedAt : latest),
    effectiveEvents[0]!.updatedAt
  );
  const totalQuoteVolume = effectiveEvents.reduce((sum, event) => sum + event.quoteVolume24h, 0);
  const priceSources: UMonitorPriceSourceSnapshotInsert[] = effectiveEvents.map((event) => ({
    venue: event.venue,
    pair: event.pair,
    sourceType: event.sourceType,
    latestPrice: event.latestPrice,
    bid: event.bid,
    ask: event.ask,
    quoteVolume24h: event.quoteVolume24h,
    weightPercent: totalQuoteVolume === 0 ? 0 : (event.quoteVolume24h / totalQuoteVolume) * 100,
    status: event.status
  }));
  const weightedPrice =
    totalQuoteVolume === 0
      ? 0
      : effectiveEvents.reduce((sum, event) => sum + event.latestPrice * event.quoteVolume24h, 0) / totalQuoteVolume;

  const priceSourcesInserted = await insertPriceSourceSnapshots(db, capturedAt, priceSources);
  await insertWeightedPriceSnapshot(db, {
    capturedAt,
    weightedPrice,
    baselinePrice: 1,
    sourceCount: priceSources.length,
    componentsJson: JSON.stringify(
      priceSources.map((row) => ({
        venue: row.venue,
        latestPrice: row.latestPrice,
        quoteVolume24h: row.quoteVolume24h,
        weightPercent: row.weightPercent,
        status: row.status
      }))
    )
  });

  return {
    capturedAt,
    priceSourcesInserted,
    weightedPriceWritten: true,
    weightedPrice
  };
}

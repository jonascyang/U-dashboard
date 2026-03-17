type LiveSnapshot = {
  latestPrice?: number;
  quoteVolume24h?: number;
  bid?: number;
  ask?: number;
  updatedAt: string;
  status: "live" | "stale" | "error";
};

type VenueHealth = {
  status: "connecting" | "live" | "reconnecting" | "stopped" | "error";
  updatedAt: string;
  detail?: string;
};

type PersistenceHealth = {
  status: "idle" | "pending" | "ok" | "error";
  lastAttemptAt?: string;
  lastSuccessAt?: string;
  lastErrorAt?: string;
  errorMessage?: string;
};

type SeedSource = {
  venue: string;
  latestPrice: number;
  quoteVolume24h: number;
  updatedAt: string;
  status: "live" | "stale";
};

class UMonitorRuntimeStore {
  private snapshots = new Map<string, LiveSnapshot>();
  private venueHealth = new Map<string, VenueHealth>();
  private persistenceHealth: PersistenceHealth = { status: "idle" };

  upsert(venue: string, snapshot: LiveSnapshot) {
    this.snapshots.set(venue, snapshot);
  }

  get(venue: string) {
    return this.snapshots.get(venue);
  }

  setVenueHealth(venue: string, health: VenueHealth) {
    this.venueHealth.set(venue, health);
  }

  getVenueHealth(venue: string) {
    return this.venueHealth.get(venue);
  }

  setPersistencePending(at: string) {
    this.persistenceHealth = {
      ...this.persistenceHealth,
      status: "pending",
      lastAttemptAt: at,
      errorMessage: undefined
    };
  }

  setPersistenceSuccess(at: string) {
    this.persistenceHealth = {
      ...this.persistenceHealth,
      status: "ok",
      lastAttemptAt: at,
      lastSuccessAt: at,
      errorMessage: undefined
    };
  }

  setPersistenceError(at: string, errorMessage: string) {
    this.persistenceHealth = {
      ...this.persistenceHealth,
      status: "error",
      lastAttemptAt: at,
      lastErrorAt: at,
      errorMessage
    };
  }

  getPersistenceHealth() {
    return this.persistenceHealth;
  }

  clear() {
    this.snapshots.clear();
    this.venueHealth.clear();
    this.persistenceHealth = { status: "idle" };
  }

  materialize<T extends SeedSource>(seedSources: T[]): T[] {
    return seedSources.map((seed) => {
      const live = this.snapshots.get(seed.venue);
      if (!live) return seed;

      return {
        ...seed,
        latestPrice: live.latestPrice ?? seed.latestPrice,
        quoteVolume24h: live.quoteVolume24h ?? seed.quoteVolume24h,
        updatedAt: live.updatedAt,
        status: live.status === "error" ? "stale" : live.status
      };
    });
  }
}

export const uMonitorRuntimeStore = new UMonitorRuntimeStore();

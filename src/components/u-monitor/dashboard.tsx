"use client";

import { startTransition, useEffect, useState } from "react";

import { DepegChart } from "@/components/u-monitor/depeg-chart";
import { PriceCard } from "@/components/u-monitor/price-card";
import { SourceTable } from "@/components/u-monitor/source-table";
import { SupplyCard } from "@/components/u-monitor/supply-card";
import { U_MONITOR_WORKER_FALLBACK_URL } from "@/server/u-monitor-config";
import type { UDepegPoint, UMonitorOverview } from "@/server/u-monitor-service";

type UMonitorDepeg = {
  updatedAt: string;
  baselinePrice: number;
  maxDeviationValue30d: number;
  maxDeviationPercent30d: number;
  maxDeviationAt30d: string;
  series: UDepegPoint[];
};

type DashboardState = {
  overview: UMonitorOverview | null;
  depeg: UMonitorDepeg | null;
  error: string | null;
};

const initialState: DashboardState = {
  overview: null,
  depeg: null,
  error: null
};

export function UMonitorDashboard() {
  const [{ overview, depeg, error }, setState] = useState(initialState);

  useEffect(() => {
    let cancelled = false;
    const apiBase = process.env.NEXT_PUBLIC_API_BASE_URL ?? U_MONITOR_WORKER_FALLBACK_URL;

    async function load() {
      try {
        const [overviewResponse, depegResponse] = await Promise.all([
          fetch(`${apiBase}/api/v1/u-monitor/overview`, { cache: "no-store" }),
          fetch(`${apiBase}/api/v1/u-monitor/depeg`, { cache: "no-store" })
        ]);

        if (!overviewResponse.ok || !depegResponse.ok) {
          throw new Error("dashboard fetch failed");
        }

        const [nextOverview, nextDepeg] = (await Promise.all([
          overviewResponse.json(),
          depegResponse.json()
        ])) as [UMonitorOverview, UMonitorDepeg];

        if (cancelled) return;

        startTransition(() => {
          setState({
            overview: nextOverview,
            depeg: nextDepeg,
            error: null
          });
        });
      } catch {
        if (cancelled) return;

        startTransition(() => {
          setState({
            overview: null,
            depeg: null,
            error: "Unable to load monitor data."
          });
        });
      }
    }

    load();

    return () => {
      cancelled = true;
    };
  }, []);

  if (error) {
    return (
      <section className="panel">
        <h1 style={{ marginTop: 0 }}>U Stablecoin Monitor</h1>
        <p>{error}</p>
      </section>
    );
  }

  if (!overview || !depeg) {
    return (
      <section className="panel">
        <h1 style={{ marginTop: 0 }}>U Stablecoin Monitor</h1>
        <p>Loading monitor...</p>
      </section>
    );
  }

  return (
    <div className="grid">
      <header className="header-row">
        <div>
          <p className="monitor-kicker">Internal Ops Risk Dashboard</p>
          <h1 style={{ margin: 0 }}>U Stablecoin Monitor</h1>
          <p style={{ margin: "4px 0 0", color: "#667085" }}>
            {overview.chain} · {overview.symbol} · Contract {overview.contractAddress}
          </p>
        </div>
        <small>Updated: {overview.updatedAt}</small>
      </header>

      <section className="grid monitor-grid">
        <PriceCard updatedAt={overview.updatedAt} weightedPrice={overview.weightedPrice} priceSources={overview.priceSources} />
        <DepegChart
          maxDeviationAt30d={depeg.maxDeviationAt30d}
          maxDeviationPercent30d={depeg.maxDeviationPercent30d}
          maxDeviationValue30d={depeg.maxDeviationValue30d}
          series={depeg.series}
        />
        <SupplyCard totalSupply={overview.totalSupply} supplyDeltas={overview.supplyDeltas} />
      </section>

      <SourceTable rows={overview.priceSources} />
    </div>
  );
}

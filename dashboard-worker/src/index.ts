import { runHourlyPipeline } from "@worker/cron/hourly";
import { BinanceUMonitor, HtxUMonitor, LBankUMonitor, PancakeUMonitor } from "@worker/durable-objects/venue-agent";
import { validateEnv } from "@worker/env";
import { handleAlertsGet, handleAlertsPatch } from "@worker/routes/alerts";
import { handleMarkets } from "@worker/routes/markets";
import { handleOverview } from "@worker/routes/overview";
import { handleTimeseries } from "@worker/routes/timeseries";
import {
  handleUMonitorDepeg,
  handleUMonitorOverview,
  handleUMonitorPersist,
  handleUMonitorStart,
  handleUMonitorSupply
} from "@worker/routes/u-monitor";
import { consumeUMonitorVenueEvents } from "@worker/services/u-monitor-queue-consumer.service";
import { snapshotUMonitorSupply } from "@worker/services/u-monitor-scheduler.service";
import type { WorkerEnv } from "@worker/types";

type ScheduledControllerLike = {
  scheduledTime: number;
};

type ExecutionContextLike = {
  waitUntil: (promise: Promise<unknown>) => void;
};

type QueueMessageLike<T> = {
  body: T;
};

type MessageBatchLike<T> = {
  messages: QueueMessageLike<T>[];
};

function notFound() {
  return Response.json({ error: "not found" }, { status: 404 });
}

export default {
  async fetch(request: Request, envInput: Partial<WorkerEnv>): Promise<Response> {
    const env = validateEnv(envInput);
    const url = new URL(request.url);
    const pathname = url.pathname;

    if (request.method === "GET" && pathname === "/api/v1/overview") {
      return handleOverview(request, env);
    }
    if (request.method === "GET" && pathname === "/api/v1/markets") {
      return handleMarkets(request, env);
    }
    if (request.method === "GET" && pathname === "/api/v1/alerts") {
      return handleAlertsGet(request, env);
    }
    if (request.method === "PATCH" && pathname.startsWith("/api/v1/alerts/")) {
      const id = pathname.slice("/api/v1/alerts/".length);
      return handleAlertsPatch(request, env, id);
    }
    if (request.method === "GET" && pathname === "/api/v1/metrics/timeseries") {
      return handleTimeseries(request, env);
    }
    if (request.method === "POST" && pathname === "/api/v1/u-monitor/persist") {
      return handleUMonitorPersist(request, env);
    }
    if (request.method === "POST" && pathname === "/api/v1/u-monitor/start") {
      return handleUMonitorStart(request, env);
    }
    if (request.method === "GET" && pathname === "/api/v1/u-monitor/overview") {
      return handleUMonitorOverview(request, env);
    }
    if (request.method === "GET" && pathname === "/api/v1/u-monitor/depeg") {
      return handleUMonitorDepeg(request, env);
    }
    if (request.method === "GET" && pathname === "/api/v1/u-monitor/supply") {
      return handleUMonitorSupply(request, env);
    }

    return notFound();
  },

  async scheduled(controller: ScheduledControllerLike, envInput: Partial<WorkerEnv>, ctx: ExecutionContextLike) {
    const env = validateEnv(envInput);
    const scheduledAt = new Date(controller.scheduledTime);
    const capturedAt = scheduledAt.toISOString();

    if (scheduledAt.getUTCMinutes() === 0) {
      ctx.waitUntil(runHourlyPipeline(env, capturedAt));
      ctx.waitUntil(snapshotUMonitorSupply(env, capturedAt));
    }
  },

  async queue(batch: MessageBatchLike<Parameters<typeof consumeUMonitorVenueEvents>[1][number]>, envInput: Partial<WorkerEnv>) {
    const env = validateEnv(envInput);
    await consumeUMonitorVenueEvents(
      env.DB,
      batch.messages.map((message) => message.body)
    );
  }
};

export { BinanceUMonitor, HtxUMonitor, LBankUMonitor, PancakeUMonitor };

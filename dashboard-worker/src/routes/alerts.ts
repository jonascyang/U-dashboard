import { listAlerts, updateAlertStatus } from "@worker/repositories/alerts.repository";
import type { WorkerEnv } from "@worker/types";

export async function handleAlertsGet(request: Request, env: WorkerEnv): Promise<Response> {
  const url = new URL(request.url);
  const status = url.searchParams.get("status") ?? undefined;
  const levels = url.searchParams.get("level")?.split(",").filter(Boolean);

  const rows = await listAlerts(env.DB, {
    status,
    levels
  });
  return Response.json({ rows });
}

type PatchBody = {
  status?: "active" | "acknowledged" | "resolved" | "silenced";
  note?: string;
};

export async function handleAlertsPatch(request: Request, env: WorkerEnv, id: string): Promise<Response> {
  const body = (await request.json()) as PatchBody;
  const updated = await updateAlertStatus(env.DB, id, {
    status: body.status,
    note: body.note
  });
  if (!updated) {
    return Response.json({ error: "alert not found" }, { status: 404 });
  }
  return Response.json(updated);
}

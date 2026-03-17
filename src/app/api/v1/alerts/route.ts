import { queryAlerts } from "@/server/dashboard-service";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const status = searchParams.get("status") ?? undefined;
  const levels = searchParams.get("level")?.split(",").filter(Boolean);

  const rows = await queryAlerts({ status, levels });
  return Response.json({ rows });
}

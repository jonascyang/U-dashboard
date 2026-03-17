import { queryUMonitorSupply } from "@/server/u-monitor-query";

export async function GET() {
  return Response.json(await queryUMonitorSupply());
}

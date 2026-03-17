import { queryTimeseries } from "@/server/dashboard-service";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const metric = searchParams.get("metric") || "tvl_usd";
  const points = await queryTimeseries(metric);
  return Response.json({ metric, points });
}

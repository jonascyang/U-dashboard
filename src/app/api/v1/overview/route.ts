import { queryOverview24h } from "@/server/dashboard-service";

export async function GET() {
  const data = await queryOverview24h();
  return Response.json(data);
}

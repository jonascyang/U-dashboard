import { queryMarkets } from "@/server/dashboard-service";

export async function GET() {
  const rows = await queryMarkets();
  return Response.json({ rows });
}

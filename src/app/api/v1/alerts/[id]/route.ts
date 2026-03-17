import { updateAlertStatus } from "@/server/dashboard-service";

type PatchBody = {
  status?: "active" | "acknowledged" | "resolved" | "silenced";
  note?: string;
};

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const body = (await request.json()) as PatchBody;

  const updated = await updateAlertStatus(id, {
    status: body.status,
    note: body.note
  });
  if (!updated) {
    return Response.json({ error: "alert not found" }, { status: 404 });
  }
  return Response.json(updated);
}

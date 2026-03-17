import { describe, expect, it } from "vitest";

import { GET as GET_alerts } from "@/app/api/v1/alerts/route";
import { PATCH as PATCH_alert } from "@/app/api/v1/alerts/[id]/route";
import { seedAlert } from "@/server/dashboard-service";

describe("alerts api", () => {
  it("lists and updates alerts", async () => {
    seedAlert({
      id: "a1",
      level: "warning",
      status: "active",
      ruleCode: "UTILIZATION_WARNING",
      marketId: "eth-usdc",
      metricKey: "utilization",
      currentValue: 0.86,
      thresholdValue: 0.85,
      firstSeenAt: "2026-02-25T00:00:00.000Z",
      lastSeenAt: "2026-02-25T01:00:00.000Z"
    });

    const listRes = await GET_alerts(new Request("http://localhost/api/v1/alerts?status=active"));
    const listBody = await listRes.json();
    expect(listBody.rows.length).toBeGreaterThan(0);

    const patchRes = await PATCH_alert(
      new Request("http://localhost/api/v1/alerts/a1", {
        method: "PATCH",
        body: JSON.stringify({ status: "acknowledged", note: "checking" })
      }),
      { params: Promise.resolve({ id: "a1" }) }
    );
    const patched = await patchRes.json();
    expect(patched.status).toBe("acknowledged");
  });
});

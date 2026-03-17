import { describe, expect, it } from "vitest";

import worker from "../../src/index";
import { createMockD1 } from "../helpers/mock-d1";

describe("worker routes: alerts", () => {
  it("lists and updates alerts", async () => {
    const { db } = createMockD1({
      all(query) {
        if (query.includes("FROM alerts")) {
          return [
            {
              id: "a1",
              hourTs: "2026-02-25T10:00:00.000Z",
              level: "warning",
              ruleCode: "UTILIZATION_WARNING",
              marketId: "eth-usdc",
              metricKey: "utilization",
              currentValue: 0.86,
              thresholdValue: 0.85,
              baselineValue: null,
              status: "active",
              dedupKey: "UTILIZATION_WARNING:eth-usdc",
              firstSeenAt: "2026-02-25T10:00:00.000Z",
              lastSeenAt: "2026-02-25T10:00:00.000Z",
              assignee: null,
              note: null
            }
          ];
        }
        return [];
      },
      first(query) {
        if (query.includes("FROM alerts WHERE id = ?")) {
          return {
            id: "a1",
            hourTs: "2026-02-25T10:00:00.000Z",
            level: "warning",
            ruleCode: "UTILIZATION_WARNING",
            marketId: "eth-usdc",
            metricKey: "utilization",
            currentValue: 0.86,
            thresholdValue: 0.85,
            baselineValue: null,
            status: "acknowledged",
            dedupKey: "UTILIZATION_WARNING:eth-usdc",
            firstSeenAt: "2026-02-25T10:00:00.000Z",
            lastSeenAt: "2026-02-25T11:00:00.000Z",
            assignee: null,
            note: "checking"
          };
        }
        return null;
      }
    });

    const listRes = await worker.fetch(new Request("https://example.com/api/v1/alerts?status=active"), {
      DB: db as any,
      ETH_RPC_URL: "https://rpc.example"
    });
    const listBody = (await listRes.json()) as { rows: unknown[] };
    expect(listBody.rows.length).toBe(1);

    const patchRes = await worker.fetch(
      new Request("https://example.com/api/v1/alerts/a1", {
        method: "PATCH",
        body: JSON.stringify({ status: "acknowledged", note: "checking" })
      }),
      {
        DB: db as any,
        ETH_RPC_URL: "https://rpc.example"
      }
    );
    const patched = (await patchRes.json()) as { status: string };
    expect(patched.status).toBe("acknowledged");
  });
});

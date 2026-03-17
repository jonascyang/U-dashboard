import { describe, expect, it } from "vitest";

import { readBscUMonitorTotalSupply } from "@/server/u-monitor/supply-reader";

describe("readBscUMonitorTotalSupply", () => {
  it("reads decimals and totalSupply from the token contract", async () => {
    const calls: string[] = [];
    const client = {
      readContract: async ({ functionName }: { functionName: string }) => {
        calls.push(functionName);
        if (functionName === "decimals") return 18;
        if (functionName === "totalSupply") return 122_040_000000000000000000000n;
        throw new Error(`Unexpected function ${functionName}`);
      }
    };

    const totalSupply = await readBscUMonitorTotalSupply(client as never);

    expect(calls).toEqual(["decimals", "totalSupply"]);
    expect(totalSupply).toBe(122_040_000);
  });
});

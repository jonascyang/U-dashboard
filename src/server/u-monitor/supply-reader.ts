import { createPublicClient, formatUnits, http, webSocket, type PublicClient } from "viem";
import { bsc } from "viem/chains";

import { U_MONITOR_CONTRACT_ADDRESS } from "@/server/u-monitor/registry";

const erc20SupplyAbi = [
  {
    type: "function",
    stateMutability: "view",
    name: "decimals",
    inputs: [],
    outputs: [{ name: "", type: "uint8" }]
  },
  {
    type: "function",
    stateMutability: "view",
    name: "totalSupply",
    inputs: [],
    outputs: [{ name: "", type: "uint256" }]
  }
] as const;

type SupplyClient = Pick<PublicClient, "readContract">;

export function createBscMonitorClient(rpcUrl: string, transport: "http" | "websocket" = "http") {
  return createPublicClient({
    chain: bsc,
    transport: transport === "websocket" ? webSocket(rpcUrl) : http(rpcUrl)
  });
}

export async function readBscUMonitorTotalSupply(client: SupplyClient): Promise<number> {
  const decimals = await client.readContract({
    address: U_MONITOR_CONTRACT_ADDRESS,
    abi: erc20SupplyAbi,
    functionName: "decimals"
  });
  const totalSupply = await client.readContract({
    address: U_MONITOR_CONTRACT_ADDRESS,
    abi: erc20SupplyAbi,
    functionName: "totalSupply"
  });

  return Number(formatUnits(totalSupply, decimals));
}

export async function readBscUMonitorTotalSupplyFromRpc(
  rpcUrl: string,
  transport: "http" | "websocket" = "http"
): Promise<number> {
  const client = createBscMonitorClient(rpcUrl, transport);
  return readBscUMonitorTotalSupply(client);
}

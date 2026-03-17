import { createPublicClient, http, type PublicClient } from "viem";
import { bsc } from "viem/chains";

type PancakeClient = Pick<PublicClient, "readContract">;

const poolAbi = [
  {
    type: "function",
    stateMutability: "view",
    name: "token0",
    inputs: [],
    outputs: [{ name: "", type: "address" }]
  },
  {
    type: "function",
    stateMutability: "view",
    name: "token1",
    inputs: [],
    outputs: [{ name: "", type: "address" }]
  },
  {
    type: "function",
    stateMutability: "view",
    name: "slot0",
    inputs: [],
    outputs: [
      { name: "sqrtPriceX96", type: "uint160" },
      { name: "tick", type: "int24" },
      { name: "observationIndex", type: "uint16" },
      { name: "observationCardinality", type: "uint16" },
      { name: "observationCardinalityNext", type: "uint16" },
      { name: "feeProtocol", type: "uint8" },
      { name: "unlocked", type: "bool" }
    ]
  }
] as const;

const erc20DecimalsAbi = [
  {
    type: "function",
    stateMutability: "view",
    name: "decimals",
    inputs: [],
    outputs: [{ name: "", type: "uint8" }]
  }
] as const;

export function computePancakeV3PriceFromSlot0(input: {
  sqrtPriceX96: bigint;
  token0Address: string;
  token1Address: string;
  token0Decimals: number;
  token1Decimals: number;
  baseTokenAddress: string;
}) {
  const sqrtPrice = Number(input.sqrtPriceX96) / 2 ** 96;
  const token1PerToken0 = sqrtPrice * sqrtPrice * 10 ** (input.token0Decimals - input.token1Decimals);
  const baseIsToken0 = input.token0Address.toLowerCase() === input.baseTokenAddress.toLowerCase();
  return baseIsToken0 ? token1PerToken0 : 1 / token1PerToken0;
}

function extractSqrtPriceX96(slot0: unknown): bigint {
  if (Array.isArray(slot0)) {
    return slot0[0] as bigint;
  }

  if (typeof slot0 === "object" && slot0 !== null && "sqrtPriceX96" in slot0) {
    return slot0.sqrtPriceX96 as bigint;
  }

  return slot0 as bigint;
}

export async function readPancakeV3PoolSnapshot(
  clientOrRpcUrl: PancakeClient | string,
  input: {
    poolAddress: string;
    baseTokenAddress: string;
    quoteVolume24h?: number;
  }
) {
  const client =
    typeof clientOrRpcUrl === "string"
      ? createPublicClient({
          chain: bsc,
          transport: http(clientOrRpcUrl)
        })
      : clientOrRpcUrl;

  const [token0Address, token1Address, slot0] = await Promise.all([
    client.readContract({ address: input.poolAddress as `0x${string}`, abi: poolAbi, functionName: "token0" }),
    client.readContract({ address: input.poolAddress as `0x${string}`, abi: poolAbi, functionName: "token1" }),
    client.readContract({ address: input.poolAddress as `0x${string}`, abi: poolAbi, functionName: "slot0" })
  ]);

  const [token0Decimals, token1Decimals] = await Promise.all([
    client.readContract({ address: token0Address, abi: erc20DecimalsAbi, functionName: "decimals" }),
    client.readContract({ address: token1Address, abi: erc20DecimalsAbi, functionName: "decimals" })
  ]);

  const sqrtPriceX96 = extractSqrtPriceX96(slot0);

  return {
    latestPrice: computePancakeV3PriceFromSlot0({
      sqrtPriceX96,
      token0Address,
      token1Address,
      token0Decimals,
      token1Decimals,
      baseTokenAddress: input.baseTokenAddress
    }),
    quoteVolume24h: input.quoteVolume24h,
    updatedAt: new Date().toISOString()
  };
}

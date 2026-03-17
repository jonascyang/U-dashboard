import type { D1DatabaseLike } from "@worker/types";

import {
  insertPriceSourceSnapshots,
  insertSupplySnapshot,
  insertWeightedPriceSnapshot,
  type UMonitorPriceSourceSnapshotInsert
} from "../repositories/u-monitor.repository";

export async function persistUMonitorSnapshot(
  db: D1DatabaseLike,
  input: {
    capturedAt: string;
    weightedPrice: {
      weightedPrice: number;
      baselinePrice: number;
      sourceCount: number;
      componentsJson: string;
    };
    priceSources: UMonitorPriceSourceSnapshotInsert[];
    supply: {
      contractAddress: string;
      chainId: number;
      totalSupply: number;
    };
  }
) {
  const priceSourcesInserted = await insertPriceSourceSnapshots(db, input.capturedAt, input.priceSources);
  await insertWeightedPriceSnapshot(db, {
    capturedAt: input.capturedAt,
    weightedPrice: input.weightedPrice.weightedPrice,
    baselinePrice: input.weightedPrice.baselinePrice,
    sourceCount: input.weightedPrice.sourceCount,
    componentsJson: input.weightedPrice.componentsJson
  });
  await insertSupplySnapshot(db, {
    capturedAt: input.capturedAt,
    contractAddress: input.supply.contractAddress,
    chainId: input.supply.chainId,
    totalSupply: input.supply.totalSupply
  });

  return {
    priceSourcesInserted,
    weightedPriceWritten: true,
    supplyWritten: true
  };
}

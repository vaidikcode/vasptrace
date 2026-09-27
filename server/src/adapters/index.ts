import { Chain, ChainAdapter } from "../types";
import { bitcoinAdapter } from "./bitcoinAdapter";
import { ethereumAdapter } from "./ethereumAdapter";
import { tronAdapter } from "./tronAdapter";

const registry: Record<Chain, ChainAdapter> = {
  BTC: bitcoinAdapter,
  ETH: ethereumAdapter,
  TRON: tronAdapter,
};

export function getAdapter(chain: Chain): ChainAdapter {
  const adapter = registry[chain];
  if (!adapter) throw new Error(`No chain adapter registered for ${chain}`);
  return adapter;
}

export { bitcoinAdapter, ethereumAdapter, tronAdapter };

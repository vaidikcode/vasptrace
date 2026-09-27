import path from "path";
import {
  AddressLookupOptions,
  ChainAdapter,
  NormalizedTransfer,
} from "../types";
import { FIXTURES_DIR } from "../config/paths";
import { listJsonFiles, readJsonFile } from "../util/fsStore";

// Prototype note: a live implementation would call an EVM JSON-RPC node or
// an indexer API for native + ERC20 Transfer events here, behind the same
// ChainAdapter interface.

interface RawEthTransfer {
  txId: string;
  timestamp: string;
  from: string;
  to: string;
  asset: string; // "ETH" for native, otherwise the token symbol
  tokenSymbol?: string;
  amount: number;
}

interface RawEthFile {
  synthetic: boolean;
  transfers: RawEthTransfer[];
}

const RETRIEVED_AT = "2026-09-27T00:00:00Z";

let cache: NormalizedTransfer[] | null = null;

function loadAll(): NormalizedTransfer[] {
  if (cache) return cache;
  const dir = path.join(FIXTURES_DIR, "eth");
  const transfers: NormalizedTransfer[] = [];

  for (const file of listJsonFiles(dir)) {
    const raw = readJsonFile<RawEthFile>(file);
    for (const t of raw.transfers) {
      transfers.push({
        chain: "ETH",
        txId: t.txId,
        from: t.from,
        to: t.to,
        asset: t.asset,
        amount: t.amount,
        timestamp: t.timestamp,
        hop: -1,
        source: "replay-fixture",
        retrievedAt: RETRIEVED_AT,
        tokenSymbol: t.tokenSymbol,
      });
    }
  }
  cache = transfers;
  return transfers;
}

export const ethereumAdapter: ChainAdapter = {
  chain: "ETH",
  async getTransfersForAddress(
    address: string,
    opts?: AddressLookupOptions
  ): Promise<NormalizedTransfer[]> {
    const all = loadAll();
    return all.filter((t) => {
      const matchesAddress =
        t.from.toLowerCase() === address.toLowerCase() ||
        t.to.toLowerCase() === address.toLowerCase();
      if (!matchesAddress) return false;
      if (opts?.fromTime && t.timestamp < opts.fromTime) return false;
      if (opts?.toTime && t.timestamp > opts.toTime) return false;
      return true;
    });
  },
  validateAddress(address: string): boolean {
    return /^0x[a-fA-F0-9]{40}$/.test(address);
  },
};

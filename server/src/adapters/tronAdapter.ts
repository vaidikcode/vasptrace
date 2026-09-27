import path from "path";
import {
  AddressLookupOptions,
  ChainAdapter,
  NormalizedTransfer,
} from "../types";
import { FIXTURES_DIR } from "../config/paths";
import { listJsonFiles, readJsonFile } from "../util/fsStore";

// Prototype note: a live implementation would call the TRON full-node/
// TronGrid API for native TRX and TRC20 transfers here, behind the same
// ChainAdapter interface.

interface RawTronTransfer {
  txId: string;
  timestamp: string;
  from: string;
  to: string;
  asset: string; // "TRX" for native, otherwise the token symbol
  tokenSymbol?: string;
  amount: number;
}

interface RawTronFile {
  synthetic: boolean;
  transfers: RawTronTransfer[];
}

const RETRIEVED_AT = "2026-09-27T00:00:00Z";

let cache: NormalizedTransfer[] | null = null;

function loadAll(): NormalizedTransfer[] {
  if (cache) return cache;
  const dir = path.join(FIXTURES_DIR, "tron");
  const transfers: NormalizedTransfer[] = [];

  for (const file of listJsonFiles(dir)) {
    const raw = readJsonFile<RawTronFile>(file);
    for (const t of raw.transfers) {
      transfers.push({
        chain: "TRON",
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

export const tronAdapter: ChainAdapter = {
  chain: "TRON",
  async getTransfersForAddress(
    address: string,
    opts?: AddressLookupOptions
  ): Promise<NormalizedTransfer[]> {
    const all = loadAll();
    return all.filter((t) => {
      const matchesAddress = t.from === address || t.to === address;
      if (!matchesAddress) return false;
      if (opts?.fromTime && t.timestamp < opts.fromTime) return false;
      if (opts?.toTime && t.timestamp > opts.toTime) return false;
      return true;
    });
  },
  validateAddress(address: string): boolean {
    return /^T[a-zA-Z0-9]{25,40}$/.test(address);
  },
};

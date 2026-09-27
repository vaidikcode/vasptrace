import path from "path";
import {
  AddressLookupOptions,
  ChainAdapter,
  NormalizedTransfer,
} from "../types";
import { FIXTURES_DIR } from "../config/paths";
import { listJsonFiles, readJsonFile } from "../util/fsStore";

// Prototype note: a live implementation would swap this file's body for
// calls to a block-explorer/node RPC while keeping the same ChainAdapter
// interface and the same NormalizedTransfer shape, so nothing downstream
// (graph builder, attribution, confidence) would need to change.

interface RawUtxo {
  vout: number;
  address: string;
  amount: number;
  isChange?: boolean;
}

interface RawBtcTx {
  txId: string;
  timestamp: string;
  inputs: { txId: string; vout: number; address: string; amount: number }[];
  outputs: RawUtxo[];
}

interface RawBtcFile {
  synthetic: boolean;
  transactions: RawBtcTx[];
}

const RETRIEVED_AT = "2026-09-27T00:00:00Z"; // fixed "replay" retrieval timestamp

let cache: NormalizedTransfer[] | null = null;

function loadAll(): NormalizedTransfer[] {
  if (cache) return cache;
  const dir = path.join(FIXTURES_DIR, "btc");
  const transfers: NormalizedTransfer[] = [];

  for (const file of listJsonFiles(dir)) {
    const raw = readJsonFile<RawBtcFile>(file);
    for (const tx of raw.transactions) {
      // Attribute every output back to the transaction's primary (first)
      // input address: for a suspect-controlled UTXO this is the sender.
      const primaryInput = tx.inputs[0]?.address ?? "unknown";
      for (const out of tx.outputs) {
        transfers.push({
          chain: "BTC",
          txId: tx.txId,
          from: primaryInput,
          to: out.address,
          asset: "BTC",
          amount: out.amount,
          timestamp: tx.timestamp,
          hop: -1, // filled in by graphBuilder
          source: "replay-fixture",
          retrievedAt: RETRIEVED_AT,
          isChange: out.isChange ?? false,
          utxo: {
            inputs: tx.inputs,
            outputs: tx.outputs,
          },
        });
      }
    }
  }
  cache = transfers;
  return transfers;
}

export const bitcoinAdapter: ChainAdapter = {
  chain: "BTC",
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
    // Heuristic only — see docs/PRD.md Non-functional requirements:
    // "Address-format validation is heuristic."
    return /^(bc1[a-z0-9]{20,60}|[13][a-km-zA-HJ-NP-Z1-9]{25,34})$/.test(
      address
    );
  },
};

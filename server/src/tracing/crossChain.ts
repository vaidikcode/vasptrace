import path from "path";
import { BridgeLinkRecord, Chain } from "../types";
import { FIXTURES_DIR } from "../config/paths";
import { readJsonFile } from "../util/fsStore";

interface BridgeLinksFile {
  synthetic: boolean;
  links: BridgeLinkRecord[];
}

let cache: BridgeLinkRecord[] | null = null;

function loadAll(): BridgeLinkRecord[] {
  if (cache) return cache;
  const file = path.join(FIXTURES_DIR, "bridge-links.json");
  const raw = readJsonFile<BridgeLinksFile>(file);
  cache = raw.links;
  return cache;
}

// FR-06: a cross-chain join is only ever made when an explicit matching
// record correlates the source-chain event with a destination-chain event.
// Timing or amount similarity alone is never sufficient — that is exactly
// the kind of inferred link this function refuses to make.
export function findBridgeContinuation(
  sourceChain: Chain,
  sourceTxId: string,
  sourceAddress: string
): BridgeLinkRecord | undefined {
  return loadAll().find(
    (l) =>
      l.sourceChain === sourceChain &&
      l.sourceTxId === sourceTxId &&
      l.sourceAddress === sourceAddress
  );
}

export function allBridgeLinks(): BridgeLinkRecord[] {
  return loadAll();
}

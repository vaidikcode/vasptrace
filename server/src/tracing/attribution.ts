import {
  Candidate,
  CaseInput,
  Chain,
  EvidencePathStep,
  GraphEdge,
  LabelRecord,
  TransactionGraph,
} from "../types";
import { getLabelsForAddress, hasConflictingLabels } from "../labels/labelStore";
import { computeConfidence, labelReliabilityScore } from "./confidence";
import { generateId } from "../util/fsStore";

const key = (chain: Chain, address: string) => `${chain}:${address}`;

interface RawHit {
  chain: Chain;
  address: string;
  labels: LabelRecord[];
  path: EvidencePathStep[];
  hopCount: number;
  boundaryUnresolved: boolean;
  hitCount: number;
}

// FR-04: walks the bounded graph looking for the nearest VASP encounter on
// every branch. Bridge and mixer nodes are pass-through points (the trace
// continues past them) unless the graph could not be extended past them —
// in that case they become the terminal, "possible leads only" result.
export function attributeCandidates(
  graph: TransactionGraph,
  caseInput: CaseInput
): Candidate[] {
  const adjacency = new Map<string, GraphEdge[]>();
  for (const e of graph.edges) {
    const k = key(e.fromChain, e.fromAddress);
    if (!adjacency.has(k)) adjacency.set(k, []);
    adjacency.get(k)!.push(e);
  }

  const hits = new Map<string, RawHit>();

  function recordHit(
    chain: Chain,
    address: string,
    labels: LabelRecord[],
    path: EvidencePathStep[],
    hopCount: number,
    boundaryUnresolved: boolean
  ) {
    const k = key(chain, address);
    const existing = hits.get(k);
    if (existing) {
      existing.hitCount += 1;
      if (hopCount < existing.hopCount) {
        existing.path = path;
        existing.hopCount = hopCount;
      }
    } else {
      hits.set(k, { chain, address, labels, path, hopCount, boundaryUnresolved, hitCount: 1 });
    }
  }

  function walk(
    chain: Chain,
    address: string,
    path: EvidencePathStep[],
    hopCount: number,
    visited: Set<string>
  ) {
    const k = key(chain, address);
    if (visited.has(k)) return; // guard against cycles
    const nextVisited = new Set(visited);
    nextVisited.add(k);

    if (hopCount > 0) {
      const labels = getLabelsForAddress(address, chain);
      if (labels.length > 0) {
        const primary = labels[0];
        const outEdges = adjacency.get(k) ?? [];

        if (primary.serviceType === "bridge") {
          if (outEdges.length > 0) {
            for (const e of outEdges) descend(e, path, hopCount, nextVisited);
          } else {
            recordHit(chain, address, labels, path, hopCount, true);
          }
          return;
        }

        if (primary.serviceType === "mixer") {
          recordHit(chain, address, labels, path, hopCount, false);
          return; // provenance beyond a mixer cannot be reliably attributed
        }

        // exchange / otc-desk / payment-processor / unknown-but-labelled
        recordHit(chain, address, labels, path, hopCount, false);
        return;
      }
    }

    const outEdges = adjacency.get(k) ?? [];
    for (const e of outEdges) descend(e, path, hopCount, nextVisited);
  }

  function descend(
    e: GraphEdge,
    path: EvidencePathStep[],
    hopCount: number,
    visited: Set<string>
  ) {
    if (e.transfer) {
      if (e.transfer.isChange) return; // change returns to the sender; not a third-party flow
      const step: EvidencePathStep = {
        chain: e.transfer.chain,
        from: e.fromAddress,
        to: e.toAddress,
        txId: e.transfer.txId,
        amount: e.transfer.amount,
        asset: e.transfer.asset,
        timestamp: e.transfer.timestamp,
        hop: e.hop,
      };
      walk(e.toChain, e.toAddress, [...path, step], hopCount + 1, visited);
    } else if (e.bridgeLink) {
      const step: EvidencePathStep = {
        chain: e.toChain,
        from: e.fromAddress,
        to: e.toAddress,
        txId: e.bridgeLink.destTxId,
        amount: 0,
        asset: "BRIDGE",
        timestamp: e.bridgeLink.observedAt,
        hop: e.hop,
        note: `Cross-chain crossing via ${e.bridgeLink.bridgeEntity}, matched to bridge-links record ${e.bridgeLink.id}.`,
      };
      walk(e.toChain, e.toAddress, [...path, step], hopCount + 1, visited);
    }
  }

  walk(graph.seedChain, graph.seedAddress, [], 0, new Set());

  if (hits.size === 0) {
    return [notEstablishedCandidate(graph)];
  }

  const candidates: Candidate[] = [];
  for (const hit of hits.values()) {
    candidates.push(buildCandidate(hit, caseInput));
  }

  return rankCandidates(candidates);
}

function buildCandidate(hit: RawHit, caseInput: CaseInput): Candidate {
  const primary = hit.labels[0];
  const conflicting = hasConflictingLabels(hit.labels);
  const lastValueStep = [...hit.path].reverse().find((s) => s.asset !== "BRIDGE");
  const attributableAmount = lastValueStep?.amount ?? 0;
  const asset = lastValueStep?.asset ?? "";
  const crossChain = hit.path.some((s) => s.asset === "BRIDGE");

  const confidence = computeConfidence({
    labels: hit.labels,
    path: hit.path,
    hopCount: hit.hopCount,
    caseInput,
    independentPathCount: hit.hitCount,
  });

  return {
    id: generateId("cand"),
    entity: primary.entity,
    receivingAddress: hit.address,
    chain: hit.chain,
    hopCount: hit.hopCount,
    attributableAmount,
    asset,
    addressType: primary.addressType,
    serviceType: primary.serviceType,
    confidence,
    evidencePath: hit.path,
    labelRefs: hit.labels,
    crossChain,
    boundaryUnresolved: hit.boundaryUnresolved,
    vaspNotEstablished: false,
  };
}

function notEstablishedCandidate(graph: TransactionGraph): Candidate {
  const reasons = [
    "No address reachable within the bounded transaction graph carries a matching VASP label.",
  ];
  if (graph.truncated) {
    reasons.push(
      "The graph was truncated before exhausting every path — a VASP may exist beyond the traced boundary."
    );
  }
  return {
    id: generateId("cand"),
    entity: null,
    receivingAddress: graph.seedAddress,
    chain: graph.seedChain,
    hopCount: 0,
    attributableAmount: 0,
    asset: "",
    addressType: "unknown",
    serviceType: "unknown",
    confidence: { band: "unverified", reasons, hasConflictingLabels: false },
    evidencePath: [],
    labelRefs: [],
    crossChain: false,
    boundaryUnresolved: false,
    vaspNotEstablished: true,
  };
}

// FR-04 ranking: shorter path length, larger attributable flow, better
// temporal fit, and higher label-source reliability all push a candidate up
// the list. No single factor dominates outright so a short, weakly-evidenced
// path cannot silently outrank a longer, well-evidenced one.
function rankCandidates(candidates: Candidate[]): Candidate[] {
  const score = (c: Candidate): number => {
    const reliability = c.labelRefs[0] ? labelReliabilityScore(c.labelRefs[0]) : 0;
    const amountScore = Math.min(1, Math.log10(c.attributableAmount + 1) / 5);
    const bandScore = { high: 1, medium: 0.7, low: 0.4, unverified: 0.15 }[
      c.confidence.band
    ];
    const hopPenalty = c.hopCount * 0.05;
    return reliability * 0.35 + amountScore * 0.25 + bandScore * 0.3 - hopPenalty;
  };
  return [...candidates].sort((a, b) => score(b) - score(a));
}

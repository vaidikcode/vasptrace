import { Chain, GraphEdge, GraphNode, TimeWindow, TransactionGraph } from "../types";
import { getAdapter } from "../adapters";
import { findBridgeContinuation } from "./crossChain";

export const DEFAULT_HOP_LIMIT = 4;
export const DEFAULT_TRANSFER_CAP = 500;

interface QueueItem {
  address: string;
  chain: Chain;
  hop: number;
}

const nodeKey = (chain: Chain, address: string) => `${chain}:${address}`;

export interface GraphBuilderOptions {
  hopLimit?: number;
  transferCap?: number;
  timeWindow?: TimeWindow;
}

export async function buildTransactionGraph(
  seedChain: Chain,
  seedAddress: string,
  opts: GraphBuilderOptions = {}
): Promise<TransactionGraph> {
  const hopLimit = opts.hopLimit ?? DEFAULT_HOP_LIMIT;
  const transferCap = opts.transferCap ?? DEFAULT_TRANSFER_CAP;

  const nodes: GraphNode[] = [];
  const edges: GraphEdge[] = [];
  const visited = new Set<string>();
  const queue: QueueItem[] = [];
  let truncated = false;
  let truncationReason: string | undefined;
  let transferEdgeCount = 0;

  visited.add(nodeKey(seedChain, seedAddress));
  nodes.push({ address: seedAddress, chain: seedChain, hop: 0 });
  queue.push({ address: seedAddress, chain: seedChain, hop: 0 });

  while (queue.length > 0) {
    const cur = queue.shift() as QueueItem;
    const adapter = getAdapter(cur.chain);
    const transfers = await adapter.getTransfersForAddress(cur.address, {
      fromTime: opts.timeWindow?.from,
      toTime: opts.timeWindow?.to,
    });

    const outgoing = transfers.filter(
      (t) => t.from.toLowerCase() === cur.address.toLowerCase()
    );

    for (const t of outgoing) {
      const nextHop = cur.hop + 1;

      if (nextHop > hopLimit) {
        truncated = true;
        truncationReason = `Hop limit (${hopLimit}) reached before all reachable transfers could be traced.`;
        continue;
      }
      if (transferEdgeCount >= transferCap) {
        truncated = true;
        truncationReason = `Transfer cap (${transferCap}) reached before all reachable transfers could be traced.`;
        break;
      }

      const transferAtHop = { ...t, hop: nextHop };
      edges.push({
        transfer: transferAtHop,
        fromAddress: cur.address,
        fromChain: cur.chain,
        toAddress: t.to,
        toChain: cur.chain,
        hop: nextHop,
      });
      transferEdgeCount += 1;

      const key = nodeKey(cur.chain, t.to);
      const isNewNode = !visited.has(key);
      if (isNewNode) {
        visited.add(key);
        nodes.push({ address: t.to, chain: cur.chain, hop: nextHop });
      }

      // Only follow this address further if the value genuinely continues
      // moving (not the sender's own change) — see FR-04 / scenario 3.
      if (!t.isChange && isNewNode) {
        queue.push({ address: t.to, chain: cur.chain, hop: nextHop });
      }

      // FR-06: attempt a cross-chain continuation only via an explicit
      // bridge-links.json match — never inferred from timing/amount alone.
      const link = findBridgeContinuation(cur.chain, t.txId, t.to);
      if (link) {
        const destKey = nodeKey(link.destChain, link.destAddress);
        edges.push({
          bridgeLink: link,
          fromAddress: t.to,
          fromChain: cur.chain,
          toAddress: link.destAddress,
          toChain: link.destChain,
          hop: nextHop,
        });
        if (!visited.has(destKey)) {
          visited.add(destKey);
          nodes.push({
            address: link.destAddress,
            chain: link.destChain,
            hop: nextHop,
          });
          queue.push({
            address: link.destAddress,
            chain: link.destChain,
            hop: nextHop,
          });
        }
      }
    }
  }

  return {
    seedAddress,
    seedChain,
    nodes,
    edges,
    hopLimit,
    transferCap,
    truncated,
    truncationReason,
  };
}

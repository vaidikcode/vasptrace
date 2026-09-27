import path from "path";
import fs from "fs";
import {
  AnalysisRun,
  AnalysisWarning,
  CaseRecord,
} from "../types";
import {
  buildTransactionGraph,
  DEFAULT_HOP_LIMIT,
  DEFAULT_TRANSFER_CAP,
} from "../tracing/graphBuilder";
import { attributeCandidates } from "../tracing/attribution";
import { RUNS_DIR } from "../config/paths";
import { generateId, readJsonFile, writeJsonFile } from "../util/fsStore";
import { attachRun } from "./caseStore";
import { recordAudit } from "../audit/auditLog";

const KNOWN_ASSETS = new Set(["BTC", "ETH", "TRX", "USDT"]);

function buildWarnings(run: Omit<AnalysisRun, "warnings">, graphTruncated: boolean, truncationReason: string | undefined): AnalysisWarning[] {
  const warnings: AnalysisWarning[] = [];

  if (graphTruncated) {
    warnings.push({
      kind: "truncation",
      message:
        truncationReason ??
        "The transaction graph was truncated by the configured hop limit or transfer cap.",
    });
  }

  const conflicting = run.candidates.filter((c) => c.confidence.hasConflictingLabels);
  if (conflicting.length > 0) {
    warnings.push({
      kind: "conflicting-labels",
      message: `${conflicting.length} candidate(s) carry conflicting VASP labels; confidence has been downgraded and automatic recipient selection is blocked for them.`,
    });
  }

  const unresolved = run.candidates.filter((c) => c.boundaryUnresolved);
  if (unresolved.length > 0) {
    warnings.push({
      kind: "cross-chain-unresolved",
      message: `${unresolved.length} candidate(s) stop at an unresolved cross-chain boundary — no explicit bridge-link match was found, so these are possible leads only.`,
    });
  }

  const unsupported = run.candidates.filter(
    (c) => c.asset && !KNOWN_ASSETS.has(c.asset)
  );
  if (unsupported.length > 0) {
    warnings.push({
      kind: "unsupported-token",
      message: `${unsupported.length} candidate(s) involve an asset type this prototype does not specifically recognize; amounts are shown as reported but not cross-validated.`,
    });
  }

  const notEstablished = run.candidates.filter((c) => c.vaspNotEstablished);
  if (notEstablished.length > 0 && run.candidates.length === notEstablished.length) {
    warnings.push({
      kind: "incomplete-data",
      message: "No VASP could be established for this case from the available replay data.",
    });
  }

  return warnings;
}

export interface AnalyzeOptions {
  hopLimit?: number;
  transferCap?: number;
}

export async function runAnalysis(
  caseRecord: CaseRecord,
  actor: string,
  opts: AnalyzeOptions = {}
): Promise<AnalysisRun> {
  const hopLimit = opts.hopLimit ?? DEFAULT_HOP_LIMIT;
  const transferCap = opts.transferCap ?? DEFAULT_TRANSFER_CAP;

  const graph = await buildTransactionGraph(caseRecord.chain, caseRecord.seedAddress, {
    hopLimit,
    transferCap,
    timeWindow: caseRecord.timeWindow,
  });

  const candidates = attributeCandidates(graph, caseRecord);

  const runBase = {
    id: generateId("run"),
    caseId: caseRecord.id,
    createdAt: new Date().toISOString(),
    config: { hopLimit, transferCap },
    graphSummary: {
      nodeCount: graph.nodes.length,
      edgeCount: graph.edges.length,
      truncated: graph.truncated,
    },
    candidates,
  };

  const warnings = buildWarnings(runBase, graph.truncated, graph.truncationReason);

  const run: AnalysisRun = { ...runBase, warnings };

  writeJsonFile(path.join(RUNS_DIR, `${run.id}.json`), run);
  attachRun(caseRecord.id, run.id);
  recordAudit(actor, "run.create", run.id, { caseId: caseRecord.id, candidateCount: candidates.length });

  return run;
}

export function getRun(id: string): AnalysisRun | undefined {
  const p = path.join(RUNS_DIR, `${id}.json`);
  if (!fs.existsSync(p)) return undefined;
  return readJsonFile<AnalysisRun>(p);
}

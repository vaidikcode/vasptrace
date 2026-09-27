import path from "path";
import fs from "fs";
import { AnalysisRun, CaseRecord, EvidenceBundle } from "../types";
import { REPORTS_DIR } from "../config/paths";
import { canonicalize, generateId, readJsonFile, sha256, writeJsonFile } from "../util/fsStore";
import { recordAudit } from "../audit/auditLog";

function renderMarkdown(run: AnalysisRun, caseRecord: CaseRecord): string {
  const lines: string[] = [];
  lines.push(`# VASPTrace Evidence Report`);
  lines.push("");
  lines.push(
    "> **DEMO / REPLAY DATA — NOT LIVE SAHYOG.** This report was produced by a Smart India Hackathon prototype against curated, synthetic replay fixtures. It is a demonstration artifact, not a live intelligence product, and does not identify beneficial owners or authorize any freeze."
  );
  lines.push("");
  lines.push(`**Case ID:** ${caseRecord.id}`);
  lines.push(`**Run ID:** ${run.id}`);
  lines.push(`**Generated:** ${new Date().toISOString()}`);
  lines.push("");
  lines.push("## Case input");
  lines.push(`- Chain: ${caseRecord.chain}`);
  lines.push(`- Seed address: \`${caseRecord.seedAddress}\``);
  lines.push(`- Time window: ${caseRecord.timeWindow.from} to ${caseRecord.timeWindow.to}`);
  if (caseRecord.asset) lines.push(`- Asset: ${caseRecord.asset}`);
  if (caseRecord.amount !== undefined) lines.push(`- Approximate amount: ${caseRecord.amount}`);
  if (caseRecord.victimAddress) lines.push(`- Victim address: \`${caseRecord.victimAddress}\``);
  if (caseRecord.incidentType) lines.push(`- Incident type: ${caseRecord.incidentType}`);
  if (caseRecord.txIds && caseRecord.txIds.length > 0) {
    lines.push(`- Known transaction IDs: ${caseRecord.txIds.join(", ")}`);
  }
  lines.push("");
  lines.push("## Analysis configuration");
  lines.push(`- Hop limit: ${run.config.hopLimit}`);
  lines.push(`- Transfer cap: ${run.config.transferCap}`);
  lines.push(
    `- Graph: ${run.graphSummary.nodeCount} nodes / ${run.graphSummary.edgeCount} edges${
      run.graphSummary.truncated ? " (truncated)" : ""
    }`
  );
  lines.push("");

  if (run.warnings.length > 0) {
    lines.push("## Warnings");
    for (const w of run.warnings) {
      lines.push(`- **${w.kind}**: ${w.message}`);
    }
    lines.push("");
  }

  lines.push("## Candidates");
  if (run.candidates.every((c) => c.vaspNotEstablished)) {
    lines.push("");
    lines.push("**VASP not established.** No labelled VASP was found within the bounded transaction graph traced for this case.");
  } else {
    run.candidates.forEach((c, idx) => {
      lines.push("");
      lines.push(`### ${idx + 1}. ${c.entity ?? "VASP not established"}`);
      lines.push(`- Receiving address: \`${c.receivingAddress}\` (${c.chain})`);
      lines.push(`- Address type / service type: ${c.addressType} / ${c.serviceType}`);
      lines.push(`- Hop count: ${c.hopCount}`);
      lines.push(`- Attributable amount: ${c.attributableAmount} ${c.asset}`.trim());
      lines.push(`- Cross-chain: ${c.crossChain ? "yes" : "no"}`);
      if (c.boundaryUnresolved) {
        lines.push(`- **Boundary unresolved — possible lead only.** No bridge-links match was found to continue this trace onto another chain.`);
      }
      lines.push(`- Confidence: **${c.confidence.band}**`);
      for (const r of c.confidence.reasons) lines.push(`  - ${r}`);
      lines.push(`- Evidence path:`);
      for (const step of c.evidencePath) {
        const noteSuffix = step.note ? ` — ${step.note}` : "";
        lines.push(
          `  - Hop ${step.hop}: \`${step.from}\` → \`${step.to}\` (${step.txId}), ${step.amount} ${step.asset}, ${step.timestamp}${noteSuffix}`
        );
      }
      if (c.labelRefs.length > 0) {
        lines.push(`- Label source(s):`);
        for (const l of c.labelRefs) {
          lines.push(
            `  - ${l.entity} (${l.serviceType}/${l.addressType}) — ${l.source}, observed ${l.observedAt}`
          );
        }
      }
    });
  }

  lines.push("");
  lines.push("---");
  lines.push(
    "_This is a demonstration mock adapter and demonstration evidence report. Fixtures are synthetic; no live blockchain or SAHYOG systems were contacted to produce this document._"
  );

  return lines.join("\n");
}

export function createEvidenceBundle(
  run: AnalysisRun,
  caseRecord: CaseRecord,
  actor: string
): EvidenceBundle {
  const jsonPayload = { ...run, caseInput: { ...caseRecord } };
  const contentHash = sha256(canonicalize(jsonPayload));
  const markdownReport = renderMarkdown(run, caseRecord);

  const bundle: EvidenceBundle = {
    runId: run.id,
    caseId: caseRecord.id,
    contentHash,
    createdAt: new Date().toISOString(),
    jsonPayload,
    markdownReport,
  };

  writeJsonFile(path.join(REPORTS_DIR, `${run.id}.json`), bundle);
  fs.writeFileSync(path.join(REPORTS_DIR, `${run.id}.md`), markdownReport, "utf-8");

  recordAudit(actor, "report.export", run.id, { contentHash });

  return bundle;
}

export function getEvidenceBundle(runId: string): EvidenceBundle | undefined {
  const p = path.join(REPORTS_DIR, `${runId}.json`);
  if (!fs.existsSync(p)) return undefined;
  return readJsonFile<EvidenceBundle>(p);
}

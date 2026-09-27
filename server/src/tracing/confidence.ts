import {
  CaseInput,
  ConfidenceBand,
  ConfidenceResult,
  EvidencePathStep,
  LabelRecord,
} from "../types";

// FR-05: confidence is always a band with human-readable reasons, never a
// bare statistical accuracy percentage presented as a calibrated probability.

export function labelReliabilityScore(label: LabelRecord): number {
  const s = label.source.toLowerCase();
  if (s.includes("unverified") || s.includes("community")) return 0.35;
  if (s.includes("published") || s.includes("registry")) return 0.95;
  return 0.65;
}

function pathContinuityScore(path: EvidencePathStep[]): number {
  const valueSteps = path.filter((s) => s.asset !== "BRIDGE");
  if (valueSteps.length <= 1) return 1;
  let lossFraction = 0;
  for (let i = 1; i < valueSteps.length; i++) {
    const prev = valueSteps[i - 1].amount;
    const cur = valueSteps[i].amount;
    if (prev > 0) lossFraction = Math.max(lossFraction, (prev - cur) / prev);
  }
  if (lossFraction <= 0.1) return 1;
  if (lossFraction <= 0.3) return 0.7;
  return 0.45;
}

function caseRelevanceScore(
  caseInput: CaseInput,
  path: EvidencePathStep[]
): { score: number; reason: string } {
  const lastStep = path[path.length - 1];
  if (!lastStep) return { score: 0.5, reason: "No case time window supplied to compare against." };

  const within =
    lastStep.timestamp >= caseInput.timeWindow.from &&
    lastStep.timestamp <= caseInput.timeWindow.to;

  if (within) {
    return {
      score: 0.9,
      reason: "The receiving transaction falls inside the case's stated time window.",
    };
  }
  return {
    score: 0.4,
    reason: "The receiving transaction falls outside the case's stated time window.",
  };
}

export interface ConfidenceInput {
  labels: LabelRecord[];
  path: EvidencePathStep[];
  hopCount: number;
  caseInput: CaseInput;
  independentPathCount: number; // how many distinct traced paths reach this same entity
}

export function computeConfidence(input: ConfidenceInput): ConfidenceResult {
  const { labels, path, caseInput, independentPathCount } = input;
  const reasons: string[] = [];

  const conflicting =
    labels.length > 1 && new Set(labels.map((l) => l.entity)).size > 1;

  const primary = labels[0];
  const reliability = labelReliabilityScore(primary);
  reasons.push(
    `Label reliability: "${primary.source}" (observed ${primary.observedAt.slice(0, 10)}).`
  );

  const continuity = pathContinuityScore(path);
  reasons.push(
    continuity >= 0.9
      ? "Path continuity: the traced flow is unbroken across all hops."
      : "Path continuity: value decreased more than expected between hops (possible fee, split, or partial attribution)."
  );

  const relevance = caseRelevanceScore(caseInput, path);
  reasons.push(`Case relevance: ${relevance.reason}`);

  const corroboration = independentPathCount > 1 ? 0.9 : 0.5;
  reasons.push(
    independentPathCount > 1
      ? `Independent corroboration: ${independentPathCount} independent traced paths reach this entity.`
      : "Independent corroboration: only a single traced path reaches this entity."
  );

  if (conflicting) {
    reasons.push(
      `Conflicting labels found on this address (${labels
        .map((l) => `${l.entity} — ${l.source}, observed ${l.observedAt.slice(0, 10)}`)
        .join("; ")}); confidence has been downgraded and this candidate is blocked from automatic recipient selection.`
    );
  }

  let score = (reliability + continuity + relevance.score + corroboration) / 4;
  if (conflicting) score = Math.min(score, 0.45); // hard cap per FR-05

  let band: ConfidenceBand;
  if (score >= 0.85) band = "high";
  else if (score >= 0.65) band = "medium";
  else if (score >= 0.4) band = "low";
  else band = "unverified";

  return { band, reasons, hasConflictingLabels: conflicting };
}

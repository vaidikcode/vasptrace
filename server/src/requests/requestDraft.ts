import path from "path";
import fs from "fs";
import {
  AnalysisRun,
  Candidate,
  LegalAuthorityFields,
  REQUIRED_LEGAL_FIELDS,
  RequestDraft,
  RequestType,
} from "../types";
import { REQUEST_DRAFTS_DIR } from "../config/paths";
import { generateId, readJsonFile, writeJsonFile } from "../util/fsStore";
import { recordAudit } from "../audit/auditLog";

function filePath(id: string): string {
  return path.join(REQUEST_DRAFTS_DIR, `${id}.json`);
}

export function createRequestDraft(
  run: AnalysisRun,
  candidate: Candidate,
  requestType: RequestType,
  actor: string
): RequestDraft {
  const now = new Date().toISOString();
  const draft: RequestDraft = {
    id: generateId("draft"),
    runId: run.id,
    caseId: run.caseId,
    candidateId: candidate.id,
    recipientEntity: candidate.entity ?? "Unknown / VASP not established",
    recipientAddress: candidate.receivingAddress,
    requestType,
    legalAuthorityFields: {},
    state: "draft",
    createdAt: now,
    updatedAt: now,
  };
  writeJsonFile(filePath(draft.id), draft);
  recordAudit(actor, "request-draft.create", draft.id, { runId: run.id, candidateId: candidate.id });
  return draft;
}

export function getRequestDraft(id: string): RequestDraft | undefined {
  const p = filePath(id);
  if (!fs.existsSync(p)) return undefined;
  return readJsonFile<RequestDraft>(p);
}

export function listRequestDraftsForRun(runId: string): RequestDraft[] {
  if (!fs.existsSync(REQUEST_DRAFTS_DIR)) return [];
  return fs
    .readdirSync(REQUEST_DRAFTS_DIR)
    .filter((f) => f.endsWith(".json"))
    .map((f) => readJsonFile<RequestDraft>(path.join(REQUEST_DRAFTS_DIR, f)))
    .filter((d) => d.runId === runId);
}

export function missingRequiredFields(fields: LegalAuthorityFields): string[] {
  return REQUIRED_LEGAL_FIELDS.filter((f) => !fields[f] || fields[f]!.trim().length === 0);
}

export interface EditRequestDraftInput {
  legalAuthorityFields?: Partial<LegalAuthorityFields>;
  requestType?: RequestType;
}

export function editRequestDraft(
  id: string,
  input: EditRequestDraftInput,
  actor: string
): RequestDraft | { error: string } {
  const draft = getRequestDraft(id);
  if (!draft) return { error: "not_found" };
  if (draft.state !== "draft") {
    return { error: "Draft can only be edited while in the 'draft' state." };
  }
  if (input.legalAuthorityFields) {
    draft.legalAuthorityFields = { ...draft.legalAuthorityFields, ...input.legalAuthorityFields };
  }
  if (input.requestType) draft.requestType = input.requestType;
  draft.updatedAt = new Date().toISOString();
  writeJsonFile(filePath(id), draft);
  recordAudit(actor, "request-draft.edit", id, {});
  return draft;
}

export function approveRequestDraft(
  id: string,
  approvedBy: string,
  candidate: Candidate | undefined,
  overrideConflictingLabels: boolean
): RequestDraft | { error: string } {
  const draft = getRequestDraft(id);
  if (!draft) return { error: "not_found" };
  if (draft.state !== "draft") {
    return { error: `Draft is already in state '${draft.state}'.` };
  }
  const missing = missingRequiredFields(draft.legalAuthorityFields);
  if (missing.length > 0) {
    return { error: `Missing required legal-authority fields: ${missing.join(", ")}` };
  }
  if (candidate?.confidence.hasConflictingLabels && !overrideConflictingLabels) {
    return {
      error:
        "This candidate carries conflicting VASP labels and is blocked from approval without an explicit override (see FR-05).",
    };
  }
  if (candidate?.vaspNotEstablished) {
    return { error: "Cannot approve a request naming a candidate where the VASP was not established." };
  }

  draft.state = "approved";
  draft.approvedBy = approvedBy;
  draft.approvedAt = new Date().toISOString();
  draft.updatedAt = draft.approvedAt;
  writeJsonFile(filePath(id), draft);
  recordAudit(approvedBy, "request-draft.approve", id, { overrideConflictingLabels });
  return draft;
}

export function markHandedOff(id: string, handoffRef: string, actor: string): RequestDraft | { error: string } {
  const draft = getRequestDraft(id);
  if (!draft) return { error: "not_found" };
  if (draft.state !== "approved") {
    return { error: "Draft must be approved before handoff." };
  }
  draft.state = "handed-off";
  draft.handoffRef = handoffRef;
  draft.handoffAt = new Date().toISOString();
  draft.updatedAt = draft.handoffAt;
  writeJsonFile(filePath(id), draft);
  recordAudit(actor, "request-draft.handoff", id, { handoffRef });
  return draft;
}

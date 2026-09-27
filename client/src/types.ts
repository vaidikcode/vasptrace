// Minimal client-side mirror of the server's shared types (server/src/types.ts).
// Kept in sync by hand for this prototype; a shared package would remove the
// duplication in a follow-on iteration.

export type Chain = "BTC" | "ETH" | "TRON";

export interface TimeWindow {
  from: string;
  to: string;
}

export interface CaseInput {
  chain: Chain;
  seedAddress: string;
  timeWindow: TimeWindow;
  txIds?: string[];
  asset?: string;
  amount?: number;
  victimAddress?: string;
  incidentType?: string;
  caseTitle?: string;
}

export interface CaseRecord extends CaseInput {
  id: string;
  createdAt: string;
  updatedAt: string;
  runIds: string[];
}

export type ConfidenceBand = "high" | "medium" | "low" | "unverified";

export interface ConfidenceResult {
  band: ConfidenceBand;
  reasons: string[];
  hasConflictingLabels: boolean;
}

export interface EvidencePathStep {
  chain: Chain;
  from: string;
  to: string;
  txId: string;
  amount: number;
  asset: string;
  timestamp: string;
  hop: number;
  note?: string;
}

export interface LabelRecord {
  address: string;
  chain: Chain;
  entity: string;
  serviceType: string;
  addressType: string;
  source: string;
  observedAt: string;
  licenceNote: string;
}

export interface Candidate {
  id: string;
  entity: string | null;
  receivingAddress: string;
  chain: Chain;
  hopCount: number;
  attributableAmount: number;
  asset: string;
  addressType: string;
  serviceType: string;
  confidence: ConfidenceResult;
  evidencePath: EvidencePathStep[];
  labelRefs: LabelRecord[];
  crossChain: boolean;
  boundaryUnresolved: boolean;
  vaspNotEstablished: boolean;
}

export type WarningKind =
  | "truncation"
  | "incomplete-data"
  | "unsupported-token"
  | "conflicting-labels"
  | "cross-chain-unresolved";

export interface AnalysisWarning {
  kind: WarningKind;
  message: string;
}

export interface AnalysisRun {
  id: string;
  caseId: string;
  createdAt: string;
  config: { hopLimit: number; transferCap: number };
  graphSummary: { nodeCount: number; edgeCount: number; truncated: boolean };
  candidates: Candidate[];
  warnings: AnalysisWarning[];
}

export interface EvidenceBundle {
  runId: string;
  caseId: string;
  contentHash: string;
  createdAt: string;
  jsonPayload: unknown;
  markdownReport: string;
}

export type RequestType =
  | "kyc-details"
  | "transaction-records"
  | "account-freeze"
  | "general-information";

export type RequestDraftState = "draft" | "approved" | "handed-off";

export interface LegalAuthorityFields {
  requestingOfficer?: string;
  officerDesignation?: string;
  caseFirNumber?: string;
  legalProvision?: string;
  authorisingAuthority?: string;
  justification?: string;
}

export interface RequestDraft {
  id: string;
  runId: string;
  caseId: string;
  candidateId: string;
  recipientEntity: string;
  recipientAddress: string;
  requestType: RequestType;
  legalAuthorityFields: LegalAuthorityFields;
  state: RequestDraftState;
  createdAt: string;
  updatedAt: string;
  approvedBy?: string;
  approvedAt?: string;
  handoffRef?: string;
  handoffAt?: string;
  missingRequiredFields?: string[];
}

export interface AuditEntry {
  id: string;
  timestamp: string;
  actor: string;
  action: string;
  targetId: string;
  detail?: Record<string, unknown>;
}

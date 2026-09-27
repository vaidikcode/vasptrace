// Shared domain types for VASPTrace. See docs/PRD.md section 6 ("Interfaces
// and data model") for the spec these types implement.

export type Chain = "BTC" | "ETH" | "TRON";

export type DataSource = "replay-fixture"; // only value in this prototype; a
// live adapter would add "live-api" here without touching downstream types.

export interface TimeWindow {
  from: string; // ISO-8601
  to: string; // ISO-8601
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

// ---- Chain adapter interface -----------------------------------------

export interface UtxoDetail {
  inputs: { txId: string; vout: number; address: string; amount: number }[];
  outputs: { vout: number; address: string; amount: number }[];
}

export interface NormalizedTransfer {
  chain: Chain;
  txId: string;
  from: string;
  to: string;
  asset: string;
  amount: number;
  timestamp: string; // ISO-8601
  hop: number; // filled in by the graph builder, 0 for the seed-adjacent edge
  source: DataSource;
  retrievedAt: string; // ISO-8601, when this record was "fetched" (replay time)
  utxo?: UtxoDetail; // only present for BTC transfers
  tokenSymbol?: string; // ERC20 / TRC20 token symbol, if not the native asset
  isChange?: boolean; // heuristic flag: this output likely returns change to the sender
  memo?: string;
}

export interface AddressLookupOptions {
  fromTime?: string;
  toTime?: string;
  limit?: number;
}

export interface ChainAdapter {
  chain: Chain;
  // A live implementation would call a real block-explorer/node API here;
  // this prototype always resolves against fixtures/<chain>/*.json.
  getTransfersForAddress(
    address: string,
    opts?: AddressLookupOptions
  ): Promise<NormalizedTransfer[]>;
  validateAddress(address: string): boolean;
}

// ---- Labels -------------------------------------------------------------

export type ServiceType =
  | "exchange"
  | "mixer"
  | "bridge"
  | "otc-desk"
  | "payment-processor"
  | "unknown";

export type AddressType =
  | "deposit-address"
  | "hot-wallet"
  | "cold-wallet"
  | "mixer-pool"
  | "bridge-contract"
  | "unknown";

export interface LabelRecord {
  address: string;
  chain: Chain;
  entity: string;
  serviceType: ServiceType;
  addressType: AddressType;
  source: string;
  observedAt: string; // ISO-8601
  licenceNote: string; // provenance / licensing note for the label claim
}

// ---- Tracing / graph ------------------------------------------------------

export interface GraphNode {
  address: string;
  chain: Chain;
  hop: number;
}

export interface GraphEdge {
  // Exactly one of these is set. A plain transfer edge follows a real
  // on-chain movement of value; a bridgeLink edge represents a documented
  // cross-chain crossing (FR-06) and carries no value amount of its own.
  transfer?: NormalizedTransfer;
  bridgeLink?: BridgeLinkRecord;
  fromAddress: string;
  fromChain: Chain;
  toAddress: string;
  toChain: Chain;
  hop: number;
}

export interface TransactionGraph {
  seedAddress: string;
  seedChain: Chain;
  nodes: GraphNode[];
  edges: GraphEdge[];
  hopLimit: number;
  transferCap: number;
  truncated: boolean;
  truncationReason?: string;
}

// ---- Attribution / confidence --------------------------------------------

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
  note?: string; // e.g. "change output, excluded from attributable amount"
}

export interface Candidate {
  id: string;
  entity: string | null; // null only for the synthetic "not established" placeholder
  receivingAddress: string;
  chain: Chain;
  hopCount: number;
  attributableAmount: number;
  asset: string;
  addressType: AddressType;
  serviceType: ServiceType;
  confidence: ConfidenceResult;
  evidencePath: EvidencePathStep[];
  labelRefs: LabelRecord[];
  crossChain: boolean;
  boundaryUnresolved: boolean; // true if the path stops at an unmatched bridge boundary
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

export interface AnalysisRunConfig {
  hopLimit: number;
  transferCap: number;
}

export interface AnalysisRun {
  id: string;
  caseId: string;
  createdAt: string;
  config: AnalysisRunConfig;
  graphSummary: {
    nodeCount: number;
    edgeCount: number;
    truncated: boolean;
  };
  candidates: Candidate[];
  warnings: AnalysisWarning[];
}

// ---- Evidence bundle -------------------------------------------------------

export interface EvidenceBundle {
  runId: string;
  caseId: string;
  contentHash: string; // sha256 over canonicalized JSON payload
  createdAt: string;
  jsonPayload: AnalysisRun & { caseInput: CaseInput };
  markdownReport: string;
}

// ---- Request drafts ---------------------------------------------------------

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
  legalProvision?: string; // e.g. section of law authorizing the request
  authorisingAuthority?: string;
  justification?: string;
}

export const REQUIRED_LEGAL_FIELDS: (keyof LegalAuthorityFields)[] = [
  "requestingOfficer",
  "officerDesignation",
  "caseFirNumber",
  "legalProvision",
  "authorisingAuthority",
  "justification",
];

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
}

// ---- Audit log --------------------------------------------------------------

export type AuditAction =
  | "case.create"
  | "run.create"
  | "report.export"
  | "request-draft.create"
  | "request-draft.edit"
  | "request-draft.approve"
  | "request-draft.handoff";

export interface AuditEntry {
  id: string;
  timestamp: string;
  actor: string;
  action: AuditAction;
  targetId: string;
  detail?: Record<string, unknown>;
}

// ---- Bridge links -----------------------------------------------------------

export interface BridgeLinkRecord {
  id: string;
  sourceChain: Chain;
  sourceTxId: string;
  sourceAddress: string;
  destChain: Chain;
  destTxId: string;
  destAddress: string;
  bridgeEntity: string;
  observedAt: string;
  source: DataSource;
  note?: string;
}

import {
  AnalysisRun,
  CaseInput,
  CaseRecord,
  EvidenceBundle,
  LegalAuthorityFields,
  RequestDraft,
  RequestType,
  AuditEntry,
} from "../types";

const BASE = "/api";

async function request<T>(path: string, opts?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    ...opts,
    headers: { "Content-Type": "application/json", ...(opts?.headers ?? {}) },
  });
  if (!res.ok) {
    let body: unknown;
    try {
      body = await res.json();
    } catch {
      body = { error: res.statusText };
    }
    const message =
      (body as { error?: string; message?: string })?.message ??
      (body as { error?: string })?.error ??
      `Request failed (${res.status})`;
    throw new Error(message);
  }
  return res.json() as Promise<T>;
}

export const api = {
  createCase: (input: CaseInput) =>
    request<CaseRecord>("/cases", { method: "POST", body: JSON.stringify(input) }),

  getCase: (id: string) => request<CaseRecord>(`/cases/${id}`),

  analyzeCase: (id: string, opts?: { hopLimit?: number; transferCap?: number }) =>
    request<AnalysisRun>(`/cases/${id}/analyze`, {
      method: "POST",
      body: JSON.stringify(opts ?? {}),
    }),

  getRun: (id: string) => request<AnalysisRun>(`/runs/${id}`),

  getReport: (id: string) => request<EvidenceBundle>(`/runs/${id}/report`),

  reportMarkdownUrl: (id: string) => `${BASE}/runs/${id}/report?format=md`,

  createRequestDraft: (runId: string, candidateId: string, requestType: RequestType) =>
    request<RequestDraft>(`/runs/${runId}/request-draft`, {
      method: "POST",
      body: JSON.stringify({ candidateId, requestType }),
    }),

  editRequestDraft: (id: string, legalAuthorityFields: Partial<LegalAuthorityFields>) =>
    request<RequestDraft>(`/request-drafts/${id}`, {
      method: "PATCH",
      body: JSON.stringify({ legalAuthorityFields }),
    }),

  approveRequestDraft: (id: string, approvedBy: string, overrideConflictingLabels: boolean) =>
    request<RequestDraft>(`/request-drafts/${id}`, {
      method: "PATCH",
      body: JSON.stringify({ approve: true, approvedBy, overrideConflictingLabels }),
    }),

  getRequestDraft: (id: string) => request<RequestDraft>(`/request-drafts/${id}`),

  handoffRequestDraft: (id: string) =>
    request<{ draft: RequestDraft; mockAcknowledgement: { acknowledgementRef: string; message: string } }>(
      `/request-drafts/${id}/handoff`,
      { method: "POST" }
    ),

  getAuditLog: () => request<{ entries: AuditEntry[] }>("/audit-log"),
};

export class ApiError extends Error {}

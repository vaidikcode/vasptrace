import { useState } from "react";
import { api } from "../api/client";
import { Candidate, LegalAuthorityFields, RequestDraft, RequestType } from "../types";

interface Props {
  runId: string;
  candidate: Candidate | null;
}

const REQUEST_TYPES: { value: RequestType; label: string }[] = [
  { value: "kyc-details", label: "KYC details" },
  { value: "transaction-records", label: "Transaction records" },
  { value: "account-freeze", label: "Account freeze" },
  { value: "general-information", label: "General information" },
];

const REQUIRED_FIELDS: (keyof LegalAuthorityFields)[] = [
  "requestingOfficer",
  "officerDesignation",
  "caseFirNumber",
  "legalProvision",
  "authorisingAuthority",
  "justification",
];

const FIELD_LABELS: Record<keyof LegalAuthorityFields, string> = {
  requestingOfficer: "Requesting officer",
  officerDesignation: "Officer designation",
  caseFirNumber: "Case / FIR number",
  legalProvision: "Legal provision",
  authorisingAuthority: "Authorising authority",
  justification: "Justification",
};

export default function RequestDraftPanel({ runId, candidate }: Props) {
  const [requestType, setRequestType] = useState<RequestType>("kyc-details");
  const [draft, setDraft] = useState<RequestDraft | null>(null);
  const [fields, setFields] = useState<LegalAuthorityFields>({});
  const [approvedBy, setApprovedBy] = useState("");
  const [overrideConflicting, setOverrideConflicting] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ackMessage, setAckMessage] = useState<string | null>(null);

  const missing = REQUIRED_FIELDS.filter((f) => !fields[f] || fields[f]!.trim() === "");

  async function handleCreateDraft() {
    if (!candidate) return;
    setBusy(true);
    setError(null);
    setAckMessage(null);
    try {
      const created = await api.createRequestDraft(runId, candidate.id, requestType);
      setDraft(created);
      setFields({});
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function handleSaveFields() {
    if (!draft) return;
    setBusy(true);
    setError(null);
    try {
      const updated = await api.editRequestDraft(draft.id, fields);
      setDraft(updated);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function handleApprove() {
    if (!draft) return;
    setBusy(true);
    setError(null);
    try {
      const updated = await api.approveRequestDraft(
        draft.id,
        approvedBy || "Reviewing officer",
        overrideConflicting
      );
      setDraft(updated);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function handleHandoff() {
    if (!draft) return;
    setBusy(true);
    setError(null);
    try {
      const result = await api.handoffRequestDraft(draft.id);
      setDraft(result.draft);
      setAckMessage(result.mockAcknowledgement.message);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="panel">
      <h2>Request draft</h2>

      {!candidate && <p className="small-note">Select a candidate above to draft a request.</p>}

      {candidate && !draft && (
        <>
          <p className="small-note">
            Recipient: <strong>{candidate.entity ?? "VASP not established"}</strong> (
            {candidate.receivingAddress})
          </p>
          {candidate.vaspNotEstablished && (
            <p className="missing-fields">
              This candidate is "VASP not established" and cannot be used as a request recipient.
            </p>
          )}
          <div className="field">
            <label>Request type</label>
            <select value={requestType} onChange={(e) => setRequestType(e.target.value as RequestType)}>
              {REQUEST_TYPES.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>
          </div>
          <button onClick={handleCreateDraft} disabled={busy || candidate.vaspNotEstablished}>
            Create draft
          </button>
        </>
      )}

      {draft && (
        <>
          <p>
            Draft <code>{draft.id}</code> for <strong>{draft.recipientEntity}</strong> —{" "}
            <span className="state-pill">{draft.state}</span>
          </p>

          {draft.state === "draft" && (
            <>
              <h3>Legal-authority fields</h3>
              <div className="grid-2">
                {REQUIRED_FIELDS.map((f) => (
                  <div className="field" key={f}>
                    <label>{FIELD_LABELS[f]}</label>
                    {f === "justification" ? (
                      <textarea
                        value={fields[f] ?? ""}
                        onChange={(e) => setFields({ ...fields, [f]: e.target.value })}
                      />
                    ) : (
                      <input
                        value={fields[f] ?? ""}
                        onChange={(e) => setFields({ ...fields, [f]: e.target.value })}
                      />
                    )}
                  </div>
                ))}
              </div>
              <button className="secondary" onClick={handleSaveFields} disabled={busy}>
                Save fields
              </button>

              {missing.length > 0 && (
                <p className="missing-fields">Missing required fields: {missing.map((f) => FIELD_LABELS[f]).join(", ")}</p>
              )}

              {candidate?.confidence.hasConflictingLabels && (
                <div className="field" style={{ marginTop: 12 }}>
                  <label>
                    <input
                      type="checkbox"
                      style={{ width: "auto", marginRight: 8 }}
                      checked={overrideConflicting}
                      onChange={(e) => setOverrideConflicting(e.target.checked)}
                    />
                    I have reviewed the conflicting labels on this address and explicitly override
                    the auto-selection block.
                  </label>
                </div>
              )}

              <div className="field" style={{ marginTop: 12 }}>
                <label>Approved by</label>
                <input value={approvedBy} onChange={(e) => setApprovedBy(e.target.value)} placeholder="Reviewing officer name" />
              </div>

              <div className="flex-buttons">
                <button onClick={handleApprove} disabled={busy || missing.length > 0}>
                  Approve
                </button>
              </div>
            </>
          )}

          {draft.state === "approved" && (
            <div className="flex-buttons">
              <button onClick={handleHandoff} disabled={busy}>
                Trigger mock handoff
              </button>
            </div>
          )}

          {draft.state === "handed-off" && ackMessage && (
            <div className="warnings-banner">
              <h3>Mock acknowledgement</h3>
              <p style={{ fontSize: 13 }}>{ackMessage}</p>
              <p className="small-note">Reference: {draft.handoffRef}</p>
            </div>
          )}

          <p className="mock-notice">
            Handoff in this prototype calls a labelled mock adapter only. It never contacts a real
            SAHYOG endpoint and never claims a real handoff occurred.
          </p>
        </>
      )}

      {error && <div className="error-banner">{error}</div>}
    </div>
  );
}

import { useState } from "react";
import DemoBanner from "./components/DemoBanner";
import CaseForm from "./components/CaseForm";
import ResultsView from "./components/ResultsView";
import ReportExport from "./components/ReportExport";
import RequestDraftPanel from "./components/RequestDraftPanel";
import { api } from "./api/client";
import { AnalysisRun, Candidate, CaseInput, CaseRecord } from "./types";

export default function App() {
  const [caseRecord, setCaseRecord] = useState<CaseRecord | null>(null);
  const [run, setRun] = useState<AnalysisRun | null>(null);
  const [selectedCandidate, setSelectedCandidate] = useState<Candidate | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleCreateAndAnalyze(input: CaseInput) {
    setSubmitting(true);
    setError(null);
    setRun(null);
    setSelectedCandidate(null);
    try {
      const created = await api.createCase(input);
      setCaseRecord(created);
      const analysis = await api.analyzeCase(created.id);
      setRun(analysis);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div>
      <DemoBanner />
      <div className="app-shell">
        <header className="app-header">
          <h1>VASPTrace</h1>
          <p>
            Automated Blockchain Intelligence &amp; VASP Attribution Engine — Smart India Hackathon
            prototype for the SAHYOG ecosystem. See <code>docs/PRD.md</code> for the governing
            specification.
          </p>
        </header>

        <CaseForm onSubmit={handleCreateAndAnalyze} submitting={submitting} />

        {error && <div className="error-banner">{error}</div>}

        {caseRecord && !run && !submitting && (
          <p className="small-note">Case {caseRecord.id} created. Running analysis…</p>
        )}

        {run && (
          <>
            <ResultsView
              run={run}
              selectedCandidateId={selectedCandidate?.id ?? null}
              onSelectCandidate={setSelectedCandidate}
            />
            <ReportExport runId={run.id} />
            <RequestDraftPanel runId={run.id} candidate={selectedCandidate} />
          </>
        )}
      </div>
    </div>
  );
}

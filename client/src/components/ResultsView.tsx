import { AnalysisRun, Candidate } from "../types";

interface Props {
  run: AnalysisRun;
  selectedCandidateId: string | null;
  onSelectCandidate: (candidate: Candidate) => void;
}

function WarningsBanner({ run }: { run: AnalysisRun }) {
  if (run.warnings.length === 0) return null;
  return (
    <div className="warnings-banner">
      <h3>Warnings</h3>
      <ul>
        {run.warnings.map((w, i) => (
          <li key={i}>
            <strong>{w.kind}:</strong> {w.message}
          </li>
        ))}
      </ul>
    </div>
  );
}

function CandidateCard({
  candidate,
  index,
  selected,
  onSelect,
}: {
  candidate: Candidate;
  index: number;
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <div
      className={`candidate-card${selected ? " selected" : ""}`}
      onClick={onSelect}
      role="button"
      tabIndex={0}
    >
      <div className="candidate-header">
        <h4>
          #{index + 1} {candidate.entity ?? "VASP not established"}
        </h4>
        <span className={`badge ${candidate.confidence.band}`}>{candidate.confidence.band}</span>
      </div>

      {!candidate.vaspNotEstablished && (
        <div className="meta-row">
          <span>Receiving address: {candidate.receivingAddress} ({candidate.chain})</span>
          <span>Hop count: {candidate.hopCount}</span>
          <span>
            Attributable amount: {candidate.attributableAmount} {candidate.asset}
          </span>
          <span>Type: {candidate.addressType} / {candidate.serviceType}</span>
          {candidate.crossChain && <span>Cross-chain</span>}
        </div>
      )}

      {candidate.boundaryUnresolved && (
        <p className="small-note">
          <strong>Boundary unresolved — possible lead only.</strong> No bridge-links match was found
          to continue this trace onto another chain.
        </p>
      )}

      <ul className="reasons">
        {candidate.confidence.reasons.map((r, i) => (
          <li key={i}>{r}</li>
        ))}
      </ul>

      {candidate.evidencePath.length > 0 && (
        <div className="path-tree">
          {candidate.evidencePath.map((step, i) => (
            <div className="path-step" key={i}>
              Hop {step.hop}: <code>{step.from}</code> → <code>{step.to}</code> — {step.amount}{" "}
              {step.asset} ({step.chain}, tx {step.txId})
              {step.note && <div className="note-inline">{step.note}</div>}
            </div>
          ))}
        </div>
      )}

      {candidate.labelRefs.length > 0 && (
        <div className="path-tree">
          {candidate.labelRefs.map((l, i) => (
            <div className="path-step" key={i}>
              Label: {l.entity} ({l.serviceType}/{l.addressType}) — {l.source}, observed{" "}
              {l.observedAt.slice(0, 10)}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function ResultsView({ run, selectedCandidateId, onSelectCandidate }: Props) {
  return (
    <div className="panel">
      <h2>Analysis results</h2>
      <p className="small-note">
        Graph: {run.graphSummary.nodeCount} nodes / {run.graphSummary.edgeCount} edges
        {run.graphSummary.truncated ? " (truncated)" : ""} · hop limit {run.config.hopLimit} · transfer
        cap {run.config.transferCap}
      </p>

      <WarningsBanner run={run} />

      {run.candidates.map((c, i) => (
        <CandidateCard
          key={c.id}
          candidate={c}
          index={i}
          selected={c.id === selectedCandidateId}
          onSelect={() => onSelectCandidate(c)}
        />
      ))}

      <p className="small-note">
        Click a candidate to select it as the proposed recipient in the request-draft panel below.
        Confidence bands summarize reasoning; they are not calibrated statistical probabilities.
      </p>
    </div>
  );
}

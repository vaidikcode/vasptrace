import { useState } from "react";
import { api } from "../api/client";

interface Props {
  runId: string;
}

function downloadText(filename: string, content: string, mime: string) {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export default function ReportExport({ runId }: Props) {
  const [busy, setBusy] = useState(false);
  const [hash, setHash] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleExport() {
    setBusy(true);
    setError(null);
    try {
      const bundle = await api.getReport(runId);
      setHash(bundle.contentHash);
      downloadText(`vasptrace-report-${runId}.md`, bundle.markdownReport, "text/markdown");
      downloadText(
        `vasptrace-evidence-${runId}.json`,
        JSON.stringify(bundle.jsonPayload, null, 2),
        "application/json"
      );
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="panel">
      <h2>Evidence export</h2>
      <p className="small-note">
        Freezes this run into a content-hashed (SHA-256) evidence bundle and downloads the Markdown
        report plus the JSON evidence bundle.
      </p>
      <button onClick={handleExport} disabled={busy}>
        {busy ? "Exporting…" : "Export report (Markdown + JSON)"}
      </button>
      {hash && <p className="small-note">Content hash: {hash}</p>}
      {error && <div className="error-banner">{error}</div>}
      <p className="mock-notice">
        This is a demonstration mock adapter and demonstration evidence report. Fixtures are
        synthetic; no live blockchain or SAHYOG systems were contacted.
      </p>
    </div>
  );
}

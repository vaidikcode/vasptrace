import { Router } from "express";
import { getRun } from "../cases/analysisRun";
import { getCase } from "../cases/caseStore";
import { createEvidenceBundle, getEvidenceBundle } from "../reports/evidenceBundle";
import { requestDraftCreateSchema } from "../validation";
import { createRequestDraft, listRequestDraftsForRun } from "../requests/requestDraft";
import { actorFrom } from "./actor";

export const runsRouter = Router();

runsRouter.get("/runs/:id", (req, res) => {
  const run = getRun(req.params.id);
  if (!run) return res.status(404).json({ error: "not_found" });
  res.json(run);
});

runsRouter.get("/runs/:id/report", (req, res) => {
  const run = getRun(req.params.id);
  if (!run) return res.status(404).json({ error: "not_found" });
  const caseRecord = getCase(run.caseId);
  if (!caseRecord) return res.status(404).json({ error: "case_not_found" });

  let bundle = getEvidenceBundle(run.id);
  if (!bundle) {
    bundle = createEvidenceBundle(run, caseRecord, actorFrom(req));
  }

  if (req.query.format === "md") {
    res.setHeader("Content-Type", "text/markdown; charset=utf-8");
    res.setHeader("Content-Disposition", `attachment; filename="vasptrace-report-${run.id}.md"`);
    return res.send(bundle.markdownReport);
  }

  res.json(bundle);
});

runsRouter.post("/runs/:id/export", (req, res) => {
  const run = getRun(req.params.id);
  if (!run) return res.status(404).json({ error: "not_found" });
  const caseRecord = getCase(run.caseId);
  if (!caseRecord) return res.status(404).json({ error: "case_not_found" });
  const bundle = createEvidenceBundle(run, caseRecord, actorFrom(req));
  res.status(201).json(bundle);
});

runsRouter.post("/runs/:id/request-draft", (req, res) => {
  const run = getRun(req.params.id);
  if (!run) return res.status(404).json({ error: "not_found" });

  const parsed = requestDraftCreateSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "validation_error", issues: parsed.error.issues });
  }

  const candidate = run.candidates.find((c) => c.id === parsed.data.candidateId);
  if (!candidate) return res.status(404).json({ error: "candidate_not_found" });

  const draft = createRequestDraft(run, candidate, parsed.data.requestType, actorFrom(req));
  res.status(201).json(draft);
});

runsRouter.get("/runs/:id/request-drafts", (req, res) => {
  const run = getRun(req.params.id);
  if (!run) return res.status(404).json({ error: "not_found" });
  res.json({ requestDrafts: listRequestDraftsForRun(run.id) });
});

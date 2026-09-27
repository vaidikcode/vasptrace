import { Router } from "express";
import { caseInputSchema, analyzeOptionsSchema } from "../validation";
import { createCase, getCase, listCases } from "../cases/caseStore";
import { runAnalysis } from "../cases/analysisRun";
import { recordAudit } from "../audit/auditLog";
import { actorFrom } from "./actor";

export const casesRouter = Router();

casesRouter.get("/cases", (req, res) => {
  res.json({ cases: listCases() });
});

casesRouter.post("/cases", (req, res) => {
  const parsed = caseInputSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "validation_error", issues: parsed.error.issues });
  }
  const actor = actorFrom(req);
  const record = createCase(parsed.data);
  recordAudit(actor, "case.create", record.id, { chain: record.chain });
  res.status(201).json(record);
});

casesRouter.get("/cases/:id", (req, res) => {
  const record = getCase(req.params.id);
  if (!record) return res.status(404).json({ error: "not_found" });
  res.json(record);
});

casesRouter.post("/cases/:id/analyze", async (req, res) => {
  const record = getCase(req.params.id);
  if (!record) return res.status(404).json({ error: "not_found" });

  const parsedOpts = analyzeOptionsSchema.safeParse(req.body ?? {});
  if (!parsedOpts.success) {
    return res.status(400).json({ error: "validation_error", issues: parsedOpts.error.issues });
  }

  try {
    const actor = actorFrom(req);
    const run = await runAnalysis(record, actor, parsedOpts.data);
    res.status(201).json(run);
  } catch (err) {
    res.status(500).json({ error: "analysis_failed", message: (err as Error).message });
  }
});

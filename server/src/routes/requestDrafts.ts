import { Router } from "express";
import { requestDraftEditSchema } from "../validation";
import {
  approveRequestDraft,
  editRequestDraft,
  getRequestDraft,
  markHandedOff,
  missingRequiredFields,
} from "../requests/requestDraft";
import { getRun } from "../cases/analysisRun";
import { mockSubmitToSahyog } from "../mockSahyog/mockAdapter";
import { actorFrom } from "./actor";

export const requestDraftsRouter = Router();

requestDraftsRouter.get("/request-drafts/:id", (req, res) => {
  const draft = getRequestDraft(req.params.id);
  if (!draft) return res.status(404).json({ error: "not_found" });
  const missing = missingRequiredFields(draft.legalAuthorityFields);
  res.json({ ...draft, missingRequiredFields: missing });
});

requestDraftsRouter.patch("/request-drafts/:id", (req, res) => {
  const parsed = requestDraftEditSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "validation_error", issues: parsed.error.issues });
  }
  const actor = actorFrom(req);
  const draft = getRequestDraft(req.params.id);
  if (!draft) return res.status(404).json({ error: "not_found" });

  if (parsed.data.approve) {
    const run = getRun(draft.runId);
    const candidate = run?.candidates.find((c) => c.id === draft.candidateId);
    const approved = approveRequestDraft(
      req.params.id,
      parsed.data.approvedBy ?? actor,
      candidate,
      parsed.data.overrideConflictingLabels ?? false
    );
    if ("error" in approved) return res.status(400).json({ error: approved.error });
    return res.json(approved);
  }

  const edited = editRequestDraft(
    req.params.id,
    {
      legalAuthorityFields: parsed.data.legalAuthorityFields,
      requestType: parsed.data.requestType,
    },
    actor
  );
  if ("error" in edited) return res.status(400).json({ error: edited.error });
  res.json(edited);
});

requestDraftsRouter.post("/request-drafts/:id/handoff", (req, res) => {
  const draft = getRequestDraft(req.params.id);
  if (!draft) return res.status(404).json({ error: "not_found" });
  if (draft.state !== "approved") {
    return res.status(400).json({ error: "Draft must be approved before it can be handed off." });
  }

  const ack = mockSubmitToSahyog(draft);
  const updated = markHandedOff(req.params.id, ack.acknowledgementRef, actorFrom(req));
  if ("error" in updated) return res.status(400).json({ error: updated.error });

  res.json({ draft: updated, mockAcknowledgement: ack });
});

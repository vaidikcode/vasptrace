import { Router } from "express";
import { readAuditLog } from "../audit/auditLog";

export const auditLogRouter = Router();

auditLogRouter.get("/audit-log", (req, res) => {
  res.json({ entries: readAuditLog() });
});

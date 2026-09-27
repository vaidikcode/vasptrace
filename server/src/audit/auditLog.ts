import { AuditAction, AuditEntry } from "../types";
import { AUDIT_LOG_PATH } from "../config/paths";
import { appendLine, generateId, readLines } from "../util/fsStore";

// Append-only by construction: this module exposes no update/delete, only
// record() and read(). The underlying file is JSON-lines so it can grow
// without ever rewriting prior entries.

export function recordAudit(
  actor: string,
  action: AuditAction,
  targetId: string,
  detail?: Record<string, unknown>
): AuditEntry {
  const entry: AuditEntry = {
    id: generateId("audit"),
    timestamp: new Date().toISOString(),
    actor,
    action,
    targetId,
    detail,
  };
  appendLine(AUDIT_LOG_PATH, JSON.stringify(entry));
  return entry;
}

export function readAuditLog(): AuditEntry[] {
  return readLines(AUDIT_LOG_PATH)
    .map((line) => JSON.parse(line) as AuditEntry)
    .sort((a, b) => b.timestamp.localeCompare(a.timestamp));
}

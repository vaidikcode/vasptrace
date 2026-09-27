import path from "path";
import { CaseInput, CaseRecord } from "../types";
import { CASES_DIR } from "../config/paths";
import { generateId, readJsonFile, writeJsonFile } from "../util/fsStore";
import fs from "fs";

function filePath(id: string): string {
  return path.join(CASES_DIR, `${id}.json`);
}

export function createCase(input: CaseInput): CaseRecord {
  const now = new Date().toISOString();
  const record: CaseRecord = {
    ...input,
    id: generateId("case"),
    createdAt: now,
    updatedAt: now,
    runIds: [],
  };
  writeJsonFile(filePath(record.id), record);
  return record;
}

export function getCase(id: string): CaseRecord | undefined {
  const p = filePath(id);
  if (!fs.existsSync(p)) return undefined;
  return readJsonFile<CaseRecord>(p);
}

export function listCases(): CaseRecord[] {
  if (!fs.existsSync(CASES_DIR)) return [];
  return fs
    .readdirSync(CASES_DIR)
    .filter((f) => f.endsWith(".json"))
    .map((f) => readJsonFile<CaseRecord>(path.join(CASES_DIR, f)))
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export function attachRun(caseId: string, runId: string): CaseRecord | undefined {
  const record = getCase(caseId);
  if (!record) return undefined;
  record.runIds.push(runId);
  record.updatedAt = new Date().toISOString();
  writeJsonFile(filePath(caseId), record);
  return record;
}

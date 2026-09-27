import path from "path";

// __dirname here is server/dist/config at runtime (or server/src/config under
// tsx dev mode, same nesting depth), so the relative walk-up is identical in
// both dev and built modes.
export const SERVER_ROOT = path.resolve(__dirname, "..", "..");
export const REPO_ROOT = path.resolve(SERVER_ROOT, "..");
export const FIXTURES_DIR = path.resolve(REPO_ROOT, "fixtures");
export const DATA_DIR = path.resolve(SERVER_ROOT, "data");
export const CASES_DIR = path.resolve(DATA_DIR, "cases");
export const RUNS_DIR = path.resolve(DATA_DIR, "runs");
export const REPORTS_DIR = path.resolve(DATA_DIR, "reports");
export const REQUEST_DRAFTS_DIR = path.resolve(DATA_DIR, "request-drafts");
export const AUDIT_LOG_PATH = path.resolve(DATA_DIR, "audit-log.jsonl");

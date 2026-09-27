import express from "express";
import cors from "cors";
import { casesRouter } from "./routes/cases";
import { runsRouter } from "./routes/runs";
import { requestDraftsRouter } from "./routes/requestDrafts";
import { auditLogRouter } from "./routes/auditLog";
import { ensureDir } from "./util/fsStore";
import { CASES_DIR, REPORTS_DIR, REQUEST_DRAFTS_DIR, RUNS_DIR } from "./config/paths";

export function createApp() {
  ensureDir(CASES_DIR);
  ensureDir(RUNS_DIR);
  ensureDir(REPORTS_DIR);
  ensureDir(REQUEST_DRAFTS_DIR);

  const app = express();
  app.use(cors());
  app.use(express.json());

  app.get("/api/health", (req, res) => {
    res.json({
      status: "ok",
      mode: "DEMO / REPLAY DATA — NOT LIVE SAHYOG",
      synthetic: true,
    });
  });

  app.use("/api", casesRouter);
  app.use("/api", runsRouter);
  app.use("/api", requestDraftsRouter);
  app.use("/api", auditLogRouter);

  app.use((req, res) => {
    res.status(404).json({ error: "not_found", path: req.path });
  });

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  app.use((err: Error, req: express.Request, res: express.Response, _next: express.NextFunction) => {
    console.error(err);
    res.status(500).json({ error: "internal_error", message: err.message });
  });

  return app;
}

import { Request } from "express";

// No auth system in this prototype: the caller may identify itself via an
// X-Actor header for a more realistic audit log; otherwise a fixed demo
// actor name is recorded.
export function actorFrom(req: Request): string {
  const header = req.header("x-actor");
  return header && header.trim().length > 0 ? header.trim() : "demo-investigator";
}

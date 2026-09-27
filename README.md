# VASPTrace

**Automated Blockchain Intelligence & VASP Attribution Engine** — a Smart India
Hackathon prototype for the SAHYOG ecosystem (Problem Statement ID 26182,
Ministry of Home Affairs / I4C, CIS Division). The full governing
specification is in [`docs/PRD.md`](docs/PRD.md), derived from the original
[`docs/PROBLEM_STATEMENT.md`](docs/PROBLEM_STATEMENT.md).

> **DEMO / REPLAY DATA — NOT LIVE SAHYOG.** This is a hackathon prototype. It
> runs entirely offline against curated, synthetic replay fixtures and a mock
> SAHYOG handoff adapter. It never calls a live blockchain API and never
> contacts any real government system.

## What this is

Given a seed cryptocurrency address from a case, VASPTrace builds a bounded
transaction graph across BTC/ETH/TRON, attributes the nearest VASP (exchange,
OTC desk, etc.) encountered along each traced path, scores confidence with
human-readable reasons (never a fabricated accuracy percentage), and lets an
investigator export an evidence bundle and draft a legally-gated request
toward a (mocked) SAHYOG handoff.

## Architecture

```
/server   Express + TypeScript API, in-process tracing engine, JSON-file store
/client   Vite + React + TypeScript investigator UI
/fixtures Curated synthetic replay data: BTC/ETH/TRON transfers, VASP labels,
          bridge-link match records
/docs     PRD.md — the full governing specification
```

Backend modules (`server/src/`):

- `types.ts` — shared domain types (`CaseInput`, `ChainAdapter`,
  `NormalizedTransfer`, `LabelRecord`, `AnalysisRun`, `Candidate`,
  `EvidenceBundle`, `RequestDraft`, …).
- `adapters/{bitcoin,ethereum,tron}Adapter.ts` — one `ChainAdapter`
  implementation per chain, each reading from `fixtures/<chain>/*.json` and
  tagging every transfer `source: "replay-fixture"` with a retrieval
  timestamp. Written so a live-API adapter could be swapped in later behind
  the same interface (see the comment at the top of each file).
- `labels/labelStore.ts` — loads `fixtures/labels/vasp-labels.json`.
- `tracing/graphBuilder.ts` — bounded BFS from a seed address (default 4
  hops, hard cap 500 normalized transfers), records truncation state.
- `tracing/attribution.ts` — walks the bounded graph for the nearest VASP
  encounter per path, distinguishing deposit-address / hot-wallet / mixer /
  bridge relationships, and ranks multiple candidates.
- `tracing/confidence.ts` — computes a confidence band (high / medium / low /
  unverified) from four factors, always with human-readable reasons.
- `tracing/crossChain.ts` — only joins two chain legs when an explicit
  `fixtures/bridge-links.json` match record exists; otherwise the trace stops
  at the boundary as "unresolved — possible leads only".
- `cases/caseStore.ts`, `cases/analysisRun.ts` — case CRUD and analysis
  orchestration, persisted as JSON under `server/data/` (gitignored).
- `reports/evidenceBundle.ts` — freezes a run into a SHA-256 content-hashed
  JSON bundle plus a Markdown report.
- `requests/requestDraft.ts` — request-draft CRUD, required-field validation,
  and the draft → approved → handed-off state machine.
- `mockSahyog/mockAdapter.ts` — demo-only mock handoff adapter.
- `audit/auditLog.ts` — append-only JSON-lines audit log.
- `routes/*.ts`, `app.ts`, `index.ts` — REST API wiring.

Frontend (`client/src/`): a case-intake form (with one-click scenario
presets matching the acceptance suite below), a results view with ranked
candidates, warnings, and a textual evidence-path tree, a report-export
button, and a request-draft panel with legal-field validation, approval, and
mock handoff.

## Setup

Requires Node.js 18+ and npm.

```bash
npm install
```

This installs both workspaces (`server`, `client`) via npm workspaces. If you
have no network access, `npm install` will fail — the source is still
complete and consistent; you'll just need to install dependencies once
network access is available (see `server/package.json` and
`client/package.json` for the exact dependency list).

## Running

Two terminals:

```bash
# Terminal 1 — API on http://localhost:4000
npm run dev:server

# Terminal 2 — UI on http://localhost:5173 (proxies /api to :4000)
npm run dev:client
```

Then open http://localhost:5173.

To build for production:

```bash
npm run build            # builds server (tsc) and client (tsc + vite build)
npm run start:server     # runs the compiled server from server/dist
```

Data is persisted under `server/data/` (cases, runs, request drafts, reports,
audit log) as JSON — this is a prototype-grade store, not a database, and is
gitignored except for a `.gitkeep`.

## Running through the 8 acceptance scenarios

The case-intake form has a "Load an acceptance-suite scenario" dropdown that
pre-fills the chain/address/time-window for each of the following (matching
docs/PRD.md section 8). You can also drive them directly against the API.

| # | Scenario | Chain | Seed address | Expected outcome |
| - | -------- | ----- | ------------- | ----------------- |
| 1 | Direct TRC20 USDT deposit to a labelled exchange | TRON | `TSeed1TronSuspectAddress0001` | Single high/medium-confidence candidate, hop 1 |
| 2 | ETH multi-hop path + weaker alternative | ETH | `0xaaaaa3e800000000000000000000000000000000` | Two candidates; the 3-hop, better-evidenced one ranks above the 2-hop, weaker one |
| 3 | BTC split output / change address | BTC | `bc1qseed3suspectaddressxx0001` | Only the non-change output (1.2 BTC of 2.0) is attributable |
| 4 | Unlabelled destination | ETH | `0xaaaaa3ee00000000000000000000000000000000` | "VASP not established" |
| 5 | Conflicting labels on one address | TRON | `TSeed5TronSuspectAddress0005` | Confidence downgraded to low; auto-selection blocked without explicit override |
| 6 | Verified ETH→TRON bridge crossing | ETH | `0xaaaaa3f000000000000000000000000000000000` | Trace continues across chains to the TRON-side VASP |
| 7 | Ambiguous bridge, no match record | BTC | `bc1qseed7suspectbridgexxxx0001` | Stops at the bridge boundary: "unresolved — possible leads only" |
| 8 | 6-hop chain forcing hop-limit truncation | ETH | `0xaaaaa3f200000000000000000000000000000000` | Run marked truncated; "VASP not established" within the bounded graph |

For each: pick the preset (or type the address), leave the time window at
its default (`2026-01-01T00:00:00Z` to `2026-12-31T00:00:00Z`), click "Create
case and run analysis", and inspect the candidates/warnings panel. From
there you can export a report, select a candidate, fill in legal-authority
fields, approve, and trigger the mock handoff to see the full workflow
end to end.

## Prototype limitations (see also docs/PRD.md sections 7/9/10)

- **No live blockchain APIs.** All chain data comes from curated, synthetic
  JSON fixtures under `fixtures/`, replayed by the chain adapters. A live
  adapter could be substituted later behind the same `ChainAdapter`
  interface without touching the tracing/attribution code.
- **No live SAHYOG integration.** `mockSahyog/mockAdapter.ts` is a local,
  clearly labelled mock. It never contacts a real endpoint and its
  acknowledgement is never a real handoff.
- **Synthetic labels only.** `fixtures/labels/vasp-labels.json` is entirely
  fabricated for this demo (`"synthetic": true` at the top of every fixture
  file) and does not describe any real address or entity.
- **Address-format validation is heuristic.** Regex-based plausibility checks
  cannot authoritatively distinguish every cross-network ambiguous address
  format; this is a known limitation, not a hard guarantee of validity.
- **No fabricated accuracy numbers.** Confidence is always a band (high /
  medium / low / unverified) with stated reasons — never a bare percentage
  presented as a calibrated probability.
- **No beneficial-owner identification or asset freezing.** VASPTrace
  identifies candidate VASPs and receiving addresses from on-chain and label
  evidence only. It does not determine who controls an address and it does
  not freeze, seize, or move any asset — those remain human/legal-process
  actions entirely outside this tool.
- **Not for production use.** This is a hackathon demonstration prototype: no
  authentication/authorization, no real database, no load testing, no
  security hardening beyond basic input validation.

## License

MIT — see [`LICENSE`](LICENSE).

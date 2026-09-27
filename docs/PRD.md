# VASPTrace — Product Requirements Document
Product: Automated Blockchain Intelligence and VASP Attribution Engine
Context: Smart India Hackathon prototype for the SAHYOG ecosystem
Version: 1.0 · 17 September 2026

Problem Statement ID: 26182
Organization: Ministry of Home Affairs
Department: Indian Cyber Crime Coordination Centre (I4C), CIS Division
Category: Software
Theme: Blockchain & Cybersecurity

Primary users: Law enforcement investigators and supervising officers
Status: Build-ready prototype specification; government integration requires sponsor validation

## 1. Product summary

Investigators often begin with a suspect cryptocurrency address but do not know which virtual asset service provider (VASP), if any, later received the funds. Manually following transactions and deciding where to send a lawful request takes specialized effort. VASPTrace turns an address and case context into an evidence-backed set of fund paths, ranks likely receiving VASPs, and prepares a report and request draft for an investigator to review.

Core promise: For a supported chain and bounded case window, an investigator can identify the nearest evidence-supported VASP receiving the relevant funds, understand why the system made that attribution, and prepare a SAHYOG-ready request package within minutes. The system may also conclude that no VASP can be identified reliably.

The prototype uses live blockchain data where available and vetted replay fixtures for a reliable demonstration. It does not assume access to SAHYOG production APIs or proprietary VASP identity records. Public blockchain data alone does not establish a wallet's beneficial owner.

## 2. Goals and success measures

| Goal | Prototype acceptance measure |
|---|---|
| Shorten the path from suspect address to actionable lead | Complete the defined end-to-end demo in no more than five minutes using a replay fixture. Record actual analysis time separately from investigator review time. |
| Make attribution defensible | Every VASP candidate displays the exact path, transaction references, label source, confidence band, and uncertainty. No unsupported candidate is presented as confirmed. |
| Prepare the next lawful action | Generate an exportable evidence report and a request draft with missing fields clearly marked; require human approval before mock handoff. |
| Work across distinct chain models | Pass curated direct-deposit and multi-hop cases on Bitcoin, Ethereum, and Tron. |
| Avoid misleading conclusions | Correctly abstain or flag ambiguity in negative and conflicting-label test cases. |

The prototype will measure candidate precision and recall on a labelled evaluation set, but will not claim a production accuracy percentage from a small demo set. The team must publish the evaluation set size, ground-truth method, and results alongside any accuracy claim.

## 3. Users and workflow

**Investigator:** Opens a case, supplies the suspect address, chain, relevant transaction identifiers if known, asset, amount range, and incident time window. Reviews ranked paths and candidates, adds case facts, then exports the report or submits an approved draft to the mock SAHYOG adapter.

**Supervisor:** Reviews the evidence, edits or rejects the proposed recipient and request type, and records approval. The prototype may use a separate supervisor role in the demo; a production approval policy is a sponsor decision.

End-to-end flow:

1. Receive a case from the mock SAHYOG intake interface or enter it manually.
2. Validate the chain, address, asset, and time window; warn when an address format is valid on more than one network.
3. Fetch chain transactions and licensed or curated entity labels; preserve source and retrieval time.
4. Build a bounded transaction graph and trace relevant outgoing paths.
5. Identify service encounters and rank VASP deposit candidates with evidence and confidence reasons.
6. Display a focused graph and an ordered evidence trail; allow the investigator to inspect alternatives and uncertain transitions.
7. Generate a report and a disclosure or preservation/freezing request draft, subject to the applicable authority and case facts.
8. Require explicit review and approval before sending the draft to a mock handoff endpoint; log the decision.

## 4. Scope and priorities

| Priority | Capability |
|---|---|
| P0 — MVP | Case intake; Bitcoin, Ethereum, and Tron address and transaction ingestion; BTC UTXO tracing; ETH/TRON native and supported token transfer tracing; bounded graph search; VASP label matching; ranked candidates with explainable confidence; verified bridge or swap continuation between supported chains; direct-deposit, hot-wallet, and exchange-cluster display when supported by labels; graph and evidence views; exportable report; human-approved request draft; mock SAHYOG adapter; audit log; replay fixtures. |
| P1 — if capacity permits | Additional verified bridge and swap protocols; mixer and bridge classification from sourced labels; simple risk indicators; side-by-side candidate comparison; case rerun and change summary. |
| Roadmap | BNB Chain, Polygon, Solana and further adapters; licensed intelligence feeds at scale; advanced typology detection; portfolio-wide alerts; production SAHYOG integration; large-scale indexing and operations. |

The P0 build must not depend on P1. P0 includes at least one verified cross-chain transition between supported chains, demonstrated with a documented fixture; a bridge or swap without a provable input-output link must be shown as an unresolved boundary. The prototype does not autonomously freeze assets, identify beneficial owners, infer guilt, or send live legal requests.

## 5. Functional requirements

**FR-01 — Case intake and validation**
Store a case reference, investigator identity, alleged incident type, suspect chain and address, relevant time window, and optional transaction IDs, victim address, asset, and amount range. Reject malformed inputs with a useful explanation. Chain must be explicit when formats overlap. A case can contain multiple seed addresses, but each analysis run records its exact input snapshot.
Acceptance: Valid inputs create a case and immutable run ID. Invalid or ambiguous inputs do not start analysis. The UI shows which optional context is absent and how that limits relevance.

**FR-02 — Chain data acquisition**
Use chain adapters behind a common interface to fetch transfers, block time and height, transaction status, asset identity, and source provenance. The Bitcoin adapter follows transaction inputs and outputs at the UTXO level. Ethereum and Tron adapters distinguish native transfers from token transfers and retain token contract identity. Retries, pagination, rate limits, and partial provider outages must produce a visible incomplete-data state.
Acceptance: The same curated case yields a normalized transfer graph from live data or replay fixtures. Every graph edge links back to its chain transaction and provider retrieval record. Confirmed and pending activity are distinguished.

**FR-03 — Bounded path tracing**
Start from relevant outgoing transfers, prioritize case-matching asset, timing, and amount, and search up to four transaction hops by default. A per-run limit of 500 normalized transfers prevents uncontrolled expansion in the prototype. Record splits, merges, apparent change outputs, and service boundaries without claiming that every downstream output contains the same suspect funds. Investigator controls may narrow the window or rerun with a different bound; the report records the bound used.
Acceptance: A multi-hop case returns the expected paths within the run limit. When a limit is reached, the result says the search was truncated and does not imply that no farther VASP exists.

**FR-04 — Service recognition and attribution**
Recognize exchange deposit addresses, custodial services, hot wallets, clusters, mixers, bridges, and swap services only from sourced labels or explicit, documented heuristics. A candidate VASP must have a traceable path ending at an address attributed to that VASP. "Nearest" means the first supported VASP deposit encounter along a relevant path; rank multiple qualifying encounters using path length, attributable flow, temporal fit, and label quality. A tagged hot wallet alone must not be described as a direct deposit address unless the deposit relationship is evidenced.
Acceptance: The result shows receiving address, entity, service/address type, hop count, asset and amount estimate, first relevant receipt time, label provenance, and alternative candidates. With no reliable label or path, it returns "VASP not established."

**FR-05 — Explainable confidence and risk**
Assign high, medium, low, or unverified attribution confidence using four recorded factors: label reliability, path continuity, case relevance, and independent corroboration. Show the factor evidence and downgrade reasons. Confidence measures support for an entity attribution, not likelihood of criminality. Risk indicators such as mixer contact or high-risk entity labels are separate from attribution confidence and carry source and date.
Acceptance: Changing or removing a label changes the displayed confidence and explanation. Conflicting labels prevent a high-confidence conclusion until resolved. The UI never displays an unexplained percentage as a calibrated probability.

**FR-06 — Cross-chain continuation**
For P0, continue across supported chains only when the system can associate the source bridge or swap transaction with a destination event through a documented protocol event, provider evidence, or a vetted fixture. Store both legs and the matching method. Similar amount and timing alone are insufficient for an asserted link. Support at least one verified transition in the acceptance suite; additional bridge and swap protocols are P1.
Acceptance: A verified fixture displays a single connected path and matching evidence. An ambiguous bridge case stops at the service boundary and offers possible leads without joining them as fact.

**FR-07 — Investigator views and report**
Provide a case summary, ranked candidate list, focused fund-flow graph, ordered transaction trail, data-source panel, and clear warnings for missing data, truncation, and uncertain labels. Export a human-readable PDF or Markdown report plus machine-readable JSON evidence bundle. The report includes case/run identifiers, UTC timestamps, chain/asset, addresses, transaction hashes or UTXO references, path rationale, candidate ranking, confidence reasons, source versions, analyst actions, and a content hash for integrity checking.
Acceptance: A reviewer can reproduce each asserted on-chain step from its transaction reference and can distinguish observed facts, third-party labels, and system inferences. Re-export of the same frozen run preserves the same evidence content hash.

**FR-08 — SAHYOG request preparation**
Generate a draft addressed to the investigator-selected, evidence-supported VASP. Include case reference, request type, legal-authority fields supplied by the investigator, deposit address, asset, transaction evidence, time range, specific information or action sought, and attachments. Validate required fields and show missing information. Only an authorized human action changes status from draft to approved for mock handoff. The mock adapter acknowledges receipt with a reference; it must be visibly labelled as a demonstration integration.
Acceptance: A draft cannot be handed off before required fields and approval are present. Choosing a different recipient or editing request text is logged. Mock acknowledgement does not appear as proof that an asset was frozen or that a VASP complied.

## 6. Interfaces and data model

The implementation should keep provider-specific APIs behind adapters. These are internal prototype contracts, not claims about official SAHYOG endpoints.

| Object or interface | Required fields / behavior |
|---|---|
| CaseInput | caseId, chain, suspectAddress, timeStartUtc, timeEndUtc, optional txIds, assetId, amountRange, incidentType, victimAddress |
| ChainAdapter | Validate address; fetch transactions and transfers by address or transaction; return normalized edges with chain, txId, from, to, assetId, amount, blockTimeUtc, confirmationStatus, and source metadata. BTC edges additionally retain input/output outpoints. |
| LabelRecord | addressOrClusterId, entityId, serviceType, addressType, source, observedAt, validity, licence, and any corroboration or dispute note |
| AnalysisRun | Input snapshot, adapter/provider versions, search bounds, run status, graph reference, candidates, warnings, start/end times |
| Candidate | VASP/entity ID, receiving address, ordered evidence path, amount estimate and method, confidence band and reasons, label references, ranking reason |
| EvidenceBundle | Frozen report data, raw reference manifest, source manifest, analyst decisions, creation time, and content hash |
| RequestDraft | Case and bundle IDs, proposed recipient and type, investigator-supplied authority fields, requested action/data, approval state, approver, mock acknowledgement |

Suggested internal operations are createCase, startAnalysis, getAnalysis, exportEvidence, createRequestDraft, approveRequestDraft, and mockHandoff. The mock SAHYOG adapter receives and returns these objects through a documented test contract. A production mapping is deferred until authorized API documentation and security requirements are available.

## 7. Non-functional requirements and safeguards

**Performance:** On the curated fixture set and a standard demo laptop/server, finish each bounded analysis within two minutes at the 95th percentile. Live-provider timing is measured separately and shown as provider-dependent; no result is silently fabricated when an API fails.

**Reliability:** Support replay mode; surface provider timeout, stale label, unsupported token, chain reorganization, and truncated search states. Cache retrieved data with its retrieval time and confirmation state.

**Security:** Role-based access for investigator and supervisor, encrypted transport and storage for case data, secrets outside the repository, and a tamper-evident record of inputs, exports, edits, approvals, and mock handoffs. Do not put case data on a public blockchain.

**Privacy and provenance:** Minimize personal case data in third-party API requests, document provider retention/licensing terms before use, and maintain a source manifest for every label and transaction dataset. Use synthetic or authorized cases in demos.

**Evidence discipline:** Keep observed on-chain facts separate from labels and inferences. Every report states the analysis time and limitations; later chain events or revised labels require a new run rather than silent edits to an earlier report.

**Accessibility:** The candidate list and evidence trail must remain usable without relying on graph color or layout alone.

## 8. Demo and acceptance suite

| Scenario | Expected result |
|---|---|
| Tron USDT direct deposit | Identify a sourced VASP deposit address, show the transfer and draft the request. |
| Ethereum token multi-hop path | Rank the nearest supported VASP candidate and show each token transfer and any lower-ranked alternative. |
| Bitcoin split with change | Follow relevant UTXOs, label uncertain change heuristics, and avoid treating the entire transaction value as suspect funds. |
| Unsupported or unlabelled destination | Return "VASP not established"; still export the factual trace. |
| Conflicting VASP labels | Surface the conflict, lower confidence, and block automatic recipient selection. |
| Verified bridge fixture | Continue across chains with explicit matching evidence. |
| Ambiguous bridge or swap | Stop the asserted path at the service boundary and list leads as unverified. |
| Provider rate limit or graph bound | Return a partial result with a prominent completeness warning. |
| Request approval gate | Refuse mock handoff without required fields and human approval; log successful approved handoff. |

The showcase journey should use one synthetic or publicly documented fraud case: suspect address → relevant split or intermediary → identifiable VASP deposit → evidence and confidence review → report → approved mock request. A separate negative case demonstrates abstention. The team should display the source and provenance of every VASP label used in the showcase.

## 9. Delivery sequence and dependencies

1. **Foundation:** Define normalized transfer and label contracts; prepare authorized fixtures and expected traces; build case intake and adapter skeletons.
2. **Trace and attribution:** Implement the three chain adapters, bounded graph search, sourced label matching, ranking, and abstention.
3. **Investigator workflow:** Build candidate and evidence views, frozen report export, role/approval flow, and mock SAHYOG adapter.
4. **Hardening and demo:** Run the acceptance suite, measure fixture timing, rehearse live-to-replay fallback, and publish limitations and evaluation results.

**External dependencies:** Blockchain API availability and terms, usable VASP labels and their licences, approved demo data, and sponsor confirmation of SAHYOG payloads, recipient directory, legal-authority fields, and production security controls. The SIH problem statement supplies the target workflow; it does not supply an API contract.

## 10. Product risks and decisions

| Risk | Required product behavior |
|---|---|
| False VASP attribution | Show evidence and alternatives; abstain when labels or paths are inadequate; require human selection of the recipient. |
| Mistaking a hot wallet for a deposit endpoint | Distinguish address types and state the exact supported relationship. |
| False cross-chain link | Continue only with verifiable matching evidence. |
| Tracing explosion or missing provider data | Bound search; show truncation and incomplete-data warnings. |
| Legal or routing mismatch | Draft only; require authority fields and human approval; replace the mock adapter only after sponsor validation. |
| Demo dependence on live services | Maintain deterministic fixtures and label their replay status in the UI and report. |

**Sponsor validation before production:** Confirm the official SAHYOG integration contract, authorization and approval policy, VASP directory, permissible request types, evidence format, retention rules, and operational service levels. A February 2026 MHA parliamentary reply describes Sahyog as supporting VDA service-provider disclosure, asset freeze and tracking, and secure communication; it does not publish the API contract needed for this implementation.

## References

- User-supplied SIH problem statement and referenced Blockchain Intelligence Architecture conversation, used for the product brief and prototype direction.
- Ministry of Home Affairs, Rajya Sabha answer No. 589, 4 February 2026, for Sahyog's publicly described VDA workflow.
- Bitcoin Developer Guide: Transactions, for UTXO-level transaction structure.
- Ethereum documentation: Transactions and smart contract events, for account transactions and token transfer logs.
- TRON developer documentation: TRC-20 interface, for token transfer event structure.

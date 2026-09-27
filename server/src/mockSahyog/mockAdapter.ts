import { RequestDraft } from "../types";
import { generateId } from "../util/fsStore";

// This is a demonstration mock adapter standing in for SAHYOG. It never
// contacts any real endpoint and never claims to have performed a real
// handoff to a production system — see docs/PRD.md FR-08 and the
// non-deceptive framing requirement in the Non-functional requirements.

export interface MockHandoffResponse {
  acknowledgementRef: string;
  receivedAt: string;
  message: string;
  demo: true;
}

export function mockSubmitToSahyog(draft: RequestDraft): MockHandoffResponse {
  return {
    acknowledgementRef: generateId("MOCK-SAHYOG-ACK"),
    receivedAt: new Date().toISOString(),
    message:
      `DEMO ADAPTER: this acknowledgement is generated locally by the VASPTrace prototype and was never sent to, or received from, the real SAHYOG platform. ` +
      `Draft ${draft.id} for recipient "${draft.recipientEntity}" (${draft.requestType}) was recorded as a simulated handoff only.`,
    demo: true,
  };
}

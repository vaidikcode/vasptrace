import { z } from "zod";
import { getAdapter } from "./adapters";
import { Chain } from "./types";

export const caseInputSchema = z
  .object({
    chain: z.enum(["BTC", "ETH", "TRON"]),
    seedAddress: z.string().min(4),
    timeWindow: z.object({
      from: z.string().min(1),
      to: z.string().min(1),
    }),
    txIds: z.array(z.string()).optional(),
    asset: z.string().optional(),
    amount: z.number().nonnegative().optional(),
    victimAddress: z.string().optional(),
    incidentType: z.string().optional(),
    caseTitle: z.string().optional(),
  })
  .superRefine((val, ctx) => {
    // Heuristic, chain-specific address format check only — see docs/PRD.md
    // "Address-format validation is heuristic" limitation.
    const adapter = getAdapter(val.chain as Chain);
    if (!adapter.validateAddress(val.seedAddress)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["seedAddress"],
        message: `seedAddress does not look like a plausible ${val.chain} address (heuristic check only).`,
      });
    }
    if (val.victimAddress && !adapter.validateAddress(val.victimAddress)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["victimAddress"],
        message: `victimAddress does not look like a plausible ${val.chain} address (heuristic check only).`,
      });
    }
    const from = Date.parse(val.timeWindow.from);
    const to = Date.parse(val.timeWindow.to);
    if (Number.isNaN(from) || Number.isNaN(to)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["timeWindow"],
        message: "timeWindow.from and timeWindow.to must be valid ISO-8601 timestamps.",
      });
    } else if (from > to) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["timeWindow"],
        message: "timeWindow.from must be before timeWindow.to.",
      });
    }
  });

export const analyzeOptionsSchema = z.object({
  hopLimit: z.number().int().min(1).max(10).optional(),
  transferCap: z.number().int().min(1).max(2000).optional(),
});

export const requestDraftCreateSchema = z.object({
  candidateId: z.string().min(1),
  requestType: z.enum([
    "kyc-details",
    "transaction-records",
    "account-freeze",
    "general-information",
  ]),
});

export const requestDraftEditSchema = z.object({
  legalAuthorityFields: z
    .object({
      requestingOfficer: z.string().optional(),
      officerDesignation: z.string().optional(),
      caseFirNumber: z.string().optional(),
      legalProvision: z.string().optional(),
      authorisingAuthority: z.string().optional(),
      justification: z.string().optional(),
    })
    .optional(),
  requestType: z
    .enum(["kyc-details", "transaction-records", "account-freeze", "general-information"])
    .optional(),
  approve: z.boolean().optional(),
  approvedBy: z.string().optional(),
  overrideConflictingLabels: z.boolean().optional(),
});

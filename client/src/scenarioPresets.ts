import { Chain } from "./types";

// Convenience presets matching docs/PRD.md section 8 (the acceptance suite),
// so a demo can be driven straight from the UI without typing addresses.
export interface ScenarioPreset {
  id: string;
  label: string;
  chain: Chain;
  seedAddress: string;
  from: string;
  to: string;
  incidentType?: string;
}

export const SCENARIO_PRESETS: ScenarioPreset[] = [
  {
    id: "scn1",
    label: "1. TRON direct deposit to labelled exchange",
    chain: "TRON",
    seedAddress: "TSeed1TronSuspectAddress0001",
    from: "2026-01-01T00:00:00Z",
    to: "2026-12-31T00:00:00Z",
    incidentType: "UPI/crypto fraud",
  },
  {
    id: "scn2",
    label: "2. ETH multi-hop path + alternative candidate",
    chain: "ETH",
    seedAddress: "0xaaaaa3e800000000000000000000000000000000",
    from: "2026-01-01T00:00:00Z",
    to: "2026-12-31T00:00:00Z",
  },
  {
    id: "scn3",
    label: "3. BTC split output with change address",
    chain: "BTC",
    seedAddress: "bc1qseed3suspectaddressxx0001",
    from: "2026-01-01T00:00:00Z",
    to: "2026-12-31T00:00:00Z",
  },
  {
    id: "scn4",
    label: "4. ETH destination with no VASP label",
    chain: "ETH",
    seedAddress: "0xaaaaa3ee00000000000000000000000000000000",
    from: "2026-01-01T00:00:00Z",
    to: "2026-12-31T00:00:00Z",
  },
  {
    id: "scn5",
    label: "5. TRON address with conflicting labels",
    chain: "TRON",
    seedAddress: "TSeed5TronSuspectAddress0005",
    from: "2026-01-01T00:00:00Z",
    to: "2026-12-31T00:00:00Z",
  },
  {
    id: "scn6",
    label: "6. ETH -> TRON verified bridge crossing",
    chain: "ETH",
    seedAddress: "0xaaaaa3f000000000000000000000000000000000",
    from: "2026-01-01T00:00:00Z",
    to: "2026-12-31T00:00:00Z",
  },
  {
    id: "scn7",
    label: "7. BTC ambiguous bridge (no match record)",
    chain: "BTC",
    seedAddress: "bc1qseed7suspectbridgexxxx0001",
    from: "2026-01-01T00:00:00Z",
    to: "2026-12-31T00:00:00Z",
  },
  {
    id: "scn8",
    label: "8. ETH deep chain forcing hop-limit truncation",
    chain: "ETH",
    seedAddress: "0xaaaaa3f200000000000000000000000000000000",
    from: "2026-01-01T00:00:00Z",
    to: "2026-12-31T00:00:00Z",
  },
];

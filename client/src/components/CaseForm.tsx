import { useState } from "react";
import { CaseInput, Chain } from "../types";
import { SCENARIO_PRESETS } from "../scenarioPresets";

interface Props {
  onSubmit: (input: CaseInput) => void;
  submitting: boolean;
}

const emptyForm = {
  chain: "TRON" as Chain,
  seedAddress: "",
  from: "2026-01-01T00:00:00Z",
  to: "2026-12-31T00:00:00Z",
  txIds: "",
  asset: "",
  amount: "",
  victimAddress: "",
  incidentType: "",
};

export default function CaseForm({ onSubmit, submitting }: Props) {
  const [form, setForm] = useState(emptyForm);

  function applyPreset(id: string) {
    const preset = SCENARIO_PRESETS.find((p) => p.id === id);
    if (!preset) return;
    setForm({
      ...emptyForm,
      chain: preset.chain,
      seedAddress: preset.seedAddress,
      from: preset.from,
      to: preset.to,
      incidentType: preset.incidentType ?? "",
    });
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const input: CaseInput = {
      chain: form.chain,
      seedAddress: form.seedAddress.trim(),
      timeWindow: { from: form.from, to: form.to },
      txIds: form.txIds.trim()
        ? form.txIds.split(",").map((s) => s.trim()).filter(Boolean)
        : undefined,
      asset: form.asset.trim() || undefined,
      amount: form.amount.trim() ? Number(form.amount) : undefined,
      victimAddress: form.victimAddress.trim() || undefined,
      incidentType: form.incidentType.trim() || undefined,
    };
    onSubmit(input);
  }

  return (
    <form className="panel" onSubmit={handleSubmit}>
      <h2>Case intake</h2>

      <div className="field">
        <label>Load an acceptance-suite scenario (optional)</label>
        <select defaultValue="" onChange={(e) => applyPreset(e.target.value)}>
          <option value="" disabled>
            Choose a scenario fixture to pre-fill the form…
          </option>
          {SCENARIO_PRESETS.map((p) => (
            <option key={p.id} value={p.id}>
              {p.label}
            </option>
          ))}
        </select>
      </div>

      <div className="grid-2">
        <div className="field">
          <label>Chain</label>
          <select
            value={form.chain}
            onChange={(e) => setForm({ ...form, chain: e.target.value as Chain })}
          >
            <option value="BTC">Bitcoin (BTC)</option>
            <option value="ETH">Ethereum (ETH)</option>
            <option value="TRON">TRON</option>
          </select>
        </div>
        <div className="field">
          <label>Seed address</label>
          <input
            value={form.seedAddress}
            onChange={(e) => setForm({ ...form, seedAddress: e.target.value })}
            placeholder="Suspect wallet address"
            required
          />
        </div>
      </div>

      <div className="grid-2">
        <div className="field">
          <label>Time window — from</label>
          <input
            value={form.from}
            onChange={(e) => setForm({ ...form, from: e.target.value })}
            placeholder="ISO-8601, e.g. 2026-01-01T00:00:00Z"
            required
          />
        </div>
        <div className="field">
          <label>Time window — to</label>
          <input
            value={form.to}
            onChange={(e) => setForm({ ...form, to: e.target.value })}
            placeholder="ISO-8601"
            required
          />
        </div>
      </div>

      <div className="grid-2">
        <div className="field">
          <label>Known transaction ID(s), comma-separated (optional)</label>
          <input
            value={form.txIds}
            onChange={(e) => setForm({ ...form, txIds: e.target.value })}
          />
        </div>
        <div className="field">
          <label>Asset (optional)</label>
          <input value={form.asset} onChange={(e) => setForm({ ...form, asset: e.target.value })} />
        </div>
      </div>

      <div className="grid-2">
        <div className="field">
          <label>Approximate amount (optional)</label>
          <input
            type="number"
            value={form.amount}
            onChange={(e) => setForm({ ...form, amount: e.target.value })}
          />
        </div>
        <div className="field">
          <label>Victim address (optional)</label>
          <input
            value={form.victimAddress}
            onChange={(e) => setForm({ ...form, victimAddress: e.target.value })}
          />
        </div>
      </div>

      <div className="field">
        <label>Incident type (optional)</label>
        <input
          value={form.incidentType}
          onChange={(e) => setForm({ ...form, incidentType: e.target.value })}
          placeholder="e.g. investment scam, sextortion, romance scam"
        />
      </div>

      <button type="submit" disabled={submitting}>
        {submitting ? "Running…" : "Create case and run analysis"}
      </button>
    </form>
  );
}

import path from "path";
import { Chain, LabelRecord } from "../types";
import { FIXTURES_DIR } from "../config/paths";
import { readJsonFile } from "../util/fsStore";

interface LabelsFile {
  synthetic: boolean;
  labels: LabelRecord[];
}

let cache: LabelRecord[] | null = null;

function loadAll(): LabelRecord[] {
  if (cache) return cache;
  const file = path.join(FIXTURES_DIR, "labels", "vasp-labels.json");
  const raw = readJsonFile<LabelsFile>(file);
  cache = raw.labels;
  return cache;
}

// Multiple LabelRecords can share an address (the "conflicting labels"
// scenario), so lookups always return an array rather than a single record.
export function getLabelsForAddress(
  address: string,
  chain: Chain
): LabelRecord[] {
  return loadAll().filter((l) => l.address === address && l.chain === chain);
}

export function hasConflictingLabels(labels: LabelRecord[]): boolean {
  if (labels.length < 2) return false;
  const entities = new Set(labels.map((l) => l.entity));
  return entities.size > 1;
}

export function allLabels(): LabelRecord[] {
  return loadAll();
}

import { atom } from "jotai";
import { filtersAtom, selectedFilterIdAtom, pastFiltersAtom, futureFiltersAtom } from "./core-atoms";
import type { FilterType } from "../filters/filter-registry";
import type { CustomPreset } from "./types";
import { uuid } from "./types";

function isValidPreset(obj: unknown): obj is CustomPreset {
  if (!obj || typeof obj !== 'object') return false;
  const p = obj as Record<string, unknown>;
  if (typeof p.name !== 'string' || p.name.length === 0 || p.name.length > 100) return false;
  if (!Array.isArray(p.filters)) return false;
  return p.filters.every((f: unknown) => {
    if (!f || typeof f !== 'object') return false;
    const fd = f as Record<string, unknown>;
    if (typeof fd.type !== 'string') return false;
    if (typeof fd.enabled !== 'boolean') return false;
    if (!fd.params || typeof fd.params !== 'object') return false;
    return true;
  });
}

function loadCustomPresetsFromStorage(): CustomPreset[] {
  try {
    const raw = localStorage.getItem("spectra-custom-presets");
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(isValidPreset);
  } catch {
    return [];
  }
}

function saveCustomPresetsToStorage(presets: CustomPreset[]) {
  try {
    localStorage.setItem("spectra-custom-presets", JSON.stringify(presets));
  } catch (e) {
    if (e instanceof DOMException && e.name === "QuotaExceededError") {
      console.warn('[Spectra] Storage full — could not save custom preset');
    }
  }
}

export const customPresetsAtom = atom<CustomPreset[]>(loadCustomPresetsFromStorage());

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const saveCurrentAsPresetAtom = atom(null, (get: any, set: any, name: string) => {
  const safe = name.replace(/[^a-zA-Z0-9 _\-()]/g, "").slice(0, 100) || "Untitled";
  const filters = get(filtersAtom);
  const stripped: CustomPreset["filters"] = filters.map((f: { type: FilterType; enabled: boolean; params: Record<string, number> }) => ({
    type: f.type,
    enabled: f.enabled,
    params: { ...f.params },
  }));
  const current = get(customPresetsAtom);
  const updated = [...current, { name: safe, filters: stripped }];
  saveCustomPresetsToStorage(updated);
  set(customPresetsAtom, updated);
});

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const deleteCustomPresetAtom = atom(null, (_get: any, set: any, index: number) => {
  const current = _get(customPresetsAtom);
  const updated = current.filter((_: unknown, i: number) => i !== index);
  saveCustomPresetsToStorage(updated);
  set(customPresetsAtom, updated);
});

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const loadCustomPresetAtom = atom(null, (get: any, set: any, index: number) => {
  const customPresets = get(customPresetsAtom);
  const preset = customPresets[index];
  if (!preset) return;
  const past = get(pastFiltersAtom);
  const filters = get(filtersAtom);
  set(pastFiltersAtom, [...past, filters].slice(-30));
  set(futureFiltersAtom, []);
  set(
    filtersAtom,
    preset.filters.map((f: { type: FilterType; enabled: boolean; params: Record<string, number> }) => ({
      id: uuid(),
      type: f.type,
      params: { ...f.params },
      enabled: f.enabled,
      locked: false,
    })),
  );
  set(selectedFilterIdAtom, null);
});

import { atom, getDefaultStore, type Getter, type Setter } from "jotai";
import { filterManifestByType, FILTER_MANIFESTS, type FilterType } from "../filters/filter-registry";

export type { FilterType };

export function uuid(): string {
  if (typeof crypto !== "undefined" && crypto.randomUUID) return crypto.randomUUID();
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = crypto.getRandomValues(new Uint8Array(1))[0] & 15;
    return (c === "x" ? r : (r & 3) | 8).toString(16);
  });
}

export interface FilterData {
  id: string;
  type: FilterType;
  params: Record<string, number>;
  enabled: boolean;
  locked?: boolean;
}

const MAX_HISTORY = 30;

export const filtersAtom = atom<FilterData[]>([]);
export const selectedFilterIdAtom = atom<string | null>(null);
export const pastFiltersAtom = atom<FilterData[][]>([]);
export const futureFiltersAtom = atom<FilterData[][]>([]);
export const effectBrowserOpenAtom = atom(false);
export const presetBrowserOpenAtom = atom(false);
export const imageUrlAtom = atom<string | null>(null);
export const exportTriggerAtom = atom(0);
export const isExportingAtom = atom(false);
export const exportFormatAtom = atom<'png' | 'jpeg' | 'webp'>('png');
export const pendingExportHandleAtom = atom<FileSystemFileHandle | null>(null);

export const toggleLockFilterAtom = atom(null, (get, set, filterId: string) => {
  pushToPast(get, set);
  set(
    filtersAtom,
    get(filtersAtom).map((f) => (f.id === filterId ? { ...f, locked: !f.locked } : f)),
  );
});

export const batchLockFiltersAtom = atom(null, (get, set) => {
  pushToPast(get, set);
  const filters = get(filtersAtom);
  const allLocked = filters.every((f) => f.locked);
  set(
    filtersAtom,
    filters.map((f) => ({ ...f, locked: !allLocked })),
  );
});

// Write-only action atoms

export const setSelectedFilterIdAtom = atom(null, (_get, set, id: string | null) =>
  set(selectedFilterIdAtom, id),
);

export const setEffectBrowserOpenAtom = atom(null, (_get, set, v: boolean) =>
  set(effectBrowserOpenAtom, v),
);

export const setPresetBrowserOpenAtom = atom(null, (_get, set, v: boolean) =>
  set(presetBrowserOpenAtom, v),
);

export const setImageUrlAtom = atom(null, (get, set, file: File) => {
  const current = get(imageUrlAtom);
  if (current) URL.revokeObjectURL(current);
  set(imageUrlAtom, URL.createObjectURL(file));
});

export const triggerExportAtom = atom(null, (get, set) =>
  set(exportTriggerAtom, get(exportTriggerAtom) + 1),
);

export const setExportingAtom = atom(null, (_get, set, v: boolean) =>
  set(isExportingAtom, v),
);

// History helpers

const pushToPast = (get: Getter, set: Setter) => {
  const filters = get(filtersAtom);
  const past = get(pastFiltersAtom);
  set(pastFiltersAtom, [...past, filters].slice(-MAX_HISTORY));
};

export const addFilterAtom = atom(null, (get, set, type: FilterType, id?: string) => {
  pushToPast(get, set);
  const manifest = filterManifestByType.get(type);
  const newFilter: FilterData = {
    id: id ?? uuid(),
    type,
    params: manifest ? { ...manifest.defaultParams } : {},
    enabled: true,
    locked: false,
  };
  set(filtersAtom, [newFilter, ...get(filtersAtom)]);
});

export const updateFilterParamAtom = atom(
  null,
  (get, set, filterId: string, param: string, value: number) => {
    set(
      filtersAtom,
      get(filtersAtom).map((f) =>
        f.id === filterId ? { ...f, params: { ...f.params, [param]: value } } : f,
      ),
    );
  },
);

export const toggleFilterAtom = atom(null, (get, set, filterId: string) => {
  pushToPast(get, set);
  set(
    filtersAtom,
    get(filtersAtom).map((f) => (f.id === filterId ? { ...f, enabled: !f.enabled } : f)),
  );
});

export const batchToggleFiltersAtom = atom(null, (get, set, filterIds: string[]) => {
  pushToPast(get, set);
  const filters = get(filtersAtom);
  const allEnabled = filterIds.every((id) => {
    const f = filters.find((f) => f.id === id);
    return f?.enabled;
  });
  set(
    filtersAtom,
    filters.map((f) => (filterIds.includes(f.id) ? { ...f, enabled: !allEnabled } : f)),
  );
});

export const removeFilterAtom = atom(null, (get, set, filterId: string) => {
  pushToPast(get, set);
  const selectedId = get(selectedFilterIdAtom);
  set(
    filtersAtom,
    get(filtersAtom).filter((f) => f.id !== filterId),
  );
  if (selectedId === filterId) {
    set(selectedFilterIdAtom, null);
  }
});

export const moveFilterUpAtom = atom(null, (get, set, filterId: string) => {
  pushToPast(get, set);
  const filters = [...get(filtersAtom)];
  const idx = filters.findIndex((f) => f.id === filterId);
  if (idx <= 0) return;
  [filters[idx - 1], filters[idx]] = [filters[idx], filters[idx - 1]];
  set(filtersAtom, filters);
});

export const moveFilterDownAtom = atom(null, (get, set, filterId: string) => {
  pushToPast(get, set);
  const filters = [...get(filtersAtom)];
  const idx = filters.findIndex((f) => f.id === filterId);
  if (idx < 0 || idx >= filters.length - 1) return;
  [filters[idx + 1], filters[idx]] = [filters[idx], filters[idx + 1]];
  set(filtersAtom, filters);
});

export const reorderFiltersAtom = atom(null, (get, set, filters: FilterData[]) => {
  pushToPast(get, set);
  set(filtersAtom, filters);
});

export const undoAtom = atom(null, (get, set) => {
  const past = get(pastFiltersAtom);
  if (past.length === 0) return;
  const prev = past[past.length - 1];
  set(futureFiltersAtom, [...get(futureFiltersAtom), get(filtersAtom)]);
  set(pastFiltersAtom, past.slice(0, -1));
  set(filtersAtom, prev);
  const selectedId = get(selectedFilterIdAtom);
  if (selectedId && !prev.some((f) => f.id === selectedId)) {
    set(selectedFilterIdAtom, null);
  }
});

export const redoAtom = atom(null, (get, set) => {
  const future = get(futureFiltersAtom);
  if (future.length === 0) return;
  const next = future[0];
  set(pastFiltersAtom, [...get(pastFiltersAtom), get(filtersAtom)]);
  set(futureFiltersAtom, future.slice(1));
  set(filtersAtom, next);
  const selectedId = get(selectedFilterIdAtom);
  if (selectedId && !next.some((f) => f.id === selectedId)) {
    set(selectedFilterIdAtom, null);
  }
});

export interface CustomPreset {
  name: string;
  filters: { type: FilterType; enabled: boolean; params: Record<string, number> }[];
}

function loadCustomPresetsFromStorage(): CustomPreset[] {
  try {
    const raw = localStorage.getItem("spectra-custom-presets");
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveCustomPresetsToStorage(presets: CustomPreset[]) {
  try {
    localStorage.setItem("spectra-custom-presets", JSON.stringify(presets));
  } catch (e) {
    if (e instanceof DOMException && e.name === "QuotaExceededError") {
      const existing = document.getElementById("quota-warning-custom");
      if (existing) return;
      const el = document.createElement("div");
      el.id = "quota-warning-custom";
      el.className =
        "fixed bottom-20 left-1/2 -translate-x-1/2 z-50 bg-red-900/90 border border-red-700/50 text-red-200 text-xs px-4 py-2 rounded-lg shadow-lg animate-fade-in";
      el.textContent = "Storage full — could not save custom preset";
      document.body.appendChild(el);
      setTimeout(() => el.remove(), 3000);
    }
  }
}

export const customPresetsAtom = atom<CustomPreset[]>(loadCustomPresetsFromStorage());

export const saveCurrentAsPresetAtom = atom(null, (get, set, name: string) => {
  const safe = name.replace(/[^a-zA-Z0-9 _\-()]/g, "").slice(0, 100) || "Untitled";
  const filters = get(filtersAtom);
  const stripped: CustomPreset["filters"] = filters.map((f) => ({
    type: f.type,
    enabled: f.enabled,
    params: { ...f.params },
  }));
  const current = get(customPresetsAtom);
  const updated = [...current, { name: safe, filters: stripped }];
  saveCustomPresetsToStorage(updated);
  set(customPresetsAtom, updated);
});

export const deleteCustomPresetAtom = atom(null, (get, set, index: number) => {
  const current = get(customPresetsAtom);
  const updated = current.filter((_, i) => i !== index);
  saveCustomPresetsToStorage(updated);
  set(customPresetsAtom, updated);
});

export const loadCustomPresetAtom = atom(null, (get, set, index: number) => {
  const customPresets = get(customPresetsAtom);
  const preset = customPresets[index];
  if (!preset) return;
  pushToPast(get, set);
  set(futureFiltersAtom, []);
  set(
    filtersAtom,
    preset.filters.map((f) => ({
      id: uuid(),
      type: f.type,
      params: { ...f.params },
      enabled: f.enabled,
      locked: false,
    })),
  );
  set(selectedFilterIdAtom, null);
});

export const resetEditorAtom = atom(null, (get, set) => {
  const url = get(imageUrlAtom);
  if (url) URL.revokeObjectURL(url);
  set(imageUrlAtom, null);
  set(filtersAtom, []);
  set(exportTriggerAtom, 0);
  set(selectedFilterIdAtom, null);
  set(isExportingAtom, false);
  set(pastFiltersAtom, []);
  set(futureFiltersAtom, []);
});

// Jotai store for external (non-React) access
export const jotaiStore = getDefaultStore();

// Initialize from URL hash
try {
  const hash = window.location.hash;
  if (hash && hash.length > 5 && hash.length < 10000) {
    const raw = atob(hash.slice(1));
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.length <= 50) {
      const validTypes = new Set(FILTER_MANIFESTS.map(m => m.type));
      const initialFilters: FilterData[] = [];
      for (const f of parsed) {
        if (typeof f.t !== 'string' || !validTypes.has(f.t)) continue;
        if (f.p && typeof f.p === 'object') {
          for (const k of Object.keys(f.p)) {
            if (typeof f.p[k] !== 'number') { delete f.p[k]; }
          }
        }
        initialFilters.push({
          id: uuid(),
          type: f.t,
          params: (f.p && typeof f.p === 'object') ? f.p : {},
          enabled: f.e !== false,
          locked: f.l === true,
        });
      }
      if (initialFilters.length > 0) {
        jotaiStore.set(filtersAtom, initialFilters);
        jotaiStore.set(selectedFilterIdAtom, initialFilters[0].id);
      }
    }
    history.replaceState(null, "", window.location.pathname + window.location.search);
  }
  } catch { /* invalid hash — ignore */ }

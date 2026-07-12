import { atom } from "jotai";
import { filterManifestByType } from "../filters/filter-registry";
import type { FilterType } from "../filters/filter-registry";
import { filtersAtom, selectedFilterIdAtom, pastFiltersAtom, futureFiltersAtom, imageUrlAtom } from "./core-atoms";
import type { FilterData } from "./types";
import { uuid } from "./types";

const MAX_HISTORY = 30;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const pushToPast = (get: any, set: any) => {
  const filters = get(filtersAtom);
  const past = get(pastFiltersAtom);
  set(pastFiltersAtom, [...past, filters].slice(-MAX_HISTORY));
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const toggleLockFilterAtom = atom(null, (get: any, set: any, filterId: string) => {
  pushToPast(get, set);
  set(
    filtersAtom,
    get(filtersAtom).map((f: FilterData) => (f.id === filterId ? { ...f, locked: !f.locked } : f)),
  );
});

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const batchLockFiltersAtom = atom(null, (get: any, set: any) => {
  pushToPast(get, set);
  const filters = get(filtersAtom);
  const allLocked = filters.every((f: FilterData) => f.locked);
  set(
    filtersAtom,
    filters.map((f: FilterData) => ({ ...f, locked: !allLocked })),
  );
});

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const setImageUrlAtom = atom(null, (get: any, set: any, file: File) => {
  const current = get(imageUrlAtom);
  if (current) URL.revokeObjectURL(current);
  set(imageUrlAtom, URL.createObjectURL(file));
});

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const addFilterAtom = atom(null, (get: any, set: any, type: FilterType, id?: string) => {
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
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (get: any, set: any, filterId: string, param: string, value: number) => {
    set(
      filtersAtom,
      get(filtersAtom).map((f: FilterData) =>
        f.id === filterId ? { ...f, params: { ...f.params, [param]: value } } : f,
      ),
    );
  },
);

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const toggleFilterAtom = atom(null, (get: any, set: any, filterId: string) => {
  pushToPast(get, set);
  set(
    filtersAtom,
    get(filtersAtom).map((f: FilterData) => (f.id === filterId ? { ...f, enabled: !f.enabled } : f)),
  );
});

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const batchToggleFiltersAtom = atom(null, (get: any, set: any, filterIds: string[]) => {
  pushToPast(get, set);
  const filters = get(filtersAtom);
  const allEnabled = filterIds.every((id) => {
    const f = filters.find((f: FilterData) => f.id === id);
    return f?.enabled;
  });
  set(
    filtersAtom,
    filters.map((f: FilterData) => (filterIds.includes(f.id) ? { ...f, enabled: !allEnabled } : f)),
  );
});

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const removeFilterAtom = atom(null, (get: any, set: any, filterId: string) => {
  pushToPast(get, set);
  const selectedId = get(selectedFilterIdAtom);
  set(
    filtersAtom,
    get(filtersAtom).filter((f: FilterData) => f.id !== filterId),
  );
  if (selectedId === filterId) {
    set(selectedFilterIdAtom, null);
  }
});

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const moveFilterUpAtom = atom(null, (get: any, set: any, filterId: string) => {
  pushToPast(get, set);
  const filters = [...get(filtersAtom)];
  const idx = filters.findIndex((f: FilterData) => f.id === filterId);
  if (idx <= 0) return;
  [filters[idx - 1], filters[idx]] = [filters[idx], filters[idx - 1]];
  set(filtersAtom, filters);
});

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const moveFilterDownAtom = atom(null, (get: any, set: any, filterId: string) => {
  pushToPast(get, set);
  const filters = [...get(filtersAtom)];
  const idx = filters.findIndex((f: FilterData) => f.id === filterId);
  if (idx < 0 || idx >= filters.length - 1) return;
  [filters[idx + 1], filters[idx]] = [filters[idx], filters[idx + 1]];
  set(filtersAtom, filters);
});

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const reorderFiltersAtom = atom(null, (get: any, set: any, filters: FilterData[]) => {
  pushToPast(get, set);
  set(filtersAtom, filters);
});

// Batches updateFilterParam + history clear into a single atom write → 1 re-render instead of 3
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const updateFilterParamWithHistoryAtom = atom(
  null,
  (get: any, set: any, filterId: string, param: string, value: number) => {
    const pre = get(filtersAtom);
    set(
      filtersAtom,
      pre.map((f: FilterData) =>
        f.id === filterId ? { ...f, params: { ...f.params, [param]: value } } : f,
      ),
    );
    set(pastFiltersAtom, [...get(pastFiltersAtom), pre].slice(-MAX_HISTORY));
    set(futureFiltersAtom, []);
  },
);

// Batches past/future clear into a single atom write → 1 re-render instead of 2
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const pushHistoryAtom = atom(null, (get: any, set: any, prev: FilterData[]) => {
  set(pastFiltersAtom, [...get(pastFiltersAtom), prev].slice(-MAX_HISTORY));
  set(futureFiltersAtom, []);
});

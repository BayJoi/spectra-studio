import { atom } from "jotai";
import { filtersAtom, selectedFilterIdAtom, pastFiltersAtom, futureFiltersAtom } from "./core-atoms";
import type { FilterData } from "./types";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const undoAtom = atom(null, (get: any, set: any) => {
  const past = get(pastFiltersAtom);
  if (past.length === 0) return;
  const prev = past[past.length - 1];
  set(futureFiltersAtom, [...get(futureFiltersAtom), get(filtersAtom)]);
  set(pastFiltersAtom, past.slice(0, -1));
  set(filtersAtom, prev);
  const selectedId = get(selectedFilterIdAtom);
  if (selectedId && !prev.some((f: FilterData) => f.id === selectedId)) {
    set(selectedFilterIdAtom, null);
  }
});

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const redoAtom = atom(null, (get: any, set: any) => {
  const future = get(futureFiltersAtom);
  if (future.length === 0) return;
  const next = future[0];
  set(pastFiltersAtom, [...get(pastFiltersAtom), get(filtersAtom)]);
  set(futureFiltersAtom, future.slice(1));
  set(filtersAtom, next);
  const selectedId = get(selectedFilterIdAtom);
  if (selectedId && !next.some((f: FilterData) => f.id === selectedId)) {
    set(selectedFilterIdAtom, null);
  }
});

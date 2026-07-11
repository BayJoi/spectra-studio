import { atom } from "jotai";
import { filtersAtom, selectedFilterIdAtom, pastFiltersAtom, futureFiltersAtom, imageUrlAtom } from "./core-atoms";
import { exportTriggerAtom, isExportingAtom } from "./export-atoms";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const resetEditorAtom = atom(null, (_get: any, set: any) => {
  const url = _get(imageUrlAtom);
  if (url) URL.revokeObjectURL(url);
  set(imageUrlAtom, null);
  set(filtersAtom, []);
  set(exportTriggerAtom, 0);
  set(selectedFilterIdAtom, null);
  set(isExportingAtom, false);
  set(pastFiltersAtom, []);
  set(futureFiltersAtom, []);
});

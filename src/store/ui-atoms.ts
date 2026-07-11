import { atom } from "jotai";
import { selectedFilterIdAtom } from "./core-atoms";

export const effectBrowserOpenAtom = atom(false);
export const presetBrowserOpenAtom = atom(false);
export const renderScaleAtom = atom<number>(1.0);

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const setSelectedFilterIdAtom = atom(null, (_get: any, set: any, id: string | null) =>
  set(selectedFilterIdAtom, id),
);

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const setEffectBrowserOpenAtom = atom(null, (_get: any, set: any, v: boolean) =>
  set(effectBrowserOpenAtom, v),
);

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const setPresetBrowserOpenAtom = atom(null, (_get: any, set: any, v: boolean) =>
  set(presetBrowserOpenAtom, v),
);

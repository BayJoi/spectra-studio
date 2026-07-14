import { atom } from "jotai";
import { selectedFilterIdAtom } from "./core-atoms";
import { uuid } from "./types";

export const effectBrowserOpenAtom = atom(false);
export const presetBrowserOpenAtom = atom(false);
export const renderScaleAtom = atom<number>(
  Number(localStorage.getItem("spectra-render-scale")) || 1.0,
);

export const autoSaveEnabledAtom = atom<boolean>(
  localStorage.getItem("spectra-autosave") === "true",
);

export interface ToastItem {
  id: string;
  message: string;
  type: "success" | "error" | "info";
}

export const toastsAtom = atom<ToastItem[]>([]);

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const addToastAtom = atom(null, (get: any, set: any, message: string, type: "success" | "error" | "info" = "info") => {
  set(toastsAtom, [...get(toastsAtom), { id: uuid(), message, type }]);
});

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const removeToastAtom = atom(null, (_get: any, set: any, id: string) => {
  set(toastsAtom, (prev: ToastItem[]) => prev.filter((t) => t.id !== id));
});

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

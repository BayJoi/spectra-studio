import { atom } from "jotai";

export const exportTriggerAtom = atom(0);
export const isExportingAtom = atom(false);
export const exportFormatAtom = atom<'png' | 'jpeg' | 'webp'>(
  (localStorage.getItem("spectra-export-format") as 'png' | 'jpeg' | 'webp') || 'png',
);
export const pendingExportHandleAtom = atom<FileSystemFileHandle | null>(null);
export const exportQualityAtom = atom<number>(
  Number(localStorage.getItem("spectra-export-quality")) || 0.95,
);

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const triggerExportAtom = atom(null, (_get: any, set: any) =>
  set(exportTriggerAtom, _get(exportTriggerAtom) + 1),
);

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const setExportingAtom = atom(null, (_get: any, set: any, v: boolean) =>
  set(isExportingAtom, v),
);

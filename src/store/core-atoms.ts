import { atom, getDefaultStore } from "jotai";
import type { FilterData } from "./types";

export const filtersAtom = atom<FilterData[]>([]);
export const hasFiltersAtom = atom((get) => get(filtersAtom).length > 0);
export const selectedFilterIdAtom = atom<string | null>(null);
export const pastFiltersAtom = atom<FilterData[][]>([]);
export const futureFiltersAtom = atom<FilterData[][]>([]);
export const imageUrlAtom = atom<string | null>(null);

export const jotaiStore = getDefaultStore();

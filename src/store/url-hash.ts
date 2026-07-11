import { FILTER_MANIFESTS } from "../filters/filter-registry";
import { filtersAtom, selectedFilterIdAtom, jotaiStore } from "./core-atoms";
import type { FilterData } from "./types";
import { uuid } from "./types";

export function initFromUrlHash() {
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
}

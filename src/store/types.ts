import type { FilterType } from "../filters/filter-registry";
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

export interface CustomPreset {
  name: string;
  filters: { type: FilterType; enabled: boolean; params: Record<string, number> }[];
}

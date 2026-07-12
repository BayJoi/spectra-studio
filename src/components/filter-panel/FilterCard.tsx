import { memo, useRef, useState } from "react";
import { useAtomValue, useSetAtom } from "jotai";
import {
  selectedFilterIdAtom,
  updateFilterParamAtom,
  updateFilterParamWithHistoryAtom,
  toggleFilterAtom,
  toggleLockFilterAtom,
  removeFilterAtom,
  moveFilterUpAtom,
  moveFilterDownAtom,
  jotaiStore,
  pushHistoryAtom,
} from "../../store/atoms";
import type { FilterData } from "../../store/atoms";
import { filterManifestByType } from "../../filters/filter-registry";

function clampAndSnap(value: number, min: number, max: number, step: number): number {
  return Math.round(Math.max(min, Math.min(max, value)) / step) * step;
}

function CollapsibleSection({ collapsed, children }: { collapsed: boolean; children: React.ReactNode }) {
  return (
    <div className={`grid transition-[grid-template-rows] duration-200 ease-out ${collapsed ? 'grid-rows-[0fr]' : 'grid-rows-[1fr]'}`}>
      <div className="overflow-hidden">{children}</div>
    </div>
  );
}

interface FilterCardProps {
  filter: FilterData;
  idx: number;
  total: number;
  isCollapsed: boolean;
  isDragOver: boolean;
  onToggleCollapse: (id: string) => void;
  onDragStart: (id: string) => void;
  onDragEnd: () => void;
  onDragEnter: (idx: number) => void;
  onDragLeave: (e: React.DragEvent) => void;
  onDrop: (e: React.DragEvent, toIdx: number) => void;
  preDragFiltersRef: React.MutableRefObject<FilterData[] | null>;
}

export const FilterCard = memo(function FilterCard({
  filter, idx, total, isCollapsed, isDragOver,
  onToggleCollapse, onDragStart, onDragEnd, onDragEnter, onDragLeave, onDrop,
  preDragFiltersRef,
}: FilterCardProps) {
  const selectedId = useAtomValue(selectedFilterIdAtom);
  const setSelectedId = useSetAtom(selectedFilterIdAtom);
  const updateFilterParam = useSetAtom(updateFilterParamAtom);
  const updateParamWithHistory = useSetAtom(updateFilterParamWithHistoryAtom);
  const pushHistory = useSetAtom(pushHistoryAtom);
  const toggleFilter = useSetAtom(toggleFilterAtom);
  const toggleLock = useSetAtom(toggleLockFilterAtom);
  const removeFilter = useSetAtom(removeFilterAtom);
  const moveFilterUp = useSetAtom(moveFilterUpAtom);
  const moveFilterDown = useSetAtom(moveFilterDownAtom);

  const [editingValue, setEditingValue] = useState<{ filterId: string; key: string } | null>(null);
  const editCommittedRef = useRef(false);
  const editInputRef = useRef<HTMLInputElement>(null);
  const lastPressRef = useRef<Map<string, number>>(new Map());

  const manifest = filterManifestByType.get(filter.type);
  if (!manifest) return null;

  const isSelected = selectedId === filter.id;
  const isCollapsedCard = isCollapsed;

  return (
    <div
      className={`group rounded-xl border transition-all duration-150 ${isSelected ? "border-neutral-700 bg-neutral-900" : isDragOver ? "border-orange-500 bg-neutral-900" : "border-neutral-800 bg-neutral-900/60 hover:border-neutral-700"}`}
      onDragOver={(e) => { e.preventDefault(); }}
      onDrop={(e) => onDrop(e, idx)}
      onDragEnter={() => onDragEnter(idx)}
      onDragLeave={onDragLeave}
    >
      <div
        className="flex items-center gap-2 px-3 h-10 cursor-pointer select-none"
        onMouseDown={(e) => {
          const now = Date.now();
          const last = lastPressRef.current.get(filter.id) ?? 0;
          const delta = now - last;
          lastPressRef.current.set(filter.id, now);
          if (delta < 250) {
            e.preventDefault();
            e.stopPropagation();
            onToggleCollapse(filter.id);
          } else {
            setSelectedId(filter.id);
          }
        }}
      >
        <div
          className="cursor-grab active:cursor-grabbing flex items-center justify-center w-5 h-5 text-neutral-700 hover:text-neutral-500 shrink-0"
          draggable
          onDragStart={() => onDragStart(filter.id)}
          onDragEnd={onDragEnd}
          onClick={(e) => e.stopPropagation()}
          onMouseDown={(e) => e.stopPropagation()}
          onPointerDown={(e) => e.stopPropagation()}
        >
          <div className="i-lucide-grip-vertical text-14px" />
        </div>
        <span className="text-xs font-medium text-neutral-300 flex-1">{manifest.label}</span>
        <button
          onMouseDown={(e) => { e.preventDefault(); e.stopPropagation(); onToggleCollapse(filter.id); }}
          className="w-7 h-7 rounded-md flex items-center justify-center transition-all duration-150 cursor-pointer hover:scale-105 active:scale-95 text-neutral-600 hover:text-neutral-400 hover:bg-neutral-800"
        >
          <div className={`i-lucide-chevron-right text-14px transition-transform duration-200 ${!isCollapsedCard ? 'rotate-90' : ''}`} />
        </button>
        <button
          onClick={(e) => { e.stopPropagation(); toggleFilter(filter.id); }}
          onMouseDown={(e) => e.stopPropagation()}
          className={`w-7 h-7 rounded-md flex items-center justify-center transition-all duration-150 cursor-pointer hover:scale-105 active:scale-95 ${filter.enabled ? "text-orange-500 hover:bg-orange-500/10" : "text-neutral-700 hover:bg-neutral-800"}`}
        >
          {filter.enabled ? <div className="i-lucide-power text-14px" /> : <div className="i-lucide-power-off text-14px" />}
        </button>
        <button
          onClick={(e) => { e.stopPropagation(); toggleLock(filter.id); }}
          onMouseDown={(e) => e.stopPropagation()}
          className={`w-7 h-7 rounded-md flex items-center justify-center transition-all duration-150 cursor-pointer hover:scale-105 active:scale-95 ${filter.locked ? "text-orange-500 hover:bg-orange-500/10" : "text-neutral-600 hover:text-neutral-400 hover:bg-neutral-800 opacity-40 group-hover:opacity-100"}`}
        >
          {filter.locked ? <div className="i-lucide-lock text-13px" /> : <div className="i-lucide-unlock text-13px" />}
        </button>
        <button
          onClick={(e) => { e.stopPropagation(); removeFilter(filter.id); }}
          onMouseDown={(e) => e.stopPropagation()}
          className="w-7 h-7 rounded-md flex items-center justify-center text-neutral-600 hover:text-red-400 hover:bg-red-400/10 hover:scale-105 active:scale-95 transition-all duration-150 opacity-40 group-hover:opacity-100 cursor-pointer"
        >
          <div className="i-lucide-trash-2 text-14px" />
        </button>
      </div>
      <CollapsibleSection collapsed={isCollapsedCard}>
        <div className="px-3 pb-3 pt-1 border-t border-neutral-800 space-y-3">
          {Object.entries(manifest.paramConfigs).map(([key, config]) => {
            const val = filter.params[key] ?? manifest.defaultParams[key] ?? 0;
            const isLog = config.logarithmic;
            const normVal = isLog
              ? Math.log(val / config.min) / Math.log(config.max / config.min)
              : (val - config.min) / (config.max - config.min);
            const displayVal = Number.isInteger(config.step) ? Math.round(val) : val.toFixed(2);
            return (
              <div key={key}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs text-neutral-500">{config.label}</span>
                  {editingValue?.filterId === filter.id && editingValue?.key === key ? (
                    <input
                      ref={editInputRef}
                      type="text"
                      defaultValue={displayVal}
                      className="w-16 text-xs font-mono text-neutral-200 bg-neutral-800 border border-orange-500 rounded px-1 py-0.5 text-right focus:outline-none"
                      onKeyDown={(e) => {
                        e.stopPropagation();
                        if (e.key === 'Enter') {
                          const raw = (e.target as HTMLInputElement).value;
                          const num = parseFloat(raw);
                          if (!isNaN(num)) {
                            updateParamWithHistory(filter.id, key, clampAndSnap(num, config.min, config.max, config.step));
                          }
                          editCommittedRef.current = true;
                          setEditingValue(null);
                        } else if (e.key === 'Escape') {
                          setEditingValue(null);
                        }
                      }}
                      onBlur={(e) => {
                        if (editCommittedRef.current) {
                          setEditingValue(null);
                          return;
                        }
                        const raw = e.target.value;
                        const num = parseFloat(raw);
                        if (!isNaN(num)) {
                          updateParamWithHistory(filter.id, key, clampAndSnap(num, config.min, config.max, config.step));
                        }
                        setEditingValue(null);
                      }}
                      onPointerDown={(e) => e.stopPropagation()}
                    />
                  ) : (
                    <span
                      className="text-xs font-mono text-neutral-400 w-12 text-right cursor-pointer hover:text-neutral-200 transition-colors"
                      onClick={(e) => { e.stopPropagation(); setEditingValue({ filterId: filter.id, key }); }}
                    >{displayVal}</span>
                  )}
                </div>
                <input
                  type="range"
                  min={isLog ? 0 : config.min}
                  max={isLog ? 1 : config.max}
                  step={isLog ? 0.001 : config.step}
                  value={isLog ? normVal : val}
                  disabled={filter.locked}
                  onPointerDown={() => { preDragFiltersRef.current = jotaiStore.get(filtersAtom); }}
                  onPointerUp={() => {
                    if (preDragFiltersRef.current) {
                      pushHistory(preDragFiltersRef.current);
                      preDragFiltersRef.current = null;
                    }
                  }}
                  onChange={(e) => {
                    if (isLog) {
                      const norm = parseFloat(e.target.value);
                      const next = config.min * Math.pow(config.max / config.min, norm);
                      updateFilterParam(filter.id, key, clampAndSnap(next, config.min, config.max, config.step));
                    } else {
                      updateFilterParam(filter.id, key, clampAndSnap(parseFloat(e.target.value), config.min, config.max, config.step));
                    }
                  }}
                  onDoubleClick={() => {
                    const def = manifest.defaultParams[key];
                    if (def !== undefined) updateFilterParam(filter.id, key, def);
                  }}
                  className={`w-full h-1.5 rounded-full appearance-none ${filter.locked ? 'cursor-not-allowed opacity-40 bg-neutral-900' : 'cursor-pointer bg-neutral-800'}`}
                  style={{ '--pct': `${normVal * 100}%` } as React.CSSProperties}
                />
              </div>
            );
          })}
          <div className="flex items-center gap-2 pt-1">
            <button
              onClick={(e) => { e.stopPropagation(); moveFilterUp(filter.id); }}
              disabled={idx === 0}
              className="flex-1 py-1.5 rounded-md bg-neutral-800 text-neutral-500 text-xs hover:bg-neutral-700 hover:text-neutral-300 hover:scale-105 active:scale-95 disabled:opacity-30 disabled:hover:scale-100 disabled:cursor-not-allowed transition-all duration-150 cursor-pointer"
            >
              ↑ Up
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); moveFilterDown(filter.id); }}
              disabled={idx === total - 1}
              className="flex-1 py-1.5 rounded-md bg-neutral-800 text-neutral-500 text-xs hover:bg-neutral-700 hover:text-neutral-300 hover:scale-105 active:scale-95 disabled:opacity-30 disabled:hover:scale-100 disabled:cursor-not-allowed transition-all duration-150 cursor-pointer"
            >
              ↓ Down
            </button>
          </div>
        </div>
      </CollapsibleSection>
    </div>
  );
});

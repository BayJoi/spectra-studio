import { useCallback, useRef, useEffect, useState } from "react";

import { useAtomValue, useSetAtom } from "jotai";
import {
  filtersAtom,
  imageUrlAtom,
  selectedFilterIdAtom,
  effectBrowserOpenAtom,
  presetBrowserOpenAtom,
  addFilterAtom,
  uuid,
  updateFilterParamAtom,
  toggleFilterAtom,
  toggleLockFilterAtom,
  removeFilterAtom,
  moveFilterUpAtom,
  moveFilterDownAtom,
  reorderFiltersAtom,
  batchToggleFiltersAtom,
  setSelectedFilterIdAtom,
  setEffectBrowserOpenAtom,
  setPresetBrowserOpenAtom,
  setImageUrlAtom,
  jotaiStore,
  pastFiltersAtom,
  futureFiltersAtom,
  customPresetsAtom,
  saveCurrentAsPresetAtom,
  deleteCustomPresetAtom,
  loadCustomPresetAtom,
} from "../store/atoms";
import type { FilterType } from "../store/atoms";
import type { FilterData } from "../store/atoms";
import { FILTER_MANIFESTS, filterManifestByType } from "../filters/filter-registry";

const GROUPED_MANIFESTS = [...new Set(FILTER_MANIFESTS.map((m) => m.category))].map((category) => ({
  category,
  items: FILTER_MANIFESTS.filter((m) => m.category === category),
}));

function CollapsibleSection({ collapsed, children }: { collapsed: boolean; children: React.ReactNode }) {
  return (
    <div
      className={`grid transition-[grid-template-rows] duration-200 ease-out ${
        collapsed ? 'grid-rows-[0fr]' : 'grid-rows-[1fr]'
      }`}
    >
      <div className="overflow-hidden">
        {children}
      </div>
    </div>
  );
}

function highlightMatch(text: string, query: string) {
  if (!query) return text;
  const idx = text.toLowerCase().indexOf(query.toLowerCase());
  if (idx === -1) return text;
  return (
    <>{text.slice(0, idx)}<span className="text-orange-400">{text.slice(idx, idx + query.length)}</span>{text.slice(idx + query.length)}</>
  );
}

function clampAndSnap(value: number, min: number, max: number, step: number): number {
  return Math.round(Math.max(min, Math.min(max, value)) / step) * step;
}

export function BottomPanel() {
  const filters = useAtomValue(filtersAtom);
  const imageUrl = useAtomValue(imageUrlAtom);
  const setImageUrl = useSetAtom(setImageUrlAtom);
  const addFilter = useSetAtom(addFilterAtom);
  const updateFilterParam = useSetAtom(updateFilterParamAtom);
  const toggleFilter = useSetAtom(toggleFilterAtom);
  const removeFilter = useSetAtom(removeFilterAtom);
  const moveFilterUp = useSetAtom(moveFilterUpAtom);
  const moveFilterDown = useSetAtom(moveFilterDownAtom);
  const reorderFilters = useSetAtom(reorderFiltersAtom);
  const batchToggleFilters = useSetAtom(batchToggleFiltersAtom);
  const selectedId = useAtomValue(selectedFilterIdAtom);
  const setSelectedId = useSetAtom(setSelectedFilterIdAtom);
  const customPresets = useAtomValue(customPresetsAtom);
  const saveCustomPreset = useSetAtom(saveCurrentAsPresetAtom);
  const deleteCustomPreset = useSetAtom(deleteCustomPresetAtom);
  const loadCustomPreset = useSetAtom(loadCustomPresetAtom);
  const dropdownOpen = useAtomValue(effectBrowserOpenAtom);
  const setDropdownOpen = useSetAtom(setEffectBrowserOpenAtom);
  const presetOpen = useAtomValue(presetBrowserOpenAtom);
  const setPresetOpen = useSetAtom(setPresetBrowserOpenAtom);
  const [presetName, setPresetName] = useState("");
  const [showSavePrompt, setShowSavePrompt] = useState(false);
  const [collapsedIds, setCollapsedIds] = useState<Set<string>>(new Set());
  const [dragOverIdx, setDragOverIdx] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [editingValue, setEditingValue] = useState<{ filterId: string; key: string } | null>(null);
  const editInputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const presetRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<string | null>(null);
  const lastPressRef = useRef<Map<string, number>>(new Map());
  const preDragFiltersRef = useRef<FilterData[] | null>(null);
  const filtersRef = useRef(filters);
  // eslint-disable-next-line react-hooks/refs -- intentional: keep ref fresh for event handlers
  filtersRef.current = filters;
  const toggleLock = useSetAtom(toggleLockFilterAtom);

  const toggleCollapse = useCallback((id: string) => {
    setCollapsedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }, []);

  useEffect(() => {
    if (filters.length === 0) {
      if (selectedId !== null) setSelectedId(null);
    } else if (selectedId && !filters.find((f) => f.id === selectedId)) {
      setSelectedId(filters[0]?.id ?? null);
    } else if (!selectedId) {
      setSelectedId(filters[0]?.id ?? null);
    }
  }, [filters, selectedId, setSelectedId]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- intentional: derived state reset on dropdown close
    if (!dropdownOpen) setSearchQuery("");
  }, [dropdownOpen]);

  useEffect(() => {
    if (!editingValue || !editInputRef.current) return;
    editInputRef.current.focus();
    editInputRef.current.select();
  }, [editingValue]);

  useEffect(() => {
    if (!dropdownOpen && !presetOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownOpen && dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
        setSearchQuery("");
      }
      if (presetOpen && presetRef.current && !presetRef.current.contains(e.target as Node)) {
        setPresetOpen(false);
        setShowSavePrompt(false);
      }
    };
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setDropdownOpen(false);
        setPresetOpen(false);
        setShowSavePrompt(false);
      }
    };
    document.addEventListener("pointerdown", handleClickOutside);
    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("pointerdown", handleClickOutside);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [dropdownOpen, presetOpen, setDropdownOpen, setPresetOpen]);

  const handleSelectFilter = useCallback(
    (type: FilterType) => {
      const newId = uuid();
      addFilter(type, newId);
      setCollapsedIds((prev) => new Set(prev).add(newId));
      setDropdownOpen(false);
    },
    [addFilter, setDropdownOpen],
  );

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImageUrl(file);
    }
    e.target.value = "";
  };

  const handleDragStart = useCallback((id: string) => {
    dragRef.current = id;
    setDragOverIdx(null);
  }, []);
  const handleDragEnd = useCallback(() => {
    dragRef.current = null;
    setDragOverIdx(null);
  }, []);
  const handleDragEnterCard = useCallback((idx: number) => {
    setDragOverIdx(idx);
  }, []);
  const handleDragLeaveCard = useCallback((e: React.DragEvent) => {
    const related = e.relatedTarget as Node | null;
    if (!e.currentTarget.contains(related)) {
      setDragOverIdx(null);
    }
  }, []);
  const handleDrop = useCallback(
    (e: React.DragEvent, toIdx: number) => {
      e.preventDefault();
      setDragOverIdx(null);
      const fromId = dragRef.current;
      if (!fromId) return;
      const current = filtersRef.current;
      const fromIdx = current.findIndex((f) => f.id === fromId);
      if (fromIdx === -1 || fromIdx === toIdx) return;
      const reordered = [...current];
      const [moved] = reordered.splice(fromIdx, 1);
      const insertAt = toIdx;
      reordered.splice(insertAt, 0, moved);
      reorderFilters(reordered);
      dragRef.current = null;
    },
    [reorderFilters],
  );

  return (
    <div className="h-full flex flex-col bg-neutral-950 border-t border-neutral-800 select-none">
      <div className="flex items-center justify-between px-5 h-12 border-b border-neutral-800 shrink-0">
        <div className="flex items-center gap-3">
          <span className="text-xs font-semibold text-neutral-400 tracking-widest uppercase">Effects</span>
          <span className="text-xs font-mono text-neutral-600">{filters.length}</span>
        </div>
        <div className="flex items-center gap-2">
          {filters.length > 0 && (
            <button
              onClick={() => batchToggleFilters(filters.map(f => f.id))}
              className="px-3 py-1.5 rounded-md bg-neutral-800 border border-neutral-700 text-neutral-400 hover:text-neutral-200 hover:border-neutral-600 hover:scale-105 active:scale-95 text-xs transition-all duration-150 cursor-pointer"
            >
              {filters.every(f => f.enabled) ? 'All Off' : 'All On'}
            </button>
          )}
            <label className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-xs transition-all duration-150 ${imageUrl ? "bg-neutral-900 border border-neutral-700 text-neutral-500 cursor-not-allowed" : "bg-neutral-900 border border-neutral-700 text-neutral-400 hover:text-neutral-200 hover:border-neutral-600 hover:scale-105 active:scale-95 cursor-pointer"}`}>
              <div className="i-lucide-image text-14px" />
              <span>Image</span>
              <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} disabled={!!imageUrl} />
            </label>
            <label className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-xs transition-all duration-150 ${!imageUrl ? "bg-neutral-800 border border-neutral-700 text-neutral-500 cursor-not-allowed" : "bg-neutral-800 border border-neutral-700 text-neutral-400 hover:text-neutral-200 hover:border-neutral-600 hover:scale-105 active:scale-95 cursor-pointer"}`}>
              <div className="i-lucide-image text-14px" />
              <span>Replace</span>
              <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} disabled={!imageUrl} />
            </label>
          <div className="relative" ref={presetRef}>
            <button
              onClick={() => setPresetOpen(!presetOpen)}
              disabled={!imageUrl && filters.length === 0}
              className="flex items-center gap-2 px-3 py-1.5 rounded-md bg-neutral-800 border border-neutral-700 text-neutral-400 hover:text-neutral-200 hover:border-neutral-600 hover:scale-105 active:scale-95 disabled:text-neutral-600 disabled:hover:scale-100 disabled:hover:border-neutral-700 disabled:cursor-not-allowed text-xs transition-all duration-150 cursor-pointer"
            >
              <div className="i-lucide-folder-open text-14px" />
              Presets
            </button>
            {presetOpen && (
              <div className="absolute bottom-full right-0 mb-6 w-56 bg-neutral-900 border border-neutral-700 rounded-xl shadow-2xl z-50 animate-drop-in overflow-hidden">
                <div className="max-h-80 overflow-y-auto custom-scrollbar p-2 space-y-1">
                  {showSavePrompt ? (
                    <div className="p-2 space-y-2">
                      <input
                        type="text"
                        value={presetName}
                        onChange={(e) => setPresetName(e.target.value)}
                        placeholder="Preset name..."
                        className="w-full px-2 py-1.5 text-xs bg-neutral-800 border border-neutral-700 rounded text-neutral-200 placeholder-neutral-600 focus:outline-none focus:border-orange-500"
                        autoFocus
                        onKeyDown={(e) => {
                          if (e.key === "Enter" && presetName.trim()) {
                            saveCustomPreset(presetName.trim());
                            setPresetName("");
                            setShowSavePrompt(false);
                            setPresetOpen(false);
                          }
                          if (e.key === "Escape") setShowSavePrompt(false);
                        }}
                      />
                      <div className="flex gap-2">
                          <button
                            onClick={() => { setShowSavePrompt(false); setPresetName(""); }}
                            className="flex-1 py-1 text-xs rounded bg-neutral-800 text-neutral-500 hover:text-neutral-300 hover:scale-[1.02] active:scale-[0.98] transition-all duration-150 cursor-pointer"
                          >Cancel</button>
                          <button
                            onClick={() => { if (presetName.trim()) { saveCustomPreset(presetName.trim()); setPresetName(""); setShowSavePrompt(false); setPresetOpen(false); } }}
                            className="flex-1 py-1 text-xs rounded bg-orange-600 text-white hover:bg-orange-500 hover:scale-[1.02] active:scale-[0.98] transition-all duration-150 cursor-pointer"
                          >Save</button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <button
                        onClick={() => setShowSavePrompt(true)}
                        className="w-full text-left px-3 py-2 text-sm text-neutral-300 hover:bg-neutral-800 hover:text-white rounded-lg flex items-center gap-2 hover:scale-[1.02] active:scale-[0.98] transition-all duration-150 cursor-pointer"
                      >
                        <div className="i-lucide-save text-14px" />
                        Save Current...
                      </button>
                      <div className="h-px bg-neutral-800 my-1" />
                      {customPresets.length === 0 && (
                        <div className="px-3 py-4 text-center text-xs text-neutral-600">
                          No saved presets
                        </div>
                      )}
                      {customPresets.length > 0 && (
                        <>
                          <div className="px-3 py-1 text-[10px] font-semibold text-neutral-600 tracking-widest uppercase">Custom</div>
                          {customPresets.map((preset, idx) => (
                            <div key={`custom-${idx}`} className="flex items-center gap-1 group/preset">
                              <button
                                onClick={() => { loadCustomPreset(idx); setPresetOpen(false); }}
                                className="flex-1 text-left px-3 py-2 text-sm text-neutral-300 hover:bg-neutral-800 hover:text-white rounded-lg truncate hover:scale-[1.02] active:scale-[0.98] transition-all duration-150 cursor-pointer"
                              >{preset.name}</button>
                              <button
                                onClick={() => deleteCustomPreset(idx)}
                                className="p-2 text-neutral-600 hover:text-red-400 opacity-0 group-hover/preset:opacity-100 transition-all duration-150 hover:scale-110 active:scale-90 cursor-pointer"
                              ><div className="i-lucide-x text-12px" /></button>
                            </div>
                          ))}
                        </>
                      )}
                    </>
                  )}
                </div>
              </div>
            )}
          </div>
          <div className="relative" ref={dropdownRef}>
            <button
              onClick={() => setDropdownOpen(!dropdownOpen)}
              disabled={!imageUrl}
              className="flex items-center gap-2 px-3 py-1.5 rounded-md bg-orange-600 text-white text-xs font-medium hover:bg-orange-500 hover:shadow-[0_0_12px_rgba(253,154,62,0.35)] hover:scale-105 active:scale-95 disabled:opacity-50 disabled:hover:bg-orange-600 disabled:hover:shadow-none disabled:hover:scale-100 disabled:cursor-not-allowed transition-all duration-150 cursor-pointer"
            >
              <div className="i-lucide-plus text-14px" />
              Add Effect
            </button>
            {dropdownOpen && (
              <div className="absolute bottom-full right-0 mb-6 w-64 bg-neutral-900 border border-neutral-700 rounded-xl shadow-2xl z-50 animate-drop-in overflow-hidden">
                <div className="p-2 pb-0">
                  <div className="flex items-center gap-2 px-2 py-1.5 bg-neutral-800 rounded-lg border border-neutral-700">
                    <div className="i-lucide-search text-13px text-neutral-500 shrink-0" />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Search effects..."
                      className="w-full bg-transparent text-xs text-neutral-200 placeholder-neutral-500 focus:outline-none"
                      onPointerDown={(e) => e.stopPropagation()}
                    />
                  </div>
                </div>
                <div className="max-h-72 overflow-y-auto custom-scrollbar p-2">
                  {GROUPED_MANIFESTS.map(({ category, items }) => {
                    const filtered = searchQuery
                      ? items.filter((m) => m.label.toLowerCase().includes(searchQuery.toLowerCase()))
                      : items;
                    if (filtered.length === 0) return null;
                    return (
                      <div key={category}>
                        <div className="px-2 py-1.5 text-[10px] font-semibold text-neutral-600 tracking-widest uppercase">
                          {category}
                        </div>
                        <div className="space-y-0.5">
                          {filtered.map((manifest) => (
                            <button
                              key={manifest.type}
                              onClick={() => handleSelectFilter(manifest.type)}
                              className="w-full text-left px-3 py-2 text-sm text-neutral-300 hover:bg-neutral-800 hover:text-white hover:scale-[1.02] active:scale-[0.98] transition-all duration-150 cursor-pointer rounded-lg"
                            >
                              {highlightMatch(manifest.label, searchQuery)}
                            </button>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                  {searchQuery && GROUPED_MANIFESTS.every(({ items }) =>
                    !items.some((m) => m.label.toLowerCase().includes(searchQuery.toLowerCase()))
                  ) && (
                    <div className="px-3 py-6 text-center text-xs text-neutral-600">No effects found</div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto min-h-0 custom-scrollbar">
        {filters.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center p-8">
            <p className="text-neutral-600 text-sm">No effects yet.</p>
            <p className="text-neutral-700 text-xs mt-1">
              Click <strong className="text-neutral-500">+ Add Effect</strong> to start.
            </p>
          </div>
        ) : (
          <div className="p-3 space-y-2">
            {filters.map((filter, idx) => {
              const manifest = filterManifestByType.get(filter.type);
              if (!manifest) return null;
              const isSelected = selectedId === filter.id;
              const isCollapsed = collapsedIds.has(filter.id);
              return (
                <div
                  key={filter.id}
                  className={`group rounded-xl border transition-all duration-150 ${isSelected ? "border-neutral-700 bg-neutral-900" : dragOverIdx === idx ? "border-orange-500 bg-neutral-900" : "border-neutral-800 bg-neutral-900/60 hover:border-neutral-700"}`}
                  onDragOver={(e) => { e.preventDefault(); }}
                  onDrop={(e) => handleDrop(e, idx)}
                  onDragEnter={() => handleDragEnterCard(idx)}
                  onDragLeave={handleDragLeaveCard}
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
                        toggleCollapse(filter.id);
                      } else {
                        setSelectedId(filter.id);
                      }
                    }}
                  >
                    <div
                      className="cursor-grab active:cursor-grabbing flex items-center justify-center w-5 h-5 text-neutral-700 hover:text-neutral-500 shrink-0"
                      draggable
                      onDragStart={() => handleDragStart(filter.id)}
                      onDragEnd={handleDragEnd}
                      onClick={(e) => e.stopPropagation()}
                      onMouseDown={(e) => e.stopPropagation()}
                      onPointerDown={(e) => e.stopPropagation()}
                    >
                      <div className="i-lucide-grip-vertical text-14px" />
                    </div>
                    <span className="text-xs font-medium text-neutral-300 flex-1">{manifest.label}</span>
                    <button
                      onMouseDown={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        toggleCollapse(filter.id);
                      }}
                      className="w-7 h-7 rounded-md flex items-center justify-center transition-all duration-150 cursor-pointer hover:scale-105 active:scale-95 text-neutral-600 hover:text-neutral-400 hover:bg-neutral-800"
                    >
                      <div className={`i-lucide-chevron-right text-14px transition-transform duration-200 ${!isCollapsed ? 'rotate-90' : ''}`} />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleFilter(filter.id);
                      }}
                      className={`w-7 h-7 rounded-md flex items-center justify-center transition-all duration-150 cursor-pointer hover:scale-105 active:scale-95 ${filter.enabled ? "text-orange-500 hover:bg-orange-500/10" : "text-neutral-700 hover:bg-neutral-800"}`}
                    >
                      {filter.enabled ? <div className="i-lucide-power text-14px" /> : <div className="i-lucide-power-off text-14px" />}
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleLock(filter.id);
                      }}
                      className={`w-7 h-7 rounded-md flex items-center justify-center transition-all duration-150 cursor-pointer hover:scale-105 active:scale-95 ${filter.locked ? "text-orange-500 hover:bg-orange-500/10" : "text-neutral-600 hover:text-neutral-400 hover:bg-neutral-800 opacity-40 group-hover:opacity-100"}`}
                    >
                      {filter.locked ? <div className="i-lucide-lock text-13px" /> : <div className="i-lucide-unlock text-13px" />}
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        removeFilter(filter.id);
                      }}
                      className="w-7 h-7 rounded-md flex items-center justify-center text-neutral-600 hover:text-red-400 hover:bg-red-400/10 hover:scale-105 active:scale-95 transition-all duration-150 opacity-40 group-hover:opacity-100 cursor-pointer"
                    >
                      <div className="i-lucide-trash-2 text-14px" />
                    </button>
                  </div>
                  <CollapsibleSection collapsed={isCollapsed}>
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
                                          const pre = jotaiStore.get(filtersAtom);
                                          updateFilterParam(filter.id, key, clampAndSnap(num, config.min, config.max, config.step));
                                          jotaiStore.set(pastFiltersAtom, [...jotaiStore.get(pastFiltersAtom), pre].slice(-30));
                                          jotaiStore.set(futureFiltersAtom, []);
                                        }
                                        setEditingValue(null);
                                      } else if (e.key === 'Escape') {
                                        setEditingValue(null);
                                      }
                                    }}
                                    onBlur={(e) => {
                                      const raw = e.target.value;
                                      const num = parseFloat(raw);
                                      if (!isNaN(num)) {
                                        const pre = jotaiStore.get(filtersAtom);
                                        updateFilterParam(filter.id, key, clampAndSnap(num, config.min, config.max, config.step));
                                        jotaiStore.set(pastFiltersAtom, [...jotaiStore.get(pastFiltersAtom), pre].slice(-30));
                                        jotaiStore.set(futureFiltersAtom, []);
                                      }
                                      setEditingValue(null);
                                    }}
                                    onPointerDown={(e) => e.stopPropagation()}
                                  />
                                ) : (
                                  <span
                                    className="text-xs font-mono text-neutral-400 w-12 text-right cursor-pointer hover:text-neutral-200 transition-colors"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setEditingValue({ filterId: filter.id, key });
                                    }}
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
                                    const past = jotaiStore.get(pastFiltersAtom);
                                    jotaiStore.set(pastFiltersAtom, [...past, preDragFiltersRef.current].slice(-30));
                                    jotaiStore.set(futureFiltersAtom, []);
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
                            onClick={(e) => {
                              e.stopPropagation();
                              moveFilterUp(filter.id);
                            }}
                            disabled={idx === 0}
                            className="flex-1 py-1.5 rounded-md bg-neutral-800 text-neutral-500 text-xs hover:bg-neutral-700 hover:text-neutral-300 hover:scale-105 active:scale-95 disabled:opacity-30 disabled:hover:scale-100 disabled:cursor-not-allowed transition-all duration-150 cursor-pointer"
                          >
                            ↑ Up
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              moveFilterDown(filter.id);
                            }}
                            disabled={idx === filters.length - 1}
                            className="flex-1 py-1.5 rounded-md bg-neutral-800 text-neutral-500 text-xs hover:bg-neutral-700 hover:text-neutral-300 hover:scale-105 active:scale-95 disabled:opacity-30 disabled:hover:scale-100 disabled:cursor-not-allowed transition-all duration-150 cursor-pointer"
                          >
                            ↓ Down
                          </button>
                        </div>
                      </div>
                    </CollapsibleSection>
                  </div>
                );
              })}
          </div>
        )}
      </div>
    </div>
  );
}

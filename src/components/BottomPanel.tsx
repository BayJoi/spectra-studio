import { useCallback, useRef, useEffect, useState } from "react";
import { useAtomValue, useSetAtom } from "jotai";
import {
  filtersAtom,
  imageUrlAtom,
  selectedFilterIdAtom,
  effectBrowserOpenAtom,
  presetBrowserOpenAtom,
  reorderFiltersAtom,
  batchToggleFiltersAtom,
  setSelectedFilterIdAtom,
  setEffectBrowserOpenAtom,
  setPresetBrowserOpenAtom,
  setImageUrlAtom,
} from "../store/atoms";
import type { FilterData } from "../store/atoms";
import { FilterCard } from "./filter-panel/FilterCard";
import { EffectBrowser } from "./filter-panel/EffectBrowser";
import { PresetBrowser } from "./filter-panel/PresetBrowser";

export function BottomPanel() {
  const filters = useAtomValue(filtersAtom);
  const imageUrl = useAtomValue(imageUrlAtom);
  const setImageUrl = useSetAtom(setImageUrlAtom);
  const reorderFilters = useSetAtom(reorderFiltersAtom);
  const batchToggleFilters = useSetAtom(batchToggleFiltersAtom);
  const selectedId = useAtomValue(selectedFilterIdAtom);
  const setSelectedId = useSetAtom(setSelectedFilterIdAtom);
  const dropdownOpen = useAtomValue(effectBrowserOpenAtom);
  const setDropdownOpen = useSetAtom(setEffectBrowserOpenAtom);
  const presetOpen = useAtomValue(presetBrowserOpenAtom);
  const setPresetOpen = useSetAtom(setPresetBrowserOpenAtom);
  const [collapsedIds, setCollapsedIds] = useState<Set<string>>(new Set());
  const [dragOverIdx, setDragOverIdx] = useState<number | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const presetRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<string | null>(null);
  const preDragFiltersRef = useRef<FilterData[] | null>(null);
  const filtersRef = useRef(filters);
  // eslint-disable-next-line react-hooks/refs -- intentional: keep ref fresh for event handlers
  filtersRef.current = filters;

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
    if (!dropdownOpen && !presetOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownOpen && dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
      if (presetOpen && presetRef.current && !presetRef.current.contains(e.target as Node)) {
        setPresetOpen(false);
      }
    };
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setDropdownOpen(false);
        setPresetOpen(false);
      }
    };
    document.addEventListener("pointerdown", handleClickOutside);
    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("pointerdown", handleClickOutside);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [dropdownOpen, presetOpen, setDropdownOpen, setPresetOpen]);

  const MAX_FILE_SIZE = 100 * 1024 * 1024; // 100MB

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > MAX_FILE_SIZE) {
        alert('File too large. Maximum size is 100MB.');
        e.target.value = "";
        return;
      }
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
    if (!e.currentTarget.contains(related)) setDragOverIdx(null);
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
      reordered.splice(toIdx, 0, moved);
      reorderFilters(reordered);
      dragRef.current = null;
    },
    [reorderFilters],
  );

  const handleFilterAdded = useCallback((id: string) => {
    setCollapsedIds((prev) => new Set(prev).add(id));
  }, []);

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
              className="px-3 py-1.5 text-xs font-medium rounded-md bg-neutral-800 border border-neutral-700 text-neutral-400 hover:text-neutral-200 hover:border-neutral-600 hover:scale-105 active:scale-95 transition-all duration-150 cursor-pointer"
            >
              {filters.every(f => f.enabled) ? 'All Off' : 'All On'}
            </button>
          )}
          <button
            onClick={() => { if (!imageUrl) document.getElementById('image-input')?.click(); }}
            disabled={!!imageUrl}
            className={`flex items-center gap-2 px-3 py-1.5 text-xs font-medium rounded-md border border-neutral-700 transition-all duration-150 hover:scale-105 active:scale-95 ${imageUrl ? "bg-neutral-900 text-neutral-500 cursor-not-allowed hover:scale-100" : "bg-neutral-900 text-neutral-400 hover:text-neutral-200 hover:border-neutral-600 cursor-pointer"}`}
          >
            <div className="i-lucide-image text-14px" />
            <span>Image</span>
            <input id="image-input" type="file" accept="image/*" className="hidden" onChange={handleImageUpload} disabled={!!imageUrl} />
          </button>
          <button
            onClick={() => { if (imageUrl) document.getElementById('replace-input')?.click(); }}
            disabled={!imageUrl}
            className={`flex items-center gap-2 px-3 py-1.5 text-xs font-medium rounded-md border border-neutral-700 transition-all duration-150 hover:scale-105 active:scale-95 ${!imageUrl ? "bg-neutral-800 text-neutral-500 cursor-not-allowed hover:scale-100" : "bg-neutral-800 text-neutral-400 hover:text-neutral-200 hover:border-neutral-600 cursor-pointer"}`}
          >
            <div className="i-lucide-image text-14px" />
            <span>Replace</span>
            <input id="replace-input" type="file" accept="image/*" className="hidden" onChange={handleImageUpload} disabled={!imageUrl} />
          </button>
          <PresetBrowser disabled={!imageUrl && filters.length === 0} />
          <EffectBrowser onFilterAdded={handleFilterAdded} />
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
            {filters.map((filter, idx) => (
              <FilterCard
                key={filter.id}
                filter={filter}
                idx={idx}
                total={filters.length}
                isCollapsed={collapsedIds.has(filter.id)}
                isDragOver={dragOverIdx === idx}
                onToggleCollapse={toggleCollapse}
                onDragStart={handleDragStart}
                onDragEnd={handleDragEnd}
                onDragEnter={handleDragEnterCard}
                onDragLeave={handleDragLeaveCard}
                onDrop={handleDrop}
                preDragFiltersRef={preDragFiltersRef}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

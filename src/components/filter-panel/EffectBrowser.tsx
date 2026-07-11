import { useRef, useState, useCallback } from "react";
import { useAtomValue, useSetAtom } from "jotai";
import { addFilterAtom, uuid, imageUrlAtom, effectBrowserOpenAtom, setEffectBrowserOpenAtom } from "../../store/atoms";
import type { FilterType } from "../../store/atoms";
import { FILTER_MANIFESTS } from "../../filters/filter-registry";

const GROUPED_MANIFESTS = [...new Set(FILTER_MANIFESTS.map((m) => m.category))].map((category) => ({
  category,
  items: FILTER_MANIFESTS.filter((m) => m.category === category),
}));

function highlightMatch(text: string, query: string) {
  if (!query) return text;
  const idx = text.toLowerCase().indexOf(query.toLowerCase());
  if (idx === -1) return text;
  return (
    <>{text.slice(0, idx)}<span className="text-orange-400">{text.slice(idx, idx + query.length)}</span>{text.slice(idx + query.length)}</>
  );
}

interface EffectBrowserProps {
  onFilterAdded: (id: string) => void;
}

export function EffectBrowser({ onFilterAdded }: EffectBrowserProps) {
  const imageUrl = useAtomValue(imageUrlAtom);
  const addFilter = useSetAtom(addFilterAtom);
  const dropdownOpen = useAtomValue(effectBrowserOpenAtom);
  const setDropdownOpen = useSetAtom(setEffectBrowserOpenAtom);
  const [searchQuery, setSearchQuery] = useState("");
  const dropdownRef = useRef<HTMLDivElement>(null);

  const handleSelectFilter = useCallback(
    (type: FilterType) => {
      const newId = uuid();
      addFilter(type, newId);
      onFilterAdded(newId);
      setDropdownOpen(false);
    },
    [addFilter, setDropdownOpen, onFilterAdded],
  );

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setDropdownOpen(!dropdownOpen)}
        disabled={!imageUrl}
        className="flex items-center gap-2 px-3 py-1.5 text-xs font-medium border border-neutral-700 bg-orange-600 text-white hover:bg-orange-500 hover:shadow-[0_0_12px_rgba(253,154,62,0.35)] hover:scale-105 active:scale-95 disabled:opacity-50 disabled:hover:bg-orange-600 disabled:hover:shadow-none disabled:hover:scale-100 disabled:cursor-not-allowed transition-all duration-150 rounded-md cursor-pointer"
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
  );
}

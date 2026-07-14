import { useEffect } from "react";
import { useSetAtom } from "jotai";
import {
  undoAtom,
  redoAtom,
  removeFilterAtom,
  batchToggleFiltersAtom,
  toggleLockFilterAtom,
  batchLockFiltersAtom,
  setPresetBrowserOpenAtom,
  setEffectBrowserOpenAtom,
  renderScaleAtom,
  jotaiStore,
  filtersAtom,
  selectedFilterIdAtom,
  presetBrowserOpenAtom,
  effectBrowserOpenAtom,
  imageUrlAtom,
} from "../store/atoms";
import { RENDER_SCALES } from "../constants";

export function useEditorKeyboardShortcuts(
  setBeforeAfter: (fn: (v: boolean) => boolean) => void,
  nudgeCompareSplit?: (delta: number) => void,
) {
  const undo = useSetAtom(undoAtom);
  const redo = useSetAtom(redoAtom);
  const removeFilter = useSetAtom(removeFilterAtom);
  const batchToggle = useSetAtom(batchToggleFiltersAtom);
  const toggleLock = useSetAtom(toggleLockFilterAtom);
  const batchLock = useSetAtom(batchLockFiltersAtom);
  const setPresetOpen = useSetAtom(setPresetBrowserOpenAtom);
  const setEffectOpen = useSetAtom(setEffectBrowserOpenAtom);
  const setRenderScale = useSetAtom(renderScaleAtom);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      const tag = target.tagName;
      const type = (target as HTMLInputElement).type;
      const isTyping = tag === "TEXTAREA" || (tag === "INPUT" && type !== "range");

      const filters = jotaiStore.get(filtersAtom);
      const selectedId = jotaiStore.get(selectedFilterIdAtom);

      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === "z") {
        if (isTyping) return;
        e.preventDefault();
        redo();
        return;
      }

      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "y") {
        if (isTyping) return;
        e.preventDefault();
        redo();
        return;
      }

      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "z") {
        if (isTyping) return;
        e.preventDefault();
        undo();
        return;
      }

      if (isTyping) return;

      if (e.key === "Delete" || e.key === "Backspace") {
        if (selectedId) {
          e.preventDefault();
          removeFilter(selectedId);
        }
        return;
      }

      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "l") {
        e.preventDefault();
        batchLock();
        return;
      }

      if (e.ctrlKey || e.metaKey) return;

      if (e.shiftKey && (e.key === "ArrowLeft" || e.key === "ArrowRight")) {
        e.preventDefault();
        nudgeCompareSplit?.(e.key === "ArrowLeft" ? -0.02 : 0.02);
        return;
      }

      switch (e.key.toLowerCase()) {
        case 'c': {
          const imageUrl = jotaiStore.get(imageUrlAtom);
          if (!imageUrl || filters.length === 0) break;
          e.preventDefault();
          setBeforeAfter(v => !v);
          break;
        }
        case 'd':
          e.preventDefault();
          batchToggle(filters.map(f => f.id));
          break;
        case 'p':
          e.preventDefault();
          setPresetOpen(!jotaiStore.get(presetBrowserOpenAtom));
          break;
        case 'e':
          e.preventDefault();
          setEffectOpen(!jotaiStore.get(effectBrowserOpenAtom));
          break;
        case 'l':
          e.preventDefault();
          if (selectedId) toggleLock(selectedId);
          break;
        case 'r':
          e.preventDefault();
          {
            const currentIdx = RENDER_SCALES.findIndex(s => s.value === jotaiStore.get(renderScaleAtom));
            const nextIdx = (currentIdx + 1) % RENDER_SCALES.length;
            setRenderScale(RENDER_SCALES[nextIdx].value);
          }
          break;
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [undo, redo, removeFilter, batchToggle, toggleLock, batchLock, setPresetOpen, setEffectOpen, setBeforeAfter, setRenderScale, nudgeCompareSplit]);
}

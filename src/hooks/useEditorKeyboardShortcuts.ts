import { useEffect, useRef } from "react";
import { useAtomValue, useSetAtom } from "jotai";
import {
  filtersAtom,
  selectedFilterIdAtom,
  presetBrowserOpenAtom,
  effectBrowserOpenAtom,
  imageUrlAtom,
  undoAtom,
  redoAtom,
  removeFilterAtom,
  batchToggleFiltersAtom,
  toggleLockFilterAtom,
  batchLockFiltersAtom,
  setPresetBrowserOpenAtom,
  setEffectBrowserOpenAtom,
  renderScaleAtom,
} from "../store/atoms";
import { RENDER_SCALES } from "../constants";

export function useEditorKeyboardShortcuts(setBeforeAfter: (fn: (v: boolean) => boolean) => void) {
  const filters = useAtomValue(filtersAtom);
  const selectedId = useAtomValue(selectedFilterIdAtom);
  const presetOpen = useAtomValue(presetBrowserOpenAtom);
  const effectOpen = useAtomValue(effectBrowserOpenAtom);
  const renderScale = useAtomValue(renderScaleAtom);
  const imageUrl = useAtomValue(imageUrlAtom);
  const undo = useSetAtom(undoAtom);
  const redo = useSetAtom(redoAtom);
  const removeFilter = useSetAtom(removeFilterAtom);
  const batchToggle = useSetAtom(batchToggleFiltersAtom);
  const toggleLock = useSetAtom(toggleLockFilterAtom);
  const batchLock = useSetAtom(batchLockFiltersAtom);
  const setPresetOpen = useSetAtom(setPresetBrowserOpenAtom);
  const setEffectOpen = useSetAtom(setEffectBrowserOpenAtom);
  const setRenderScale = useSetAtom(renderScaleAtom);

  const filtersRef = useRef(filters);
  // eslint-disable-next-line react-hooks/refs -- intentional: keep ref fresh for event handlers
  filtersRef.current = filters;
  const selectedIdRef = useRef(selectedId);
  // eslint-disable-next-line react-hooks/refs -- intentional: keep ref fresh for event handlers
  selectedIdRef.current = selectedId;
  const presetOpenRef = useRef(presetOpen);
  // eslint-disable-next-line react-hooks/refs -- intentional: keep ref fresh for event handlers
  presetOpenRef.current = presetOpen;
  const effectOpenRef = useRef(effectOpen);
  // eslint-disable-next-line react-hooks/refs -- intentional: keep ref fresh for event handlers
  effectOpenRef.current = effectOpen;
  const renderScaleRef = useRef(renderScale);
  // eslint-disable-next-line react-hooks/refs -- intentional: keep ref fresh for event handlers
  renderScaleRef.current = renderScale;
  const imageUrlRef = useRef(imageUrl);
  // eslint-disable-next-line react-hooks/refs -- intentional: keep ref fresh for event handlers
  imageUrlRef.current = imageUrl;

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      const tag = target.tagName;
      const type = (target as HTMLInputElement).type;
      const isTyping = tag === "TEXTAREA" || (tag === "INPUT" && type !== "range");

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
        if (selectedIdRef.current) {
          e.preventDefault();
          removeFilter(selectedIdRef.current);
        }
        return;
      }

      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "l") {
        e.preventDefault();
        batchLock();
        return;
      }

      if (e.ctrlKey || e.metaKey) return;

      switch (e.key.toLowerCase()) {
        case 'c':
          if (!imageUrlRef.current || filtersRef.current.length === 0) break;
          e.preventDefault();
          setBeforeAfter(v => !v);
          break;
        case 'd':
          e.preventDefault();
          batchToggle(filtersRef.current.map(f => f.id));
          break;
        case 'p':
          e.preventDefault();
          setPresetOpen(!presetOpenRef.current);
          break;
        case 'e':
          e.preventDefault();
          setEffectOpen(!effectOpenRef.current);
          break;
        case 'l':
          e.preventDefault();
          if (selectedIdRef.current) toggleLock(selectedIdRef.current);
          break;
        case 'r':
          e.preventDefault();
          {
            const currentIdx = RENDER_SCALES.findIndex(s => s.value === renderScaleRef.current);
            const nextIdx = (currentIdx + 1) % RENDER_SCALES.length;
            setRenderScale(RENDER_SCALES[nextIdx].value);
          }
          break;
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [undo, redo, removeFilter, batchToggle, toggleLock, batchLock, setPresetOpen, setEffectOpen, setBeforeAfter, setRenderScale]);
}

import { useCallback, useEffect, useRef, useState } from "react";
import { useAtomValue, useSetAtom } from "jotai";
import {
  imageUrlAtom,
  hasFiltersAtom,
  resetEditorAtom,
  setImageUrlAtom,
  exportFormatAtom,
  exportQualityAtom,
  renderScaleAtom,
  autoSaveEnabledAtom,
  addToastAtom,
} from "../store/atoms";
import { ErrorBoundary } from "./ErrorBoundary";
import { CanvasArea } from "./CanvasArea";
import { BottomPanel } from "./BottomPanel";
import { Toast } from "./Toast";
import { EXPORT_FORMATS, RENDER_SCALES } from "../constants";
import { useEditorKeyboardShortcuts } from "../hooks/useEditorKeyboardShortcuts";
import { useAutoSave } from "../hooks/useAutoSave";
import { useExport } from "../hooks/useExport";

const MAX_FILE_SIZE = 100 * 1024 * 1024; // 100MB

export function EditorLayout({ onBack }: { onBack: () => void }) {
  const [dragOver, setDragOver] = useState(false);
  const [beforeAfter, setBeforeAfter] = useState(false);
  const imageUrl = useAtomValue(imageUrlAtom);
  const { performExport, canExport, isExporting } = useExport();
  useAutoSave();
  const hasFilters = useAtomValue(hasFiltersAtom);
  // Reset compare mode when all filters are removed — adjusted during render
  // (not in an effect) to avoid cascading renders (react-hooks/set-state-in-effect)
  const [prevHasFilters, setPrevHasFilters] = useState(hasFilters);
  if (prevHasFilters !== hasFilters) {
    setPrevHasFilters(hasFilters);
    if (!hasFilters && beforeAfter) setBeforeAfter(false);
  }
  const exportFormat = useAtomValue(exportFormatAtom);
  const setExportFormat = useSetAtom(exportFormatAtom);
  const exportQuality = useAtomValue(exportQualityAtom);
  const setExportQuality = useSetAtom(exportQualityAtom);
  const renderScale = useAtomValue(renderScaleAtom);
  const setRenderScale = useSetAtom(renderScaleAtom);
  const resetEditor = useSetAtom(resetEditorAtom);
  const setImageUrl = useSetAtom(setImageUrlAtom);
  const autoSaveEnabled = useAtomValue(autoSaveEnabledAtom);
  const setAutoSaveEnabled = useSetAtom(autoSaveEnabledAtom);
  const addToast = useSetAtom(addToastAtom);
  const onBackRef = useRef(onBack);
  const nudgeCompareRef = useRef<(delta: number) => void>(undefined);
  // eslint-disable-next-line react-hooks/refs -- intentional: keep ref fresh for event handlers
  onBackRef.current = onBack;

  useEditorKeyboardShortcuts(setBeforeAfter, (delta) => nudgeCompareRef.current?.(delta));

  const handleBack = useCallback(() => {
    if (imageUrl) {
      const ok = window.confirm("You have unsaved changes. Leave the editor?");
      if (!ok) return;
    }
    resetEditor();
    onBackRef.current();
  }, [imageUrl, resetEditor]);

  const processImageFile = useCallback((file: File) => {
    if (file.size > MAX_FILE_SIZE) {
      addToast('File too large. Maximum size is 100MB.', 'error');
      return;
    }
    if (!file.type.startsWith("image/")) return;
    setImageUrl(file);
  }, [setImageUrl, addToast]);

  useEffect(() => {
    const handlePaste = (e: ClipboardEvent) => {
      const target = document.activeElement;
      const tag = target?.tagName ?? "";
      const type = (target as HTMLInputElement)?.type;
      if (tag === "TEXTAREA" || (tag === "INPUT" && type !== "range")) return;
      const items = e.clipboardData?.items;
      if (!items) return;
      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        if (item.type.startsWith("image/")) {
          e.preventDefault();
          const file = item.getAsFile();
          if (file) processImageFile(file);
          break;
        }
      }
    };
    document.addEventListener("paste", handlePaste);
    return () => document.removeEventListener("paste", handlePaste);
  }, [processImageFile]);

  const [formatOpen, setFormatOpen] = useState(false);
  const formatRef = useRef<HTMLDivElement>(null);
  const [resOpen, setResOpen] = useState(false);
  const resRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (formatRef.current && !formatRef.current.contains(e.target as Node)) {
        setFormatOpen(false);
      }
      if (resRef.current && !resRef.current.contains(e.target as Node)) {
        setResOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  useEffect(() => {
    if (!imageUrl) return;
    const fn = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };
    addEventListener("beforeunload", fn);
    return () => removeEventListener("beforeunload", fn);
  }, [imageUrl]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const files = Array.from(e.dataTransfer.files);
    const imageFile = files.find((f) => f.type.startsWith("image/"));
    if (imageFile) {
      if (imageFile.size > MAX_FILE_SIZE) {
        addToast('File too large. Maximum size is 100MB.', 'error');
        return;
      }
      setImageUrl(imageFile);
    }
  }, [setImageUrl, addToast]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
  }, []);

  return (
    <div className="flex flex-col h-screen bg-neutral-950 text-white font-sans overflow-hidden">
      <header className="h-14 bg-neutral-950/80 backdrop-blur-md border-b border-neutral-800/80 flex items-center justify-between px-5 shrink-0 z-20 grain-bg ">
        <div className="flex items-center gap-3">
            <button
              onClick={handleBack}
              className="flex items-center justify-center w-10 h-10 text-neutral-500 hover:text-neutral-200 hover:bg-neutral-800 hover:scale-105 active:scale-95 transition-interactive duration-150 rounded-md cursor-pointer"
              aria-label="Back to Home"
            >
              <div className="i-lucide-chevron-left text-22px" />
            </button>
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-md bg-gradient-to-br from-orange-500 to-orange-600 flex items-center justify-center">
              <div className="i-lucide-palette text-18px text-white" />
            </div>
            <span className="text-lg tracking-tight text-neutral-200 font-display">
              Spectra Studio
            </span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              const next = !autoSaveEnabled;
              setAutoSaveEnabled(next);
              localStorage.setItem("spectra-autosave", String(next));
              addToast(next ? 'Auto-save enabled' : 'Auto-save disabled', 'info');
            }}
            className={`flex items-center justify-center w-10 h-10 transition-interactive duration-150 rounded-md cursor-pointer hover:scale-105 active:scale-95 ${autoSaveEnabled ? 'text-orange-500 hover:bg-orange-500/10' : 'text-neutral-500 hover:text-neutral-200 hover:bg-neutral-800'}`}
            aria-label="Toggle auto-save"
            title={autoSaveEnabled ? "Auto-save on" : "Auto-save off"}
          >
            <div className="i-lucide-save text-18px" />
          </button>
          {imageUrl && hasFilters && (
            <button
              onClick={() => setBeforeAfter(v => !v)}
              className={`px-3 py-2 text-sm rounded-md transition-interactive duration-150 hover:scale-105 active:scale-95 cursor-pointer flex items-center gap-2 ${beforeAfter ? 'bg-orange-600 text-white' : 'bg-neutral-800 border border-neutral-700 text-neutral-400 hover:text-neutral-200 hover:border-neutral-600'}`}
              title="Before / After comparison"
            >
              {beforeAfter ? <div className="i-lucide-image-off text-14px" /> : <div className="i-lucide-image text-14px" />}
              {beforeAfter ? 'Normal' : 'Compare'}
            </button>
          )}
          {imageUrl && (
            <div ref={resRef} className="relative">
              <button
                onClick={() => setResOpen(v => !v)}
                title="Canvas resolution only — exports always use full quality"
                aria-label="Render scale"
                aria-expanded={resOpen}
                aria-haspopup="true"
                className="px-5 py-2 text-sm font-medium bg-neutral-800 border border-neutral-700 text-neutral-400 hover:text-neutral-200 hover:border-neutral-600 hover:scale-105 active:scale-95 transition-interactive duration-150 rounded-md cursor-pointer flex items-center gap-2"
              >
                <div className="i-lucide-monitor text-14px" />
                <span className="tabular-nums">{RENDER_SCALES.find(s => s.value === renderScale)?.shortLabel ?? '100%'}</span>
                <div className={`i-lucide-chevron-down text-12px transition-transform duration-200 ${resOpen ? 'rotate-180' : ''}`} />
              </button>
              {resOpen && (
                <div className="absolute right-0 top-full mt-1 w-36 bg-neutral-900 border border-neutral-700 rounded-lg shadow-xl z-50 overflow-hidden animate-drop-in">
                  {RENDER_SCALES.map((scale) => (
                    <button
                      key={scale.value}
                      onClick={() => { setRenderScale(scale.value); setResOpen(false); }}
                      className={`w-full text-left px-3 py-2 text-xs transition-colors cursor-pointer hover:bg-neutral-800 flex items-center justify-between ${renderScale === scale.value ? 'text-orange-400' : 'text-neutral-300 hover:text-white'}`}
                    >
                      <span>{scale.label}</span>
                      <span className="font-mono text-neutral-500">{scale.shortLabel}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
          <div ref={formatRef} className="relative flex">
            <button
              onClick={performExport}
              disabled={isExporting || !canExport}
              title={`Export as ${exportFormat.toUpperCase()}`}
              className="px-5 py-2 text-sm font-medium bg-orange-600 text-white hover:bg-orange-500 hover:scale-105 active:scale-95 disabled:opacity-50 disabled:hover:scale-100 disabled:hover:shadow-none transition-interactive duration-150 rounded-l-md cursor-pointer disabled:cursor-not-allowed flex items-center gap-2"
            >
              {isExporting ? <div className="w-[14px] h-[14px] border-[1.5px] border-white/30 border-t-white rounded-full animate-spectra-spin" /> : null}
              {isExporting ? "Exporting…" : "Export"}
              {!isExporting && <span className="text-white/60 text-[11px] font-mono uppercase tracking-wide">{exportFormat}</span>}
            </button>
            <button
              onClick={(e) => {
                e.preventDefault();
                if (!canExport || isExporting) return;
                setFormatOpen(v => !v);
              }}
              disabled={isExporting || !canExport}
              aria-label="Export format options"
              aria-expanded={formatOpen}
              aria-haspopup="true"
              className="px-2 py-2 text-sm font-medium bg-orange-600 text-white hover:bg-orange-500 hover:scale-105 active:scale-95 disabled:opacity-50 disabled:hover:scale-100 transition-interactive duration-150 rounded-r-md cursor-pointer disabled:cursor-not-allowed border-l border-orange-500/30"
            >
              <div className={`i-lucide-chevron-down text-12px transition-transform duration-200 ${formatOpen ? 'rotate-180' : ''}`} />
            </button>
            {formatOpen && (
              <div className="absolute right-0 top-full mt-1 w-44 bg-neutral-900 border border-neutral-700 rounded-lg shadow-xl z-50 overflow-hidden animate-drop-in">
                <div className="px-3 py-2 border-b border-neutral-800">
                  <p className="text-[10px] text-neutral-500 leading-relaxed">Select a format below, then click <span className="text-neutral-400 font-medium">Export</span> to save. Quality only applies to JPEG & WebP.</p>
                </div>
                {EXPORT_FORMATS.map((fmt) => (
                  <button
                    key={fmt.value}
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      setExportFormat(fmt.value);
                      localStorage.setItem("spectra-export-format", fmt.value);
                    }}
                    aria-pressed={fmt.value === exportFormat}
                    className={`w-full text-left px-3 py-2 text-xs transition-colors cursor-pointer hover:bg-neutral-800 flex items-center justify-between ${fmt.value === exportFormat ? 'text-orange-400' : 'text-neutral-300 hover:text-white'}`}
                  >
                    <span>{fmt.label}</span>
                    {fmt.value === exportFormat && <div className="i-lucide-check text-12px" />}
                  </button>
                ))}
                {exportFormat !== 'png' && (
                  <div className="px-3 py-2 border-t border-neutral-800">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[10px] text-neutral-500">Quality</span>
                      <span className="text-[10px] font-mono text-neutral-400 tabular-nums">{Math.round(exportQuality * 100)}%</span>
                    </div>
                    <input
                      type="range"
                      min="10"
                      max="100"
                      step="1"
                      value={Math.round(exportQuality * 100)}
                      aria-label="Export quality"
                      onChange={(e) => {
                        const q = Number(e.target.value) / 100;
                        setExportQuality(q);
                        localStorage.setItem("spectra-export-quality", String(q));
                      }}
                      className="w-full h-1.5 rounded-full appearance-none bg-neutral-800 cursor-pointer"
                      style={{ '--pct': `${Math.round(exportQuality * 100)}%` } as React.CSSProperties}
                    />
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </header>

      <main
        className="flex-1 relative overflow-hidden min-h-0"
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
      >
        {dragOver && (
          <div className="absolute inset-0 z-50 bg-neutral-900/60 flex items-center justify-center border-2 border-dashed border-orange-500/30 rounded-xl m-3">
            <div className="flex flex-col items-center gap-2">
              <div className="w-14 h-14 rounded-xl bg-orange-500/10 flex items-center justify-center border border-orange-500/20">
                <div className="i-lucide-palette text-26px text-orange-400" />
              </div>
              <p className="text-neutral-300 text-lg font-medium">Drop to edit</p>
            </div>
          </div>
        )}
        <ErrorBoundary>
          <CanvasArea beforeAfter={beforeAfter} nudgeRef={nudgeCompareRef} />
        </ErrorBoundary>
      </main>

      <div className="shrink-0 grain-bg" style={{ height: 'var(--bottom-panel-height)' }}>
        <div className="h-full backdrop-blur-sm">
          <BottomPanel />
        </div>
      </div>
      <Toast />
    </div>
  );
}

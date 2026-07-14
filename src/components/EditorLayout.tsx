import { useCallback, useEffect, useRef, useState } from "react";
import { useAtomValue, useSetAtom } from "jotai";
import {
  imageUrlAtom,
  isExportingAtom,
  hasFiltersAtom,
  resetEditorAtom,
  setImageUrlAtom,
  triggerExportAtom,
  setExportingAtom,
  exportFormatAtom,
  exportQualityAtom,
  pendingExportHandleAtom,
  renderScaleAtom,
  autoSaveEnabledAtom,
  addToastAtom,
  filtersAtom,
  jotaiStore,
} from "../store/atoms";
import { ErrorBoundary } from "./ErrorBoundary";
import { CanvasArea } from "./CanvasArea";
import { BottomPanel } from "./BottomPanel";
import { Toast } from "./Toast";
import { EXPORT_FORMATS, RENDER_SCALES } from "../constants";
import { useEditorKeyboardShortcuts } from "../hooks/useEditorKeyboardShortcuts";

const MAX_FILE_SIZE = 100 * 1024 * 1024; // 100MB

export function EditorLayout({ onBack }: { onBack: () => void }) {
  const [dragOver, setDragOver] = useState(false);
  const [beforeAfter, setBeforeAfter] = useState(false);
  const imageUrl = useAtomValue(imageUrlAtom);
  const isExporting = useAtomValue(isExportingAtom);
  const setExporting = useSetAtom(setExportingAtom);
  const triggerExport = useSetAtom(triggerExportAtom);
  const hasFilters = useAtomValue(hasFiltersAtom);
  useEffect(() => {
    if (!hasFilters && beforeAfter) setBeforeAfter(false);
  }, [hasFilters, beforeAfter]);
  const exportFormat = useAtomValue(exportFormatAtom);
  const setExportFormat = useSetAtom(exportFormatAtom);
  const exportQuality = useAtomValue(exportQualityAtom);
  const setExportQuality = useSetAtom(exportQualityAtom);
  const setPendingExportHandle = useSetAtom(pendingExportHandleAtom);
  const renderScale = useAtomValue(renderScaleAtom);
  const setRenderScale = useSetAtom(renderScaleAtom);
  const resetEditor = useSetAtom(resetEditorAtom);
  const setImageUrl = useSetAtom(setImageUrlAtom);
  const autoSaveEnabled = useAtomValue(autoSaveEnabledAtom);
  const setAutoSaveEnabled = useSetAtom(autoSaveEnabledAtom);
  const addToast = useSetAtom(addToastAtom);
  const canExport = imageUrl !== null && hasFilters;
  const exportLockRef = useRef(false);
  const onBackRef = useRef(onBack);
  const nudgeCompareRef = useRef<(delta: number) => void>(undefined);
  // eslint-disable-next-line react-hooks/refs -- intentional: keep ref fresh for event handlers
  onBackRef.current = onBack;
  useEffect(() => { if (!isExporting) exportLockRef.current = false; }, [isExporting]);

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

  const saveTimerRef = useRef<ReturnType<typeof setTimeout>>(undefined);
  const filtersValue = useAtomValue(filtersAtom);
  useEffect(() => {
    if (!autoSaveEnabled) return;
    const save = async () => {
      try {
        const url = jotaiStore.get(imageUrlAtom);
        if (!url) return;
        const res = await fetch(url);
        const blob = await res.blob();
        const reader = new FileReader();
        const dataUrl = await new Promise<string>((resolve) => {
          reader.onloadend = () => resolve(reader.result as string);
          reader.readAsDataURL(blob);
        });
        if (dataUrl.length > 4 * 1024 * 1024) return;
        const filters = jotaiStore.get(filtersAtom);
        sessionStorage.setItem("spectra-session", JSON.stringify({ filters, image: dataUrl }));
      } catch { /* storage full or fetch failed — ignore */ }
    };
    clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(save, 800);
    return () => clearTimeout(saveTimerRef.current);
  }, [autoSaveEnabled, imageUrl, filtersValue]);

  useEffect(() => {
    if (!autoSaveEnabled || imageUrl) return;
    try {
      const raw = sessionStorage.getItem("spectra-session");
      if (!raw) return;
      const parsed = JSON.parse(raw);
      if (parsed.filters && Array.isArray(parsed.filters) && parsed.image) {
        const byteString = atob(parsed.image.split(",")[1]);
        const ab = new Uint8Array(byteString.length);
        for (let i = 0; i < byteString.length; i++) ab[i] = byteString.charCodeAt(i);
        const mime = parsed.image.match(/data:(image\/\w+);/)?.[1] ?? "image/png";
        const file = new File([ab], "session-restore." + (mime.split("/")[1] ?? "png"), { type: mime });
        const ok = window.confirm("Restore your previous session?");
        if (ok) {
          setImageUrl(file);
          jotaiStore.set(filtersAtom, parsed.filters);
          addToast("Session restored", "success");
        }
      }
      sessionStorage.removeItem("spectra-session");
    } catch { /* ignore */ }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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

  const performExport = useCallback(async () => {
    if (exportLockRef.current || isExporting || !canExport) return;
    exportLockRef.current = true;
    setExporting(true);

    const fmt = EXPORT_FORMATS.find(f => f.value === exportFormat) ?? EXPORT_FORMATS[0];
    const ext = fmt.ext;
    const fileName = `spectra-export-${Date.now()}${ext}`;

    if ('showSaveFilePicker' in window) {
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const handle = await (window as any).showSaveFilePicker({
          suggestedName: fileName,
          types: [{ description: `${fmt.label} Image`, accept: { 'image/*': [ext] } }],
        });
        setPendingExportHandle(handle);
        triggerExport();
        return;
      } catch (err: unknown) {
        if (err instanceof DOMException && err.name === 'AbortError') {
          setExporting(false);
          exportLockRef.current = false;
          setPendingExportHandle(null);
          return;
        }
        try {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const handle = await (window as any).showSaveFilePicker({
            suggestedName: fileName,
          });
          setPendingExportHandle(handle);
          triggerExport();
          return;
        } catch (err2: unknown) {
          if (err2 instanceof DOMException && err2.name === 'AbortError') {
            setExporting(false);
            exportLockRef.current = false;
            setPendingExportHandle(null);
            return;
          }
          setExporting(false);
          exportLockRef.current = false;
          setPendingExportHandle(null);
          return;
        }
      }
    } else {
      setPendingExportHandle(null);
    }

    triggerExport();
  }, [canExport, isExporting, exportFormat, setExporting, setPendingExportHandle, triggerExport]);

  return (
    <div className="flex flex-col h-screen bg-neutral-950 text-white font-sans overflow-hidden">
      <header className="h-14 bg-neutral-950/80 backdrop-blur-md border-b border-neutral-800/80 flex items-center justify-between px-5 shrink-0 z-20 grain-bg ">
        <div className="flex items-center gap-3">
            <button
              onClick={handleBack}
              className="flex items-center justify-center w-10 h-10 text-neutral-500 hover:text-neutral-200 hover:bg-neutral-800 hover:scale-105 active:scale-95 transition-all duration-150 rounded-md cursor-pointer"
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
            className={`flex items-center justify-center w-10 h-10 transition-all duration-150 rounded-md cursor-pointer hover:scale-105 active:scale-95 ${autoSaveEnabled ? 'text-orange-500 hover:bg-orange-500/10' : 'text-neutral-500 hover:text-neutral-200 hover:bg-neutral-800'}`}
            aria-label="Toggle auto-save"
            title={autoSaveEnabled ? "Auto-save on" : "Auto-save off"}
          >
            <div className="i-lucide-save text-18px" />
          </button>
          {imageUrl && hasFilters && (
            <button
              onClick={() => setBeforeAfter(v => !v)}
              className={`px-3 py-2 text-sm rounded-md transition-all duration-150 hover:scale-105 active:scale-95 cursor-pointer flex items-center gap-2 ${beforeAfter ? 'bg-orange-600 text-white' : 'bg-neutral-800 border border-neutral-700 text-neutral-400 hover:text-neutral-200 hover:border-neutral-600'}`}
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
                className="px-5 py-2 text-sm font-medium bg-neutral-800 border border-neutral-700 text-neutral-400 hover:text-neutral-200 hover:border-neutral-600 hover:scale-105 active:scale-95 transition-all duration-150 rounded-md cursor-pointer flex items-center gap-2"
              >
                <div className="i-lucide-monitor text-14px" />
                {RENDER_SCALES.find(s => s.value === renderScale)?.shortLabel ?? '100%'}
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
              className="px-5 py-2 text-sm font-medium bg-orange-600 text-white hover:bg-orange-500 hover:scale-105 active:scale-95 disabled:opacity-50 disabled:hover:scale-100 disabled:hover:shadow-none transition-all duration-150 rounded-l-md cursor-pointer disabled:cursor-not-allowed flex items-center gap-2"
            >
              {isExporting ? <div className="w-[14px] h-[14px] border-[1.5px] border-white/30 border-t-white rounded-full animate-spectra-spin" /> : null}
              {isExporting ? "Exporting" : "Export"}
            </button>
            <button
              onClick={(e) => {
                e.preventDefault();
                if (!canExport || isExporting) return;
                setFormatOpen(v => !v);
              }}
              disabled={isExporting || !canExport}
              className="px-2 py-2 text-sm font-medium bg-orange-600 text-white hover:bg-orange-500 hover:scale-105 active:scale-95 disabled:opacity-50 disabled:hover:scale-100 transition-all duration-150 rounded-r-md cursor-pointer disabled:cursor-not-allowed border-l border-orange-500/30"
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
                    className={`w-full text-left px-3 py-2 text-xs transition-colors cursor-pointer hover:bg-neutral-800 ${fmt.value === exportFormat ? 'text-orange-400' : 'text-neutral-300 hover:text-white'}`}
                  >
                    {fmt.label}
                  </button>
                ))}
                {exportFormat !== 'png' && (
                  <div className="px-3 py-2 border-t border-neutral-800">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[10px] text-neutral-500">Quality</span>
                      <span className="text-[10px] font-mono text-neutral-400">{Math.round(exportQuality * 100)}%</span>
                    </div>
                    <input
                      type="range"
                      min="10"
                      max="100"
                      step="1"
                      value={Math.round(exportQuality * 100)}
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

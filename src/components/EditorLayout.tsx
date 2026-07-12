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
  pendingExportHandleAtom,
  renderScaleAtom,
} from "../store/atoms";
import { ErrorBoundary } from "./ErrorBoundary";
import { CanvasArea } from "./CanvasArea";
import { BottomPanel } from "./BottomPanel";
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
  const exportFormat = useAtomValue(exportFormatAtom);
  const setExportFormat = useSetAtom(exportFormatAtom);
  const setPendingExportHandle = useSetAtom(pendingExportHandleAtom);
  const renderScale = useAtomValue(renderScaleAtom);
  const setRenderScale = useSetAtom(renderScaleAtom);
  const resetEditor = useSetAtom(resetEditorAtom);
  const setImageUrl = useSetAtom(setImageUrlAtom);
  const canExport = imageUrl !== null && hasFilters;
  const exportLockRef = useRef(false);
  const onBackRef = useRef(onBack);
  // eslint-disable-next-line react-hooks/refs -- intentional: keep ref fresh for event handlers
  onBackRef.current = onBack;
  useEffect(() => { if (!isExporting) exportLockRef.current = false; }, [isExporting]);

  useEditorKeyboardShortcuts(setBeforeAfter);

  const handleBack = useCallback(() => {
    if (imageUrl) {
      const ok = window.confirm("You have unsaved changes. Leave the editor?");
      if (!ok) return;
    }
    resetEditor();
    onBackRef.current();
  }, [imageUrl, resetEditor]);

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
        alert('File too large. Maximum size is 100MB.');
        return;
      }
      setImageUrl(imageFile);
    }
  }, [setImageUrl]);

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
          <div ref={formatRef} className="relative">
            <button
              onClick={() => {
                if (!canExport || isExporting) return;
                setFormatOpen(v => !v);
              }}
              disabled={isExporting || !canExport}
              className="px-5 py-2 text-sm font-medium bg-orange-600 text-white hover:bg-orange-500 hover:scale-105 active:scale-95 disabled:opacity-50 disabled:hover:scale-100 disabled:hover:shadow-none transition-all duration-150 rounded-md cursor-pointer disabled:cursor-not-allowed flex items-center gap-2"
            >
              {isExporting ? <div className="w-[14px] h-[14px] border-[1.5px] border-white/30 border-t-white rounded-full animate-spectra-spin" /> : null}
              {isExporting ? "Exporting" : "Export"}
              {!isExporting && <div className={`i-lucide-chevron-down text-12px transition-transform duration-200 ${formatOpen ? 'rotate-180' : ''}`} />}
            </button>
            {formatOpen && (
              <div className="absolute right-0 top-full mt-1 w-28 bg-neutral-900 border border-neutral-700 rounded-lg shadow-xl z-50 overflow-hidden animate-drop-in">
                {EXPORT_FORMATS.map((fmt) => (
                  <button
                    key={fmt.value}
                    onClick={async () => {
                      setExportFormat(fmt.value);
                      setFormatOpen(false);
                      if (exportLockRef.current || isExporting || !canExport) return;
                      exportLockRef.current = true;
                      setExporting(true);

                      const ext = fmt.ext;
                      const fileName = `spectra-export-${Date.now()}${ext}`;

                      if ('showSaveFilePicker' in window) {
                        try {
                          // eslint-disable-next-line @typescript-eslint/no-explicit-any -- File System Access API not in TS lib
                          const handle = await (window as any).showSaveFilePicker({
                            suggestedName: fileName,
                            types: [{ description: `${fmt.label} Image`, accept: { 'image/*': [ext] } }],
                          });
                          setPendingExportHandle(handle);
                        } catch (err: unknown) {
                          if (err instanceof DOMException && err.name === 'AbortError') {
                            setExporting(false);
                            exportLockRef.current = false;
                            setPendingExportHandle(null);
                            return;
                          }
                          // Extension not in system MIME DB (e.g., .webp on Windows).
                          // Retry without type filtering.
                          try {
                            // eslint-disable-next-line @typescript-eslint/no-explicit-any
                            const handle = await (window as any).showSaveFilePicker({
                              suggestedName: fileName,
                            });
                            setPendingExportHandle(handle);
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
                    }}
                    className={`w-full text-left px-3 py-2 text-xs transition-colors cursor-pointer hover:bg-neutral-800 ${fmt.value === exportFormat ? 'text-orange-400' : 'text-neutral-300 hover:text-white'}`}
                  >
                    {fmt.label}
                  </button>
                ))}
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
          <CanvasArea beforeAfter={beforeAfter} />
        </ErrorBoundary>
      </main>

      <div className="shrink-0 grain-bg" style={{ height: 'var(--bottom-panel-height)' }}>
        <div className="h-full backdrop-blur-sm">
          <BottomPanel />
        </div>
      </div>
    </div>
  );
}

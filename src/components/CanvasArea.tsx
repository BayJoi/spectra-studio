import { useRef, useState, useEffect, useMemo } from "react";
import { useAtomValue, useSetAtom } from "jotai";
import { jotaiStore, filtersAtom, selectedFilterIdAtom, imageUrlAtom, exportTriggerAtom, updateFilterParamAtom, setExportingAtom, exportFormatAtom, pendingExportHandleAtom } from "../store/atoms";
import type { FilterData } from "../store/atoms";
import { EffectEngine } from "../gl/engine";
import type Stats from "stats-gl";


const MIME_MAP: Record<string, string> = { png: 'image/png', jpeg: 'image/jpeg', webp: 'image/webp' };
const EXT_MAP: Record<string, string> = { png: '.png', jpeg: '.jpg', webp: '.webp' };

export function CanvasArea({ beforeAfter }: { beforeAfter?: boolean }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<EffectEngine | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);

  const imageUrl = useAtomValue(imageUrlAtom);
  const filters = useAtomValue(filtersAtom);
  const selectedFilterId = useAtomValue(selectedFilterIdAtom);
  const exportTrigger = useAtomValue(exportTriggerAtom);
  const exportFormat = useAtomValue(exportFormatAtom);
  const pendingExportHandle = useAtomValue(pendingExportHandleAtom);
  const setExporting = useSetAtom(setExportingAtom);
  const updateFilterParam = useSetAtom(updateFilterParamAtom);

  const [transform, setTransform] = useState({ x: 0, y: 0, scale: 1 });
  const [glError, setGlError] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const [loading, setLoading] = useState(false);
  const [smoothZoom, setSmoothZoom] = useState(false);
  const [exported, setExported] = useState(false);

  const isDragging = useRef(false);
  const lastPos = useRef({ x: 0, y: 0 });
  const [draggingCenterFor, setDraggingCenterFor] = useState<string | null>(null);
  const [splitPos, setSplitPos] = useState(0.5);
  const sliderDragging = useRef(false);

  const zoomBy = (factor: number) => {
    setSmoothZoom(true);
    setTransform((prev) => ({ ...prev, scale: Math.max(0.1, Math.min(prev.scale * factor, 50)) }));
  };

  const resetZoom = () => {
    setSmoothZoom(true);
    setTransform({ x: 0, y: 0, scale: 1 });
  };

  const statsRef = useRef<Stats | null>(null);

  useEffect(() => {
    if (!canvasRef.current) return;
    try {
      engineRef.current = new EffectEngine(canvasRef.current);
      if (import.meta.env.DEV) {
        import("stats-gl").then(({ default: Stats }) => {
          const stats = new Stats({ trackGPU: true });
          stats.init(canvasRef.current!).then(() => {
            statsRef.current = stats;
            containerRef.current?.appendChild(stats.domElement);
          });
        });
      }
    } catch (err) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- intentional: propagate WebGL init error to UI
      setGlError(err instanceof Error ? err.message : "Could not start WebGL2.");
    }
    return () => {
      statsRef.current?.domElement.remove();
      statsRef.current = null;
      engineRef.current?.dispose();
      engineRef.current = null;
    };
  }, []);

  const kickLoopRef = useRef<() => void>(() => {});

  useEffect(() => {
    const engine = engineRef.current;
    if (!engine) return;
    const onVisibility = () => {
      engine.hidden = document.hidden;
      if (!engine.hidden) kickLoopRef.current();
    };
    const obs = new IntersectionObserver(([e]) => {
      engine.hidden = document.hidden || !e.isIntersecting;
      if (!engine.hidden) kickLoopRef.current();
    }, { threshold: 0 });
    if (canvasRef.current) obs.observe(canvasRef.current);
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      obs.disconnect();
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, []);

  useEffect(() => {
    if (!imageUrl || !engineRef.current) {
      setReady(false);
      if (!imageUrl && engineRef.current) {
        engineRef.current.clear();
      }
      return;
    }
    let cancelled = false;
    setTransform({ x: 0, y: 0, scale: 1 });
    setReady(false);
    setLoading(true);
    setGlError(null);
    engineRef.current
      .loadImage(imageUrl)
      .then(() => {
        if (!cancelled) setReady(true);
      })
      .catch((err) => {
        if (!cancelled) setGlError(err instanceof Error ? err.message : "Could not load that image.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [imageUrl]);

  const moveRaf = useRef<number>(0);
  const exportingRef = useRef(false);

  useEffect(() => {
    return () => {
      cancelAnimationFrame(moveRaf.current);
    };
  }, []);

  useEffect(() => {
    if (!ready || !engineRef.current) return;
    const engine = engineRef.current;
    const stats = statsRef.current;
    let active = true;
    let lastFilters: FilterData[] | null = null;
    let pendingShaders = false;
    let rafId = 0;

    const loop = () => {
      if (!active) return;
      let needsNextFrame = false;
      if (!engine.hidden && !exportingRef.current) {
        const currentFilters = jotaiStore.get(filtersAtom);
        const hasAnimated = engine.isAnimated(currentFilters);
        const filtersChanged = currentFilters !== lastFilters;
        stats?.begin();
        pendingShaders = engine.render(currentFilters);
        stats?.end();
        if (hasAnimated || filtersChanged || pendingShaders) {
          lastFilters = currentFilters;
          needsNextFrame = true;
        }
      } else {
        needsNextFrame = true;
      }
      if (needsNextFrame) {
        rafId = requestAnimationFrame(loop);
      } else {
        rafId = 0;
      }
    };

    const kick = () => {
      if (!active) return;
      if (rafId === 0) {
        rafId = requestAnimationFrame(loop);
      }
    };
    kickLoopRef.current = kick;

    rafId = requestAnimationFrame(loop);

    const unsub = jotaiStore.sub(filtersAtom, kick);

    return () => {
      active = false;
      cancelAnimationFrame(rafId);
      unsub();
    };
  }, [ready]);

  const setPendingExportHandle = useSetAtom(pendingExportHandleAtom);

  useEffect(() => {
    if (exportTrigger === 0 || !engineRef.current || !ready) return;
    exportingRef.current = true;
    let cancelled = false;
    const mimeType = MIME_MAP[exportFormat] ?? 'image/png';
    const ext = EXT_MAP[exportFormat] ?? '.png';
    (async () => {
      try {
        const blob = await engineRef.current!.exportBlob(jotaiStore.get(filtersAtom), mimeType);
        if (cancelled || !blob) return;

        const handle = pendingExportHandle;
        if (handle) {
          const writable = await handle.createWritable();
          await writable.write(blob);
          await writable.close();
        } else {
          const url = URL.createObjectURL(blob);
          const a = document.createElement("a");
          a.href = url;
          a.download = `spectra-export-${Date.now()}${ext}`;
          a.rel = "noopener";
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          setTimeout(() => URL.revokeObjectURL(url), 5000);
        }

        setExported(true);
      } catch (err) {
        console.error('[CanvasArea] Export failed:', err);
      }
      if (!cancelled) {
        exportingRef.current = false;
        setExporting(false);
        setPendingExportHandle(null);
      }
    })();
    return () => {
      cancelled = true;
      exportingRef.current = false;
    };
  }, [exportTrigger, ready, exportFormat, setExporting, pendingExportHandle, setPendingExportHandle]);

  useEffect(() => {
    if (!beforeAfter) return;
    const onMove = (e: PointerEvent) => {
      if (!sliderDragging.current || !wrapperRef.current) return;
      const rect = wrapperRef.current.getBoundingClientRect();
      const x = (e.clientX - rect.left) / rect.width;
      setSplitPos(Math.max(0.01, Math.min(0.99, x)));
    };
    const onUp = () => { sliderDragging.current = false; };
    document.addEventListener('pointermove', onMove);
    document.addEventListener('pointerup', onUp);
    return () => {
      document.removeEventListener('pointermove', onMove);
      document.removeEventListener('pointerup', onUp);
    };
  }, [beforeAfter]);

  useEffect(() => {
    if (!exported) return;
    const t = setTimeout(() => setExported(false), 2200);
    return () => clearTimeout(t);
  }, [exported]);

  const handlePointerDown = (e: React.PointerEvent) => {
    setSmoothZoom(false);
    const target = e.target as HTMLElement;
    if (target.dataset.filterId) {
      setDraggingCenterFor(target.dataset.filterId);
      target.setPointerCapture(e.pointerId);
      e.stopPropagation();
      return;
    }
    isDragging.current = true;
    lastPos.current = { x: e.clientX, y: e.clientY };
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (draggingCenterFor && wrapperRef.current) {
      cancelAnimationFrame(moveRaf.current);
      moveRaf.current = requestAnimationFrame(() => {
        const rect = wrapperRef.current!.getBoundingClientRect();
        const x = Math.max(0, Math.min(100, ((e.clientX - rect.left) / rect.width) * 100));
        const y = Math.max(0, Math.min(100, ((e.clientY - rect.top) / rect.height) * 100));
        updateFilterParam(draggingCenterFor, "centerX", x);
        updateFilterParam(draggingCenterFor, "centerY", y);
      });
      return;
    }
    if (!isDragging.current) return;
    const dx = e.clientX - lastPos.current.x;
    const dy = e.clientY - lastPos.current.y;
    lastPos.current = { x: e.clientX, y: e.clientY };
    setTransform((prev) => ({ ...prev, x: prev.x + dx, y: prev.y + dy }));
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    if (draggingCenterFor) {
      setDraggingCenterFor(null);
      (e.target as HTMLElement).releasePointerCapture(e.pointerId);
      return;
    }
    isDragging.current = false;
    (e.target as HTMLElement).releasePointerCapture(e.pointerId);
  };

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    setSmoothZoom(false);
    const cont = containerRef.current;
    if (!cont) return;
    const crect = cont.getBoundingClientRect();
    const mx = e.clientX - crect.left;
    const my = e.clientY - crect.top;
    const cx = crect.width / 2;
    const cy = crect.height / 2;
    const delta = -e.deltaY * 0.001;
    setTransform((prev) => {
      const newScale = Math.max(0.1, Math.min(prev.scale * (1 + delta), 50));
      const ratio = newScale / prev.scale;
      const newX = mx - cx - (mx - cx - prev.x) * ratio;
      const newY = my - cy - (my - cy - prev.y) * ratio;
      return { x: newX, y: newY, scale: newScale };
    });
  };

  const radialBlurHandles = useMemo(() => {
    const selected = filters.find((f) => f.id === selectedFilterId);
    return selected && selected.enabled && selected.type === "RadialBlur" ? [selected] : [];
  }, [filters, selectedFilterId]);

  if (glError) {
    const isWebGL = glError.toLowerCase().includes("webgl") || glError.includes("not available");
    return (
      <div className="w-full h-full flex items-center justify-center p-8 text-center">
        <div className="max-w-sm bg-neutral-900 border border-neutral-800 rounded-xl px-8 py-10">
          <div className="w-16 h-16 mx-auto mb-5 rounded-xl bg-red-900/20 flex items-center justify-center border border-red-900/30">
            <span className="text-red-400 text-xl font-mono">!</span>
          </div>
          <p className="text-neutral-200 font-medium text-lg mb-2">
            {isWebGL ? "WebGL2 unavailable" : "Image error"}
          </p>
          <p className="text-neutral-500 text-base leading-relaxed">
            {glError}
            {isWebGL ? " Try Chrome, Edge, or Firefox." : ""}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className="w-full h-full relative cursor-grab active:cursor-grabbing overflow-hidden touch-none flex items-center justify-center"
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerLeave={handlePointerUp}
      onPointerCancel={handlePointerUp}
      onWheel={handleWheel}
    >
      <div
        className={`${imageUrl ? "relative" : "absolute"} ${smoothZoom ? "transition-transform duration-200 ease-out" : ""}`}
        style={{
          transform: imageUrl ? `translate(${transform.x}px, ${transform.y}px) scale(${transform.scale})` : "none",
          willChange: imageUrl ? "transform" : "auto",
          visibility: imageUrl ? "visible" : "hidden",
          pointerEvents: imageUrl ? "auto" : "none",
        }}
      >
        <div ref={wrapperRef} className="relative inline-block leading-none">
          <canvas
            ref={canvasRef}
            width="1"
            height="1"
            className={`max-w-[90vw] block transition-opacity duration-[450ms] ease-out ${ready && !loading ? "opacity-100" : "opacity-0"}`}
            style={{
              maxHeight: 'calc(100vh - var(--bottom-panel-height) - var(--header-height))',
              ...(beforeAfter ? { clipPath: `inset(0 0 0 ${splitPos * 100}%)` } : {}),
            }}
          />
          {beforeAfter && imageUrl && (
            <img
              src={imageUrl}
              alt="Original"
              className="absolute inset-0 pointer-events-none select-none"
              style={{
                maxWidth: '90vw',
                maxHeight: 'calc(100vh - var(--bottom-panel-height) - var(--header-height))',
                objectFit: 'contain',
                clipPath: `inset(0 ${(1 - splitPos) * 100}% 0 0)`,
              }}
              draggable={false}
            />
          )}
          {beforeAfter && imageUrl && (
            <div
              className="absolute inset-y-0 w-0.5 bg-orange-500 shadow-[0_0_8px_rgba(253,154,62,0.5)] cursor-ew-resize z-30 touch-none"
              style={{ left: `${splitPos * 100}%` }}
              onPointerDown={(e) => { sliderDragging.current = true; e.currentTarget.setPointerCapture(e.pointerId); e.stopPropagation(); }}
            >
              <div className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-8 h-8 rounded-full bg-orange-500 shadow-[0_0_12px_rgba(253,154,62,0.35)] flex items-center justify-center cursor-ew-resize border-2 border-orange-400">
                <div className="w-3 h-3 rounded-full bg-white" />
              </div>
            </div>
          )}
          {radialBlurHandles.map((f) => (
            <div
              key={f.id + "handle"}
              data-filter-id={f.id}
              className="absolute w-12 h-12 -ml-6 -mt-6 border-2 border-orange-500 rounded-full flex items-center justify-center cursor-move hover:bg-orange-500/15 hover:scale-110 transition-transform shadow-[0_0_12px_rgba(253,154,62,0.25)] z-50 touch-none"
              style={{ left: `${f.params.centerX ?? 50}%`, top: `${f.params.centerY ?? 50}%` }}
            >
              <div className="w-3 h-3 bg-orange-500 rounded-full pointer-events-none" />
            </div>
          ))}
          
        </div>
      </div>

      {loading && (
        <div className="absolute inset-0 flex items-center justify-center bg-neutral-950/60 z-30 animate-fade-in">
          <div className="flex flex-col items-center gap-3 bg-neutral-900 border border-neutral-800 rounded-xl px-8 py-6">
            <div className="w-[22px] h-[22px] border-2 border-neutral-800 border-t-orange-500 rounded-full animate-spectra-spin" />
            <p className="text-neutral-600 text-xs font-mono tracking-[0.3em] uppercase">Processing</p>
          </div>
        </div>
      )}

      {imageUrl && (
        <div className="absolute bottom-3 left-3 flex items-center gap-2 bg-neutral-900/90 border border-neutral-800 rounded-lg p-2 z-20 animate-fade-in">
          <div className="flex items-center gap-2 px-2 text-xs font-mono text-neutral-500">
            <div className="i-lucide-maximize-2 text-16px" />
            <span>{Math.round(transform.scale * 100)}%</span>
          </div>
          <div className="w-px h-5 bg-neutral-800" />
          <button
            onClick={() => zoomBy(1 / 1.2)}
            aria-label="Zoom out"
            className="w-9 h-9 rounded text-neutral-500 hover:text-neutral-200 hover:bg-neutral-800 hover:scale-105 active:scale-95 flex items-center justify-center transition-all duration-150 cursor-pointer"
          >
            <div className="i-lucide-zoom-out text-16px" />
          </button>
          <button
            onClick={() => zoomBy(1.2)}
            aria-label="Zoom in"
            className="w-9 h-9 rounded text-neutral-500 hover:text-neutral-200 hover:bg-neutral-800 hover:scale-105 active:scale-95 flex items-center justify-center transition-all duration-150 cursor-pointer"
          >
            <div className="i-lucide-zoom-in text-16px" />
          </button>
          <button
            onClick={resetZoom}
            aria-label="Reset zoom"
            className="w-9 h-9 rounded text-neutral-500 hover:text-neutral-200 hover:bg-neutral-800 hover:scale-105 active:scale-95 flex items-center justify-center transition-all duration-150 cursor-pointer"
          >
            <div className="i-lucide-maximize-2 text-16px" />
          </button>
        </div>
      )}

      {exported && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 flex items-center gap-2 bg-neutral-900/95 border border-orange-500/30 rounded-lg px-4 py-2.5 z-40 shadow-lg shadow-black/40 animate-slide-down">
          <div className="w-2 h-2 rounded-full bg-orange-500 animate-pulse" />
          <p className="text-neutral-200 text-sm font-medium">Image exported</p>
        </div>
      )}
    </div>
  );
}

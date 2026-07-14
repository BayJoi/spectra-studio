import { useRef, useState, useEffect, useMemo, useCallback } from "react";
import { useAtomValue, useSetAtom } from "jotai";
import { jotaiStore, filtersAtom, selectedFilterIdAtom, imageUrlAtom, exportTriggerAtom, updateFilterParamAtom, setExportingAtom, exportFormatAtom, exportQualityAtom, pendingExportHandleAtom, renderScaleAtom, addToastAtom } from "../store/atoms";
import type { FilterData } from "../store/atoms";
import { EffectEngine } from "../gl/engine";
import { EXPORT_FORMATS } from "../constants";
import { ZoomControls } from "./canvas/ZoomControls";
import type Stats from "stats-gl";

export function CanvasArea({ beforeAfter, nudgeRef }: { beforeAfter?: boolean; nudgeRef?: React.MutableRefObject<((delta: number) => void) | undefined> }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<EffectEngine | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);

  const imageUrl = useAtomValue(imageUrlAtom);
  const filters = useAtomValue(filtersAtom);
  const selectedFilterId = useAtomValue(selectedFilterIdAtom);
  const exportTrigger = useAtomValue(exportTriggerAtom);
  const exportFormat = useAtomValue(exportFormatAtom);
  const exportQuality = useAtomValue(exportQualityAtom);
  const renderScale = useAtomValue(renderScaleAtom);
  const setExporting = useSetAtom(setExportingAtom);
  const updateFilterParam = useSetAtom(updateFilterParamAtom);
  const addToast = useSetAtom(addToastAtom);

  const [transform, setTransform] = useState({ x: 0, y: 0, scale: 1 });
  const [glError, setGlError] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const [loading, setLoading] = useState(false);
  const [fadeIn, setFadeIn] = useState(false);
  const [smoothZoom, setSmoothZoom] = useState(false);

  const isDragging = useRef(false);
  const lastPos = useRef({ x: 0, y: 0 });
  const [draggingCenterFor, setDraggingCenterFor] = useState<string | null>(null);
  const [splitPos, setSplitPos] = useState(0.5);
  const sliderDragging = useRef(false);
  const freeTracking = useRef(false);

  const nudgeSplit = useCallback((delta: number) => {
    setSplitPos((prev) => Math.max(0.01, Math.min(0.99, prev + delta)));
  }, []);

  useEffect(() => {
    if (nudgeRef) nudgeRef.current = nudgeSplit;
  }, [nudgeRef, nudgeSplit]);

  const zoomBy = useCallback((factor: number) => {
    setSmoothZoom(true);
    setTransform((prev) => ({ ...prev, scale: Math.max(0.1, Math.min(prev.scale * factor, 50)) }));
  }, []);

  const zoomIn = useCallback(() => zoomBy(1.2), [zoomBy]);
  const zoomOut = useCallback(() => zoomBy(1 / 1.2), [zoomBy]);

  const resetZoom = useCallback(() => {
    setSmoothZoom(true);
    setTransform({ x: 0, y: 0, scale: 1 });
  }, []);

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

  const kickLoopRef = useRef<() => void>(undefined!);

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
    setFadeIn(false);
    setLoading(true);
    setGlError(null);
    engineRef.current
      .loadImage(imageUrl)
      .then(() => {
        if (!cancelled) {
          setReady(true);
          setTimeout(() => { if (!cancelled) { setFadeIn(true); setLoading(false); } }, 100);
        }
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

  useEffect(() => {
    if (engineRef.current && ready) {
      engineRef.current.setRenderScale(renderScale);
      engineRef.current.render(jotaiStore.get(filtersAtom));
    }
  }, [renderScale, ready]);

  const moveRaf = useRef<number>(0);
  const exportingRef = useRef(false);

  const handleWheel = useCallback((e: WheelEvent) => {
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
  }, []);

  useEffect(() => {
    return () => {
      cancelAnimationFrame(moveRaf.current);
    };
  }, []);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    el.addEventListener('wheel', handleWheel, { passive: false });
    return () => el.removeEventListener('wheel', handleWheel);
  }, [handleWheel]);

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
    const unsubScale = jotaiStore.sub(renderScaleAtom, kick);

    return () => {
      active = false;
      cancelAnimationFrame(rafId);
      unsub();
      unsubScale();
    };
  }, [ready]);

  const setPendingExportHandle = useSetAtom(pendingExportHandleAtom);

  useEffect(() => {
    if (exportTrigger === 0 || !engineRef.current || !ready) return;
    exportingRef.current = true;
    let cancelled = false;
    const fmt = EXPORT_FORMATS.find(f => f.value === exportFormat) ?? EXPORT_FORMATS[0];
    const mimeType = fmt.mime;
    const ext = fmt.ext;
    (async () => {
      try {
        const blob = await engineRef.current!.exportBlob(jotaiStore.get(filtersAtom), mimeType, exportQuality);
        if (cancelled || !blob) {
            if (!cancelled) {
              exportingRef.current = false;
              setExporting(false);
              setPendingExportHandle(null);
            }
            return;
          }

        const handle = jotaiStore.get(pendingExportHandleAtom);
        if (handle) {
          const writable = await handle.createWritable();
          await writable.write(blob);
          await writable.close();
          addToast('Exported', 'success');
        } else {
          const url = URL.createObjectURL(blob);
          const a = document.createElement("a");
          a.href = url;
          a.download = `spectra-export-${Date.now()}${ext}`;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          URL.revokeObjectURL(url);
          addToast('Exported', 'success');
        }
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
  }, [exportTrigger, ready, exportFormat, exportQuality, setExporting, setPendingExportHandle, addToast]);

  useEffect(() => {
    if (!beforeAfter) return;
    freeTracking.current = true;
    const onMove = (e: PointerEvent) => {
      if ((!sliderDragging.current && !freeTracking.current) || !wrapperRef.current) return;
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

  const handlePointerDown = (e: React.PointerEvent) => {
    freeTracking.current = false;
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
            className={`max-w-[90vw] block transition-opacity duration-[450ms] ease-out ${fadeIn ? "opacity-100" : "opacity-0"}`}
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
              className="absolute inset-y-0 cursor-ew-resize z-30 touch-none"
              style={{ left: `calc(${splitPos * 100}% - 12px)`, width: '24px' }}
              onPointerDown={(e) => { freeTracking.current = false; sliderDragging.current = true; e.currentTarget.setPointerCapture(e.pointerId); e.stopPropagation(); }}
            >
              <div className="absolute inset-y-0 left-1/2 -translate-x-1/2 w-0.5 bg-orange-500 shadow-[0_0_8px_rgba(253,154,62,0.5)]" />
              <div className="absolute top-1/2 left-1/2 -translate-y-1/2 -translate-x-1/2 w-8 h-8 rounded-full bg-orange-500 shadow-[0_0_12px_rgba(253,154,62,0.35)] flex items-center justify-center border-2 border-orange-400">
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
        <ZoomControls
          scale={transform.scale}
          onZoomIn={zoomIn}
          onZoomOut={zoomOut}
          onReset={resetZoom}
        />
      )}


    </div>
  );
}

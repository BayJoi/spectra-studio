import { memo } from "react";

interface ZoomControlsProps {
  scale: number;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onReset: () => void;
}

export const ZoomControls = memo(function ZoomControls({ scale, onZoomIn, onZoomOut, onReset }: ZoomControlsProps) {
  return (
    <div className="absolute bottom-3 left-3 flex items-center gap-2 bg-neutral-900/90 border border-neutral-800 rounded-lg p-2 z-20 animate-fade-in">
      <div className="flex items-center gap-2 px-2 text-xs font-mono text-neutral-500">
        <span className="tabular-nums" aria-live="off">{Math.round(scale * 100)}%</span>
      </div>
      <div className="w-px h-5 bg-neutral-800" />
      <button
        onClick={onZoomOut}
        aria-label="Zoom out"
        className="w-9 h-9 rounded text-neutral-500 hover:text-neutral-200 hover:bg-neutral-800 hover:scale-105 active:scale-95 flex items-center justify-center transition-interactive duration-150 cursor-pointer"
      >
        <div className="i-lucide-zoom-out text-16px" />
      </button>
      <button
        onClick={onZoomIn}
        aria-label="Zoom in"
        className="w-9 h-9 rounded text-neutral-500 hover:text-neutral-200 hover:bg-neutral-800 hover:scale-105 active:scale-95 flex items-center justify-center transition-interactive duration-150 cursor-pointer"
      >
        <div className="i-lucide-zoom-in text-16px" />
      </button>
      <button
        onClick={onReset}
        aria-label="Reset zoom"
        className="w-9 h-9 rounded text-neutral-500 hover:text-neutral-200 hover:bg-neutral-800 hover:scale-105 active:scale-95 flex items-center justify-center transition-interactive duration-150 cursor-pointer"
      >
        <div className="i-lucide-maximize-2 text-16px" />
      </button>
    </div>
  );
});

import { useEffect, useRef, useState } from "react";
import { FILTER_MANIFESTS } from "../filters/filter-registry";
import { initDigitalRain } from "../utils/digital-rain";
import { initRainOnGlass } from "../utils/rain-on-glass";
import { initHologramGlitch } from "../utils/hologram-glitch";
import { initSequinWave } from "../utils/sequin-wave";

interface LandingPageProps {
  onLaunch: () => void;
}

const FEATURES = [
  { iconClass: "i-lucide-layers", title: "Stackable effects", desc: "Add, reorder, toggle — each renders in sequence through the GPU pipeline." },
  { iconClass: "i-lucide-zap", title: "Real-time sliders", desc: "Every parameter re-renders instantly. No preview waits." },
  { iconClass: "i-lucide-shield", title: "100% client-side", desc: "Your images never leave your device. Private by design." },
];

const SHORTCUTS = [
  { key: "Ctrl+Z", action: "Undo last change" },
  { key: "Ctrl+Y", action: "Redo last change" },
  { key: "Delete / Backspace", action: "Remove selected filter" },
  { key: "C", action: "Toggle compare mode" },
  { key: "D", action: "Toggle all effects" },
  { key: "E", action: "Open effects browser" },
  { key: "P", action: "Open preset browser" },
  { key: "L", action: "Lock/unlock selected effect" },
  { key: "Ctrl+L", action: "Lock/unlock all effects" },
];

type ShaderType = 'off' | 'digital-rain' | 'rain-on-glass' | 'hologram-glitch' | 'sequin-wave';

const SHADERS: { value: ShaderType; label: string }[] = [
  { value: 'digital-rain', label: 'Digital Rain' },
  { value: 'rain-on-glass', label: 'Rain on Glass' },
  { value: 'hologram-glitch', label: 'Hologram Glitch' },
  { value: 'sequin-wave', label: 'Sequin Wave' },
];


const shaderInits: Partial<Record<ShaderType, (canvas: HTMLCanvasElement) => () => void>> = {
  'digital-rain': (c) => initDigitalRain(c, { interactive: false, darkness: 0.6 }),
  'rain-on-glass': (c) => initRainOnGlass(c, { interactive: false, darkness: 0.65 }),
  'hologram-glitch': (c) => initHologramGlitch(c, { intensity: 0.25, scanSpeed: 0.6, darkness: 0.55 }),
  'sequin-wave': (c) => initSequinWave(c, { darkness: 0.55 }),
};

export function LandingPage({ onLaunch }: LandingPageProps) {
  const [showShortcuts, setShowShortcuts] = useState(false);
  const [showShaderPicker, setShowShaderPicker] = useState(false);
  const [activeShader, setActiveShader] = useState<ShaderType>('off');
  const [mounted, setMounted] = useState(false);
  const [dropdownStyle, setDropdownStyle] = useState<React.CSSProperties>({});
  const canvas2dRef = useRef<HTMLCanvasElement>(null);
  const canvasWebglRef = useRef<HTMLCanvasElement>(null);
  const shaderCleanupRef = useRef<(() => void) | null>(null);
  const navCardRef = useRef<HTMLDivElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // eslint-disable-next-line react-hooks/set-state-in-effect -- intentional: mount detection for entrance animation
  useEffect(() => { setMounted(true); }, []);

  const shaderEnabled = activeShader !== 'off';

  useEffect(() => {
    const isWebgl = activeShader !== 'off' && activeShader !== 'digital-rain';
    const canvas = isWebgl ? canvasWebglRef.current : canvas2dRef.current;
    if (shaderCleanupRef.current) {
      shaderCleanupRef.current();
      shaderCleanupRef.current = null;
    }
    if (activeShader === 'off' || !canvas) return;
    const init = shaderInits[activeShader];
    if (!init) return;
    shaderCleanupRef.current = init(canvas);
    return () => {
      if (shaderCleanupRef.current) {
        shaderCleanupRef.current();
        shaderCleanupRef.current = null;
      }
    };
  }, [activeShader]);

  useEffect(() => {
    if (!showShortcuts) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setShowShortcuts(false); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [showShortcuts]);

  useEffect(() => {
    if (!showShaderPicker) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setShowShaderPicker(false); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [showShaderPicker]);

  const pickerRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!showShaderPicker) return;
    const onPointer = (e: PointerEvent) => {
      if (pickerRef.current && !pickerRef.current.contains(e.target as Node) &&
          dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowShaderPicker(false);
      }
    };
    window.addEventListener('pointerdown', onPointer);
    return () => window.removeEventListener('pointerdown', onPointer);
  }, [showShaderPicker]);

  return (
    <div className={`h-screen w-full bg-neutral-950 text-neutral-100 font-sans relative overflow-y-auto custom-scrollbar ${mounted ? '' : 'no-transition'}`} data-shader={shaderEnabled ? 'true' : undefined}>
      <div
        className="grain-overlay-fixed"
        data-active={shaderEnabled ? 'true' : undefined}
      />
      <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
        <div
          className="absolute top-[12%] left-[3%] w-[45%] h-[55%] rounded-full bg-orange-500/5 blur-[200px]"
          style={{ animation: "orb-1 28s ease-in-out infinite" }}
        />
        <div
          className="absolute bottom-[8%] right-[5%] w-[38%] h-[48%] rounded-full bg-orange-600/3 blur-[180px]"
          style={{ animation: "orb-2 32s ease-in-out infinite" }}
        />
        <div
          className="absolute top-[38%] right-[22%] w-[28%] h-[34%] rounded-full bg-orange-500/2 blur-[140px]"
          style={{ animation: "orb-3 22s ease-in-out infinite" }}
        />
      </div>
      <canvas
        ref={canvas2dRef}
        className={`fixed inset-0 w-full h-full pointer-events-none z-[1] transition-opacity duration-700 ${shaderEnabled && activeShader === 'digital-rain' ? 'opacity-100' : 'opacity-0'}`}
      />
      <canvas
        ref={canvasWebglRef}
        className={`fixed inset-0 w-full h-full pointer-events-none z-[1] transition-opacity duration-700 ${shaderEnabled && activeShader !== 'digital-rain' ? 'opacity-100' : 'opacity-0'}`}
      />
      <style>{`
        @keyframes orb-1 { 0%,100%{transform:translate(0,0)scale(1)} 33%{transform:translate(40px,-50px)scale(1.08)} 66%{transform:translate(-30px,30px)scale(0.92)} }
        @keyframes orb-2 { 0%,100%{transform:translate(0,0)scale(1)} 33%{transform:translate(-40px,40px)scale(0.92)} 66%{transform:translate(40px,-40px)scale(1.08)} }
        @keyframes orb-3 { 0%,100%{transform:translate(0,0)scale(1)} 50%{transform:translate(30px,40px)scale(1.04)} }
        [data-shader="true"] nav .text-neutral-500 { color: #d4d4d4 !important; text-shadow: 0 1px 4px rgba(0,0,0,0.5) !important; }
        [data-shader="true"] section .text-neutral-300 { color: #f5f5f5 !important; text-shadow: 0 1px 4px rgba(0,0,0,0.5) !important; }
        [data-shader="true"] section .text-neutral-500 { color: #d4d4d4 !important; text-shadow: 0 1px 4px rgba(0,0,0,0.5) !important; }
        [data-shader="true"] section .text-neutral-600 { color: #a3a3a3 !important; text-shadow: 0 1px 4px rgba(0,0,0,0.5) !important; }
        [data-shader="true"] footer { color: #737373 !important; text-shadow: 0 1px 4px rgba(0,0,0,0.5) !important; }
      `}</style>

      <nav className="relative z-10 mx-auto pt-5 px-5 max-w-6xl">
            <div ref={navCardRef} className={`${shaderEnabled ? 'bg-neutral-950/2 backdrop-blur-lg border-neutral-800/20 shadow-xl shadow-black/30' : 'bg-transparent border-neutral-800/80'} border rounded-xl transition-all duration-300`}>
          <div className="flex items-center justify-between px-5 py-3.5">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-md bg-gradient-to-br from-orange-500 to-orange-600 flex items-center justify-center shadow-sm shadow-orange-500/15">
                <div className="i-lucide-palette text-15px text-white" />
              </div>
              <span className="font-display text-neutral-200 text-lg tracking-tight">Spectra Studio</span>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowShortcuts(true)}
                className="flex items-center justify-center px-2.5 py-2 text-neutral-500 hover:text-neutral-200 hover:bg-neutral-800 hover:scale-105 active:scale-95 rounded-lg transition-all duration-150 cursor-pointer"
                title="Keyboard shortcuts"
                aria-label="Keyboard shortcuts"
              >
                <div className="i-lucide-keyboard text-15px" />
              </button>
              <div ref={pickerRef}>
                <button
                  onClick={() => {
                    if (!showShaderPicker) {
                      const card = navCardRef.current;
                      if (card) {
                        const r = card.getBoundingClientRect();
                        setDropdownStyle({
                          position: 'fixed',
                          top: r.bottom + 10,
                          right: window.innerWidth - r.right,
                          zIndex: 60,
                        });
                      }
                    }
                    setShowShaderPicker(p => !p);
                  }}
                  className={`flex items-center gap-1.5 px-2.5 py-2 rounded-lg transition-all duration-150 cursor-pointer ${shaderEnabled ? 'text-orange-400 hover:text-orange-300 bg-neutral-800/60' : 'text-neutral-500 hover:text-neutral-200 hover:bg-neutral-800'} hover:scale-105 active:scale-95`}
                  title="Background shader"
                  aria-label="Toggle background shader"
                >
                  {shaderEnabled ? <div className="i-lucide-eye text-14px" /> : <div className="i-lucide-eye-off text-14px" />}
                  <span className="text-xs font-mono hidden sm:inline">{shaderEnabled ? activeShader.replace(/-/g, ' ') : 'off'}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </nav>
      {showShaderPicker && (
        <div ref={dropdownRef} style={dropdownStyle} className={`${shaderEnabled ? 'bg-neutral-900/40 backdrop-blur-xl border-neutral-700 shadow-xl shadow-black/30' : 'bg-transparent border-neutral-700/70'} w-44 border rounded-xl animate-drop-in overflow-hidden transition-all duration-300`}>
          <div className="p-2 space-y-0.5">
            <button
              onClick={() => { setActiveShader('off'); setShowShaderPicker(false); }}
              className={`w-full text-left px-3 py-2 text-sm transition-all duration-100 cursor-pointer rounded-lg ${activeShader === 'off' ? 'bg-neutral-800 text-neutral-200' : 'text-neutral-300 hover:bg-neutral-800 hover:text-white hover:scale-[1.02] active:scale-[0.98]'}`}
            >
              Off
            </button>
            {SHADERS.map(s => (
              <button
                key={s.value}
                onClick={() => { setActiveShader(s.value); setShowShaderPicker(false); }}
                className={`w-full text-left px-3 py-2 text-sm transition-all duration-100 cursor-pointer rounded-lg ${activeShader === s.value ? 'bg-neutral-800 text-neutral-200' : 'text-neutral-300 hover:bg-neutral-800 hover:text-white hover:scale-[1.02] active:scale-[0.98]'}`}
              >
                <span className="flex items-center gap-1.5">
                  {s.label}
                    {s.value === 'hologram-glitch' && <span title="Warning: performance-heavy shader"><div className="i-lucide-triangle-alert text-12px text-amber-400/70 shrink-0" /></span>}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}

      {showShortcuts && (
        <div className="fixed inset-0 z-50 flex items-center justify-center" onClick={() => setShowShortcuts(false)}>
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
          <div
            className="relative z-10 bg-neutral-900 border border-neutral-800 rounded-xl p-6 w-full max-w-sm mx-4 shadow-2xl animate-drop-in"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-sm font-semibold text-neutral-200">Keyboard Shortcuts</h2>
              <button
                onClick={() => setShowShortcuts(false)}
                className="text-neutral-500 hover:text-neutral-300 transition-colors cursor-pointer"
                aria-label="Close"
              >
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M4 4l8 8M12 4l-8 8" />
                </svg>
              </button>
            </div>
            <div className="space-y-2.5">
              {SHORTCUTS.map((s) => (
                <div key={s.key} className="flex items-center justify-between">
                  <span className="text-xs text-neutral-500">{s.action}</span>
                  <kbd className="px-2 py-1 bg-neutral-800 border border-neutral-700 rounded text-xs font-mono text-neutral-400">
                    {s.key}
                  </kbd>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      <section className="relative z-10 flex flex-col items-center px-5 pt-16 pb-16 ">
        <div className="text-center max-w-4xl mx-auto hero-entrance hero-delay-2">
          <h1 className="text-[3.5rem] md:text-[6rem] lg:text-[7rem] leading-[1.1] font-display font-normal text-neutral-200">
            Creative effects.
            <br />
            <span className="text-orange-500">Zero latency.</span>
          </h1>
          <p className="mt-5 text-base md:text-lg text-neutral-500 max-w-lg mx-auto leading-relaxed font-sans">
            {FILTER_MANIFESTS.length} GPU shader effects for photos, applied in real time through a WebGL2 pipeline. Nothing leaves your device.
          </p>
          <button
            onClick={onLaunch}
            className="mt-8 inline-flex items-center gap-2.5 bg-orange-600 text-white font-medium px-8 py-3.5 rounded-lg text-sm hover:bg-orange-500 hover:shadow-[0_0_12px_rgba(253,154,62,0.35)] hover:scale-105 active:scale-95 transition-all duration-150 cursor-pointer shadow-[0_10px_15px_-3px_rgba(0,0,0,0.1)]"
          >
            Launch Studio
            <div className="i-lucide-arrow-right text-16px" />
          </button>
        </div>
      </section>

      <section className="relative z-10 max-w-5xl mx-auto px-5 pb-16 ">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {FEATURES.map((f, i) => (
            <div
              key={f.title}
              className={`reveal stagger-${i + 1} border rounded-xl px-5 py-6 transition-all duration-300 ${shaderEnabled ? 'bg-neutral-950/2 backdrop-blur-lg border-neutral-800/20 hover:border-neutral-700/40 shadow-lg shadow-black/20' : 'bg-transparent border-neutral-800/80 hover:border-neutral-700/80'}`}
            >
              <div className="w-9 h-9 rounded-lg bg-neutral-900/80 border border-neutral-800/60 flex items-center justify-center mb-3.5">
                <div className={`${f.iconClass} text-17px text-orange-500`} />
              </div>
              <h3 className="text-sm font-semibold text-neutral-200 mb-1">{f.title}</h3>
              <p className="text-sm text-neutral-500 leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="relative z-10 max-w-5xl mx-auto px-5 pb-16 ">
        <div className="text-center mb-8">
          <h2 className="text-2xl md:text-3xl font-display font-normal text-neutral-300 reveal stagger-2">All effects</h2>
          <p className="text-sm text-neutral-600 mt-2 font-sans reveal stagger-3">Every filter available in Spectra Studio</p>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {FILTER_MANIFESTS.map((m, i) => (
            <div
              key={m.type}
              className={`reveal stagger-${(i % 3) + 1} flex items-center gap-3 border rounded-lg px-4 py-3 transition-all duration-300 group ${shaderEnabled ? 'bg-neutral-950/2 backdrop-blur-lg border-neutral-800/20 hover:border-neutral-700/40 shadow-lg shadow-black/20' : 'bg-transparent border-neutral-800/70 hover:border-neutral-700 hover:bg-neutral-900/30'}`}
            >
              <div className={`w-8 h-8 rounded-md bg-gradient-to-br ${m.landingGradient ?? 'from-neutral-800/60 to-neutral-900/60'} shrink-0`} />
              <div className="min-w-0">
                <div className="text-sm font-medium text-neutral-300 group-hover:text-neutral-200 transition-colors truncate">
                  {m.label}
                </div>
                <div className="text-[11px] font-mono text-neutral-600 tracking-wide truncate">{m.category}</div>
              </div>
            </div>
          ))}
        </div>
      </section>

      <footer className="w-full flex flex-col md:flex-row items-center justify-center gap-4 md:gap-12 text-[11px] font-mono text-neutral-600 pb-8 px-6">
        <div className="text-left">
          Landing page shaders by{" "}
          <a href="https://radiant-shaders.com/" target="_blank" rel="noopener noreferrer" className="text-neutral-400 hover:text-neutral-200 hover:underline underline-offset-4 transition-colors">Radiant Shaders</a>
        </div>
        <div className="text-center">
          WebGL2 &middot; local only &middot; no upload
        </div>
        <div className="text-right">
          Inspired by{" "}
          <a href="https://github.com/ogdakke/voidmesh" target="_blank" rel="noopener noreferrer" className="text-neutral-400 hover:text-neutral-200 hover:underline underline-offset-4 transition-colors">Voidmesh</a>
        </div>
      </footer>
    </div>
  );
}

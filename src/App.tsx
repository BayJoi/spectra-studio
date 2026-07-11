import { useState, useEffect, Suspense, lazy, useCallback } from "react";
import { LandingPage } from "./components/LandingPage";
import { initGrain } from "./utils/grain";

const LazyEditorLayout = lazy(() => import("./components/EditorLayout").then(m => ({ default: m.EditorLayout })));

const editorChunkPromise = import("./components/EditorLayout");

function EditorSkeleton({fadeOut}: {fadeOut: boolean}) {
  const [visible, setVisible] = useState(false);
  useEffect(() => { requestAnimationFrame(() => requestAnimationFrame(() => setVisible(true))); }, []);
  return (
    <div className={`fixed inset-0 flex flex-col items-center justify-center bg-neutral-950 z-50 transition-opacity duration-[450ms] ease-out ${fadeOut ? "opacity-0" : visible ? "opacity-100" : "opacity-0"}`}>
      <div className="w-[22px] h-[22px] border-2 border-neutral-800 border-t-orange-500 rounded-full animate-spectra-spin mb-3.5" />
      <p className="text-neutral-600 text-[13px] font-mono tracking-[0.4em] uppercase">Spectra Studio</p>
    </div>
  );
}

function EditorMount({ fadeOut, children }: { fadeOut: boolean; children: React.ReactNode }) {
  const [visible, setVisible] = useState(false);
  useEffect(() => { requestAnimationFrame(() => requestAnimationFrame(() => setVisible(true))); }, []);
  return (
    <div className={`transition-opacity duration-[450ms] ease-out ${fadeOut ? "opacity-0 pointer-events-none" : visible ? "opacity-100" : "opacity-0"}`}>
      {children}
    </div>
  );
}

function LazyEditorWrapper({ onReady, onBack }: { onReady: () => void; onBack: () => void }) {
  useEffect(() => { onReady(); }, [onReady]);
  return <LazyEditorLayout onBack={onBack} />;
}

export default function App() {
  const [showEditor, setShowEditor] = useState(false);
  const [transitionPhase, setTransitionPhase] = useState<"idle" | "fading-out" | "fading-in">("idle");
  const [showSkeleton, setShowSkeleton] = useState(false);
  const [skeletonFadeOut, setSkeletonFadeOut] = useState(false);

  useEffect(() => {
    initGrain();
    const root = document.getElementById('root');
    const splash = document.getElementById('splash');
    if (root) root.classList.add('ready');
    if (splash) {
      splash.classList.add('fade');
      splash.addEventListener('transitionend', () => splash.remove(), { once: true });
    }
  }, []);

  useEffect(() => {
    const timers = new Map<Element, number>();
    const show = (el: Element) => {
      el.classList.add('show-scrollbar');
      const existing = timers.get(el);
      if (existing !== undefined) clearTimeout(existing);
      timers.set(el, window.setTimeout(() => el.classList.remove('show-scrollbar'), 1000));
    };
    const attach = (el: Element) => {
      if (el.hasAttribute('data-scrollbar-inited')) return;
      el.setAttribute('data-scrollbar-inited', '');
      el.addEventListener('scroll', () => show(el), { passive: true });
    };
    document.querySelectorAll('.custom-scrollbar').forEach(attach);
    const obs = new MutationObserver((entries) => {
      entries.forEach(e => e.addedNodes.forEach(n => {
        if (n instanceof Element) {
          if (n.matches?.('.custom-scrollbar')) attach(n);
          n.querySelectorAll?.('.custom-scrollbar').forEach(attach);
        }
      }));
    });
    obs.observe(document.body, { childList: true, subtree: true });
    return () => { obs.disconnect(); timers.forEach(t => window.clearTimeout(t)); };
  }, []);

  useEffect(() => {
    editorChunkPromise.catch(() => {});
  }, []);

  const launch = () => {
    setTransitionPhase("fading-out");
    setShowSkeleton(true);
    setSkeletonFadeOut(false);
    setTimeout(() => {
      setShowEditor(true);
      setTransitionPhase("fading-in");
    }, 200);
  };

  const goBack = () => {
    setTransitionPhase("fading-out");
    setTimeout(() => {
      setShowEditor(false);
      setTransitionPhase("fading-in");
    }, 200);
  };

  const handleEditorReady = useCallback(() => {
    setSkeletonFadeOut(true);
    setTimeout(() => setShowSkeleton(false), 450);
  }, []);

  useEffect(() => {
    if (transitionPhase === "fading-in") {
      const t = setTimeout(() => setTransitionPhase("idle"), 350);
      return () => clearTimeout(t);
    }
  }, [transitionPhase]);

  const hidden = transitionPhase === "fading-out";
  return (
    <>
      {showSkeleton && <EditorSkeleton fadeOut={skeletonFadeOut} />}
      {!showEditor ? (
        <div className={`transition-opacity duration-[450ms] ease-out ${hidden ? "opacity-0 pointer-events-none" : "opacity-100"}`}>
          <LandingPage onLaunch={launch} />
        </div>
      ) : (
        <EditorMount fadeOut={hidden}>
          <Suspense fallback={null}>
            <LazyEditorWrapper onReady={handleEditorReady} onBack={goBack} />
          </Suspense>
        </EditorMount>
      )}
    </>
  );
}

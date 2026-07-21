import { useEffect } from "react";
import { useAtomValue, useSetAtom } from "jotai";
import {
  jotaiStore,
  filtersAtom,
  exportTriggerAtom,
  setExportingAtom,
  exportFormatAtom,
  exportQualityAtom,
  pendingExportHandleAtom,
  addToastAtom,
} from "../store/atoms";
import type { EffectEngine } from "../gl/engine";
import { EXPORT_FORMATS } from "../constants";

/**
 * Watches the export trigger and performs the actual full-resolution render,
 * encode, and file write/download on the WebGL engine. Triggered by useExport.
 *
 * Format and quality are read imperatively from the store (not subscribed):
 * they must NOT re-run this effect. Since the trigger stays non-zero after the
 * first export, subscribing to them would re-export every time the user picks
 * a format or drags the quality slider.
 */
export function useCanvasExport(
  engineRef: React.RefObject<EffectEngine | null>,
  exportingRef: React.RefObject<boolean>,
  ready: boolean,
) {
  const exportTrigger = useAtomValue(exportTriggerAtom);
  const setExporting = useSetAtom(setExportingAtom);
  const setPendingExportHandle = useSetAtom(pendingExportHandleAtom);
  const addToast = useSetAtom(addToastAtom);

  useEffect(() => {
    if (exportTrigger === 0 || !engineRef.current || !ready) return;
    exportingRef.current = true;
    let cancelled = false;
    const exportFormat = jotaiStore.get(exportFormatAtom);
    const exportQuality = jotaiStore.get(exportQualityAtom);
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
    // eslint-disable-next-line react-hooks/exhaustive-deps -- engineRef/exportingRef are stable refs
  }, [exportTrigger, ready, setExporting, setPendingExportHandle, addToast]);
}

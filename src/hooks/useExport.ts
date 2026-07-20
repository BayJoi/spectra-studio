import { useCallback, useEffect, useRef } from "react";
import { useAtomValue, useSetAtom } from "jotai";
import {
  isExportingAtom,
  triggerExportAtom,
  setExportingAtom,
  exportFormatAtom,
  pendingExportHandleAtom,
  imageUrlAtom,
  hasFiltersAtom,
} from "../store/atoms";
import { EXPORT_FORMATS } from "../constants";

/**
 * Export orchestration: guards against concurrent exports and uses the
 * File System Access API (save picker) when available, falling back to a
 * plain download otherwise. The actual render + encode happens in CanvasArea.
 */
export function useExport() {
  const imageUrl = useAtomValue(imageUrlAtom);
  const hasFilters = useAtomValue(hasFiltersAtom);
  const isExporting = useAtomValue(isExportingAtom);
  const setExporting = useSetAtom(setExportingAtom);
  const triggerExport = useSetAtom(triggerExportAtom);
  const exportFormat = useAtomValue(exportFormatAtom);
  const setPendingExportHandle = useSetAtom(pendingExportHandleAtom);

  const canExport = imageUrl !== null && hasFilters;
  const exportLockRef = useRef(false);
  useEffect(() => { if (!isExporting) exportLockRef.current = false; }, [isExporting]);

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

  return { performExport, canExport, isExporting };
}

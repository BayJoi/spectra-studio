import { useEffect } from "react";
import { useAtomValue, useSetAtom } from "jotai";
import {
  autoSaveEnabledAtom,
  setImageUrlAtom,
  addToastAtom,
  filtersAtom,
  imageUrlAtom,
  jotaiStore,
} from "../store/atoms";

const SESSION_KEY = "spectra-session";
const MAX_SESSION_IMAGE_BYTES = 4 * 1024 * 1024;
const SAVE_DEBOUNCE_MS = 800;

async function saveSession() {
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
    if (dataUrl.length > MAX_SESSION_IMAGE_BYTES) return;
    const filters = jotaiStore.get(filtersAtom);
    sessionStorage.setItem(SESSION_KEY, JSON.stringify({ filters, image: dataUrl }));
  } catch { /* storage full or fetch failed — ignore */ }
}

/**
 * Auto-save the current session (image + filters) to sessionStorage,
 * and offer to restore it on the next visit. Subscribes at the store
 * level so the component doesn't re-render on every filter change.
 */
export function useAutoSave() {
  const autoSaveEnabled = useAtomValue(autoSaveEnabledAtom);
  const imageUrl = useAtomValue(imageUrlAtom);
  const setImageUrl = useSetAtom(setImageUrlAtom);
  const addToast = useSetAtom(addToastAtom);

  useEffect(() => {
    if (!autoSaveEnabled) return;
    let timer: number | undefined;
    const scheduleSave = () => {
      window.clearTimeout(timer);
      timer = window.setTimeout(saveSession, SAVE_DEBOUNCE_MS);
    };
    const unsubFilters = jotaiStore.sub(filtersAtom, scheduleSave);
    const unsubImage = jotaiStore.sub(imageUrlAtom, scheduleSave);
    scheduleSave(); // persist current state when auto-save is (re)enabled
    return () => {
      window.clearTimeout(timer);
      unsubFilters();
      unsubImage();
    };
  }, [autoSaveEnabled]);

  useEffect(() => {
    if (!autoSaveEnabled || imageUrl) return;
    try {
      const raw = sessionStorage.getItem(SESSION_KEY);
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
      sessionStorage.removeItem(SESSION_KEY);
    } catch { /* ignore */ }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
}

import { useEffect } from "react";
import { useAtomValue, useSetAtom } from "jotai";
import { toastsAtom, removeToastAtom } from "../store/atoms";

export function Toast() {
  const toasts = useAtomValue(toastsAtom);

  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-4 right-4 z-[100] flex flex-col-reverse gap-2 pointer-events-none">
      {toasts.map((t) => (
        <ToastItem key={t.id} toast={t} />
      ))}
    </div>
  );
}

function ToastItem({ toast }: { toast: { id: string; message: string; type: "success" | "error" | "info" } }) {
  const remove = useSetAtom(removeToastAtom);

  useEffect(() => {
    const timer = setTimeout(() => remove(toast.id), 2800);
    return () => clearTimeout(timer);
  }, [toast.id, remove]);

  const icons: Record<string, string> = {
    success: "i-lucide-check-circle text-emerald-400",
    error: "i-lucide-alert-circle text-red-400",
    info: "i-lucide-info text-blue-400",
  };

  const borders: Record<string, string> = {
    success: "border-emerald-500/30",
    error: "border-red-500/30",
    info: "border-blue-500/30",
  };

  return (
    <div
      className={`pointer-events-auto flex items-center gap-2.5 bg-neutral-900/95 border ${borders[toast.type]} rounded-lg px-4 py-2.5 shadow-xl shadow-black/40 animate-slide-down cursor-pointer`}
      onClick={() => remove(toast.id)}
    >
      <div className={`${icons[toast.type]} text-16px shrink-0`} />
      <p className="text-neutral-200 text-sm">{toast.message}</p>
    </div>
  );
}

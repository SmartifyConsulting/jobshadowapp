import { useSyncExternalStore } from "react";
import { X } from "lucide-react";
import { subscribe, getConfirmState, getToasts, resolveConfirm, dismissToast } from "@/lib/dialogs";

export function DialogHost() {
  const confirm = useSyncExternalStore(subscribe, getConfirmState, getConfirmState);
  const toasts = useSyncExternalStore(subscribe, getToasts, getToasts);

  return (
    <>
      {confirm && (
        <div className="fixed inset-0 z-[200] grid place-items-center bg-black/60 p-4" role="alertdialog" aria-modal="true">
          <div className="w-full max-w-sm rounded-2xl bg-background p-6 shadow-2xl">
            {confirm.title && <h2 className="font-display text-lg uppercase text-foreground">{confirm.title}</h2>}
            <p className="mt-2 text-sm text-foreground">{confirm.message}</p>
            <div className="mt-6 flex justify-end gap-2">
              <button onClick={() => resolveConfirm(false)} className="rounded-full bg-muted px-5 py-2 text-xs font-bold uppercase tracking-wide text-muted-foreground">
                Cancel
              </button>
              <button
                onClick={() => resolveConfirm(true)}
                className={`rounded-full px-5 py-2 text-xs font-bold uppercase tracking-wide ${confirm.danger ? "bg-destructive text-destructive-foreground" : "bg-cta text-cta-foreground"}`}
              >
                {confirm.confirmLabel ?? "Confirm"}
              </button>
            </div>
          </div>
        </div>
      )}
      <div className="fixed bottom-4 right-4 z-[200] flex w-full max-w-sm flex-col gap-2 px-4 sm:px-0">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`flex items-start gap-3 rounded-xl px-4 py-3 text-sm font-semibold shadow-xl ${t.variant === "error" ? "bg-destructive text-destructive-foreground" : "bg-cta text-cta-foreground"}`}
          >
            <p className="flex-1">{t.message}</p>
            <button onClick={() => dismissToast(t.id)} aria-label="Dismiss" className="shrink-0 opacity-80 hover:opacity-100">
              <X className="h-4 w-4" />
            </button>
          </div>
        ))}
      </div>
    </>
  );
}

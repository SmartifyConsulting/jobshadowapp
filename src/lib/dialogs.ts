// Tiny framework-free store backing the branded confirm dialog / toast
// system, so any component can call confirmAction()/notify() without
// prop-drilling, and <DialogHost/> (mounted once near the app root)
// renders whatever is currently pending.
export type ConfirmRequest = { id: number; title?: string | undefined; message: string; confirmLabel?: string | undefined; danger?: boolean | undefined; resolve: (v: boolean) => void };
export type ToastItem = { id: number; message: string; variant: "success" | "error" };

let confirmState: ConfirmRequest | null = null;
let toasts: ToastItem[] = [];
const listeners = new Set<() => void>();
let nextId = 1;

function emit() {
  listeners.forEach((l) => l());
}

export function subscribe(cb: () => void) {
  listeners.add(cb);
  return () => listeners.delete(cb);
}
export function getConfirmState() {
  return confirmState;
}
export function getToasts() {
  return toasts;
}

export function confirmAction(message: string, opts?: { title?: string; confirmLabel?: string; danger?: boolean }): Promise<boolean> {
  return new Promise((resolve) => {
    confirmState = { id: nextId++, message, title: opts?.title, confirmLabel: opts?.confirmLabel, danger: opts?.danger, resolve };
    emit();
  });
}

export function resolveConfirm(v: boolean) {
  confirmState?.resolve(v);
  confirmState = null;
  emit();
}

export function notify(message: string, variant: ToastItem["variant"] = "success") {
  const id = nextId++;
  toasts = [...toasts, { id, message, variant }];
  emit();
  setTimeout(() => {
    toasts = toasts.filter((t) => t.id !== id);
    emit();
  }, 5000);
}

export function dismissToast(id: number) {
  toasts = toasts.filter((t) => t.id !== id);
  emit();
}

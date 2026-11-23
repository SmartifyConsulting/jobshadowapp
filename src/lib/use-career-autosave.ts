import { useCallback, useEffect, useRef, useState } from "react";

type Values = Record<string, unknown>;
export function changedCareerFields(current: Values, saved: Values): Values {
  return Object.fromEntries(
    Object.entries(current).filter(
      ([key, value]) =>
        key !== "id" &&
        !key.startsWith("_") &&
        JSON.stringify(value) !== JSON.stringify(saved[key]),
    ),
  );
}

export function useCareerAutosave({
  enabled,
  values,
  paused,
  savePatch,
  initialSavedValues,
}: {
  enabled: boolean;
  values: Values;
  paused: boolean;
  savePatch: (patch: Values, signal: AbortSignal) => Promise<void>;
  initialSavedValues?: Values;
}) {
  const baseline = useRef(initialSavedValues ?? values);
  const latest = useRef({ enabled, values, paused, savePatch });
  latest.current = { enabled, values, paused, savePatch };
  const mounted = useRef(true);
  const request = useRef<AbortController | null>(null);
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState<Date | null>(null);
  const [error, setError] = useState<string | null>(null);
  const persist = useCallback(async (automatic: boolean): Promise<boolean> => {
    const state = latest.current;
    if (!mounted.current || !state.enabled || request.current || (automatic && state.paused))
      return false;
    const snapshot = { ...state.values };
    const patch = changedCareerFields(snapshot, baseline.current);
    if (!Object.keys(patch).length) return true;
    if (!String(snapshot["name"] ?? "").trim()) {
      setError("Enter the career name before saving.");
      return false;
    }
    const controller = new AbortController();
    request.current = controller;
    setSaving(true);
    setError(null);
    try {
      await state.savePatch(patch, controller.signal);
      if (!mounted.current || controller.signal.aborted) return false;
      // Edits made during the request remain dirty for the next save.
      baseline.current = snapshot;
      setSavedAt(new Date());
      return true;
    } catch {
      if (mounted.current && !controller.signal.aborted)
        setError("Couldn't save. Your changes are still here. We'll retry automatically.");
      return false;
    } finally {
      if (request.current === controller) request.current = null;
      if (mounted.current) setSaving(false);
    }
  }, []);
  useEffect(() => {
    mounted.current = true;
    const timer = enabled
      ? window.setInterval(() => {
          void persist(true);
        }, 30_000)
      : null;
    return () => {
      mounted.current = false;
      if (timer !== null) window.clearInterval(timer);
      request.current?.abort();
    };
  }, [enabled, persist]);
  const dirty = enabled && Object.keys(changedCareerFields(values, baseline.current)).length > 0;
  useEffect(() => {
    if (!dirty) return;
    const warn = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);
  return { dirty, saving, savedAt, error, saveNow: () => persist(false) };
}

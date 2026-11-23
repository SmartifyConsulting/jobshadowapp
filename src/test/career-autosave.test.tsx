import { act, cleanup, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { useCareerAutosave } from "@/lib/use-career-autosave";

beforeEach(() => vi.useFakeTimers());
afterEach(() => {
  cleanup();
  vi.useRealTimers();
});
const saved = { id: 1, name: "Accountant", description: "Saved", _count: 5 };
const tick = async (ms = 30_000) => {
  await act(async () => {
    await vi.advanceTimersByTimeAsync(ms);
  });
};

it("skips unchanged records, then saves only changed fields at 30 seconds", async () => {
  const savePatch = vi.fn().mockResolvedValue(undefined);
  const { result, rerender } = renderHook(
    ({ values }) => useCareerAutosave({ enabled: true, values, paused: false, savePatch }),
    { initialProps: { values: saved } },
  );
  await tick();
  expect(savePatch).not.toHaveBeenCalled();
  rerender({ values: { ...saved, description: "Changed", _count: 9 } });
  await tick(29_999);
  expect(savePatch).not.toHaveBeenCalled();
  await tick(1);
  expect(savePatch).toHaveBeenCalledWith({ description: "Changed" }, expect.any(AbortSignal));
  expect(result.current.dirty).toBe(false);
  expect(result.current.savedAt).toBeInstanceOf(Date);
});
it("keeps edits made during a request dirty and prevents overlapping saves", async () => {
  let finish!: () => void;
  const savePatch = vi
    .fn()
    .mockImplementationOnce(
      () =>
        new Promise<void>((resolve) => {
          finish = resolve;
        }),
    )
    .mockResolvedValue(undefined);
  const { result, rerender } = renderHook(
    ({ values }) => useCareerAutosave({ enabled: true, values, paused: false, savePatch }),
    { initialProps: { values: saved } },
  );
  rerender({ values: { ...saved, description: "First" } });
  await tick();
  rerender({ values: { ...saved, description: "Second" } });
  await tick();
  expect(savePatch).toHaveBeenCalledTimes(1);
  await act(async () => {
    finish();
  });
  expect(result.current.dirty).toBe(true);
  await tick();
  expect(savePatch).toHaveBeenLastCalledWith({ description: "Second" }, expect.any(AbortSignal));
});
it("preserves failed changes and retries on the next interval", async () => {
  const savePatch = vi
    .fn()
    .mockRejectedValueOnce(new Error("Offline"))
    .mockResolvedValue(undefined);
  const { result, rerender } = renderHook(
    ({ values }) => useCareerAutosave({ enabled: true, values, paused: false, savePatch }),
    { initialProps: { values: saved } },
  );
  rerender({ values: { ...saved, description: "Changed" } });
  await tick();
  expect(result.current.error).toContain("Your changes are still here");
  expect(result.current.dirty).toBe(true);
  await tick();
  expect(savePatch).toHaveBeenCalledTimes(2);
  expect(result.current.error).toBeNull();
});
it("holds AI review drafts until Update, including a draft loaded from the list", async () => {
  const savePatch = vi.fn().mockResolvedValue(undefined);
  const { result } = renderHook(() =>
    useCareerAutosave({
      enabled: true,
      initialSavedValues: saved,
      values: { ...saved, description: "AI draft" },
      paused: true,
      savePatch,
    }),
  );
  await tick(60_000);
  expect(savePatch).not.toHaveBeenCalled();
  expect(result.current.dirty).toBe(true);
  await act(async () => {
    expect(await result.current.saveNow()).toBe(true);
  });
  expect(savePatch).toHaveBeenCalledWith({ description: "AI draft" }, expect.any(AbortSignal));
  expect(result.current.dirty).toBe(false);
});
it("stops its timer and aborts an in-flight request on leaving the editor", async () => {
  const savePatch = vi.fn().mockReturnValue(new Promise(() => {}));
  const { rerender, unmount } = renderHook(
    ({ values }) => useCareerAutosave({ enabled: true, values, paused: false, savePatch }),
    { initialProps: { values: saved } },
  );
  rerender({ values: { ...saved, description: "Changed" } });
  await tick();
  const signal = savePatch.mock.calls[0]![1] as AbortSignal;
  unmount();
  expect(signal.aborted).toBe(true);
  await tick(60_000);
  expect(savePatch).toHaveBeenCalledTimes(1);
});

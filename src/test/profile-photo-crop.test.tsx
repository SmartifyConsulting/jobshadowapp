import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { ImageCropModal } from "@/components/ImageCropModal";

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});
it("starts halfway, fits the whole image on zoom out, and saves the same dominant-colour fill", async () => {
  const ctx = {
    drawImage: vi.fn(),
    fillRect: vi.fn(),
    fillStyle: "",
    getImageData: () => ({ data: [200, 20, 10, 255] }),
  };
  vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue(
    ctx as unknown as CanvasRenderingContext2D,
  );
  vi.spyOn(HTMLCanvasElement.prototype, "toBlob").mockImplementation((callback) =>
    callback(new Blob(["crop"], { type: "image/jpeg" })),
  );
  vi.stubGlobal("URL", { createObjectURL: () => "blob:test", revokeObjectURL: vi.fn() });
  vi.stubGlobal(
    "Image",
    class {
      width = 640;
      height = 320;
      onload?: () => void;
      set src(_value: string) {
        queueMicrotask(() => this.onload?.());
      }
    },
  );
  const save = vi.fn();
  render(
    <form onSubmit={vi.fn()}>
      <ImageCropModal
        file={new File(["image"], "avatar.png", { type: "image/png" })}
        onCancel={vi.fn()}
        onSave={save}
      />
    </form>,
  );
  const zoom = screen.getByRole("slider", { name: "Photo zoom" });
  expect(zoom).toHaveValue("0.5");
  await waitFor(() => expect(screen.getByRole("button", { name: "Save photo" })).toBeEnabled());
  fireEvent.change(zoom, { target: { value: "0" } });
  await waitFor(() =>
    expect(ctx.drawImage).toHaveBeenLastCalledWith(expect.anything(), 0, 80, 320, 160),
  );
  expect(ctx.fillStyle).toBe("rgb(200, 20, 10)");
  fireEvent.click(screen.getByRole("button", { name: "Save photo" }));
  expect(ctx.fillRect).toHaveBeenLastCalledWith(0, 0, 512, 512);
  expect(ctx.drawImage).toHaveBeenLastCalledWith(expect.anything(), 0, 128, 512, 256);
  expect(save).toHaveBeenCalledWith(expect.any(Blob));
});

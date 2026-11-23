import { dominantImageColour } from "@/lib/image-colour";
import { useEffect, useRef, useState } from "react";

/** Crop a square avatar with a dominant-colour background when zoomed out. */
export function ImageCropModal({
  file,
  onCancel,
  onSave,
}: {
  file: File;
  onCancel: () => void;
  onSave: (blob: Blob) => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imgRef = useRef<HTMLImageElement | null>(null);
  const [error, setError] = useState("");
  const colourRef = useRef("rgb(255, 255, 255)");
  const [ready, setReady] = useState(false);
  const [zoom, setZoom] = useState(0.5); // 0 = fit whole image, 1 = 3x zoomed in
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const dragRef = useRef<{ x: number; y: number } | null>(null);

  const SIZE = 320; // on-screen canvas size (px)
  const MIN_SCALE_MULT = 1; // "fits" scale multiplier
  const MAX_SCALE_MULT = 3; // zoomed-in scale multiplier

  useEffect(() => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    let active = true;
    img.onload = () => {
      if (!active) return;
      imgRef.current = img;
      const sample = document.createElement("canvas");
      sample.width = 64;
      sample.height = 64;
      const ctx = sample.getContext("2d");
      if (ctx) {
        ctx.drawImage(img, 0, 0, 64, 64);
        colourRef.current = dominantImageColour(ctx.getImageData(0, 0, 64, 64).data);
      }
      setReady(true);
    };
    img.onerror = () => {
      if (active)
        setError("This image could not be opened. Please choose a JPG, PNG or WebP image.");
    };
    img.src = url;
    return () => {
      active = false;
      URL.revokeObjectURL(url);
    };
  }, [file]);

  useEffect(() => {
    if (ready) draw();
  }, [ready, zoom, offset]);

  function fitScale(img: HTMLImageElement) {
    return Math.min(SIZE / img.width, SIZE / img.height);
  }

  function currentScale(img: HTMLImageElement) {
    const base = fitScale(img);
    return base * (MIN_SCALE_MULT + zoom * (MAX_SCALE_MULT - MIN_SCALE_MULT));
  }

  function draw() {
    const canvas = canvasRef.current;
    const img = imgRef.current;
    if (!canvas || !img) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    canvas.width = SIZE;
    canvas.height = SIZE;

    const scale = currentScale(img);
    const w = img.width * scale;
    const h = img.height * scale;

    ctx.fillStyle = colourRef.current;
    ctx.fillRect(0, 0, SIZE, SIZE);

    const x = (SIZE - w) / 2 + offset.x;
    const y = (SIZE - h) / 2 + offset.y;
    ctx.drawImage(img, x, y, w, h);
  }

  function clampOffset(next: { x: number; y: number }, img: HTMLImageElement) {
    const scale = currentScale(img);
    const w = img.width * scale,
      h = img.height * scale;
    const maxX = Math.max(0, (w - SIZE) / 2);
    const maxY = Math.max(0, (h - SIZE) / 2);
    return {
      x: Math.min(maxX, Math.max(-maxX, next.x)),
      y: Math.min(maxY, Math.max(-maxY, next.y)),
    };
  }

  function onPointerDown(e: React.PointerEvent) {
    dragRef.current = { x: e.clientX - offset.x, y: e.clientY - offset.y };
  }
  function onPointerMove(e: React.PointerEvent) {
    if (!dragRef.current || !imgRef.current) return;
    const next = { x: e.clientX - dragRef.current.x, y: e.clientY - dragRef.current.y };
    setOffset(clampOffset(next, imgRef.current));
  }
  function onPointerUp() {
    dragRef.current = null;
  }

  function save() {
    const img = imgRef.current;
    if (!img) return;
    const OUT = 512;
    const out = document.createElement("canvas");
    out.width = OUT;
    out.height = OUT;
    const ctx = out.getContext("2d");
    if (!ctx) return;
    const ratio = OUT / SIZE;
    const scale = currentScale(img) * ratio;

    ctx.fillStyle = colourRef.current;
    ctx.fillRect(0, 0, OUT, OUT);

    const w = img.width * scale,
      h = img.height * scale;
    const x = (OUT - w) / 2 + offset.x * ratio;
    const y = (OUT - h) / 2 + offset.y * ratio;
    ctx.drawImage(img, x, y, w, h);

    out.toBlob(
      (blob) => {
        if (blob) onSave(blob);
      },
      "image/jpeg",
      0.92,
    );
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Adjust your photo"
      className="fixed inset-0 z-50 grid place-items-center bg-black/60 p-4"
    >
      <div className="w-full max-w-sm rounded-xl bg-card p-5 shadow-lg">
        <h3 className="text-sm font-semibold">Adjust your photo</h3>
        <p className="mt-1 text-xs text-muted-foreground">
          Drag to reposition, use the slider to zoom.
        </p>
        <div className="mt-4 flex justify-center">
          <canvas
            ref={canvasRef}
            width={SIZE}
            height={SIZE}
            className="max-w-full cursor-move rounded-full border border-primary/30 touch-none"
            style={{ clipPath: "circle(50%)" }}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerLeave={onPointerUp}
          />
        </div>
        <input
          aria-label="Photo zoom"
          type="range"
          min={0}
          max={1}
          step={0.01}
          value={zoom}
          onChange={(e) => {
            setZoom(Number(e.target.value));
            setOffset({ x: 0, y: 0 });
          }}
          className="mt-4 w-full"
        />
        {error && (
          <p role="alert" className="mt-2 text-sm text-destructive">
            {error}
          </p>
        )}
        <div className="mt-4 flex justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="rounded-full border border-primary/40 px-4 py-2 text-xs font-bold uppercase tracking-wide"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={!ready}
            onClick={save}
            className="rounded-full bg-cta px-4 py-2 text-xs font-bold uppercase tracking-wide text-cta-foreground"
          >
            Save photo
          </button>
        </div>
      </div>
    </div>
  );
}

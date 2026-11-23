/** Quantised histogram: ignore transparent pixels and use the largest colour group. */
export function dominantImageColour(pixels: ArrayLike<number>): string {
  const groups = new Map<number, { count: number; r: number; g: number; b: number }>();
  for (let i = 0; i + 3 < pixels.length; i += 4) {
    if (pixels[i + 3]! < 128) continue;
    const r = pixels[i]!,
      g = pixels[i + 1]!,
      b = pixels[i + 2]!;
    const key = (r >> 4) * 256 + (g >> 4) * 16 + (b >> 4);
    const group = groups.get(key) ?? { count: 0, r: 0, g: 0, b: 0 };
    group.count++;
    group.r += r;
    group.g += g;
    group.b += b;
    groups.set(key, group);
  }
  const best = [...groups.values()].sort((a, b) => b.count - a.count)[0];
  return best
    ? `rgb(${Math.round(best.r / best.count)}, ${Math.round(best.g / best.count)}, ${Math.round(best.b / best.count)})`
    : "rgb(255, 255, 255)";
}

import { readFileSync, writeFileSync } from "node:fs";
import { paint, SIZE } from "./style";
import { loadDesigns } from "./designs/index";
import { decodePNG, encodePNG } from "../png";

/**
 * Review sheet: `npx tsx tools/sprites/preview.ts <out.png> <group> [ids,comma,separated] [scale]`
 * Draws the designs ×scale (default 3) on a light background, in rows of 6, with the id order kept.
 */
const [out, group, idList, scaleArg] = process.argv.slice(2);
const designs = await loadDesigns(group ? [group] : undefined);
const ids = idList ? idList.split(",") : Object.keys(designs);
const k = Number(scaleArg ?? 3), cell = SIZE * k + 8, cols = Math.min(6, ids.length), rows = Math.ceil(ids.length / cols);
const W = cell * cols, H = cell * rows;
const img = new Uint8Array(W * H * 4);
for (let i = 0; i < img.length; i += 4) img.set([248, 240, 228, 255], i);
ids.forEach((id, n) => {
  let px: Uint8ClampedArray | Uint8Array;
  if (id.endsWith(".png")) {
    const r = decodePNG(readFileSync(id));
    px = new Uint8Array(SIZE * SIZE * 4);
    for (let y = 0; y < SIZE; y++) for (let x = 0; x < SIZE; x++) {
      const s = (Math.floor((y * r.h) / SIZE) * r.w + Math.floor((x * r.w) / SIZE)) * 4;
      px.set(r.rgba.subarray(s, s + 4), (y * SIZE + x) * 4);
    }
  } else {
    const d = designs[id];
    if (!d) { console.error(`sin diseño: ${id}`); return; }
    px = paint(d);
  }
  const ox = (n % cols) * cell + 4, oy = Math.floor(n / cols) * cell + 4;
  for (let y = 0; y < SIZE * k; y++) for (let x = 0; x < SIZE * k; x++) {
    const s = (Math.floor(y / k) * SIZE + Math.floor(x / k)) * 4;
    if (px[s + 3] < 128) continue;
    img.set(px.subarray(s, s + 4), ((oy + y) * W + ox + x) * 4);
  }
});
writeFileSync(out, encodePNG(W, H, img));
console.log(`${ids.length} → ${out}`);

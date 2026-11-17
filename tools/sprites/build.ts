import { mkdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { paint, SIZE } from "./style";
import { loadDesigns } from "./designs/index";
import { encodePNG } from "../png";
import { loadGameData } from "../../src/data/load";

/**
 * Writes every creature's sprite to src/assets/creatures/<id>.png (512×512, crisp ×8 pixels),
 * where the game picks them up. Run: npx tsx tools/sprites/build.ts
 */
const SCALE = 8;
const dir = resolve(import.meta.dirname, "../../src/assets/creatures");
mkdirSync(dir, { recursive: true });
const designs = await loadDesigns();
const data = loadGameData();
const missing = data.ecos.filter((e) => !designs[e.id]).map((e) => e.id);
for (const [id, d] of Object.entries(designs)) {
  if (!data.eco.has(id)) { console.warn(`diseño sin especie: ${id}`); continue; }
  const px = paint(d), W = SIZE * SCALE;
  const big = new Uint8Array(W * W * 4);
  for (let y = 0; y < W; y++) for (let x = 0; x < W; x++) {
    const s = (Math.floor(y / SCALE) * SIZE + Math.floor(x / SCALE)) * 4;
    big.set(px.subarray(s, s + 4), (y * W + x) * 4);
  }
  writeFileSync(resolve(dir, `${id}.png`), encodePNG(W, W, big));
}
console.log(`${Object.keys(designs).length} sprites escritos en ${dir}`);
if (missing.length) console.log(`Sin diseño (${missing.length}): ${missing.join(", ")}`);

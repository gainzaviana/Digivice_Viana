import { sculptData } from "../src/three/sculpt";
import { SCULPTS } from "../src/three/sculpts";

/** Build time and triangles per sculpted creature: npx tsx tools/sculpt-time.ts [id,id,...] */
const ids = process.argv[2] ? process.argv[2].split(",") : Object.keys(SCULPTS);
for (const id of ids) {
  const s = SCULPTS[id];
  if (!s) { console.log(`${id}: sin escultura`); continue; }
  const t = performance.now();
  const d = sculptData(s);
  const ms = Math.round(performance.now() - t);
  console.log(`${id.padEnd(34)} ${String(ms).padStart(5)} ms ${String((d.body.length + d.glow.length) / 3).padStart(7)} tris  ojos ${d.eyes.length}${ms > 600 ? "  ← DEMASIADO LENTO" : ""}`);
}

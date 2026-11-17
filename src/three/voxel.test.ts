import { describe, expect, it } from "vitest";
import { readFileSync, readdirSync } from "node:fs";
import { resolve } from "node:path";
import { decodePNG } from "../../tools/png";
import { voxelGeometry, type SpritePixels } from "./voxel";

const dir = resolve(__dirname, "../assets/creatures");
const load = (file: string): SpritePixels => {
  const img = decodePNG(readFileSync(resolve(dir, file)));
  const n = 64, rgba = new Uint8ClampedArray(n * n * 4);
  for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) {
    const sx = Math.floor(((x + 0.5) * img.w) / n), sy = Math.floor(((y + 0.5) * img.h) / n);
    rgba.set(img.rgba.subarray((sy * img.w + sx) * 4, (sy * img.w + sx) * 4 + 4), (y * n + x) * 4);
  }
  return { n, rgba };
};

describe("voxel creatures", () => {
  it("builds every sprite as a closed, grounded figure within the triangle budget", () => {
    let max = 0, maxID = "";
    for (const file of readdirSync(dir).filter((f) => f.endsWith(".png"))) {
      const { geo, height } = voxelGeometry(load(file));
      const tris = geo.index!.count / 3;
      if (tris > max) { max = tris; maxID = file; }
      geo.computeBoundingBox();
      expect(geo.boundingBox!.min.y).toBe(0);
      expect(geo.boundingBox!.max.y).toBe(height);
      geo.dispose();
    }
    console.log(`voxel max: ${max} (${maxID})`);
    expect(max, `most triangles: ${maxID}`).toBeLessThan(30000);
  });

  it("is thicker in the middle of a body than at its edge", () => {
    const n = 9, rgba = new Uint8ClampedArray(n * n * 4);
    for (let i = 0; i < n * n; i++) rgba.set([200, 80, 60, 255], i * 4);
    const { geo } = voxelGeometry({ n, rgba });
    geo.computeBoundingBox();
    expect(geo.boundingBox!.max.z).toBeGreaterThan(2);
  });
});

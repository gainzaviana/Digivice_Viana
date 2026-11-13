import { describe, expect, it } from "vitest";
import * as THREE from "three";
import { loadGameData } from "../data/load";
import type { Variant } from "../core/save";
import { buildCreature, STAGE_HEIGHT } from "./creature";

const data = loadGameData();

function triangles(root: THREE.Object3D): number {
  let n = 0;
  root.traverse((o) => {
    const g = (o as THREE.Mesh).geometry as THREE.BufferGeometry | undefined;
    if (!g) return;
    n += (g.index ? g.index.count : g.getAttribute("position").count) / 3;
  });
  return n;
}

function finite(root: THREE.Object3D): boolean {
  let ok = true;
  root.traverse((o) => {
    const g = (o as THREE.Mesh).geometry as THREE.BufferGeometry | undefined;
    if (!g) return;
    for (const a of Object.values(g.attributes)) { const arr = (a as THREE.BufferAttribute).array; for (let i = 0; i < arr.length; i++) if (!Number.isFinite(arr[i])) ok = false; }
  });
  return ok;
}

describe("3D Ecos", () => {
  it("builds every species and variant within the triangle budget, feet on the ground", () => {
    let max = 0, maxID = "";
    for (const eco of data.ecos) {
      for (const variant of ["normal", "brillante", "infectado"] as Variant[]) {
        const rig = buildCreature(eco.id, variant, data);
        const tris = triangles(rig.root);
        if (tris > max) { max = tris; maxID = eco.id; }
        expect(finite(rig.root), `${eco.id} ${variant}`).toBe(true);
        rig.root.updateMatrixWorld(true);
        const box = new THREE.Box3().setFromObject(rig.root);
        expect(box.min.y).toBeCloseTo(0, 3);
        expect(box.max.y).toBeCloseTo(STAGE_HEIGHT[eco.stage], 2);
        if (variant === "normal") expect(rig.eyes.length, eco.id).toBeGreaterThan(0);
        rig.dispose();
      }
    }
    expect(max, `most triangles: ${maxID}`).toBeLessThan(5000);
  });

  it("builds silhouettes without eyes or seams", () => {
    const rig = buildCreature("brasko", "normal", data, { silhouette: true });
    expect(rig.eyes).toHaveLength(0);
    expect(rig.seams).toHaveLength(0);
  });
});

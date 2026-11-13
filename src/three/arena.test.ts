import { describe, expect, it } from "vitest";
import regions from "../data/json/regiones.json";
import { buildArena, arenaTheme, triangleCount } from "./arena";
import { defaultQuality } from "./materials";

describe("arenas", () => {
  for (const region of regions as { id: string }[]) {
    for (const night of [false, true]) {
      it(`${region.id} (${night ? "noche" : "día"}) builds within budget`, () => {
        const a = buildArena(region.id, night, defaultQuality(true));
        const tris = triangleCount(a.root);
        expect(tris).toBeGreaterThan(1000);
        expect(tris).toBeLessThanOrEqual(15_000);
        expect(a.lights.filter((l) => l.castShadow).length).toBeLessThanOrEqual(1);
        expect(a.slots.enemy.x - a.slots.partner.x).toBeCloseTo(3.2);
        a.update(0.016, 1);
        a.dispose();
      });
    }
  }
  it("has a theme for every region", () => {
    for (const region of regions as { id: string }[]) expect(arenaTheme(region.id).name).toBeTruthy();
  });
});

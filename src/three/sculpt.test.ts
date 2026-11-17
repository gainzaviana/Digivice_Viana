import { describe, expect, it } from "vitest";
import { loadGameData } from "../data/load";
import { sculptData } from "./sculpt";
import { SCULPTS } from "./sculpts";

const data = loadGameData();

describe("sculpted creatures", () => {
  it("every species has a 3D sculpt", () => {
    expect(data.ecos.filter((e) => !SCULPTS[e.id]).map((e) => e.id)).toEqual([]);
  });

  it("sculpts build a grounded mesh with eyes (one per stage sampled)", () => {
    for (const id of ["chispin", "ecoli", "egida", "deus-maquina", "leviatan-glacial", "emperador-crisol", "aranared", "dragon-desbordamiento"]) {
      const d = sculptData(SCULPTS[id]);
      expect(d.body.length, id).toBeGreaterThan(3000);
      expect(d.eyes.length, id).toBeGreaterThan(0);
      let minY = Infinity;
      for (let i = 1; i < d.pos.length; i += 3) minY = Math.min(minY, d.pos[i]);
      expect(minY, id).toBeCloseTo(0, 5);
      expect(d.height, id).toBeGreaterThan(0.3);
    }
  }, 60000);
});

import { describe, expect, it } from "vitest";
import { loadGameData } from "../data/load";
import { PALETTE, PALETTE_COLORS } from "./palette";
import { ecoPixels, SPRITE_CANVAS } from "./sprite";
import { backdropLayers, backdropTheme } from "./backdrop";

const data = loadGameData();
// From tools/check-sprites: main ramp 4 + secondary 3 + accent 1 + outline + eye white + seam = 11; bigger forms a little more.
const COLOUR_BUDGET: Record<string, number> = { brote: 11, novato: 11, avanzado: 12, elite: 13, supremo: 14, despertar: 15, fusion: 16 };

describe("sprites", () => {
  it("has 32 palette colours", () => expect(PALETTE_COLORS.size).toBe(32));

  for (const variant of ["normal", "brillante", "infectado"] as const) {
    it(`draws every Eco (${variant}) with the art direction`, () => {
      const problems: string[] = [];
      for (const e of data.ecos) {
        const p = ecoPixels(e.id, variant, data);
        const n = p.n;
        if (n !== SPRITE_CANVAS[e.stage] || p.colors.length !== n * n) problems.push(`${e.id}: wrong canvas`);
        const filled = p.colors.filter(Boolean).length;
        if (filled < n * n * 0.08) problems.push(`${e.id}: almost empty (${filled} px)`);
        const off = p.colors.filter((c) => c && !PALETTE_COLORS.has(c));
        if (off.length) problems.push(`${e.id}: ${off.length} px outside the palette`);
        // Every silhouette edge pixel (touching transparency or the border) is the outline colour.
        let edge = 0;
        for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) {
          const c = p.colors[y * n + x];
          if (!c) continue;
          const onEdge = x === 0 || y === 0 || x === n - 1 || y === n - 1 || [[x - 1, y], [x + 1, y], [x, y - 1], [x, y + 1]].some(([a, b]) => !p.colors[b * n + a]);
          if (onEdge && c !== PALETTE.outline) edge++;
        }
        if (edge) problems.push(`${e.id}: ${edge} edge px without outline`);
        if (!p.colors.includes(PALETTE.outline)) problems.push(`${e.id}: no outline`);
        if (variant === "normal") {
          const used = new Set(p.colors.filter(Boolean)).size;
          if (used > COLOUR_BUDGET[e.stage] + 4) problems.push(`${e.id}: ${used} colours`);
          // Brotes have no seam yet (as in the native art).
          if (e.stage !== "brote" && !p.emissive.some((v) => v)) problems.push(`${e.id}: no glowing seam`);
        }
        for (const v of p.normals) if (!Number.isFinite(v)) { problems.push(`${e.id}: bad normal`); break; }
      }
      expect(problems).toEqual([]);
    });
  }

  it("silhouettes are flat slate", () => {
    const p = ecoPixels("brasko", "normal", data, true);
    expect(new Set(p.colors.filter(Boolean))).toEqual(new Set([PALETTE.slate, PALETTE.outline]));
  });

  it("is deterministic", () => {
    expect(ecoPixels("lobocifra", "infectado", data).colors).toEqual(ecoPixels("lobocifra", "infectado", data).colors);
  });
});

describe("backdrops", () => {
  it("draws every zone with palette colours only", () => {
    const hex = (r: number, g: number, b: number) => "#" + [r, g, b].map((v) => v.toString(16).padStart(2, "0")).join("").toUpperCase();
    const seen = new Set<string>();
    for (const r of data.regions) {
      expect(backdropTheme(r.id).sky.length).toBe(3);
      for (const night of [false, true]) {
        const l = backdropLayers(r.id, night);
        for (const layer of [l.sky, l.far, l.mid, l.ground]) {
          for (let i = 0; i < layer.length; i += 4) {
            if (layer[i + 3] !== 0) seen.add(hex(layer[i], layer[i + 1], layer[i + 2]));
          }
        }
      }
    }
    expect([...seen].filter((c) => !PALETTE_COLORS.has(c))).toEqual([]);
  }, 30_000);
});

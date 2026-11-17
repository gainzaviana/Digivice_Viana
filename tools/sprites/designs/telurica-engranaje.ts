import { Material as M, type Point, type SpriteForge } from "../../../src/art/forge";
import { blob, horn, P, type Colours, type Design } from "../style";

// Telúrica: a rolling armadillo that grows into a walking mountain (affinity Ruido, magenta).
const earth: Colours = {
  main: ["#7a3c48", "#c4703e", "#eaa056", "#ffd68a"],
  second: ["#8a6a6a", "#d2ac84", "#efd3a2", "#fff4d2"],
  accent: ["#3e4a72", "#6a80a6", "#a4bcd2", "#e2f0f6"],
  dark: ["#2c2438", "#4a3c58", "#6a5c7e", "#8e80a0"],
  glow: "#ff4fd2",
  iris: "#e83aa8",
};
// Despertar: obsidian plates veined with magenta magma.
const tectonic: Colours = {
  main: ["#3e2c58", "#6c4a8a", "#a274b6", "#dcb2dc"],
  second: ["#7c4c6c", "#c87c90", "#eeb4b2", "#fff2e2"],
  accent: ["#5a2a78", "#a24ac0", "#e486e6", "#ffe0fc"],
  dark: ["#1c1628", "#34284a", "#54406c", "#7a6290"],
  glow: "#ff74e6",
  iris: "#ff3ac0",
};

// Engranaje: a repair drone that grows into a perfect machine (affinity Señal, cyan).
const metal: Colours = {
  main: ["#3a4888", "#6488c6", "#9ec4ee", "#eef8ff"],
  second: ["#9a543a", "#dc9a40", "#f8cc66", "#fff4c4"],
  accent: ["#5e6688", "#a6b0ca", "#dae2f0", "#ffffff"],
  dark: ["#1c2236", "#2e3a56", "#48587c", "#6a7ea4"],
  glow: "#4af2ff",
  iris: "#14c8f0",
};
// Despertar: red-hot plating, white steam and overdriven circuits.
const overclock: Colours = {
  main: ["#5c2444", "#aa3c4a", "#ea744e", "#ffc88c"],
  second: ["#b8402a", "#f47a2a", "#ffc24a", "#fff4b4"],
  accent: ["#a8aac4", "#dcdeec", "#f4f5fb", "#ffffff"],
  dark: ["#24182c", "#3c2a44", "#5c405c", "#80607a"],
  glow: "#8afcff",
  iris: "#ff5a2a",
};

type F = SpriteForge;

/**
 * Armour bands across a dome (top of an ellipse), back to front so each plate overlaps the previous
 * one. With `yBot` null the band is clipped to the whole ellipse (a rolled ball).
 */
function bands(f: F, cx: number, cy: number, rx: number, ry: number, yBot: number | null, xs: number[], m: M, lift = 1) {
  for (let i = 0; i < xs.length - 1; i++) {
    const a = xs[i], b = xs[i + 1] + 0.015;
    const top: Point[] = [], bot: Point[] = [];
    for (let t = 0; t <= 6; t++) {
      const x = a + ((b - a) * t) / 6, dx = (x - cx) / rx, h = ry * Math.sqrt(Math.max(0, 1 - dx * dx));
      top.push(P(x, cy - h));
      bot.unshift(P(x, cy + h));
    }
    f.poly([...top, ...(yBot === null ? bot : [P(b, yBot), P(a, yBot)])], m, lift);
  }
}

/** A gear: teeth, disc, inner ring and hub. */
function gear(f: F, cx: number, cy: number, r: number, teeth: number, m: M, lift = 0, hub: M = M.dark, rot = 0) {
  const at = (rr: number, aa: number) => P(cx + Math.cos(aa) * rr, cy + Math.sin(aa) * rr);
  for (let i = 0; i < teeth; i++) {
    const a = rot + (i * Math.PI * 2) / teeth, w = (Math.PI / teeth) * 0.55;
    f.poly([at(r * 0.8, a - w), at(r * 1.22, a - w * 0.7), at(r * 1.22, a + w * 0.7), at(r * 0.8, a + w)], m, lift);
  }
  f.ellipse(cx, cy, r, r, m, lift);
  f.ring(cx, cy, r * 0.74, hub, 1, lift + 1);
  for (let i = 0; i < 4; i++) f.line(at(r * 0.3, rot + (i * Math.PI) / 2), at(r * 0.7, rot + (i * Math.PI) / 2), hub, 1, lift + 1);
  f.ellipse(cx, cy, r * 0.3, r * 0.3, hub, lift + 1);
}

const rivet = (f: F, x: number, y: number, lift = 3) => f.rect(x, y, x + 1 / 64, y + 1 / 64, M.accent, lift);

/** A pointy crystal: accent shell with a glowing core line. */
function crystal(f: F, x: number, y: number, h: number, w: number, lean: number, lift = 2) {
  f.poly([P(x - w, y), P(x - w * 0.8 + lean * 0.5, y - h * 0.7), P(x + lean, y - h), P(x + w * 0.8 + lean * 0.6, y - h * 0.6), P(x + w, y)], M.accent, lift);
  f.line(P(x + lean * 0.15, y - h * 0.15), P(x + lean * 0.7, y - h * 0.75), M.glow, 1, lift + 1);
}

/** A steam puff (clustered blobs). */
function steam(f: F, x: number, y: number, s: number) {
  blob(f, [P(x - 0.07 * s, y + 0.02 * s), P(x - 0.06 * s, y - 0.04 * s), P(x - 0.02 * s, y - 0.08 * s), P(x + 0.04 * s, y - 0.07 * s), P(x + 0.08 * s, y - 0.02 * s), P(x + 0.06 * s, y + 0.03 * s), P(x, y + 0.045 * s)], M.accent, 9);
  f.ellipse(x + 0.02 * s, y - 0.035 * s, 0.03 * s, 0.025 * s, M.accent, 10);
}

/** A floating tectonic slab: thick dark edge, plate face with a magma crack, glow beneath. */
function slab(f: F, pts: Point[], th: number, lift: number) {
  const low = Math.max(...pts.map((p) => p[1])) + th;
  const xs = pts.map((p) => p[0]), x0 = Math.min(...xs), x1 = Math.max(...xs);
  f.line(P(x0 + (x1 - x0) * 0.3, low + 0.03), P(x0 + (x1 - x0) * 0.6, low + 0.03), M.glow, 1, lift);
  f.poly(pts.map((p) => P(p[0], p[1] + th)), M.dark, lift);
  f.poly(pts, M.main, lift + 1);
  f.seamLine(P((pts[0][0] + pts[1][0]) / 2, (pts[0][1] + pts[1][1]) / 2), P((pts[2][0] + pts[3][0]) / 2, (pts[2][1] + pts[3][1]) / 2), [M.main]);
}

/** A thick stump leg with toenails. */
function stump(f: F, x: number, top: number, w: number, m: M, lift: number, nails = 3) {
  blob(f, [P(x - w, top), P(x + w, top - 0.02), P(x + w * 1.15, top + 0.16), P(x + w * 1.3, 0.97), P(x - w * 1.2, 0.97), P(x - w * 1.1, top + 0.14)], m, lift);
  for (let i = 0; i < nails; i++) f.ellipse(x - w * 0.6 + (i * w * 1.6) / Math.max(1, nails - 1) + w * 0.2, 0.958, 0.024, 0.018, M.accent, lift + 1);
}

// ───────────────────────────── Telúrica ─────────────────────────────

/** The walking mountain (shared by Supremo and Despertar). */
function coloso(f: F, awake: boolean) {
  if (awake) {
    // Tectonic plates floating behind, raised like shields.
    slab(f, [P(0.03, 0.14), P(0.07, 0.05), P(0.2, 0.03), P(0.17, 0.12)], 0.03, 0);
    slab(f, [P(0.03, 0.44), P(0.06, 0.3), P(0.12, 0.26), P(0.1, 0.42)], 0.03, 0);
  }
  // Tail
  blob(f, [P(0.12, 0.6), P(0.04, 0.7), P(0.03, 0.76), P(0.08, 0.74), P(0.14, 0.68)], M.main);
  // Far legs
  stump(f, 0.2, 0.68, 0.06, M.second, 0, 2);
  stump(f, 0.58, 0.68, 0.06, M.second, 0, 2);
  // The mountain on its back
  f.poly([P(0.08, 0.56), P(0.12, 0.34), P(0.18, 0.3), P(0.26, 0.12), P(0.32, 0.2), P(0.4, 0.02), P(0.5, 0.18), P(0.56, 0.14), P(0.66, 0.36), P(0.7, 0.56)], M.accent, 0);
  // Snow caps
  f.poly([P(0.36, 0.1), P(0.4, 0.02), P(0.45, 0.1), P(0.42, 0.09), P(0.4, 0.12), P(0.38, 0.09)], M.second, 1);
  f.poly([P(0.23, 0.18), P(0.26, 0.12), P(0.29, 0.17), P(0.26, 0.19)], M.second, 1);
  f.poly([P(0.54, 0.17), P(0.56, 0.14), P(0.59, 0.2), P(0.56, 0.21)], M.second, 1);
  // Strata ridges
  f.line(P(0.2, 0.36), P(0.34, 0.3), M.accent, 1, 2);
  f.line(P(0.44, 0.26), P(0.58, 0.34), M.accent, 1, 2);
  // Magma rivers down the slopes
  f.seamLine(P(0.4, 0.12), P(0.36, 0.28), [M.accent]);
  f.seamLine(P(0.36, 0.28), P(0.4, 0.44), [M.accent]);
  f.seamLine(P(0.26, 0.24), P(0.22, 0.42), [M.accent]);
  // Crystals growing out of the slopes
  crystal(f, 0.5, 0.4, 0.16, 0.03, 0.03, 3);
  crystal(f, 0.57, 0.44, 0.1, 0.025, 0.04, 3);
  crystal(f, 0.16, 0.44, 0.12, 0.03, -0.03, 3);
  if (awake) {
    crystal(f, 0.31, 0.3, 0.16, 0.035, -0.01, 3);
    crystal(f, 0.65, 0.42, 0.1, 0.025, 0.04, 3);
    crystal(f, 0.24, 0.42, 0.14, 0.03, -0.04, 3);
    crystal(f, 0.42, 0.44, 0.1, 0.025, 0.0, 3);
  }
  // Armoured body under the mountain
  blob(f, [P(0.06, 0.62), P(0.14, 0.5), P(0.4, 0.48), P(0.66, 0.48), P(0.78, 0.58), P(0.74, 0.76), P(0.4, 0.8), P(0.1, 0.76)], M.main, 1);
  bands(f, 0.42, 0.82, 0.38, 0.34, 0.76, [0.06, 0.18, 0.3, 0.42, 0.54, 0.66, 0.78], M.main, 2);
  f.seamLine(P(0.24, 0.52), P(0.26, 0.7), [M.main]);
  f.seamLine(P(0.48, 0.52), P(0.5, 0.7), [M.main]);
  // Near legs: pillars with rock knee plates
  for (const x of [0.28, 0.66]) {
    stump(f, x, 0.7, 0.075, M.second, 3, 3);
    blob(f, [P(x - 0.09, 0.7), P(x, 0.66), P(x + 0.09, 0.69), P(x + 0.08, 0.78), P(x - 0.08, 0.79)], M.main, 4);
    f.seamLine(P(x - 0.02, 0.69), P(x + 0.01, 0.77), [M.main]);
    if (awake) {
      f.seamLine(P(x - 0.03, 0.8), P(x + 0.01, 0.88), [M.second]);
      f.seamLine(P(x + 0.01, 0.88), P(x - 0.01, 0.94), [M.second]);
    }
  }
  // Head: heavy brow plate and the great horn
  blob(f, [P(0.66, 0.56), P(0.72, 0.44), P(0.84, 0.44), P(0.96, 0.58), P(0.95, 0.7), P(0.84, 0.74), P(0.7, 0.7)], M.second, 4);
  blob(f, [P(0.64, 0.52), P(0.7, 0.4), P(0.84, 0.38), P(0.9, 0.48), P(0.78, 0.52)], M.main, 5);
  horn(f, P(0.86, 0.62), P(0.94, 0.62), P(0.97, 0.3), 0.04, M.accent, 5);
  horn(f, P(0.79, 0.44), P(0.84, 0.43), P(0.88, 0.32), 0.02, M.accent, 6);
  horn(f, P(0.84, 0.7), P(0.88, 0.7), P(0.95, 0.78), 0.01, M.accent, 6);
  rivet(f, 0.7, 0.46, 6);
  rivet(f, 0.75, 0.43, 6);
  f.seamLine(P(0.72, 0.5), P(0.8, 0.41), [M.main]);
  if (awake) {
    // Floating plates, held like shields, magma glowing underneath.
    slab(f, [P(0.62, 0.2), P(0.72, 0.08), P(0.96, 0.05), P(0.9, 0.17)], 0.04, 6);
  }
  return [{ x: 0.81, y: 0.56, r: 0.05, angry: true }];
}

export const teluricaEngranaje: Record<string, Design> = {
  // Brote: a banded armour ball with its little face peeking out.
  bolarmi: {
    colours: earth,
    draw(f) {
      f.ellipse(0.3, 0.93, 0.08, 0.045, M.second);
      blob(f, [P(0.2, 0.84), P(0.1, 0.9), P(0.08, 0.84), P(0.16, 0.8)], M.main);
      f.ellipse(0.46, 0.53, 0.4, 0.4, M.main);
      bands(f, 0.46, 0.53, 0.4, 0.4, null, [0.06, 0.18, 0.3, 0.42, 0.52], M.main, 1);
      // Face peeking out of the front
      blob(f, [P(0.48, 0.64), P(0.56, 0.48), P(0.76, 0.44), P(0.9, 0.58), P(0.86, 0.78), P(0.66, 0.86), P(0.5, 0.8)], M.second, 2);
      f.ellipse(0.88, 0.7, 0.06, 0.05, M.second, 3);
      f.ellipse(0.91, 0.68, 0.02, 0.015, M.dark, 4);
      f.ellipse(0.54, 0.46, 0.04, 0.06, M.second, 3);
      horn(f, P(0.68, 0.48), P(0.75, 0.47), P(0.78, 0.32), 0.03, M.accent, 3);
      // Paws tucked in
      f.ellipse(0.6, 0.88, 0.07, 0.05, M.second, 4);
      f.ellipse(0.8, 0.86, 0.06, 0.05, M.second, 4);
      for (const x of [0.62, 0.82]) rivet(f, x, 0.9, 5);
      f.seamLine(P(0.24, 0.24), P(0.27, 0.36), [M.main]);
      return [{ x: 0.74, y: 0.62, r: 0.07 }, { x: 0.58, y: 0.63, r: 0.055 }];
    },
  },
  // Novato: an armadillo on all fours, banded shell and a forehead horn.
  rodacorno: {
    colours: earth,
    draw(f) {
      // Ringed tail
      blob(f, [P(0.16, 0.66), P(0.06, 0.74), P(0.03, 0.84), P(0.07, 0.84), P(0.12, 0.76), P(0.22, 0.72)], M.main);
      f.line(P(0.08, 0.74), P(0.12, 0.77), M.dark, 1, 1);
      f.line(P(0.05, 0.8), P(0.09, 0.81), M.dark, 1, 1);
      stump(f, 0.24, 0.76, 0.05, M.second, 0, 2);
      stump(f, 0.56, 0.76, 0.05, M.second, 0, 2);
      // Shell with bands and a pale skirt
      f.ellipse(0.42, 0.6, 0.34, 0.32, M.main);
      bands(f, 0.42, 0.66, 0.34, 0.38, 0.82, [0.08, 0.22, 0.34, 0.46, 0.58, 0.76], M.main, 1);
      f.band(0.78, 0.84, M.main, M.second);
      for (const x of [0.28, 0.4, 0.52]) rivet(f, x, 0.36, 3);
      stump(f, 0.34, 0.8, 0.055, M.second, 2, 2);
      stump(f, 0.66, 0.8, 0.055, M.second, 2, 2);
      // Head: long snout, helmet scute, horn and ear
      blob(f, [P(0.64, 0.62), P(0.7, 0.46), P(0.82, 0.44), P(0.97, 0.64), P(0.95, 0.72), P(0.8, 0.74), P(0.68, 0.72)], M.second, 3);
      f.ellipse(0.96, 0.67, 0.02, 0.02, M.dark, 4);
      f.ellipse(0.68, 0.42, 0.035, 0.06, M.second, 3);
      blob(f, [P(0.66, 0.5), P(0.72, 0.42), P(0.84, 0.44), P(0.86, 0.5), P(0.74, 0.54)], M.main, 4);
      horn(f, P(0.79, 0.46), P(0.86, 0.48), P(0.9, 0.24), 0.05, M.accent, 5);
      return [{ x: 0.8, y: 0.58, r: 0.055 }];
    },
  },
  // Avanzado: a plated rhino, riveted shoulder guard and twin horns.
  rinoblindo: {
    colours: earth,
    draw(f) {
      // Tail tuft
      f.line(P(0.08, 0.46), P(0.04, 0.58), M.second, 2);
      f.ellipse(0.04, 0.6, 0.025, 0.04, M.main);
      stump(f, 0.18, 0.7, 0.06, M.second, 0, 2);
      stump(f, 0.54, 0.7, 0.06, M.second, 0, 2);
      // Barrel body
      blob(f, [P(0.06, 0.58), P(0.12, 0.38), P(0.34, 0.3), P(0.6, 0.3), P(0.74, 0.44), P(0.72, 0.7), P(0.4, 0.78), P(0.12, 0.74)], M.second);
      // Saddle bands and a rump plate
      bands(f, 0.36, 0.62, 0.32, 0.32, 0.66, [0.06, 0.18, 0.28, 0.38, 0.46], M.main, 1);
      // Shoulder guard
      blob(f, [P(0.42, 0.36), P(0.56, 0.28), P(0.72, 0.38), P(0.74, 0.58), P(0.62, 0.66), P(0.46, 0.6)], M.main, 2);
      for (const [x, y] of [[0.5, 0.38], [0.58, 0.34], [0.66, 0.4], [0.7, 0.5]]) rivet(f, x, y, 4);
      f.seamLine(P(0.54, 0.44), P(0.58, 0.58), [M.main]);
      f.seamLine(P(0.26, 0.36), P(0.24, 0.5), [M.main]);
      // Near legs with knee plates
      for (const x of [0.28, 0.64]) {
        stump(f, x, 0.7, 0.07, M.second, 3, 3);
        blob(f, [P(x - 0.07, 0.72), P(x, 0.68), P(x + 0.08, 0.71), P(x + 0.07, 0.8), P(x - 0.06, 0.8)], M.main, 4);
      }
      // Head: long and low, helmeted, big nose horn
      blob(f, [P(0.64, 0.5), P(0.72, 0.34), P(0.84, 0.36), P(0.97, 0.58), P(0.95, 0.68), P(0.82, 0.7), P(0.68, 0.64)], M.second, 4);
      f.ellipse(0.94, 0.62, 0.02, 0.02, M.dark, 5);
      f.poly([P(0.66, 0.34), P(0.7, 0.24), P(0.74, 0.34)], M.second, 4);
      blob(f, [P(0.66, 0.44), P(0.72, 0.32), P(0.84, 0.34), P(0.9, 0.46), P(0.78, 0.46)], M.main, 5);
      rivet(f, 0.74, 0.36, 6);
      rivet(f, 0.82, 0.38, 6);
      horn(f, P(0.86, 0.54), P(0.94, 0.56), P(0.97, 0.18), 0.04, M.accent, 6);
      horn(f, P(0.8, 0.44), P(0.85, 0.44), P(0.87, 0.3), 0.02, M.accent, 6);
      return [{ x: 0.79, y: 0.5, r: 0.05, angry: true }];
    },
  },
  // Élite: a hunched quake beast, boulders and crystals on its hump, huge stomping feet.
  terremotor: {
    colours: earth,
    draw(f) {
      blob(f, [P(0.1, 0.6), P(0.03, 0.7), P(0.04, 0.74), P(0.12, 0.68)], M.main);
      stump(f, 0.16, 0.7, 0.06, M.second, 0, 2);
      stump(f, 0.52, 0.66, 0.07, M.second, 0, 2);
      // Hunched body, higher at the shoulders
      blob(f, [P(0.04, 0.66), P(0.08, 0.48), P(0.22, 0.36), P(0.44, 0.24), P(0.64, 0.26), P(0.78, 0.42), P(0.76, 0.68), P(0.4, 0.78), P(0.08, 0.76)], M.main);
      bands(f, 0.44, 0.66, 0.4, 0.42, 0.72, [0.04, 0.16, 0.28, 0.4, 0.52, 0.64, 0.76], M.main, 1);
      // Boulders on the hump with crystals between them
      crystal(f, 0.34, 0.32, 0.22, 0.045, -0.05, 2);
      crystal(f, 0.42, 0.3, 0.14, 0.03, -0.01, 2);
      f.poly([P(0.1, 0.46), P(0.13, 0.36), P(0.2, 0.3), P(0.3, 0.32), P(0.34, 0.4), P(0.3, 0.46)], M.accent, 3);
      f.poly([P(0.38, 0.36), P(0.42, 0.22), P(0.5, 0.16), P(0.62, 0.18), P(0.68, 0.3), P(0.62, 0.38)], M.accent, 3);
      f.line(P(0.44, 0.26), P(0.56, 0.24), M.accent, 1, 4);
      f.line(P(0.17, 0.38), P(0.26, 0.36), M.accent, 1, 4);
      crystal(f, 0.62, 0.3, 0.12, 0.03, 0.05, 4);
      f.seamLine(P(0.2, 0.48), P(0.24, 0.66), [M.main]);
      f.seamLine(P(0.46, 0.4), P(0.42, 0.56), [M.main]);
      f.seamLine(P(0.42, 0.56), P(0.46, 0.68), [M.main]);
      // Near legs: huge stomping pillars with stone anklets
      for (const [x, w] of [[0.28, 0.08], [0.66, 0.09]] as const) {
        stump(f, x, 0.66, w, M.second, 3, 3);
        blob(f, [P(x - w - 0.02, 0.68), P(x, 0.62), P(x + w + 0.02, 0.66), P(x + w + 0.01, 0.76), P(x - w - 0.01, 0.78)], M.main, 4);
        f.poly([P(x - w * 1.25, 0.86), P(x + w * 1.3, 0.86), P(x + w * 1.35, 0.9), P(x - w * 1.3, 0.9)], M.accent, 4);
      }
      // Head with brow plate, horn and tusk
      blob(f, [P(0.66, 0.48), P(0.72, 0.32), P(0.86, 0.34), P(0.97, 0.52), P(0.95, 0.64), P(0.8, 0.68), P(0.66, 0.62)], M.second, 5);
      f.ellipse(0.94, 0.57, 0.02, 0.02, M.dark, 6);
      blob(f, [P(0.62, 0.42), P(0.7, 0.28), P(0.84, 0.26), P(0.9, 0.38), P(0.76, 0.44)], M.main, 6);
      f.seamLine(P(0.7, 0.36), P(0.78, 0.3), [M.main]);
      horn(f, P(0.86, 0.5), P(0.94, 0.52), P(0.97, 0.12), 0.04, M.accent, 6);
      horn(f, P(0.78, 0.34), P(0.84, 0.32), P(0.86, 0.18), 0.03, M.accent, 7);
      horn(f, P(0.82, 0.62), P(0.87, 0.63), P(0.94, 0.72), 0.02, M.accent, 7);
      return [{ x: 0.78, y: 0.46, r: 0.05, angry: true }];
    },
  },
  // Supremo: a walking mountain with magma rivers and crystal slopes.
  "coloso-telurico": { colours: earth, draw: (f) => coloso(f, false) },
  // Despertar: obsidian and magma, holding floating tectonic plates like shields.
  "coloso-telurico-placa-tectonica": { colours: tectonic, draw: (f) => coloso(f, true) },

  // ───────────────────────────── Engranaje ─────────────────────────────

  // Brote: a round drone with a rotor, a visor and a thruster.
  bip: {
    colours: metal,
    draw(f) {
      blob(f, [P(0.42, 0.8), P(0.58, 0.8), P(0.56, 0.9), P(0.5, 0.97), P(0.44, 0.9)], M.glow);
      f.poly([P(0.36, 0.72), P(0.64, 0.72), P(0.6, 0.85), P(0.4, 0.85)], M.dark, 1);
      f.line(P(0.5, 0.26), P(0.5, 0.14), M.dark, 2);
      f.ellipse(0.5, 0.13, 0.3, 0.035, M.accent, 1);
      f.ellipse(0.5, 0.12, 0.05, 0.03, M.second, 2);
      f.ellipse(0.5, 0.54, 0.36, 0.32, M.main);
      f.band(0.68, 0.72, M.main, M.second);
      blob(f, [P(0.2, 0.47), P(0.28, 0.36), P(0.72, 0.36), P(0.8, 0.47), P(0.72, 0.6), P(0.28, 0.6)], M.dark, 1);
      // Side gears as ears
      gear(f, 0.13, 0.56, 0.06, 6, M.second, 2, M.dark, 0.3);
      gear(f, 0.87, 0.56, 0.06, 6, M.second, 2, M.dark, 0);
      f.line(P(0.68, 0.28), P(0.78, 0.18), M.accent, 1, 2);
      f.ellipse(0.79, 0.17, 0.03, 0.03, M.glow, 3);
      for (const x of [0.3, 0.5, 0.7]) rivet(f, x, 0.66, 3);
      return [{ x: 0.61, y: 0.48, r: 0.08 }, { x: 0.39, y: 0.48, r: 0.07 }];
    },
  },
  // Novato: a little repair robot, a nut on its chest and a wrench in hand.
  tuerkin: {
    colours: metal,
    draw(f) {
      // Far arm
      f.line(P(0.3, 0.56), P(0.22, 0.7), M.main, 3);
      f.ellipse(0.22, 0.72, 0.04, 0.04, M.second);
      // Far leg
      blob(f, [P(0.32, 0.78), P(0.42, 0.78), P(0.42, 0.92), P(0.32, 0.92)], M.dark);
      f.ellipse(0.38, 0.94, 0.08, 0.035, M.second);
      // Body
      blob(f, [P(0.26, 0.62), P(0.34, 0.48), P(0.6, 0.48), P(0.68, 0.62), P(0.62, 0.82), P(0.32, 0.82)], M.main);
      f.band(0.76, 0.8, M.main, M.second);
      // The nut on its chest
      const hx = 0.5, hy = 0.63, hr = 0.075;
      f.poly([0, 1, 2, 3, 4, 5].map((i) => P(hx + Math.cos((i * Math.PI) / 3) * hr, hy + Math.sin((i * Math.PI) / 3) * hr)), M.second, 1);
      f.ellipse(hx, hy, 0.03, 0.03, M.dark, 2);
      // Near leg
      blob(f, [P(0.48, 0.8), P(0.58, 0.8), P(0.58, 0.92), P(0.46, 0.92)], M.dark, 1);
      f.ellipse(0.56, 0.94, 0.09, 0.035, M.second, 2);
      // Big head with visor, ear bolt and antenna
      blob(f, [P(0.2, 0.32), P(0.26, 0.12), P(0.6, 0.1), P(0.84, 0.18), P(0.86, 0.38), P(0.66, 0.48), P(0.3, 0.46)], M.main, 2);
      blob(f, [P(0.56, 0.22), P(0.86, 0.22), P(0.88, 0.36), P(0.58, 0.38)], M.dark, 3);
      gear(f, 0.3, 0.3, 0.06, 6, M.second, 3, M.dark);
      f.line(P(0.4, 0.12), P(0.36, 0.03), M.accent, 1, 3);
      f.ellipse(0.36, 0.04, 0.025, 0.025, M.glow, 4);
      rivet(f, 0.46, 0.16, 4);
      rivet(f, 0.46, 0.4, 4);
      // Near arm with the wrench
      f.line(P(0.56, 0.56), P(0.7, 0.66), M.main, 3, 3);
      f.line(P(0.72, 0.76), P(0.84, 0.54), M.accent, 2, 4);
      f.poly([P(0.79, 0.56), P(0.82, 0.48), P(0.86, 0.52), P(0.88, 0.47), P(0.92, 0.52), P(0.88, 0.6), P(0.83, 0.6)], M.accent, 4);
      f.ellipse(0.72, 0.67, 0.045, 0.045, M.second, 5);
      return [{ x: 0.74, y: 0.29, r: 0.07 }];
    },
  },
  // Avanzado: a stocky robot with a giant thinking gear on its back.
  engranajon: {
    colours: metal,
    draw(f) {
      gear(f, 0.3, 0.36, 0.25, 10, M.second, 0, M.dark, 0.2);
      f.ellipse(0.3, 0.36, 0.045, 0.045, M.glow, 2);
      // Far arm and leg
      f.line(P(0.32, 0.56), P(0.24, 0.72), M.main, 3);
      f.ellipse(0.23, 0.74, 0.05, 0.045, M.second);
      blob(f, [P(0.3, 0.76), P(0.42, 0.76), P(0.42, 0.92), P(0.3, 0.92)], M.dark);
      f.ellipse(0.37, 0.94, 0.09, 0.035, M.main);
      // Body with a data slot
      blob(f, [P(0.3, 0.56), P(0.36, 0.42), P(0.66, 0.42), P(0.74, 0.56), P(0.68, 0.8), P(0.34, 0.8)], M.main, 1);
      f.band(0.74, 0.79, M.main, M.second);
      f.rect(0.44, 0.58, 0.64, 0.66, M.dark, 2);
      f.seamLine(P(0.46, 0.61), P(0.62, 0.61), [M.dark]);
      f.seamLine(P(0.46, 0.63), P(0.56, 0.63), [M.dark]);
      blob(f, [P(0.52, 0.78), P(0.64, 0.78), P(0.64, 0.92), P(0.52, 0.92)], M.dark, 2);
      f.ellipse(0.6, 0.94, 0.1, 0.035, M.main, 3);
      // Head
      blob(f, [P(0.42, 0.24), P(0.5, 0.12), P(0.76, 0.12), P(0.88, 0.24), P(0.86, 0.4), P(0.5, 0.42)], M.main, 3);
      blob(f, [P(0.6, 0.2), P(0.88, 0.22), P(0.88, 0.34), P(0.6, 0.34)], M.dark, 4);
      f.line(P(0.54, 0.13), P(0.5, 0.04), M.accent, 1, 4);
      f.line(P(0.62, 0.13), P(0.66, 0.04), M.accent, 1, 4);
      f.ellipse(0.5, 0.04, 0.02, 0.02, M.glow, 5);
      f.ellipse(0.66, 0.04, 0.02, 0.02, M.glow, 5);
      rivet(f, 0.5, 0.3, 5);
      // Near arm with a three-finger claw
      f.ellipse(0.58, 0.5, 0.06, 0.06, M.second, 4);
      f.line(P(0.6, 0.52), P(0.76, 0.64), M.main, 3, 4);
      f.ellipse(0.78, 0.66, 0.05, 0.05, M.second, 5);
      horn(f, P(0.8, 0.63), P(0.82, 0.67), P(0.9, 0.62), -0.01, M.accent, 6);
      horn(f, P(0.8, 0.68), P(0.82, 0.7), P(0.88, 0.74), 0.01, M.accent, 6);
      return [{ x: 0.76, y: 0.27, r: 0.065 }];
    },
  },
  // Élite: an android of salvaged plates, with piston fists.
  androforja: {
    colours: metal,
    draw(f) {
      // Far arm hanging: piston forearm and fist
      f.line(P(0.36, 0.3), P(0.3, 0.46), M.dark, 4);
      f.rect(0.24, 0.46, 0.35, 0.62, M.main, 0);
      f.rect(0.22, 0.62, 0.36, 0.73, M.second, 0);
      // Far leg
      blob(f, [P(0.36, 0.62), P(0.47, 0.62), P(0.46, 0.92), P(0.34, 0.92)], M.dark);
      f.ellipse(0.42, 0.95, 0.09, 0.03, M.main);
      // Abdomen and torso
      f.rect(0.42, 0.52, 0.6, 0.64, M.dark, 1);
      f.seamLine(P(0.44, 0.58), P(0.58, 0.58), [M.dark]);
      blob(f, [P(0.28, 0.32), P(0.38, 0.22), P(0.64, 0.2), P(0.76, 0.28), P(0.72, 0.44), P(0.6, 0.55), P(0.42, 0.55), P(0.3, 0.44)], M.main, 1);
      // Salvaged brass chest plate
      f.poly([P(0.6, 0.26), P(0.74, 0.3), P(0.7, 0.44), P(0.58, 0.42)], M.second, 2);
      rivet(f, 0.62, 0.29, 3);
      rivet(f, 0.68, 0.4, 3);
      f.seamLine(P(0.4, 0.28), P(0.36, 0.48), [M.main]);
      // Near leg with a knee piston
      blob(f, [P(0.5, 0.6), P(0.63, 0.6), P(0.63, 0.76), P(0.5, 0.76)], M.main, 2);
      blob(f, [P(0.52, 0.76), P(0.65, 0.76), P(0.67, 0.92), P(0.52, 0.92)], M.dark, 2);
      f.line(P(0.64, 0.72), P(0.66, 0.88), M.accent, 1, 3);
      f.ellipse(0.58, 0.76, 0.045, 0.04, M.second, 3);
      f.ellipse(0.62, 0.95, 0.11, 0.03, M.main, 3);
      // Head: helmet with a crest, visor, jaw grill
      blob(f, [P(0.54, 0.16), P(0.58, 0.05), P(0.74, 0.02), P(0.88, 0.08), P(0.9, 0.2), P(0.78, 0.27), P(0.6, 0.26)], M.main, 3);
      horn(f, P(0.56, 0.1), P(0.62, 0.05), P(0.42, 0.04), -0.02, M.accent, 4);
      f.rect(0.7, 0.1, 0.9, 0.16, M.dark, 4);
      f.seamLine(P(0.72, 0.13), P(0.89, 0.13), [M.dark]);
      f.rect(0.74, 0.19, 0.86, 0.25, M.second, 4);
      f.line(P(0.78, 0.2), P(0.78, 0.24), M.dark, 1, 5);
      f.line(P(0.82, 0.2), P(0.82, 0.24), M.dark, 1, 5);
      rivet(f, 0.62, 0.18, 5);
      // Near arm: shoulder joint, piston forearm and a heavy fist
      f.ellipse(0.45, 0.34, 0.08, 0.075, M.second, 4);
      rivet(f, 0.43, 0.31, 5);
      f.line(P(0.48, 0.38), P(0.58, 0.48), M.dark, 4, 5);
      f.ellipse(0.6, 0.5, 0.045, 0.045, M.dark, 6);
      f.rect(0.62, 0.44, 0.76, 0.57, M.main, 6);
      f.band(0.44, 0.47, M.main, M.second, 0.62, 0.76);
      f.line(P(0.76, 0.5), P(0.82, 0.5), M.accent, 3, 6);
      blob(f, [P(0.81, 0.42), P(0.93, 0.41), P(0.97, 0.5), P(0.95, 0.6), P(0.81, 0.6)], M.second, 7);
      f.line(P(0.87, 0.44), P(0.87, 0.58), M.dark, 1, 8);
      f.line(P(0.92, 0.45), P(0.92, 0.57), M.dark, 1, 8);
      return [{ x: 0.78, y: 0.13, r: 0.05, angry: true }];
    },
  },
  // Supremo: a perfect machine with a gear halo and a calculating core.
  "deus-maquina": { colours: metal, draw: (f) => deus(f, false) },
  // Despertar: overheated, venting steam, running past its limits.
  "deus-maquina-overclock": { colours: overclock, draw: (f) => deus(f, true) },
};

/** The perfect machine (shared by Supremo and Despertar). */
function deus(f: F, hot: boolean) {
  // Gear halo
  gear(f, 0.42, 0.28, 0.25, 14, M.second, 0, M.dark, hot ? 0.3 : 0.1);
  f.ring(0.42, 0.28, 0.13, M.glow, 1, 2);
  if (hot) {
    // Exhaust stacks
    f.line(P(0.34, 0.34), P(0.12, 0.12), M.dark, 4, 3);
    f.line(P(0.4, 0.3), P(0.3, 0.06), M.dark, 3, 3);
  }
  // Two plate wings folded behind, glowing along their edges
  for (const [tx, ty] of [[0.03, 0.36], [0.05, 0.52], [0.12, 0.66]] as const) {
    f.poly([P(0.38, 0.3), P(tx + 0.02, ty - 0.05), P(tx, ty), P(tx + 0.03, ty + 0.03), P(0.42, 0.46)], M.accent, 3);
    f.line(P(0.36, 0.4), P(tx + 0.04, ty + 0.01), M.glow, 1, 4);
  }
  // Far arm
  f.line(P(0.42, 0.36), P(0.36, 0.56), M.dark, 4, 4);
  f.ellipse(0.36, 0.59, 0.04, 0.04, M.accent, 4);
  // Legs: far, then near with a brass knee
  blob(f, [P(0.4, 0.6), P(0.5, 0.6), P(0.5, 0.92), P(0.4, 0.92)], M.dark, 4);
  f.poly([P(0.38, 0.91), P(0.52, 0.91), P(0.58, 0.97), P(0.38, 0.97)], M.accent, 5);
  blob(f, [P(0.54, 0.58), P(0.68, 0.58), P(0.67, 0.92), P(0.56, 0.92)], M.main, 5);
  f.ellipse(0.62, 0.72, 0.05, 0.05, M.second, 6);
  f.poly([P(0.54, 0.91), P(0.68, 0.91), P(0.8, 0.97), P(0.54, 0.97)], M.accent, 6);
  // Torso: V-shaped, brass collar and a calculating core
  f.rect(0.44, 0.52, 0.66, 0.62, M.dark, 5);
  f.band(0.56, 0.58, M.dark, M.second);
  blob(f, [P(0.36, 0.34), P(0.44, 0.24), P(0.72, 0.24), P(0.8, 0.34), P(0.72, 0.56), P(0.48, 0.58)], M.main, 5);
  f.band(0.24, 0.29, M.main, M.second);
  f.ring(0.63, 0.4, 0.07, M.second, 1, 6);
  f.ellipse(0.63, 0.4, 0.045, 0.045, M.glow, 7);
  f.line(P(0.46, 0.34), P(0.5, 0.52), M.dark, 1, 6);
  if (hot) {
    f.seamLine(P(0.72, 0.32), P(0.66, 0.54), [M.main]);
    f.seamLine(P(0.58, 0.6), P(0.62, 0.9), [M.main]);
    f.seamLine(P(0.4, 0.3), P(0.48, 0.5), [M.main]);
  }
  // Head: sleek helmet, swept crest, visor
  blob(f, [P(0.58, 0.16), P(0.62, 0.06), P(0.78, 0.03), P(0.9, 0.1), P(0.9, 0.2), P(0.78, 0.25), P(0.62, 0.24)], M.main, 6);
  horn(f, P(0.6, 0.1), P(0.66, 0.05), P(0.4, 0.02), -0.02, M.accent, 7);
  horn(f, P(0.6, 0.16), P(0.63, 0.12), P(0.44, 0.14), -0.01, M.accent, 7);
  f.rect(0.7, 0.1, 0.91, 0.16, M.dark, 7);
  f.seamLine(P(0.72, 0.13), P(0.9, 0.13), [M.dark]);
  f.poly([P(0.76, 0.19), P(0.88, 0.19), P(0.84, 0.24), P(0.78, 0.24)], M.second, 7);
  // Near arm: shoulder joint, bracer, hand open under a floating data cube
  f.line(P(0.52, 0.36), P(0.63, 0.52), M.main, 4, 7);
  blob(f, [P(0.4, 0.31), P(0.47, 0.24), P(0.58, 0.25), P(0.62, 0.33), P(0.54, 0.38), P(0.43, 0.37)], M.second, 8);
  rivet(f, 0.48, 0.28, 9);
  f.ellipse(0.64, 0.53, 0.035, 0.035, M.dark, 8);
  f.line(P(0.66, 0.54), P(0.82, 0.48), M.main, 4, 8);
  f.band(0.47, 0.57, M.main, M.second, 0.7, 0.74);
  horn(f, P(0.82, 0.45), P(0.83, 0.52), P(0.92, 0.46), -0.01, M.accent, 9);
  f.rect(0.82, 0.32, 0.9, 0.39, M.glow, 9);
  f.rect(0.94, 0.38, 0.96, 0.4, M.glow, 9);
  f.rect(0.76, 0.3, 0.78, 0.32, M.glow, 9);
  if (hot) {
    steam(f, 0.13, 0.1, 1.3);
    steam(f, 0.32, 0.07, 0.9);
    // Overdriven sparks
    for (const [x, y] of [[0.93, 0.26], [0.06, 0.8]] as const) f.rect(x, y, x + 2 / 64, y + 2 / 64, M.glow, 9);
  }
  return [{ x: 0.8, y: 0.13, r: 0.05, angry: hot }];
}

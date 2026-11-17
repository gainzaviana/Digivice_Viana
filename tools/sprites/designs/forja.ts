import { Material as M, type Point, type SpriteForge } from "../../../src/art/forge";
import { blob, horn, P, type Colours, type Design, type Eye } from "../style";

// Forja: an ember that grows into a sun-forge dragon (affinity Pulso, warm amber glow).
const fire: Colours = {
  main: ["#741c3a", "#c4342e", "#ee6438", "#ffa466"],
  second: ["#b4542a", "#f29a36", "#ffd25e", "#fff4b6"],
  accent: ["#36324e", "#5e5a7c", "#9894b4", "#dcd8ec"],
  dark: ["#241c34", "#3e3250", "#5e4a6c", "#86688a"],
  glow: "#ffd23a",
  iris: "#ff8a1a",
};
// Despertar: white-hot scales, platinum plates, wings of living flame.
const whiteCore: Colours = {
  main: ["#a63e3e", "#ec9462", "#ffd2a4", "#fff6e8"],
  second: ["#dc9a3e", "#ffe48a", "#fffbe0", "#ffffff"],
  accent: ["#564674", "#9a8cbc", "#d8d0ee", "#ffffff"],
  dark: ["#8a1e34", "#d23c34", "#ff7a34", "#ffc05a"],
  glow: "#ffffff",
  iris: "#ff5a00",
};

type F = SpriteForge;

/** Offset (dx, dy) rotated by `a` (radians, clockwise on screen) from (x, y). */
const rot = (x: number, y: number, dx: number, dy: number, a: number): Point => [x + dx * Math.cos(a) - dy * Math.sin(a), y + dx * Math.sin(a) + dy * Math.cos(a)];

/** A tapered stroke along a polyline (tails, limbs, necks), widths in canvas units. */
function stroke(f: F, pts: Point[], w0: number, w1: number, m: M, lift = 0) {
  const l: Point[] = [], r: Point[] = [];
  const n = pts.length;
  pts.forEach((p, i) => {
    const a = pts[Math.max(0, i - 1)], b = pts[Math.min(n - 1, i + 1)];
    let dx = b[0] - a[0], dy = b[1] - a[1];
    const len = Math.hypot(dx, dy) || 1;
    dx /= len; dy /= len;
    const w = (w0 + ((w1 - w0) * i) / (n - 1)) / 2;
    l.push([p[0] - dy * w, p[1] + dx * w]);
    r.push([p[0] + dy * w, p[1] - dx * w]);
  });
  f.poly([...l, ...r.reverse()], m, lift);
}

const FLAME: [number, number][] = [[-1, 0], [-0.92, -0.25], [-0.62, -0.4], [-0.84, -0.64], [-0.34, -0.52], [-0.14, -0.7], [0.04, -1], [0.22, -0.62], [0.52, -0.72], [0.58, -0.38], [0.94, -0.22], [1, 0], [0.74, 0.3], [0.3, 0.42], [-0.3, 0.42], [-0.74, 0.3]];
const DROP: [number, number][] = [[-1, 0], [-0.86, -0.38], [-0.42, -0.7], [0.02, -1], [0.36, -0.62], [0.84, -0.34], [1, 0], [0.7, 0.3], [0, 0.42], [-0.7, 0.3]];
/** A three-layer flame (red, amber, glowing core) rising from (x, y), tilted by `a`. */
function flame(f: F, x: number, y: number, h: number, w: number, a = 0, lift = 0, layers = 3) {
  const layer = (shape: [number, number][], sw: number, sh: number, m: M, l: number) => {
    const oy = 0.36 * h * (1 - sh);
    f.poly(shape.map(([px, py]) => rot(x, y, px * w * sw, py * h * sh + oy, a)), m, l);
  };
  layer(FLAME, 1, 1, M.main, lift);
  if (layers > 1) layer(FLAME, 0.66, 0.68, M.second, lift + 1);
  if (layers > 2) layer(DROP, 0.34, 0.4, M.glow, lift + 2);
}

const ANVIL: [number, number][] = [[-0.36, 0.25], [0.36, 0.25], [0.18, -0.24], [0.32, -0.5], [0.85, -0.56], [0.32, -0.78], [-0.52, -0.78], [-0.52, -0.52], [-0.22, -0.24]];
/** An anvil-shaped scale plate (flat face, horn forward) standing on (x, y), tilted by `a`. */
function anvil(f: F, x: number, y: number, s: number, a: number, lift: number, hot = true) {
  f.poly(ANVIL.map(([px, py]) => rot(x, y, px * s, py * s, a)), M.accent, lift);
  if (hot) f.seamLine(rot(x, y, -0.4 * s, -0.62 * s, a), rot(x, y, 0.3 * s, -0.62 * s, a), [M.accent]);
}

/** A membrane wing: arm from shoulder S to wrist E, fingers to `tips`, scalloped membrane down to the root R. */
function wing(f: F, S: Point, E: Point, tips: Point[], R: Point, depth: number, lift: number, veins = true, strut: M = M.main, mem: M = M.dark) {
  const sc = (a: Point, b: Point): Point => {
    const mx = (a[0] + b[0]) / 2, my = (a[1] + b[1]) / 2;
    return [mx + (E[0] - mx) * depth, my + (E[1] - my) * depth];
  };
  const all = [...tips, R];
  const pts: Point[] = [S, E, tips[0]];
  for (let i = 1; i < all.length; i++) pts.push(sc(all[i - 1], all[i]), all[i]);
  f.poly(pts, mem, lift);
  if (veins) for (let i = 0; i < all.length - 1; i += 2) {
    const s = sc(all[i], all[i + 1]);
    f.seamLine([E[0] + (s[0] - E[0]) * 0.25, E[1] + (s[1] - E[1]) * 0.25], [E[0] + (s[0] - E[0]) * 0.9, E[1] + (s[1] - E[1]) * 0.9], [mem]);
  }
  for (const t of tips) stroke(f, [E, t], 0.026, 0.012, strut, lift + 1);
  stroke(f, [S, E], 0.05, 0.034, strut, lift + 2);
  horn(f, [E[0] - 0.02, E[1] + 0.01], [E[0] + 0.02, E[1] + 0.005], [E[0] + 0.01, E[1] - 0.06], 0.01, M.accent, lift + 3);
}

/** An elliptical band (part of a tilted ring) between angles a0…a1. */
function orbit(f: F, cx: number, cy: number, rx: number, ry: number, tilt: number, w: number, a0: number, a1: number, m: M, lift: number) {
  const o: Point[] = [], i: Point[] = [];
  for (let k = 0; k <= 28; k++) {
    const a = a0 + ((a1 - a0) * k) / 28, c = Math.cos(a), s = Math.sin(a);
    o.push(rot(cx, cy, c * rx, s * ry, tilt));
    i.push(rot(cx, cy, c * (rx - w), s * (ry - w * 0.7), tilt));
  }
  f.poly([...o, ...i.reverse()], m, lift);
}

/** A four-point ember spark. */
function spark(f: F, x: number, y: number, s: number, lift = 9, m: M = M.glow) {
  const t = s * 0.28;
  f.poly([P(x, y - s), P(x + t, y - t), P(x + s, y), P(x + t, y + t), P(x, y + s), P(x - t, y + t), P(x - s, y), P(x - t, y - t)], m, lift);
}

/** A row of claws along a foot or hand, pointing forward/down. */
function claws(f: F, pts: Point[], len: number, lift: number, dy = 0.4) {
  for (const [x, y] of pts) horn(f, P(x - 0.014, y - 0.012), P(x + 0.012, y - 0.016), P(x + len, y + len * dy), 0.004, M.accent, lift);
}

/** A circuit vein: glowing polyline with a node at each joint. */
function vein(f: F, pts: Point[], on: M[] = [M.main], nodes = true, lift = 8) {
  for (let i = 0; i < pts.length - 1; i++) f.seamLine(pts[i], pts[i + 1], on);
  if (nodes) for (const [x, y] of pts.slice(1, -1)) f.rect(x - 0.008, y - 0.008, x + 0.008, y + 0.008, M.glow, lift);
}

const rivet = (f: F, x: number, y: number, lift: number) => f.rect(x, y, x + 1 / 64, y + 1 / 64, M.accent, lift);

// ───────────────────────────── the dragons ─────────────────────────────

/** Heavy forge dragon body plan shared by Calderón (furnace) and Solforja (sun core). */
function greatDragon(f: F, kind: "caldera" | "sol" | "blanco"): Eye[] {
  const sun = kind !== "caldera", white = kind === "blanco";
  const ring = { cx: 0.5, cy: 0.74, rx: 0.48, ry: 0.1, tilt: -0.1 };
  if (sun) {
    // Sun halo of molten metal behind the head, with rays.
    const hx = 0.74, hy = 0.24, n = white ? 12 : 8;
    for (let k = 0; k < n; k++) {
      const a = (k * Math.PI * 2) / n + 0.15, long = k % 2 === 0;
      const r1 = white ? (long ? 0.34 : 0.28) : long ? 0.3 : 0.26;
      f.poly([rot(hx, hy, 0.2, -0.045, a), rot(hx, hy, r1, 0, a), rot(hx, hy, 0.2, 0.045, a)], M.second, 0);
    }
    orbit(f, hx, hy, 0.22, 0.22, 0, 0.04, 0, Math.PI * 2, M.second, 1);
    orbit(f, hx, hy, 0.205, 0.205, 0, 0.012, 0, Math.PI * 2, M.glow, 2);
    if (white) {
      // A second, inner corona ring and orbiting molten droplets
      orbit(f, hx, hy, 0.27, 0.27, 0, 0.02, Math.PI * 1.05, Math.PI * 1.95, M.glow, 3);
      for (const [x, y] of [[0.42, 0.1], [0.98, 0.42]] as const) f.ellipse(x, y, 0.022, 0.022, M.second, 3);
    }
    // Back half of the molten ring around the body
    orbit(f, ring.cx, ring.cy, ring.rx, ring.ry, ring.tilt, 0.04, Math.PI, Math.PI * 2, M.second, 0);
  }
  // Tail, thick at the root, anvil spikes, flame at the tip
  stroke(f, [P(0.34, 0.82), P(0.2, 0.9), P(0.09, 0.87), P(0.05, 0.78)], 0.17, 0.08, M.main, 0);
  for (const [x, y, a] of [[0.25, 0.84, -0.5], [0.15, 0.84, -1.1]] as const) anvil(f, x, y, 0.075, a, 0, false);
  vein(f, [P(0.32, 0.86), P(0.2, 0.9), P(0.1, 0.88)], [M.main], false);
  flame(f, 0.06, 0.79, sun ? 0.32 : 0.28, 0.075, -0.12, 2);
  // Far leg
  blob(f, [P(0.26, 0.76), P(0.42, 0.74), P(0.44, 0.9), P(0.42, 0.97), P(0.24, 0.97), P(0.26, 0.86)], M.main, 0);
  claws(f, [P(0.38, 0.97), P(0.42, 0.965)], 0.04, 1);
  // Body
  blob(f, [P(0.22, 0.76), P(0.24, 0.5), P(0.4, 0.36), P(0.62, 0.38), P(0.76, 0.54), P(0.76, 0.74), P(0.6, 0.88), P(0.34, 0.88)], M.main, 1);
  vein(f, [P(0.24, 0.56), P(0.3, 0.62), P(0.38, 0.62), P(0.42, 0.68)]);
  vein(f, [P(0.3, 0.62), P(0.3, 0.74)], [M.main], false);
  // Chest plate
  blob(f, [P(0.46, 0.8), P(0.46, 0.52), P(0.56, 0.42), P(0.7, 0.45), P(0.77, 0.58), P(0.73, 0.74), P(0.6, 0.82)], M.second, 2);
  const cx = 0.605, cy = 0.6;
  if (!sun) {
    // The furnace: riveted iron door, glowing mouth behind a grate, flames licking out.
    for (const y of [0.76, 0.8]) f.line(P(0.5, y), P(0.7, y - 0.02), M.second, 1, 3);
    flame(f, cx - 0.04, cy - 0.07, 0.11, 0.035, -0.35, 3);
    flame(f, cx + 0.03, cy - 0.08, 0.13, 0.04, 0.2, 3);
    f.ellipse(cx, cy, 0.105, 0.115, M.accent, 6);
    f.ellipse(cx, cy + 0.008, 0.074, 0.084, M.glow, 7);
    for (const x of [cx - 0.04, cx - 0.008, cx + 0.024]) f.rect(x, cy - 0.06, x + 1 / 64, cy + 0.08, M.dark, 8);
    for (let k = 0; k < 8; k++) rivet(f, cx - 0.006 + Math.cos((k * Math.PI) / 4) * 0.092, cy - 0.006 + Math.sin((k * Math.PI) / 4) * 0.1, 8);
  } else {
    // The chest ember: a little sun with rays, set in a platinum bezel.
    for (const y of [0.5, 0.76]) f.line(P(0.5, y), P(0.72, y - 0.02), M.second, 1, 3);
    const n = white ? 12 : 8;
    for (let k = 0; k < n; k++) {
      const a = (k * Math.PI * 2) / n, long = k % 2 === 0;
      const r1 = white ? (long ? 0.2 : 0.15) : long ? 0.15 : 0.12;
      f.poly([rot(cx, cy, 0.06, -0.028, a), rot(cx, cy, r1, 0, a), rot(cx, cy, 0.06, 0.028, a)], white ? M.glow : M.main, 4);
    }
    f.ellipse(cx, cy, 0.085, 0.085, M.accent, 5);
    f.ellipse(cx, cy, 0.066, 0.066, white ? M.second : M.main, 6);
    f.ellipse(cx, cy, 0.05, 0.05, M.glow, 7);
  }
  // Near wing: wrist high, fingers fanning back and down
  const E = P(0.3, 0.07), tips = [P(0.1, 0.04), P(0.02, 0.18), P(0.03, 0.34), P(0.14, 0.46)];
  wing(f, P(0.4, 0.46), E, tips, P(0.3, 0.54), 0.22, 3, true, M.main, kind === "sol" ? M.second : M.dark);
  if (sun) for (const t of tips.slice(0, white ? 4 : 3)) flame(f, t[0], t[1], white ? 0.14 : 0.1, 0.035, Math.atan2(t[0] - E[0], -(t[1] - E[1])), 7, 2);
  // Near leg
  blob(f, [P(0.4, 0.74), P(0.56, 0.72), P(0.62, 0.84), P(0.6, 0.92), P(0.44, 0.92), P(0.38, 0.84)], M.main, 4);
  blob(f, [P(0.42, 0.97), P(0.46, 0.9), P(0.62, 0.89), P(0.7, 0.97)], M.main, 5);
  anvil(f, 0.47, 0.78, 0.1, 0.25, 6);
  claws(f, [P(0.59, 0.965), P(0.64, 0.965), P(0.69, 0.97)], 0.05, 6);
  vein(f, [P(0.42, 0.86), P(0.48, 0.86), P(0.54, 0.9)]);
  // Arm: muscled shoulder, iron bracer, claws
  stroke(f, [P(0.68, 0.48), P(0.78, 0.58), P(0.86, 0.6)], 0.1, 0.07, M.main, 7);
  stroke(f, [P(0.79, 0.585), P(0.87, 0.6)], 0.08, 0.075, M.accent, 8);
  f.seamLine(P(0.8, 0.6), P(0.86, 0.6), [M.accent]);
  f.ellipse(0.9, 0.61, 0.04, 0.035, M.main, 8);
  claws(f, [P(0.92, 0.62), P(0.9, 0.64), P(0.88, 0.645)], 0.045, 9, 1.1);
  anvil(f, 0.7, 0.47, 0.13, -0.25, 9);
  // Neck and head
  stroke(f, [P(0.56, 0.48), P(0.62, 0.34), P(0.7, 0.26)], 0.16, 0.13, M.main, 6);
  if (white) for (const [x, y, a] of [[0.56, 0.4, -1.0], [0.6, 0.32, -0.8], [0.64, 0.25, -0.6]] as const) flame(f, x, y, 0.13, 0.045, a, 6, 2);
  blob(f, [P(0.6, 0.3), P(0.64, 0.17), P(0.76, 0.12), P(0.88, 0.15), P(0.97, 0.24), P(0.97, 0.32), P(0.84, 0.36), P(0.68, 0.38)], M.main, 8);
  blob(f, [P(0.74, 0.35), P(0.86, 0.31), P(0.97, 0.31), P(0.94, 0.38), P(0.8, 0.41)], M.second, 9);
  f.line(P(0.8, 0.335), P(0.96, 0.32), M.glow, 1, 10);
  f.triangle(P(0.86, 0.33), P(0.885, 0.33), P(0.872, 0.36), M.accent, 11);
  f.rect(0.94, 0.2, 0.955, 0.215, M.dark, 10);
  vein(f, [P(0.64, 0.22), P(0.68, 0.28), P(0.72, 0.28)]);
  // Horns: two great swept-back horns and a cheek spike
  horn(f, P(0.66, 0.18), P(0.72, 0.14), P(0.5, 0.02), -0.05, M.accent, 9);
  horn(f, P(0.74, 0.135), P(0.79, 0.13), P(0.7, 0.0), -0.02, M.accent, 9);
  horn(f, P(0.68, 0.32), P(0.7, 0.36), P(0.58, 0.4), 0.0, M.accent, 9);
  if (sun) {
    // Front half of the molten ring, over the body, dripping
    orbit(f, ring.cx, ring.cy, ring.rx, ring.ry, ring.tilt, 0.045, 0, Math.PI, M.second, 12);
    orbit(f, ring.cx, ring.cy, ring.rx - 0.012, ring.ry - 0.008, ring.tilt, 0.012, 0.15, Math.PI - 0.15, M.glow, 13);
    for (const [x, y] of [[0.8, 0.84], [0.3, 0.88]] as const) f.ellipse(x, y, 0.012, 0.02, M.second, 12);
    if (white) {
      for (const [x, y, s] of [[0.96, 0.52, 0.035], [0.2, 0.56, 0.03], [0.96, 0.8, 0.03], [0.5, 0.02, 0.025]] as const) spark(f, x, y, s, 14);
    } else {
      for (const [x, y, s] of [[0.96, 0.8, 0.025]] as const) spark(f, x, y, s, 14);
    }
  }
  return [{ x: 0.8, y: 0.23, r: 0.055, angry: true }];
}


export const forja: Record<string, Design> = {
  // Brote: a round ember baby with a three-tongue flame crown, horn nubs and a flame-tipped tail.
  chispin: {
    colours: fire,
    draw(f) {
      // Little tail curling out to the side
      stroke(f, [P(0.68, 0.84), P(0.82, 0.84), P(0.9, 0.74)], 0.09, 0.05, M.main, 0);
      flame(f, 0.9, 0.72, 0.2, 0.06, 0.2, 1);
      // Flame crown behind the head
      flame(f, 0.5, 0.4, 0.38, 0.2, 0, 0);
      // Feet
      f.ellipse(0.36, 0.92, 0.1, 0.055, M.main, 0);
      f.ellipse(0.64, 0.92, 0.1, 0.055, M.main, 0);
      // Round ember body
      blob(f, [P(0.18, 0.66), P(0.24, 0.46), P(0.38, 0.35), P(0.5, 0.33), P(0.62, 0.35), P(0.76, 0.46), P(0.82, 0.66), P(0.74, 0.84), P(0.5, 0.9), P(0.26, 0.84)], M.main, 1);
      // Horn nubs
      horn(f, P(0.24, 0.46), P(0.32, 0.4), P(0.16, 0.3), -0.02, M.accent, 2);
      horn(f, P(0.68, 0.4), P(0.76, 0.46), P(0.84, 0.3), 0.02, M.accent, 2);
      // Belly with a glowing circuit heart
      blob(f, [P(0.32, 0.8), P(0.38, 0.7), P(0.5, 0.68), P(0.62, 0.7), P(0.68, 0.8), P(0.6, 0.88), P(0.4, 0.88)], M.second, 2);
      f.rect(0.48, 0.76, 0.52, 0.8, M.glow, 3);
      vein(f, [P(0.38, 0.78), P(0.44, 0.78)], [M.second], false);
      vein(f, [P(0.56, 0.78), P(0.62, 0.78)], [M.second], false);
      // Circuit veins on the cheeks and sides
      vein(f, [P(0.22, 0.62), P(0.26, 0.7), P(0.32, 0.72)]);
      vein(f, [P(0.78, 0.62), P(0.74, 0.7), P(0.68, 0.72)]);
      // Stubby arms
      f.ellipse(0.17, 0.7, 0.06, 0.07, M.main, 3);
      f.ellipse(0.83, 0.7, 0.06, 0.07, M.main, 3);
      // Toes
      for (const x of [0.3, 0.36, 0.42, 0.58, 0.64, 0.7]) f.rect(x - 0.008, 0.94, x + 0.008, 0.96, M.second, 2);
      // Little open mouth and blush
      f.ellipse(0.5, 0.635, 0.04, 0.025, M.dark, 3);
      f.ellipse(0.5, 0.645, 0.02, 0.012, M.main, 4);
      f.ellipse(0.29, 0.62, 0.035, 0.02, M.second, 3);
      f.ellipse(0.71, 0.62, 0.035, 0.02, M.second, 3);
      // Floating sparks
      spark(f, 0.12, 0.24, 0.03);
      spark(f, 0.86, 0.14, 0.025);
      spark(f, 0.94, 0.46, 0.02);
      return [{ x: 0.385, y: 0.52, r: 0.085 }, { x: 0.615, y: 0.52, r: 0.085 }];
    },
  },
  // Novato: an amber salamander on all fours, flame gills, circuit veins down its back.
  brasko: {
    colours: fire,
    draw(f) {
      // Tail curling up, flame on the tip
      stroke(f, [P(0.34, 0.72), P(0.18, 0.78), P(0.07, 0.7), P(0.06, 0.55), P(0.12, 0.45)], 0.15, 0.05, M.main, 0);
      vein(f, [P(0.28, 0.76), P(0.16, 0.76), P(0.09, 0.68), P(0.09, 0.56)], [M.main], false);
      flame(f, 0.12, 0.46, 0.3, 0.09, 0.15, 1);
      // Far legs
      stroke(f, [P(0.36, 0.74), P(0.31, 0.86), P(0.3, 0.95)], 0.09, 0.07, M.main, 0);
      stroke(f, [P(0.62, 0.74), P(0.66, 0.86), P(0.68, 0.95)], 0.09, 0.07, M.main, 0);
      // Dorsal flame fins
      for (const [x, y] of [[0.34, 0.6], [0.44, 0.56], [0.54, 0.56]] as const) flame(f, x, y, 0.12, 0.04, -0.3, 0, 2);
      // Body
      blob(f, [P(0.22, 0.72), P(0.28, 0.6), P(0.44, 0.55), P(0.62, 0.55), P(0.72, 0.62), P(0.72, 0.78), P(0.52, 0.85), P(0.3, 0.84)], M.main, 1);
      blob(f, [P(0.32, 0.81), P(0.42, 0.76), P(0.6, 0.74), P(0.71, 0.76), P(0.64, 0.84), P(0.44, 0.86)], M.second, 2);
      // Circuit veins along the back
      vein(f, [P(0.26, 0.68), P(0.36, 0.63), P(0.48, 0.65), P(0.6, 0.6), P(0.68, 0.64)]);
      vein(f, [P(0.36, 0.63), P(0.38, 0.72)], [M.main], false);
      vein(f, [P(0.6, 0.6), P(0.6, 0.7)], [M.main], false);
      // Near legs
      stroke(f, [P(0.36, 0.72), P(0.34, 0.84), P(0.38, 0.93)], 0.11, 0.08, M.main, 3);
      f.ellipse(0.41, 0.94, 0.06, 0.03, M.main, 4);
      claws(f, [P(0.43, 0.955), P(0.46, 0.955)], 0.03, 5);
      stroke(f, [P(0.64, 0.72), P(0.68, 0.84), P(0.66, 0.93)], 0.1, 0.08, M.main, 3);
      f.ellipse(0.7, 0.94, 0.06, 0.03, M.main, 4);
      claws(f, [P(0.72, 0.955), P(0.75, 0.955)], 0.03, 5);
      // Flame gills behind the head
      flame(f, 0.64, 0.38, 0.2, 0.055, -0.85, 3);
      flame(f, 0.6, 0.47, 0.18, 0.05, -1.3, 3);
      // Big head
      blob(f, [P(0.56, 0.6), P(0.57, 0.44), P(0.66, 0.33), P(0.82, 0.3), P(0.94, 0.38), P(0.97, 0.5), P(0.92, 0.62), P(0.74, 0.68)], M.main, 5);
      blob(f, [P(0.64, 0.64), P(0.78, 0.58), P(0.96, 0.53), P(0.92, 0.63), P(0.76, 0.69)], M.second, 6);
      f.line(P(0.8, 0.58), P(0.95, 0.535), M.dark, 1, 7);
      f.rect(0.93, 0.42, 0.945, 0.435, M.dark, 7);
      horn(f, P(0.7, 0.33), P(0.75, 0.31), P(0.66, 0.2), -0.02, M.accent, 6);
      horn(f, P(0.77, 0.305), P(0.81, 0.3), P(0.78, 0.2), 0.0, M.accent, 6);
      vein(f, [P(0.6, 0.5), P(0.66, 0.56), P(0.72, 0.56)]);
      spark(f, 0.3, 0.3, 0.025);
      spark(f, 0.94, 0.18, 0.02);
      return [{ x: 0.79, y: 0.45, r: 0.075 }];
    },
  },
  // Avanzado: an upright forge dragon with anvil scale plates and a red-hot tempered tail.
  fraguadrako: {
    colours: fire,
    draw(f) {
      // Tail: iron-tipped, glowing where it is being tempered
      stroke(f, [P(0.36, 0.74), P(0.22, 0.84), P(0.1, 0.8), P(0.05, 0.66), P(0.07, 0.52)], 0.16, 0.06, M.main, 0);
      stroke(f, [P(0.065, 0.74), P(0.045, 0.64), P(0.065, 0.54)], 0.085, 0.06, M.accent, 1);
      f.band(0.52, 0.62, M.accent, M.second, 0, 0.2);
      for (const y of [0.6, 0.66, 0.71]) f.seamLine(P(0.02, y), P(0.1, y + 0.01), [M.accent, M.second]);
      flame(f, 0.07, 0.53, 0.3, 0.085, 0.12, 2);
      // Far limbs
      stroke(f, [P(0.42, 0.74), P(0.36, 0.86), P(0.38, 0.95)], 0.1, 0.08, M.main, 0);
      stroke(f, [P(0.6, 0.48), P(0.7, 0.56), P(0.76, 0.5)], 0.07, 0.05, M.main, 0);
      // Anvil plates down the spine
      for (const [x, y, a] of [[0.3, 0.62, -1.1], [0.34, 0.5, -0.9], [0.42, 0.41, -0.7], [0.2, 0.8, -1.5]] as const) anvil(f, x, y, 0.11, a, 0);
      // Body
      blob(f, [P(0.3, 0.74), P(0.32, 0.54), P(0.44, 0.4), P(0.56, 0.36), P(0.66, 0.44), P(0.68, 0.62), P(0.62, 0.8), P(0.44, 0.84)], M.main, 1);
      blob(f, [P(0.5, 0.8), P(0.52, 0.58), P(0.6, 0.46), P(0.67, 0.52), P(0.66, 0.7), P(0.6, 0.8)], M.second, 2);
      for (const y of [0.56, 0.63, 0.7, 0.76]) f.line(P(0.52, y), P(0.66, y - 0.01), M.second, 1, 3);
      vein(f, [P(0.36, 0.56), P(0.44, 0.62), P(0.42, 0.72)]);
      vein(f, [P(0.44, 0.62), P(0.5, 0.56)], [M.main], false);
      // Near leg
      blob(f, [P(0.34, 0.66), P(0.46, 0.62), P(0.56, 0.7), P(0.54, 0.8), P(0.42, 0.83), P(0.32, 0.76)], M.main, 3);
      stroke(f, [P(0.48, 0.78), P(0.52, 0.88), P(0.5, 0.94)], 0.09, 0.08, M.main, 3);
      blob(f, [P(0.43, 0.97), P(0.46, 0.91), P(0.58, 0.9), P(0.64, 0.97)], M.main, 4);
      claws(f, [P(0.56, 0.965), P(0.61, 0.965), P(0.65, 0.97)], 0.045, 5);
      anvil(f, 0.46, 0.72, 0.1, 0.1, 5);
      vein(f, [P(0.36, 0.7), P(0.4, 0.76)], [M.main], false);
      // Arm with an iron bracer and claws
      stroke(f, [P(0.6, 0.46), P(0.68, 0.56), P(0.76, 0.6)], 0.085, 0.065, M.main, 4);
      stroke(f, [P(0.69, 0.575), P(0.77, 0.6)], 0.07, 0.065, M.accent, 5);
      f.seamLine(P(0.71, 0.585), P(0.76, 0.6), [M.accent]);
      f.ellipse(0.8, 0.61, 0.035, 0.032, M.main, 5);
      claws(f, [P(0.82, 0.62), P(0.8, 0.635)], 0.04, 6, 1.1);
      anvil(f, 0.58, 0.44, 0.13, -0.3, 6);
      // Neck and head
      stroke(f, [P(0.54, 0.42), P(0.6, 0.3), P(0.68, 0.24)], 0.13, 0.11, M.main, 5);
      blob(f, [P(0.6, 0.26), P(0.64, 0.15), P(0.76, 0.1), P(0.9, 0.15), P(0.98, 0.23), P(0.96, 0.31), P(0.84, 0.35), P(0.68, 0.36)], M.main, 6);
      blob(f, [P(0.72, 0.34), P(0.84, 0.3), P(0.97, 0.29), P(0.92, 0.37), P(0.78, 0.39)], M.second, 7);
      f.line(P(0.8, 0.325), P(0.95, 0.305), M.dark, 1, 8);
      f.triangle(P(0.87, 0.315), P(0.895, 0.312), P(0.883, 0.345), M.accent, 9);
      f.rect(0.95, 0.2, 0.965, 0.215, M.dark, 8);
      horn(f, P(0.65, 0.17), P(0.71, 0.13), P(0.5, 0.03), -0.04, M.accent, 7);
      horn(f, P(0.72, 0.12), P(0.77, 0.115), P(0.68, 0.0), -0.02, M.accent, 7);
      horn(f, P(0.66, 0.3), P(0.68, 0.34), P(0.58, 0.37), 0, M.accent, 7);
      vein(f, [P(0.64, 0.22), P(0.7, 0.28), P(0.68, 0.34)], [M.main], false);
      spark(f, 0.2, 0.24, 0.025);
      spark(f, 0.16, 0.36, 0.018);
      return [{ x: 0.8, y: 0.21, r: 0.055, angry: true }];
    },
  },
  // Élite: a heavy winged dragon with a riveted furnace in its chest that never goes out.
  calderon: { colours: fire, draw: (f) => greatDragon(f, "caldera") },
  // Supremo: a sun dragon inside a halo and a ring of molten metal, a little sun in its chest.
  solforja: { colours: fire, draw: (f) => greatDragon(f, "sol") },
  // Despertar: white-hot, wings edged in flame, a second ring and a blazing white core.
  "solforja-nucleo-blanco": { colours: whiteCore, draw: (f) => greatDragon(f, "blanco") },
};

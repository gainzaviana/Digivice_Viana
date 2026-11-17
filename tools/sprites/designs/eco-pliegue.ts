import { Material as M, type Point, type SpriteForge } from "../../../src/art/forge";
import { blob, horn, P, type Colours, type Design, type Eye } from "../style";

// ───────────────────────────── shared helpers ─────────────────────────────

/** A rotated ellipse as one polygon part (angle in radians; rx runs along the angle). */
function oval(f: SpriteForge, cx: number, cy: number, rx: number, ry: number, ang: number, m: M, lift = 0) {
  const pts: Point[] = [];
  const c = Math.cos(ang), s = Math.sin(ang);
  for (let i = 0; i < 24; i++) {
    const t = (i / 24) * Math.PI * 2, x = Math.cos(t) * rx, y = Math.sin(t) * ry;
    pts.push([cx + x * c - y * s, cy + x * s + y * c]);
  }
  f.poly(pts, m, lift);
}

/** A thick circular arc (angles in radians, y down: 0 = right, -π/2 = up). */
function arc(f: SpriteForge, cx: number, cy: number, r: number, w: number, a0: number, a1: number, m: M, lift = 0) {
  const outer: Point[] = [], inner: Point[] = [];
  const k = 18;
  for (let i = 0; i <= k; i++) {
    const a = a0 + ((a1 - a0) * i) / k;
    outer.push([cx + Math.cos(a) * r, cy + Math.sin(a) * r]);
    inner.push([cx + Math.cos(a) * (r - w), cy + Math.sin(a) * (r - w)]);
  }
  f.poly([...outer, ...inner.reverse()], m, lift);
}

/** A four-point sparkle star. */
function sparkle(f: SpriteForge, x: number, y: number, s: number, m: M = M.glow, lift = 6) {
  const t = s * 0.25;
  f.poly([P(x, y - s), P(x + t, y - t), P(x + s, y), P(x + t, y + t), P(x, y + s), P(x - t, y + t), P(x - s, y), P(x - t, y - t)], m, lift);
}

/** A leaf/ear shape from base to tip, `w` wide at its widest, bowed sideways by `bend`. */
function leaf(f: SpriteForge, base: Point, tip: Point, w: number, bend: number, m: M, lift = 0, prof = [0.6, 0.85, 1, 0.95, 0.75, 0.42, 0]) {
  const dx = tip[0] - base[0], dy = tip[1] - base[1], len = Math.hypot(dx, dy);
  const nx = -dy / len, ny = dx / len;
  const ts = prof.map((_, i) => i / (prof.length - 1));
  const c = (t: number): Point => [base[0] + dx * t + nx * bend * 4 * t * (1 - t), base[1] + dy * t + ny * bend * 4 * t * (1 - t)];
  const L = ts.map((t, i) => [c(t)[0] + nx * prof[i] * w * 0.5, c(t)[1] + ny * prof[i] * w * 0.5] as Point);
  const R = ts.map((t, i) => [c(t)[0] - nx * prof[i] * w * 0.5, c(t)[1] - ny * prof[i] * w * 0.5] as Point).reverse();
  f.poly([...L, ...R.slice(1)], m, lift);
}

/** A speaker cone: metal rim, dark cone, glowing driver. */
function speaker(f: SpriteForge, x: number, y: number, r: number, lift: number) {
  f.ellipse(x, y, r, r, M.accent, lift);
  f.ellipse(x + 0.006, y + 0.004, r * 0.66, r * 0.66, M.dark, lift + 1);
  f.ellipse(x + 0.008, y + 0.006, Math.max(0.014, r * 0.24), Math.max(0.014, r * 0.24), M.glow, lift + 2);
}

/** A trumpet: a tube along `path` (width in px) ending in a flared bell of length `bl`, mouth radius `bw`. */
function trumpet(f: SpriteForge, path: Point[], w: number, bl: number, bw: number, lift: number) {
  for (let i = 1; i < path.length; i++) f.line(path[i - 1], path[i], M.accent, w, lift);
  const p = path[path.length - 1], q = path[path.length - 2];
  const len = Math.hypot(p[0] - q[0], p[1] - q[1]);
  const ux = (p[0] - q[0]) / len, uy = (p[1] - q[1]) / len, nx = -uy, ny = ux;
  const w0 = (w / 64) * 0.6;
  const m: Point = [p[0] + ux * bl, p[1] + uy * bl];
  f.poly([
    P(p[0] + nx * w0, p[1] + ny * w0), P(p[0] + ux * bl * 0.6 + nx * bw * 0.45, p[1] + uy * bl * 0.6 + ny * bw * 0.45), P(m[0] + nx * bw, m[1] + ny * bw),
    P(m[0] - nx * bw, m[1] - ny * bw), P(p[0] + ux * bl * 0.6 - nx * bw * 0.45, p[1] + uy * bl * 0.6 - ny * bw * 0.45), P(p[0] - nx * w0, p[1] - ny * w0),
  ], M.accent, lift + 1);
  const ang = Math.atan2(uy, ux);
  oval(f, m[0] - ux * 0.004, m[1] - uy * 0.004, Math.max(0.022, bw * 0.32), bw * 0.82, ang, M.dark, lift + 2);
  oval(f, m[0] - ux * 0.002, m[1] - uy * 0.002, 0.014, bw * 0.4, ang, M.glow, lift + 3);
}

/** Sound waves fanning out from a point toward angle `dir`. */
function waves(f: SpriteForge, x: number, y: number, r0: number, n: number, gap: number, dir = 0, spread = 0.6) {
  for (let i = 0; i < n; i++) arc(f, x, y, r0 + i * gap, 0.022, dir - spread, dir + spread, M.glow, 6);
}

/** A glowing eighth note. */
function note(f: SpriteForge, x: number, y: number, s: number) {
  oval(f, x, y, s * 0.5, s * 0.36, -0.4, M.glow, 6);
  f.line(P(x + s * 0.42, y - s * 0.1), P(x + s * 0.42, y - s * 1.6), M.glow, 1, 6);
  f.poly([P(x + s * 0.42, y - s * 1.6), P(x + s * 1.1, y - s * 1.1), P(x + s * 1.0, y - s * 0.85), P(x + s * 0.42, y - s * 1.25)], M.glow, 6);
}

// ───────────────────────────── ECO: sound hares ─────────────────────────────

const eco: Colours = {
  main: ["#3d3f8f", "#6672cc", "#94a6ec", "#cfe0ff"],
  second: ["#c7956e", "#f2d2a4", "#fff0cc", "#fffaf0"],
  accent: ["#9a5f22", "#e0a33a", "#ffd468", "#fff3b8"],
  dark: ["#1d1f3e", "#2f3766", "#48568e", "#6a7cb8"],
  glow: "#5ff5e6",
  iris: "#1fc6d4",
};

const ecoAwake: Colours = {
  main: ["#5c2c8c", "#9c50c8", "#d282ea", "#ffd6f6"],
  second: ["#c8a0cc", "#fff0f8", "#ffffff", "#ffffff"],
  accent: ["#a8632a", "#f2b440", "#ffe07a", "#fffbd0"],
  dark: ["#1c1236", "#34245e", "#54408c", "#7a64b4"],
  glow: "#8ffff2",
  iris: "#ff5ad0",
};

/** The colossus conductor, shared by Sinfonía Titán and its Despertar. */
function titan(f: SpriteForge, awake: boolean): Eye[] {
  if (awake) {
    // A sustained note: concentric shock rings around the whole colossus.
    f.ring(0.5, 0.5, 0.49, M.glow, 1);
    arc(f, 0.5, 0.5, 0.45, 0.02, Math.PI * 1.62, Math.PI * 1.9, M.glow);
    arc(f, 0.5, 0.5, 0.45, 0.02, Math.PI * 0.62, Math.PI * 0.9, M.glow);
  }
  // Tail-coat tails behind
  f.poly([P(0.3, 0.48), P(0.12, 0.8), P(0.02, 0.97), P(0.16, 0.9), P(0.22, 0.97), P(0.36, 0.72)], M.dark);
  f.poly([P(0.28, 0.6), P(0.18, 0.84), P(0.16, 0.9), P(0.22, 0.97), P(0.32, 0.74)], M.dark, 1);
  f.seamLine(P(0.28, 0.52), P(0.08, 0.92), [M.dark]);
  // Far trumpet ear, swept back
  trumpet(f, [P(0.56, 0.2), P(0.46, 0.11), P(0.36, 0.08)], 3, 0.1, 0.075, 0);
  // Its far ear blasts sound backwards
  waves(f, 0.27, 0.06, 0.07, 2, 0.045, Math.PI * 1.05, 0.5);
  // Far arm, fist low and back
  blob(f, [P(0.34, 0.44), P(0.26, 0.56), P(0.2, 0.66), P(0.26, 0.7), P(0.34, 0.6), P(0.42, 0.5)], M.main);
  f.ellipse(0.215, 0.69, 0.045, 0.045, M.second, 1);
  // Far leg
  blob(f, [P(0.28, 0.7), P(0.46, 0.68), P(0.48, 0.86), P(0.48, 0.97), P(0.26, 0.97), P(0.26, 0.84)], M.main);
  // Massive torso
  blob(f, [P(0.24, 0.66), P(0.26, 0.46), P(0.4, 0.33), P(0.62, 0.33), P(0.8, 0.48), P(0.8, 0.72), P(0.66, 0.86), P(0.34, 0.86)], M.main);
  // Coat over the back
  f.poly([P(0.24, 0.5), P(0.36, 0.35), P(0.48, 0.33), P(0.44, 0.6), P(0.44, 0.86), P(0.3, 0.82), P(0.23, 0.66)], M.dark, 1);
  f.poly([P(0.36, 0.35), P(0.48, 0.33), P(0.46, 0.46), P(0.4, 0.5)], M.dark, 2);
  // Chest fur and a speaker grille
  blob(f, [P(0.48, 0.84), P(0.48, 0.48), P(0.6, 0.4), P(0.76, 0.5), P(0.77, 0.72), P(0.64, 0.86)], M.second, 1);
  f.ellipse(0.62, 0.65, 0.095, 0.11, M.accent, 2);
  f.ellipse(0.622, 0.655, 0.074, 0.088, M.dark, 3);
  for (const y of [0.59, 0.63, 0.67, 0.71]) f.seamLine(P(0.56, y), P(0.68, y), [M.dark]);
  // Gold buttons on the coat edge
  for (const y of [0.5, 0.6, 0.7, 0.8]) f.ellipse(0.455, y, 0.016, 0.016, M.accent, 3);
  // Near leg with a big foot and drum sole
  blob(f, [P(0.46, 0.74), P(0.66, 0.74), P(0.7, 0.88), P(0.68, 0.94), P(0.46, 0.92), P(0.42, 0.82)], M.main, 2);
  blob(f, [P(0.42, 0.92), P(0.54, 0.88), P(0.82, 0.9), P(0.86, 0.97), P(0.42, 0.97)], M.main, 3);
  f.rect(0.44, 0.955, 0.84, 0.975, M.accent, 4);
  // Head
  blob(f, [P(0.48, 0.28), P(0.52, 0.18), P(0.62, 0.13), P(0.72, 0.15), P(0.8, 0.22), P(0.78, 0.29), P(0.68, 0.34), P(0.54, 0.36)], M.main, 5);
  blob(f, [P(0.68, 0.28), P(0.78, 0.23), P(0.84, 0.26), P(0.8, 0.31), P(0.7, 0.33)], M.second, 6);
  f.ellipse(0.835, 0.255, 0.016, 0.016, M.dark, 7);
  horn(f, P(0.5, 0.28), P(0.52, 0.35), P(0.42, 0.37), 0, M.second, 6);
  // Bow tie
  f.poly([P(0.54, 0.36), P(0.62, 0.4), P(0.54, 0.44)], M.dark, 7);
  f.poly([P(0.7, 0.35), P(0.62, 0.4), P(0.7, 0.45)], M.dark, 7);
  f.ellipse(0.62, 0.4, 0.02, 0.02, M.glow, 8);
  // Near trumpet ear, bell raised high
  trumpet(f, [P(0.62, 0.15), P(0.56, 0.07), P(0.48, 0.05)], 3, 0.1, 0.085, 6);
  // Near arm: elbow out, forearm raised, white glove and glowing baton
  blob(f, [P(0.6, 0.44), P(0.72, 0.44), P(0.86, 0.46), P(0.9, 0.54), P(0.76, 0.58), P(0.6, 0.54)], M.main, 7);
  blob(f, [P(0.82, 0.52), P(0.84, 0.42), P(0.86, 0.34), P(0.93, 0.34), P(0.94, 0.46), P(0.9, 0.56)], M.main, 8);
  f.rect(0.84, 0.36, 0.94, 0.4, M.dark, 9);
  f.line(P(0.9, 0.3), P(0.97, 0.06), M.glow, 1, 10);
  f.ellipse(0.895, 0.315, 0.05, 0.045, M.second, 10);
  sparkle(f, 0.955, 0.07, awake ? 0.05 : 0.035);
  if (awake) {
    // Glowing sound seams through the fur, notes in the air.
    f.seamLine(P(0.28, 0.72), P(0.44, 0.96), [M.main]);
    f.seamLine(P(0.48, 0.78), P(0.62, 0.92), [M.main]);
    f.seamLine(P(0.64, 0.5), P(0.86, 0.5), [M.main]);
    f.seamLine(P(0.52, 0.2), P(0.6, 0.3), [M.main]);
    note(f, 0.15, 0.36, 0.06);
    note(f, 0.13, 0.58, 0.045);
    sparkle(f, 0.22, 0.24, 0.03);
    sparkle(f, 0.94, 0.8, 0.03);
  }
  return [{ x: 0.7, y: 0.23, r: 0.055, angry: true }];
}

export const ecoPliegue: Record<string, Design> = {
  // Brote: a fluffy ball whose floppy ears end in jingle bells.
  tilin: {
    colours: eco,
    draw(f) {
      // Ears
      leaf(f, P(0.38, 0.44), P(0.12, 0.16), 0.22, -0.04, M.main);
      leaf(f, P(0.62, 0.44), P(0.88, 0.16), 0.22, 0.04, M.main);
      leaf(f, P(0.35, 0.4), P(0.16, 0.21), 0.1, -0.03, M.second, 1);
      leaf(f, P(0.65, 0.4), P(0.84, 0.21), 0.1, 0.03, M.second, 1);
      // Bells at the tips
      for (const x of [0.12, 0.88]) {
        f.ring(x, 0.06, 0.028, M.accent, 1, 2);
        f.ellipse(x, 0.15, 0.085, 0.08, M.accent, 2);
        f.line(P(x - 0.07, 0.16), P(x + 0.07, 0.16), M.dark, 1, 3);
        f.ellipse(x, 0.2, 0.025, 0.022, M.glow, 3);
      }
      // Feet
      f.ellipse(0.34, 0.93, 0.1, 0.05, M.main);
      f.ellipse(0.66, 0.93, 0.1, 0.05, M.main);
      // Fluffy round body
      blob(f, [P(0.16, 0.66), P(0.22, 0.48), P(0.36, 0.38), P(0.5, 0.35), P(0.64, 0.38), P(0.78, 0.48), P(0.84, 0.66), P(0.76, 0.84), P(0.5, 0.93), P(0.24, 0.84)], M.main);
      // Fur tufts: cheeks and crown
      horn(f, P(0.2, 0.6), P(0.18, 0.72), P(0.06, 0.7), 0.02, M.main, 1);
      horn(f, P(0.8, 0.6), P(0.82, 0.72), P(0.94, 0.7), -0.02, M.main, 1);
      horn(f, P(0.42, 0.4), P(0.5, 0.38), P(0.42, 0.26), -0.02, M.main, 1);
      horn(f, P(0.5, 0.38), P(0.58, 0.4), P(0.6, 0.27), 0.02, M.main, 1);
      // Belly fluff
      blob(f, [P(0.3, 0.8), P(0.38, 0.72), P(0.5, 0.7), P(0.62, 0.72), P(0.7, 0.8), P(0.6, 0.89), P(0.4, 0.89)], M.second, 1);
      // Nose, little mouth and paws
      f.ellipse(0.53, 0.62, 0.022, 0.016, M.dark, 2);
      f.ellipse(0.29, 0.76, 0.055, 0.05, M.main, 3);
      f.ellipse(0.71, 0.76, 0.055, 0.05, M.main, 3);
      f.ellipse(0.53, 0.66, 0.03, 0.012, M.dark, 2);
      // A soft chime while it sleeps
      waves(f, 0.88, 0.15, 0.1, 2, 0.04, -0.6, 0.45);
      return [{ x: 0.64, y: 0.54, r: 0.075 }, { x: 0.42, y: 0.54, r: 0.065 }];
    },
  },

  // Novato: a sitting fennec hare with enormous speaker ears.
  ecoli: {
    colours: eco,
    draw(f) {
      // Fluffy tail
      f.ellipse(0.19, 0.8, 0.08, 0.075, M.second);
      horn(f, P(0.14, 0.76), P(0.14, 0.84), P(0.07, 0.78), 0, M.second, 1);
      // Far ear
      leaf(f, P(0.54, 0.4), P(0.3, 0.03), 0.2, -0.03, M.main);
      leaf(f, P(0.52, 0.36), P(0.33, 0.08), 0.1, -0.02, M.dark, 1);
      // Body
      blob(f, [P(0.24, 0.84), P(0.28, 0.64), P(0.42, 0.52), P(0.6, 0.54), P(0.68, 0.7), P(0.64, 0.9), P(0.4, 0.94)], M.main);
      // Chest ruff
      blob(f, [P(0.52, 0.86), P(0.5, 0.62), P(0.6, 0.56), P(0.68, 0.68), P(0.64, 0.84)], M.second, 1);
      // Hind leg: big thigh and long foot
      f.ellipse(0.38, 0.78, 0.13, 0.12, M.main, 1);
      f.seamLine(P(0.3, 0.74), P(0.36, 0.7), [M.main]);
      blob(f, [P(0.3, 0.93), P(0.36, 0.88), P(0.6, 0.9), P(0.64, 0.97), P(0.3, 0.97)], M.main, 2);
      // Foreleg
      blob(f, [P(0.6, 0.66), P(0.68, 0.68), P(0.7, 0.92), P(0.75, 0.97), P(0.6, 0.97), P(0.6, 0.86)], M.main, 2);
      // Head
      blob(f, [P(0.46, 0.48), P(0.5, 0.38), P(0.64, 0.32), P(0.8, 0.36), P(0.9, 0.45), P(0.86, 0.54), P(0.7, 0.58), P(0.54, 0.56)], M.main, 2);
      blob(f, [P(0.74, 0.5), P(0.86, 0.45), P(0.93, 0.49), P(0.88, 0.55), P(0.76, 0.56)], M.second, 3);
      f.ellipse(0.925, 0.48, 0.02, 0.018, M.dark, 4);
      horn(f, P(0.5, 0.5), P(0.52, 0.56), P(0.4, 0.58), 0, M.second, 3);
      // Near ear: huge, with a speaker cone inside
      leaf(f, P(0.6, 0.38), P(0.68, 0.01), 0.24, 0.02, M.main, 3);
      leaf(f, P(0.62, 0.34), P(0.68, 0.05), 0.15, 0.015, M.second, 4);
      speaker(f, 0.65, 0.18, 0.065, 5);
      return [{ x: 0.72, y: 0.43, r: 0.065 }];
    },
  },

  // Avanzado: a long-legged hare mid-stomp; its feet are drum pads.
  bramaliebre: {
    colours: eco,
    draw(f) {
      // Tail
      f.ellipse(0.12, 0.6, 0.075, 0.07, M.second);
      // Far ear (swept back)
      leaf(f, P(0.6, 0.26), P(0.3, 0.04), 0.15, -0.04, M.main);
      speaker(f, 0.42, 0.12, 0.045, 1);
      // Far leg
      blob(f, [P(0.26, 0.66), P(0.4, 0.62), P(0.44, 0.8), P(0.4, 0.94), P(0.26, 0.96), P(0.24, 0.84)], M.main);
      f.ellipse(0.32, 0.95, 0.09, 0.03, M.accent, 1);
      // Far arm
      blob(f, [P(0.52, 0.46), P(0.6, 0.5), P(0.64, 0.6), P(0.58, 0.62), P(0.5, 0.54)], M.main);
      // Body: leaning forward
      blob(f, [P(0.16, 0.66), P(0.22, 0.48), P(0.4, 0.38), P(0.6, 0.38), P(0.7, 0.5), P(0.64, 0.68), P(0.46, 0.76), P(0.26, 0.76)], M.main);
      blob(f, [P(0.44, 0.72), P(0.48, 0.5), P(0.62, 0.42), P(0.68, 0.54), P(0.6, 0.68)], M.second, 1);
      // Back stripes
      f.seamLine(P(0.24, 0.5), P(0.3, 0.58), [M.main]);
      f.seamLine(P(0.31, 0.44), P(0.37, 0.52), [M.main]);
      // Near hind leg: big thigh, long shin, huge foot with a drum sole
      f.ellipse(0.38, 0.66, 0.15, 0.13, M.main, 1);
      f.seamLine(P(0.3, 0.62), P(0.38, 0.58), [M.main]);
      blob(f, [P(0.38, 0.72), P(0.5, 0.74), P(0.54, 0.9), P(0.46, 0.92), P(0.4, 0.82)], M.main, 2);
      blob(f, [P(0.4, 0.92), P(0.48, 0.86), P(0.74, 0.88), P(0.78, 0.95), P(0.4, 0.96)], M.main, 3);
      f.rect(0.42, 0.95, 0.77, 0.975, M.accent, 4);
      // Stomp shock
      arc(f, 0.6, 0.97, 0.15, 0.022, Math.PI * 1.75, Math.PI * 1.95, M.glow, 6);
      arc(f, 0.6, 0.97, 0.21, 0.022, Math.PI * 1.8, Math.PI * 1.94, M.glow, 6);
      // Near arm
      blob(f, [P(0.6, 0.46), P(0.72, 0.52), P(0.8, 0.6), P(0.74, 0.64), P(0.62, 0.56)], M.main, 3);
      f.ellipse(0.8, 0.62, 0.04, 0.035, M.second, 4);
      // Head
      blob(f, [P(0.54, 0.34), P(0.58, 0.22), P(0.72, 0.17), P(0.86, 0.22), P(0.94, 0.32), P(0.88, 0.4), P(0.72, 0.42), P(0.6, 0.42)], M.main, 2);
      blob(f, [P(0.8, 0.36), P(0.9, 0.31), P(0.96, 0.34), P(0.92, 0.4), P(0.82, 0.41)], M.second, 3);
      f.ellipse(0.955, 0.335, 0.018, 0.016, M.dark, 4);
      horn(f, P(0.56, 0.34), P(0.58, 0.42), P(0.46, 0.44), 0, M.second, 3);
      // Near ear: tall, swept back, two speakers
      leaf(f, P(0.7, 0.24), P(0.5, 0.0), 0.19, -0.05, M.main, 3);
      leaf(f, P(0.69, 0.2), P(0.52, 0.03), 0.1, -0.04, M.second, 4);
      speaker(f, 0.6, 0.12, 0.055, 5);
      speaker(f, 0.535, 0.045, 0.032, 5);
      return [{ x: 0.77, y: 0.28, r: 0.06 }];
    },
  },

  // Élite: an armoured warrior hare whose ears are war trumpets.
  trompetrueno: {
    colours: eco,
    draw(f) {
      // Scarf streaming back
      f.poly([P(0.5, 0.42), P(0.3, 0.38), P(0.06, 0.44), P(0.16, 0.48), P(0.04, 0.56), P(0.3, 0.5), P(0.48, 0.5)], M.accent);
      // Far trumpet ear
      trumpet(f, [P(0.62, 0.28), P(0.52, 0.18), P(0.42, 0.14)], 3, 0.1, 0.075, 0);
      // Tail
      f.ellipse(0.16, 0.72, 0.065, 0.06, M.second);
      // Far leg
      blob(f, [P(0.28, 0.72), P(0.42, 0.7), P(0.44, 0.86), P(0.44, 0.97), P(0.26, 0.97), P(0.26, 0.84)], M.main);
      // Far arm
      blob(f, [P(0.44, 0.48), P(0.52, 0.5), P(0.52, 0.64), P(0.46, 0.68), P(0.42, 0.58)], M.main);
      // Body
      blob(f, [P(0.22, 0.68), P(0.26, 0.5), P(0.4, 0.42), P(0.6, 0.42), P(0.72, 0.54), P(0.7, 0.72), P(0.56, 0.82), P(0.3, 0.82)], M.main);
      // Chest plate
      f.poly([P(0.5, 0.46), P(0.66, 0.46), P(0.72, 0.56), P(0.68, 0.72), P(0.56, 0.78), P(0.48, 0.68)], M.dark, 1);
      f.seamLine(P(0.52, 0.54), P(0.68, 0.54), [M.dark]);
      f.seamLine(P(0.52, 0.64), P(0.68, 0.64), [M.dark]);
      f.ellipse(0.6, 0.59, 0.03, 0.03, M.glow, 2);
      // Belt
      f.rect(0.28, 0.76, 0.64, 0.8, M.accent, 2);
      // Near leg: big thigh, armoured shin
      f.ellipse(0.4, 0.76, 0.13, 0.1, M.main, 2);
      blob(f, [P(0.44, 0.8), P(0.56, 0.8), P(0.58, 0.9), P(0.5, 0.92), P(0.44, 0.86)], M.dark, 3);
      blob(f, [P(0.42, 0.92), P(0.5, 0.88), P(0.72, 0.9), P(0.76, 0.97), P(0.42, 0.97)], M.main, 3);
      for (const x of [0.7, 0.75]) horn(f, P(x - 0.02, 0.97), P(x, 0.95), P(x + 0.04, 0.98), 0, M.accent, 4);
      // Shoulder pauldron
      f.poly([P(0.38, 0.46), P(0.48, 0.4), P(0.6, 0.44), P(0.58, 0.54), P(0.42, 0.56)], M.accent, 3);
      horn(f, P(0.42, 0.44), P(0.5, 0.41), P(0.36, 0.32), -0.02, M.accent, 4);
      f.seamLine(P(0.44, 0.5), P(0.56, 0.5), [M.accent]);
      // Near arm: punching fist
      blob(f, [P(0.54, 0.5), P(0.66, 0.54), P(0.78, 0.56), P(0.8, 0.62), P(0.68, 0.64), P(0.56, 0.6)], M.main, 4);
      f.rect(0.68, 0.55, 0.76, 0.64, M.dark, 5);
      f.ellipse(0.84, 0.595, 0.055, 0.055, M.second, 5);
      waves(f, 0.84, 0.6, 0.09, 2, 0.045, 0, 0.5);
      // Head
      blob(f, [P(0.54, 0.36), P(0.58, 0.26), P(0.7, 0.21), P(0.84, 0.25), P(0.93, 0.34), P(0.89, 0.42), P(0.75, 0.44), P(0.6, 0.44)], M.main, 3);
      blob(f, [P(0.77, 0.38), P(0.89, 0.33), P(0.96, 0.36), P(0.91, 0.42), P(0.79, 0.43)], M.second, 4);
      f.ellipse(0.955, 0.355, 0.018, 0.016, M.dark, 5);
      horn(f, P(0.56, 0.36), P(0.58, 0.43), P(0.46, 0.44), 0, M.second, 4);
      // Helmet band
      f.poly([P(0.56, 0.27), P(0.7, 0.2), P(0.8, 0.22), P(0.76, 0.27), P(0.6, 0.32)], M.dark, 4);
      f.seamLine(P(0.6, 0.28), P(0.76, 0.23), [M.dark]);
      // Near trumpet ear, bell up
      trumpet(f, [P(0.7, 0.22), P(0.64, 0.12), P(0.58, 0.07)], 3, 0.09, 0.08, 5);
      return [{ x: 0.79, y: 0.32, r: 0.055, angry: true }];
    },
  },

  // Supremo: a colossal conductor hare in a tail-coat, baton raised.
  "sinfonia-titan": { colours: eco, draw: (f) => titan(f, false) },
  // Despertar: its sustained last note; a violet-gold colossus wrapped in sound.
  "sinfonia-titan-fortissimo": { colours: ecoAwake, draw: (f) => titan(f, true) },
};

// ───────────────────────────── PLIEGUE: origami fox ─────────────────────────────

const paper: Colours = {
  main: ["#b23e36", "#ea6a3e", "#ff9d5e", "#ffd09a"],
  second: ["#a6a2c8", "#e8e4f2", "#fbf6f4", "#fffdf2"],
  accent: ["#245e86", "#3e94b8", "#72cbdc", "#c2f2f4"],
  dark: ["#2a2142", "#43365f", "#635486", "#8676aa"],
  glow: "#7ff4ff",
  iris: "#16b8d0",
};

const starPaper: Colours = {
  main: ["#2c3690", "#4a62c8", "#7e9cf0", "#c4d8ff"],
  second: ["#3a2470", "#6a44b0", "#9a74dc", "#d2b8ff"],
  accent: ["#a46a1e", "#f0b43c", "#ffe080", "#fff8d0"],
  dark: ["#120e2c", "#221a4a", "#3a2e70", "#564894"],
  glow: "#fff6c8",
  iris: "#ffcc3a",
};

/** A paper crane with blade wings, facing right. */
function crane(f: SpriteForge, x: number, y: number, s: number, lift: number) {
  f.poly([P(x - s, y - s * 0.1), P(x - s * 0.2, y - s), P(x + s * 0.1, y + s * 0.05)], M.second, lift);
  f.poly([P(x - s * 0.8, y + s * 0.15), P(x + s * 0.7, y - s * 0.05), P(x + s * 0.1, y + s * 0.45)], M.second, lift + 1);
  f.poly([P(x + s * 0.5, y), P(x + s * 1.05, y - s * 0.55), P(x + s * 1.15, y - s * 0.45), P(x + s * 0.75, y + s * 0.1)], M.second, lift + 1);
  f.poly([P(x - s * 0.8, y + s * 0.15), P(x - s * 1.25, y - s * 0.35), P(x - s * 0.5, y + s * 0.15)], M.second, lift + 1);
  f.seamLine(P(x - s, y - s * 0.1), P(x - s * 0.2, y - s), [M.second]);
}

/** Air folded into a pleated screen: `n` panels `w` wide from x, top y0..bottom y1, each panel skewed by `sk`. */
function screen(f: SpriteForge, x: number, y0: number, y1: number, n: number, w: number, sk: number, lift = 0) {
  for (let i = 0; i < n; i++) {
    const a = x + i * w, b = a + w, up = i % 2 ? sk : 0, dn = i % 2 ? 0 : sk;
    f.poly([P(a, y0 + up), P(b, y0 + dn), P(b, y1 + dn), P(a, y1 + up)], i % 2 ? M.second : M.accent, lift + (i % 2));
  }
  f.seamLine(P(x + 0.01, y0 + (y1 - y0) * 0.5), P(x + n * w - 0.01, y0 + (y1 - y0) * 0.5), [M.accent, M.second]);
}

/** A pleated paper fan of `n` folds around (cx,cy): alternating main/second wedges with pointed tips. */
function fan(f: SpriteForge, cx: number, cy: number, r: number, a0: number, a1: number, n: number, lift = 0, alt: [M, M] = [M.main, M.second]) {
  const step = (a1 - a0) / n;
  for (let i = 0; i < n; i++) {
    const a = a0 + step * i, b = a + step, mid = (a + b) / 2;
    f.poly([P(cx, cy), P(cx + Math.cos(a) * r * 0.88, cy + Math.sin(a) * r * 0.88), P(cx + Math.cos(mid) * r, cy + Math.sin(mid) * r), P(cx + Math.cos(b) * r * 0.88, cy + Math.sin(b) * r * 0.88)], alt[i % 2], lift);
  }
}

/** A paper fox head facing right: crown facet, white muzzle fold, nose and two ears. */
function foxHead(f: SpriteForge, x: number, y: number, s: number, lift: number, innerEar: M = M.second) {
  const p = (dx: number, dy: number) => P(x + dx * s, y + dy * s);
  // Ears first so the head overlaps their base
  f.poly([p(-0.1, 0.02), p(-0.14, -0.26), p(0.04, -0.06)], M.main, lift);
  f.poly([p(0.02, -0.06), p(0.12, -0.3), p(0.18, -0.02)], M.main, lift);
  f.poly([p(-0.08, 0.0), p(-0.12, -0.18), p(0.0, -0.05)], innerEar, lift + 1);
  f.poly([p(0.05, -0.06), p(0.12, -0.22), p(0.15, -0.04)], innerEar, lift + 1);
  // Skull and cheek
  f.poly([p(-0.16, 0.08), p(-0.1, -0.04), p(0.06, -0.08), p(0.22, 0.02), p(0.36, 0.1), p(0.2, 0.16), p(0.0, 0.2)], M.main, lift + 1);
  f.poly([p(-0.16, 0.08), p(-0.1, -0.04), p(0.02, 0.06), p(-0.04, 0.18)], M.main, lift + 2);
  // Muzzle fold and cheek ruff
  f.poly([p(0.06, 0.08), p(0.22, 0.02), p(0.36, 0.1), p(0.2, 0.16), p(0.04, 0.18)], M.second, lift + 2);
  f.poly([p(-0.06, 0.12), p(0.06, 0.12), p(0.02, 0.26), p(-0.08, 0.2)], M.second, lift + 2);
  f.poly([p(0.33, 0.07), p(0.38, 0.1), p(0.33, 0.13)], M.dark, lift + 3);
}

/** The sorcerer fox, shared by Arcanorigami and its Despertar. */
function sorcerer(f: SpriteForge, star: boolean): Eye[] {
  // Glyph circle behind
  if (star) {
    f.ring(0.5, 0.5, 0.49, M.glow, 1);
    f.ring(0.5, 0.5, 0.43, M.glow, 1);
  } else {
    arc(f, 0.5, 0.52, 0.47, 0.02, Math.PI * 1.05, Math.PI * 1.55, M.glow);
  }
  // Fan of folded tails
  fan(f, 0.36, 0.64, 0.32, Math.PI * 0.86, Math.PI * 1.4, 6);
  f.seamLine(P(0.3, 0.6), P(0.08, 0.42), [M.main, M.second]);
  // Robe (layered folds)
  f.poly([P(0.34, 0.46), P(0.64, 0.44), P(0.76, 0.97), P(0.2, 0.97)], M.dark, 1);
  f.poly([P(0.34, 0.46), P(0.46, 0.46), P(0.38, 0.97), P(0.2, 0.97)], M.dark, 2);
  f.poly([P(0.52, 0.46), P(0.64, 0.46), P(0.76, 0.97), P(0.58, 0.97)], M.accent, 2);
  f.poly([P(0.42, 0.62), P(0.58, 0.62), P(0.62, 0.97), P(0.38, 0.97)], M.second, 3);
  f.poly([P(0.42, 0.62), P(0.5, 0.62), P(0.5, 0.97), P(0.38, 0.97)], M.second, 4);
  // Hem trim
  f.seamLine(P(0.22, 0.94), P(0.74, 0.94), [M.dark, M.accent]);
  // Paper sash with talismans
  f.poly([P(0.36, 0.6), P(0.66, 0.56), P(0.66, 0.62), P(0.36, 0.66)], M.main, 5);
  f.poly([P(0.4, 0.64), P(0.46, 0.64), P(0.46, 0.8), P(0.43, 0.84), P(0.4, 0.8)], M.second, 5);
  f.seamLine(P(0.43, 0.68), P(0.43, 0.78), [M.second]);
  // Staff (held in the near hand)
  f.line(P(0.86, 0.22), P(0.86, 0.97), M.accent, 2, 4);
  f.poly([P(0.86, 0.04), P(0.94, 0.13), P(0.86, 0.22), P(0.78, 0.13)], M.second, 5);
  f.poly([P(0.86, 0.04), P(0.94, 0.13), P(0.86, 0.13)], M.main, 6);
  f.poly([P(0.86, 0.09), P(0.89, 0.13), P(0.86, 0.17), P(0.83, 0.13)], M.glow, 7);
  // Pointed paper collar
  f.poly([P(0.3, 0.46), P(0.42, 0.38), P(0.5, 0.48), P(0.4, 0.56)], M.second, 6);
  f.poly([P(0.5, 0.48), P(0.62, 0.38), P(0.7, 0.46), P(0.6, 0.56)], M.second, 6);
  // Near sleeve reaching to the staff
  f.poly([P(0.54, 0.5), P(0.7, 0.5), P(0.84, 0.54), P(0.8, 0.66), P(0.66, 0.64), P(0.54, 0.6)], M.main, 7);
  f.poly([P(0.72, 0.52), P(0.84, 0.54), P(0.8, 0.66), P(0.74, 0.64)], M.second, 8);
  f.ellipse(0.865, 0.58, 0.035, 0.035, M.main, 8);
  // Head
  foxHead(f, 0.56, 0.3, 1.08, 8);
  // Floating crane
  crane(f, 0.18, 0.14, 0.07, 8);
  if (star) {
    for (const [x, y, s] of [[0.08, 0.32, 0.04], [0.95, 0.4, 0.03], [0.1, 0.86, 0.03], [0.32, 0.06, 0.03], [0.96, 0.78, 0.035], [0.72, 0.06, 0.025]] as const) sparkle(f, x, y, s);
    // Cuts of starlight through the paper
    f.seamLine(P(0.24, 0.9), P(0.36, 0.6), [M.dark]);
    f.seamLine(P(0.62, 0.5), P(0.72, 0.92), [M.accent]);
    f.seamLine(P(0.08, 0.56), P(0.3, 0.68), [M.main, M.second]);
    for (const [x, y] of [[0.3, 0.8], [0.68, 0.74], [0.16, 0.48], [0.2, 0.72], [0.5, 0.88], [0.62, 0.3]] as const) {
      f.seamLine(P(x - 0.02, y), P(x + 0.02, y), [M.main, M.second, M.dark, M.accent]);
      f.seamLine(P(x, y - 0.02), P(x, y + 0.02), [M.main, M.second, M.dark, M.accent]);
    }
  }
  return [{ x: 0.62, y: 0.31, r: 0.05, angry: true }];
}

Object.assign(ecoPliegue, {
  // Brote: a scrap of living paper folded into a little fox-ish shape.
  pliegue: {
    colours: paper,
    draw(f) {
      // Tail flap
      f.poly([P(0.24, 0.8), P(0.04, 0.6), P(0.14, 0.86)], M.main);
      f.poly([P(0.24, 0.8), P(0.14, 0.86), P(0.3, 0.9)], M.second, 1);
      // Ear folds
      f.poly([P(0.22, 0.44), P(0.14, 0.06), P(0.44, 0.34)], M.main);
      f.poly([P(0.56, 0.34), P(0.86, 0.06), P(0.78, 0.44)], M.main);
      f.poly([P(0.26, 0.4), P(0.19, 0.16), P(0.38, 0.35)], M.second, 1);
      f.poly([P(0.62, 0.35), P(0.81, 0.16), P(0.74, 0.4)], M.second, 1);
      // Feet
      f.poly([P(0.3, 0.9), P(0.4, 0.86), P(0.42, 0.97), P(0.28, 0.97)], M.main);
      f.poly([P(0.58, 0.86), P(0.7, 0.9), P(0.72, 0.97), P(0.58, 0.97)], M.main);
      // Body: a folded hexagon
      f.poly([P(0.5, 0.3), P(0.82, 0.44), P(0.8, 0.78), P(0.5, 0.94), P(0.2, 0.78), P(0.18, 0.44)], M.main, 1);
      // Facets: lit left half, white folded face
      f.poly([P(0.5, 0.3), P(0.18, 0.44), P(0.2, 0.78), P(0.5, 0.62)], M.main, 2);
      f.poly([P(0.5, 0.62), P(0.8, 0.78), P(0.5, 0.94), P(0.2, 0.78)], M.second, 2);
      f.poly([P(0.5, 0.62), P(0.66, 0.7), P(0.5, 0.82), P(0.34, 0.7)], M.second, 3);
      // Corner dog-ear: a fold that is still folding
      f.poly([P(0.82, 0.44), P(0.72, 0.4), P(0.8, 0.54)], M.second, 3);
      // Nose fold
      f.poly([P(0.46, 0.64), P(0.54, 0.64), P(0.5, 0.7)], M.dark, 4);
      f.seamLine(P(0.5, 0.31), P(0.5, 0.6), [M.main]);
      return [{ x: 0.64, y: 0.53, r: 0.075 }, { x: 0.36, y: 0.53, r: 0.07 }];
    },
  },

  // Novato: a sitting paper fox launching a blade-winged crane.
  origamin: {
    colours: paper,
    draw(f) {
      // Big folded tail
      f.poly([P(0.36, 0.8), P(0.08, 0.48), P(0.02, 0.62), P(0.18, 0.9), P(0.34, 0.92)], M.main);
      f.poly([P(0.08, 0.48), P(0.02, 0.62), P(0.12, 0.68), P(0.15, 0.56)], M.second, 1);
      f.poly([P(0.36, 0.8), P(0.14, 0.62), P(0.2, 0.9), P(0.34, 0.92)], M.main, 1);
      // Far foreleg
      f.poly([P(0.56, 0.66), P(0.62, 0.66), P(0.62, 0.96), P(0.54, 0.96)], M.main);
      // Body
      f.poly([P(0.3, 0.6), P(0.5, 0.46), P(0.68, 0.56), P(0.66, 0.84), P(0.5, 0.96), P(0.3, 0.94)], M.main, 1);
      f.poly([P(0.3, 0.6), P(0.5, 0.46), P(0.44, 0.74), P(0.3, 0.94)], M.main, 2);
      // Chest bib
      f.poly([P(0.5, 0.5), P(0.68, 0.56), P(0.66, 0.78), P(0.56, 0.84)], M.second, 3);
      // Haunch
      f.poly([P(0.28, 0.76), P(0.44, 0.7), P(0.48, 0.96), P(0.26, 0.96)], M.main, 3);
      f.poly([P(0.44, 0.9), P(0.56, 0.92), P(0.58, 0.97), P(0.36, 0.97)], M.second, 4);
      // Near foreleg
      f.poly([P(0.64, 0.66), P(0.7, 0.68), P(0.72, 0.96), P(0.62, 0.96)], M.main, 4);
      f.poly([P(0.62, 0.92), P(0.76, 0.93), P(0.76, 0.97), P(0.62, 0.97)], M.second, 5);
      // Head
      foxHead(f, 0.62, 0.38, 0.92, 3);
      // Crane taking off, blade wings glinting
      crane(f, 0.84, 0.14, 0.08, 6);
      return [{ x: 0.68, y: 0.38, r: 0.06 }];
    },
  },

  // Avanzado: a prowling paper fox with a pleated tail; folded-air screens deflect blows.
  pliegazorro: {
    colours: paper,
    draw(f) {
      // Folded air hanging behind it like a pleated screen
      screen(f, 0.06, 0.08, 0.3, 4, 0.05, -0.04);
      // Pleated tail
      fan(f, 0.32, 0.6, 0.3, Math.PI * 0.9, Math.PI * 1.3, 5);
      // Far legs
      f.poly([P(0.3, 0.68), P(0.38, 0.7), P(0.34, 0.96), P(0.26, 0.96)], M.main);
      f.poly([P(0.62, 0.64), P(0.7, 0.66), P(0.7, 0.96), P(0.62, 0.96)], M.main);
      // Body
      f.poly([P(0.26, 0.56), P(0.44, 0.46), P(0.7, 0.48), P(0.76, 0.6), P(0.66, 0.74), P(0.34, 0.76)], M.main, 1);
      f.poly([P(0.26, 0.56), P(0.44, 0.46), P(0.5, 0.62), P(0.34, 0.76)], M.main, 2);
      f.poly([P(0.5, 0.62), P(0.7, 0.62), P(0.66, 0.74), P(0.44, 0.76)], M.second, 2);
      f.seamLine(P(0.36, 0.52), P(0.46, 0.68), [M.main]);
      // Near legs
      f.poly([P(0.36, 0.66), P(0.46, 0.68), P(0.42, 0.96), P(0.32, 0.96)], M.main, 3);
      f.poly([P(0.3, 0.93), P(0.46, 0.93), P(0.46, 0.97), P(0.3, 0.97)], M.second, 4);
      f.poly([P(0.68, 0.58), P(0.78, 0.62), P(0.78, 0.96), P(0.68, 0.96)], M.main, 3);
      f.poly([P(0.68, 0.93), P(0.84, 0.93), P(0.84, 0.97), P(0.68, 0.97)], M.second, 4);
      // Neck ruff
      f.poly([P(0.62, 0.44), P(0.8, 0.46), P(0.76, 0.6), P(0.66, 0.56)], M.second, 3);
      // Head
      foxHead(f, 0.72, 0.32, 0.8, 4);
      // Folded-air shield in front: a pleated screen bending the blow
      screen(f, 0.85, 0.5, 0.82, 3, 0.045, 0.03, 6);
      return [{ x: 0.77, y: 0.33, r: 0.055, angry: true }];
    },
  },

  // Élite: a fox of a thousand folds; each fold holds a glowing glyph.
  "mil-pliegues": {
    colours: paper,
    draw(f) {
      // Great pleated fan of tails
      fan(f, 0.32, 0.62, 0.36, Math.PI * 0.86, Math.PI * 1.5, 8);
      for (const a of [0.95, 1.12, 1.3]) f.seamLine(P(0.32 + Math.cos(Math.PI * a) * 0.12, 0.62 + Math.sin(Math.PI * a) * 0.12), P(0.32 + Math.cos(Math.PI * a) * 0.3, 0.62 + Math.sin(Math.PI * a) * 0.3), [M.main, M.second]);
      // Far legs
      f.poly([P(0.3, 0.7), P(0.38, 0.72), P(0.34, 0.96), P(0.26, 0.96)], M.main);
      f.poly([P(0.62, 0.66), P(0.7, 0.68), P(0.7, 0.96), P(0.62, 0.96)], M.main);
      // Body, built of overlapping folds
      f.poly([P(0.24, 0.6), P(0.44, 0.46), P(0.7, 0.48), P(0.78, 0.6), P(0.68, 0.76), P(0.32, 0.78)], M.main, 1);
      f.poly([P(0.24, 0.6), P(0.44, 0.46), P(0.42, 0.66), P(0.32, 0.78)], M.main, 2);
      f.poly([P(0.44, 0.46), P(0.58, 0.48), P(0.54, 0.66), P(0.42, 0.66)], M.main, 2);
      f.poly([P(0.42, 0.66), P(0.7, 0.62), P(0.68, 0.76), P(0.4, 0.78)], M.second, 2);
      // Glyphs on folds
      f.seamLine(P(0.3, 0.6), P(0.38, 0.56), [M.main]);
      f.seamLine(P(0.34, 0.56), P(0.35, 0.68), [M.main]);
      f.seamLine(P(0.47, 0.52), P(0.52, 0.6), [M.main]);
      f.seamLine(P(0.52, 0.52), P(0.47, 0.6), [M.main]);
      // Near legs with paper-blade claws
      f.poly([P(0.36, 0.68), P(0.46, 0.7), P(0.42, 0.96), P(0.32, 0.96)], M.main, 3);
      f.poly([P(0.3, 0.92), P(0.48, 0.92), P(0.52, 0.97), P(0.3, 0.97)], M.second, 4);
      f.poly([P(0.7, 0.58), P(0.8, 0.62), P(0.8, 0.96), P(0.7, 0.96)], M.main, 3);
      f.poly([P(0.7, 0.92), P(0.86, 0.92), P(0.9, 0.97), P(0.7, 0.97)], M.second, 4);
      f.seamLine(P(0.73, 0.7), P(0.77, 0.8), [M.main]);
      f.seamLine(P(0.39, 0.76), P(0.42, 0.86), [M.main]);
      // Mane collar: pleated paper ruff
      fan(f, 0.7, 0.42, 0.2, Math.PI * 0.35, Math.PI * 0.95, 5, 3, [M.accent, M.second]);
      // Head
      foxHead(f, 0.72, 0.3, 0.82, 4, M.accent);
      f.seamLine(P(0.64, 0.27), P(0.7, 0.24), [M.main]);
      // Floating spell slips
      f.poly([P(0.88, 0.04), P(0.98, 0.08), P(0.95, 0.22), P(0.85, 0.18)], M.second, 7);
      f.seamLine(P(0.89, 0.1), P(0.94, 0.14), [M.second]);
      f.seamLine(P(0.89, 0.14), P(0.93, 0.18), [M.second]);
      f.poly([P(0.04, 0.14), P(0.12, 0.1), P(0.16, 0.22), P(0.08, 0.26)], M.second, 7);
      f.seamLine(P(0.08, 0.16), P(0.12, 0.22), [M.second]);
      return [{ x: 0.77, y: 0.31, r: 0.055, angry: true }];
    },
  },

  // Supremo: a robed paper sorcerer fox with a folded staff and fan tails.
  arcanorigami: { colours: paper, draw: (f: SpriteForge) => sorcerer(f, false) },
  // Despertar: its paper turns to night sky; every star is a cut of light.
  "arcanorigami-papel-estelar": { colours: starPaper, draw: (f: SpriteForge) => sorcerer(f, true) },
} satisfies Record<string, Design>);

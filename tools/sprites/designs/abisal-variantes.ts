import { Material as M, type Point, type SpriteForge } from "../../../src/art/forge";
import { blob, horn, P, type Colours, type Design, type Eye } from "../style";

// Abisal: a cheerful axolotl that sinks into the deep and rises again as an ice leviathan.
// Plus the alternate Élite forms of other lines and the four great fusions.

type F = SpriteForge;

/** A smooth tube along a centre line (Catmull-Rom), radius interpolated per point. */
function tube(f: F, pts: Point[], r: number[], m: M, lift = 0) {
  const k = pts.length, c: Point[] = [], rr: number[] = [];
  for (let i = 0; i < k - 1; i++) {
    const p0 = pts[Math.max(0, i - 1)], p1 = pts[i], p2 = pts[i + 1], p3 = pts[Math.min(k - 1, i + 2)];
    for (let t = 0; t < 1; t += 0.125) {
      const t2 = t * t, t3 = t2 * t;
      c.push([0, 1].map((j) => 0.5 * (2 * p1[j] + (-p0[j] + p2[j]) * t + (2 * p0[j] - 5 * p1[j] + 4 * p2[j] - p3[j]) * t2 + (-p0[j] + 3 * p1[j] - 3 * p2[j] + p3[j]) * t3)) as unknown as Point);
      rr.push(r[i] + (r[i + 1] - r[i]) * t);
    }
  }
  c.push(pts[k - 1]); rr.push(r[k - 1]);
  const left: Point[] = [], right: Point[] = [];
  for (let i = 0; i < c.length; i++) {
    const a = c[Math.max(0, i - 1)], b = c[Math.min(c.length - 1, i + 1)];
    const dx = b[0] - a[0], dy = b[1] - a[1], l = Math.hypot(dx, dy) || 1;
    const nx = -dy / l, ny = dx / l;
    left.push([c[i][0] + nx * rr[i], c[i][1] + ny * rr[i]]);
    right.push([c[i][0] - nx * rr[i], c[i][1] - ny * rr[i]]);
  }
  f.poly([...left, ...right.reverse()], m, lift);
}

/** An axolotl gill frond: a curved stalk with little feathery tufts on its sides. */
function frond(f: F, base: Point, tip: Point, w: number, m: M, lift = 0, tuft = true, glowTip = false) {
  const dx = tip[0] - base[0], dy = tip[1] - base[1], l = Math.hypot(dx, dy);
  const nx = -dy / l, ny = dx / l;
  horn(f, P(base[0] + nx * w, base[1] + ny * w), P(base[0] - nx * w, base[1] - ny * w), tip, 0.02, m, lift);
  if (tuft) for (const t of [0.45, 0.72]) {
    const x = base[0] + dx * t, y = base[1] + dy * t;
    f.ellipse(x + nx * w * 1.1, y + ny * w * 1.1, 0.018, 0.018, m, lift);
    f.ellipse(x - nx * w * 1.1, y - ny * w * 1.1, 0.018, 0.018, m, lift);
  }
  if (glowTip) f.ellipse(tip[0], tip[1], 0.02, 0.02, M.glow, lift + 1);
}

/** A faceted ice crystal from a base point to a tip, with a bright facet line. */
function crystal(f: F, base: Point, tip: Point, w: number, m: M, lift = 0, facet: M = M.second) {
  const dx = tip[0] - base[0], dy = tip[1] - base[1], l = Math.hypot(dx, dy);
  const nx = (-dy / l) * w, ny = (dx / l) * w;
  const mid: Point = [base[0] + dx * 0.55, base[1] + dy * 0.55];
  f.poly([P(base[0] + nx * 0.7, base[1] + ny * 0.7), P(mid[0] + nx, mid[1] + ny), tip, P(mid[0] - nx, mid[1] - ny), P(base[0] - nx * 0.7, base[1] - ny * 0.7)], m, lift);
  f.line(P(base[0] + dx * 0.2 + nx * 0.3, base[1] + dy * 0.2 + ny * 0.3), P(base[0] + dx * 0.8, base[1] + dy * 0.8), facet, 1, lift + 1);
}

/** A little four-point sparkle. */
function spark(f: F, x: number, y: number, s = 0.03, m: M = M.glow) {
  f.line(P(x - s, y), P(x + s, y), m, 1, 4);
  f.line(P(x, y - s), P(x, y + s), m, 1, 4);
}

/** A bubble: a shaded ring with a shine. */
function bubble(f: F, x: number, y: number, r: number, m: M = M.main) {
  f.ring(x, y, r, m, r > 0.04 ? 2 : 1, 3);
  if (r > 0.03) f.ellipse(x - r * 0.35, y - r * 0.35, 0.012, 0.012, M.second, 4);
}

/** A cog wheel: a star polygon with square-ish teeth, and a hub. */
function gear(f: F, cx: number, cy: number, r: number, teeth: number, m: M, lift = 0, hub: M = M.dark) {
  const pts: Point[] = [];
  for (let i = 0; i < teeth * 4; i++) {
    const a = (i / (teeth * 4)) * Math.PI * 2, q = i % 4;
    const rad = q === 1 || q === 2 ? r : r * 0.78;
    pts.push([cx + Math.cos(a) * rad, cy + Math.sin(a) * rad]);
  }
  f.poly(pts, m, lift);
  f.ellipse(cx, cy, r * 0.32, r * 0.32, hub, lift + 1);
}

/** A trail of smoke puffs going up. */
function smoke(f: F, pts: [number, number, number][], m: M = M.dark) {
  for (const [x, y, r] of pts) f.ellipse(x, y, r, r * 0.85, m, 0);
}

// ---------------------------------------------------------------------------------------------
// Palettes

const shallow: Colours = {
  main: ["#3c6fb0", "#5eaee0", "#98daf4", "#dcf6ff"],
  second: ["#d0a888", "#f6dcc0", "#fff0dc", "#fffaf2"],
  accent: ["#b8406e", "#ec7a9c", "#ffaac0", "#ffe2ea"],
  dark: ["#22407a", "#3466a8", "#5492cc", "#8cc4ec"],
  glow: "#ffc24a",
  iris: "#ffa82a",
};
const deep: Colours = {
  main: ["#1e2c62", "#30509a", "#4c7ac0", "#86b4e4"],
  second: ["#5c6aa6", "#94a6d8", "#c4d2f2", "#eef2ff"],
  accent: ["#5c2a74", "#9248a8", "#c87ad4", "#f4bcf0"],
  dark: ["#0e1634", "#1c2850", "#2e3e6e", "#4a5e94"],
  glow: "#ffc04a",
  iris: "#ffd060",
};
const glacial: Colours = {
  main: ["#3a62a8", "#64a2da", "#a6d8f4", "#eafaff"],
  second: ["#8eb2d8", "#d6ecfa", "#f4fcff", "#ffffff"],
  accent: ["#5460b4", "#8698e4", "#c2d2ff", "#f4f8ff"],
  dark: ["#1a2a5c", "#2c4480", "#4a68a8", "#7a98cc"],
  glow: "#ffcc5a",
  iris: "#ffb43a",
};
const absolute: Colours = {
  main: ["#5a4aa4", "#9c92e2", "#d6d2fa", "#ffffff"],
  second: ["#9ab4e0", "#e2eeff", "#ffffff", "#ffffff"],
  accent: ["#2486b0", "#52ccf0", "#a6f2ff", "#ffffff"],
  dark: ["#261c54", "#3c307c", "#5c4ea8", "#8c7ed4"],
  glow: "#ffe27a",
  iris: "#ff5ad0",
};

// ---------------------------------------------------------------------------------------------
// Leviathan body, shared by the Supremo and its Despertar.

function leviathan(f: F, awake: boolean): Eye[] {
  if (awake) {
    // A stopped clock of ice behind it: everything halts.
    f.ring(0.42, 0.42, 0.36, M.accent, 2, 0);
    f.ring(0.42, 0.42, 0.3, M.dark, 1, 0);
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * Math.PI * 2;
      const r0 = i % 3 === 0 ? 0.25 : 0.27;
      f.line(P(0.42 + Math.cos(a) * r0, 0.42 + Math.sin(a) * r0), P(0.42 + Math.cos(a) * 0.3, 0.42 + Math.sin(a) * 0.3), M.accent, 1, 1);
    }
    f.line(P(0.42, 0.42), P(0.42, 0.16), M.dark, 2, 1);
    f.line(P(0.42, 0.42), P(0.24, 0.3), M.dark, 2, 1);
  }
  // Tail fin, then the long coiled body.
  const fin = awake ? M.accent : M.accent;
  crystal(f, P(0.08, 0.62), P(0.02, 0.42), 0.04, fin, 0);
  crystal(f, P(0.08, 0.62), P(0.16, 0.46), 0.035, fin, 0);
  // Far flipper
  blob(f, [P(0.6, 0.58), P(0.76, 0.56), P(0.92, 0.64), P(0.8, 0.68), P(0.64, 0.66)], M.dark, 0);
  tube(f, [P(0.07, 0.6), P(0.1, 0.8), P(0.28, 0.92), P(0.5, 0.9), P(0.6, 0.74), P(0.56, 0.54), P(0.6, 0.38), P(0.7, 0.28)], [0.04, 0.09, 0.125, 0.135, 0.13, 0.115, 0.1, 0.085], M.main, 0);
  // Back crystals along the coil and neck.
  for (const [bx, by, tx, ty, w] of [[0.1, 0.72, 0.02, 0.78, 0.025], [0.18, 0.84, 0.12, 0.96, 0.03], [0.5, 0.56, 0.4, 0.5, 0.03], [0.5, 0.44, 0.38, 0.36, 0.035], [0.54, 0.34, 0.44, 0.22, 0.035]] as const)
    crystal(f, P(bx, by), P(tx, ty), w, M.accent, 1);
  // Belly scutes along the front of the coil and neck.
  for (const [x, y, rx, ry] of [[0.3, 0.86, 0.06, 0.035], [0.44, 0.86, 0.06, 0.035], [0.58, 0.78, 0.045, 0.04], [0.62, 0.66, 0.04, 0.04], [0.62, 0.54, 0.04, 0.04], [0.65, 0.43, 0.04, 0.035]] as const)
    f.ellipse(x, y, rx, ry, M.second, 1);
  // Glowing scale lines.
  f.seamLine(P(0.16, 0.86), P(0.3, 0.94), [M.main]);
  f.seamLine(P(0.52, 0.94), P(0.6, 0.84), [M.main]);
  // Near flipper with ice rays
  blob(f, [P(0.6, 0.62), P(0.78, 0.66), P(0.9, 0.8), P(0.8, 0.82), P(0.66, 0.74)], M.main, 2);
  f.line(P(0.66, 0.66), P(0.86, 0.79), M.accent, 1, 3);
  f.line(P(0.65, 0.7), P(0.78, 0.8), M.accent, 1, 3);
  // Head: long-snouted, with axolotl gill crowns turned to ice
  for (const [bx, by, tx, ty] of [[0.66, 0.2, 0.6, 0.02], [0.64, 0.25, 0.48, 0.1], [0.64, 0.3, 0.46, 0.24]] as const)
    crystal(f, P(bx, by), P(tx, ty), 0.03, M.accent, 1);
  blob(f, [P(0.6, 0.32), P(0.64, 0.18), P(0.78, 0.12), P(0.92, 0.18), P(0.98, 0.28), P(0.9, 0.36), P(0.72, 0.4)], M.main, 2);
  blob(f, [P(0.76, 0.32), P(0.9, 0.29), P(0.97, 0.3), P(0.9, 0.37), P(0.78, 0.38)], M.second, 3);
  f.line(P(0.8, 0.32), P(0.96, 0.31), M.dark, 1, 4);
  // Near gill crown with glowing tips
  for (const [bx, by, tx, ty] of [[0.7, 0.18, 0.7, 0.01], [0.68, 0.22, 0.54, 0.06], [0.68, 0.28, 0.52, 0.2]] as const) {
    crystal(f, P(bx, by), P(tx, ty), 0.035, awake ? M.accent : M.accent, 3);
    f.ellipse(tx + (bx - tx) * 0.12, ty + (by - ty) * 0.12, 0.014, 0.014, M.glow, 5);
  }
  // Frost breath: frozen packets hang in the air.
  for (const [x, y, s] of [[0.9, 0.46, 0.028], [0.82, 0.52, 0.022], [0.95, 0.56, 0.02]] as const) {
    f.poly([P(x, y - s), P(x + s, y), P(x, y + s), P(x - s, y)], M.second, 3);
    f.ellipse(x, y, 0.008, 0.008, M.glow, 4);
  }
  spark(f, 0.96, 0.42, 0.02, M.second);
  if (awake) {
    // A crown of crystal spires and orbiting frozen shards.
    crystal(f, P(0.76, 0.14), P(0.82, 0.0), 0.03, M.second, 4, M.accent);
    crystal(f, P(0.72, 0.15), P(0.66, 0.0), 0.025, M.second, 4, M.accent);
    for (const [x, y, s] of [[0.12, 0.2, 0.035], [0.22, 0.08, 0.025], [0.88, 0.94, 0.03], [0.8, 0.6, 0.02]] as const) {
      f.poly([P(x, y - s * 1.6), P(x + s, y), P(x, y + s * 1.6), P(x - s, y)], M.accent, 3);
      f.line(P(x, y - s), P(x, y + s), M.second, 1, 4);
    }
    f.seamLine(P(0.08, 0.66), P(0.1, 0.8), [M.main]);
    f.seamLine(P(0.56, 0.5), P(0.6, 0.36), [M.main]);
  }
  return [{ x: 0.82, y: 0.22, r: 0.05, angry: true }];
}

// ---------------------------------------------------------------------------------------------

export const abisalVariantes: Record<string, Design> = {
  // Brote: a round bubble with a face, little gill tufts and a ring of baby bubbles.
  burbuja: {
    colours: shallow,
    draw(f) {
      for (const s of [-1, 1]) {
        const x = 0.5 + s * 0.3;
        frond(f, P(x, 0.4), P(0.5 + s * 0.44, 0.2), 0.03, M.accent, 0, true);
        frond(f, P(x + s * 0.03, 0.5), P(0.5 + s * 0.48, 0.4), 0.03, M.accent, 0, true);
        frond(f, P(x + s * 0.03, 0.6), P(0.5 + s * 0.46, 0.6), 0.026, M.accent, 0, true);
      }
      f.ellipse(0.5, 0.6, 0.37, 0.36, M.main, 0);
      // Shine
      blob(f, [P(0.22, 0.5), P(0.26, 0.36), P(0.36, 0.3), P(0.34, 0.36), P(0.27, 0.44)], M.second, 3);
      f.ellipse(0.4, 0.3, 0.02, 0.018, M.second, 3);
      // Cheeks and mouth
      f.ellipse(0.27, 0.66, 0.045, 0.025, M.accent, 2);
      f.ellipse(0.73, 0.66, 0.045, 0.025, M.accent, 2);
      f.poly([P(0.42, 0.68), P(0.58, 0.68), P(0.56, 0.74), P(0.5, 0.77), P(0.44, 0.74)], M.dark, 3);
      f.ellipse(0.5, 0.745, 0.03, 0.018, M.accent, 4);
      bubble(f, 0.86, 0.12, 0.055);
      bubble(f, 0.74, 0.05, 0.025);
      bubble(f, 0.14, 0.12, 0.03);
      return [{ x: 0.37, y: 0.56, r: 0.085 }, { x: 0.63, y: 0.56, r: 0.085 }];
    },
  },

  // Novato: a cheerful upright axolotl puffing a bubble that pops into sparks.
  ajolin: {
    colours: shallow,
    draw(f) {
      // Far gills
      frond(f, P(0.5, 0.2), P(0.44, 0.03), 0.025, M.accent, 0, false);
      frond(f, P(0.48, 0.3), P(0.3, 0.16), 0.025, M.accent, 0, false);
      // Tail with its fin
      blob(f, [P(0.4, 0.74), P(0.24, 0.7), P(0.08, 0.56), P(0.04, 0.62), P(0.12, 0.8), P(0.3, 0.88), P(0.42, 0.86)], M.accent, 0);
      tube(f, [P(0.4, 0.8), P(0.24, 0.8), P(0.12, 0.72), P(0.07, 0.62)], [0.07, 0.055, 0.035, 0.015], M.main, 1);
      f.ellipse(0.42, 0.92, 0.06, 0.05, M.main, 0);
      // Body and belly
      blob(f, [P(0.32, 0.86), P(0.3, 0.64), P(0.42, 0.5), P(0.6, 0.52), P(0.66, 0.72), P(0.6, 0.9), P(0.42, 0.93)], M.main, 1);
      blob(f, [P(0.46, 0.88), P(0.46, 0.64), P(0.58, 0.58), P(0.63, 0.74), P(0.58, 0.88)], M.second, 2);
      // Near leg with toes
      f.ellipse(0.57, 0.9, 0.08, 0.06, M.main, 2);
      for (const x of [0.62, 0.66, 0.7]) f.ellipse(x, 0.95, 0.022, 0.02, M.main, 3);
      // Arm waving forward
      blob(f, [P(0.54, 0.6), P(0.68, 0.6), P(0.76, 0.56), P(0.78, 0.6), P(0.7, 0.67), P(0.55, 0.67)], M.main, 3);
      // Head: wide, flat and smiling
      blob(f, [P(0.34, 0.4), P(0.38, 0.2), P(0.58, 0.12), P(0.82, 0.16), P(0.94, 0.3), P(0.88, 0.44), P(0.66, 0.5), P(0.44, 0.5)], M.main, 2);
      f.ellipse(0.82, 0.4, 0.04, 0.025, M.accent, 3);
      f.poly([P(0.74, 0.43), P(0.8, 0.45), P(0.88, 0.43), P(0.93, 0.38), P(0.92, 0.41), P(0.86, 0.46), P(0.78, 0.47)], M.dark, 4);
      // Near gills
      frond(f, P(0.46, 0.2), P(0.38, 0.02), 0.03, M.accent, 3);
      frond(f, P(0.42, 0.28), P(0.18, 0.18), 0.03, M.accent, 3);
      frond(f, P(0.4, 0.36), P(0.16, 0.4), 0.028, M.accent, 3);
      // A bubble popping into sparks
      bubble(f, 0.9, 0.62, 0.06);
      bubble(f, 0.96, 0.5, 0.02);
      spark(f, 0.92, 0.12, 0.035);
      spark(f, 0.84, 0.04, 0.02);
      f.ellipse(0.97, 0.2, 0.012, 0.012, M.glow, 4);
      return [{ x: 0.72, y: 0.27, r: 0.075 }];
    },
  },

  // Avanzado: a four-legged axolotl riding the crest of a wave of data.
  marealote: {
    colours: shallow,
    draw(f) {
      // The tide: a curling wave behind it, streaked with data lines
      blob(f, [P(0.04, 0.7), P(0.03, 0.4), P(0.12, 0.16), P(0.3, 0.05), P(0.5, 0.06), P(0.6, 0.14), P(0.56, 0.22), P(0.46, 0.16), P(0.32, 0.18), P(0.22, 0.3), P(0.2, 0.5), P(0.24, 0.66)], M.dark, 0);
      f.seamLine(P(0.08, 0.6), P(0.1, 0.3), [M.dark]);
      f.seamLine(P(0.16, 0.2), P(0.34, 0.1), [M.dark]);
      for (const [x, y, r] of [[0.52, 0.09, 0.03], [0.42, 0.07, 0.025], [0.58, 0.17, 0.02], [0.32, 0.08, 0.02]] as const) f.ellipse(x, y, r, r, M.second, 1);
      // Tail with fin
      blob(f, [P(0.3, 0.6), P(0.16, 0.6), P(0.06, 0.66), P(0.08, 0.78), P(0.2, 0.82), P(0.32, 0.76)], M.accent, 1);
      tube(f, [P(0.32, 0.68), P(0.18, 0.72), P(0.09, 0.7)], [0.07, 0.04, 0.015], M.main, 2);
      // Far legs
      f.ellipse(0.32, 0.88, 0.06, 0.08, M.main, 1);
      f.ellipse(0.62, 0.88, 0.06, 0.08, M.main, 1);
      // Dorsal fin then body
      blob(f, [P(0.24, 0.56), P(0.3, 0.4), P(0.44, 0.34), P(0.6, 0.38), P(0.5, 0.46), P(0.32, 0.52)], M.accent, 1);
      blob(f, [P(0.2, 0.7), P(0.26, 0.5), P(0.46, 0.43), P(0.66, 0.46), P(0.76, 0.62), P(0.66, 0.8), P(0.42, 0.84), P(0.24, 0.8)], M.main, 2);
      blob(f, [P(0.32, 0.8), P(0.5, 0.7), P(0.68, 0.64), P(0.72, 0.74), P(0.58, 0.82), P(0.38, 0.84)], M.second, 3);
      for (const [x, y] of [[0.36, 0.56], [0.46, 0.52], [0.56, 0.54]] as const) f.ellipse(x, y, 0.014, 0.014, M.glow, 3);
      // Near legs with toes
      blob(f, [P(0.26, 0.72), P(0.38, 0.7), P(0.42, 0.84), P(0.44, 0.95), P(0.28, 0.96), P(0.26, 0.84)], M.main, 4);
      blob(f, [P(0.58, 0.7), P(0.7, 0.7), P(0.72, 0.84), P(0.76, 0.95), P(0.58, 0.96), P(0.58, 0.84)], M.main, 4);
      for (const x of [0.36, 0.4, 0.44]) f.ellipse(x, 0.95, 0.02, 0.018, M.main, 5);
      for (const x of [0.68, 0.72, 0.76]) f.ellipse(x, 0.95, 0.02, 0.018, M.main, 5);
      // Head
      blob(f, [P(0.56, 0.48), P(0.6, 0.3), P(0.76, 0.22), P(0.92, 0.26), P(0.98, 0.4), P(0.9, 0.54), P(0.72, 0.58)], M.main, 3);
      f.ellipse(0.88, 0.48, 0.035, 0.022, M.accent, 4);
      f.poly([P(0.78, 0.5), P(0.86, 0.52), P(0.94, 0.5), P(0.97, 0.46), P(0.96, 0.49), P(0.9, 0.54), P(0.82, 0.54)], M.dark, 5);
      // Gills, grown long
      frond(f, P(0.64, 0.28), P(0.58, 0.04), 0.03, M.accent, 4);
      frond(f, P(0.62, 0.35), P(0.38, 0.22), 0.032, M.accent, 4);
      frond(f, P(0.6, 0.44), P(0.38, 0.42), 0.03, M.accent, 4);
      bubble(f, 0.92, 0.12, 0.045);
      bubble(f, 0.84, 0.05, 0.02);
      return [{ x: 0.8, y: 0.36, r: 0.065 }];
    },
  },

  // Élite: a heavy deep-sea axolotl with a lure, fangs and glowing photophores.
  abisalote: {
    colours: deep,
    draw(f) {
      // Long far gills trailing back
      frond(f, P(0.6, 0.28), P(0.4, 0.04), 0.025, M.accent, 0, false, true);
      frond(f, P(0.58, 0.36), P(0.26, 0.2), 0.025, M.accent, 0, false, true);
      // Tail with a ragged fin
      f.poly([P(0.3, 0.56), P(0.2, 0.5), P(0.16, 0.56), P(0.08, 0.46), P(0.06, 0.56), P(0.0, 0.56), P(0.04, 0.7), P(0.02, 0.8), P(0.12, 0.8), P(0.14, 0.88), P(0.24, 0.82), P(0.32, 0.8)], M.accent, 0);
      tube(f, [P(0.34, 0.68), P(0.2, 0.7), P(0.08, 0.66)], [0.09, 0.05, 0.02], M.main, 1);
      // Far legs
      f.ellipse(0.26, 0.88, 0.07, 0.08, M.dark, 0);
      f.ellipse(0.6, 0.9, 0.07, 0.07, M.dark, 0);
      // Back spines then body
      for (const [x, y, tx, ty] of [[0.26, 0.42, 0.18, 0.26], [0.36, 0.36, 0.3, 0.18], [0.46, 0.34, 0.44, 0.16]] as const) horn(f, P(x - 0.04, y + 0.03), P(x + 0.04, y), P(tx, ty), -0.02, M.accent, 1);
      blob(f, [P(0.14, 0.72), P(0.18, 0.48), P(0.36, 0.34), P(0.58, 0.34), P(0.72, 0.5), P(0.72, 0.74), P(0.5, 0.86), P(0.24, 0.86)], M.main, 2);
      blob(f, [P(0.3, 0.84), P(0.46, 0.68), P(0.64, 0.6), P(0.72, 0.68), P(0.64, 0.8), P(0.44, 0.88)], M.second, 3);
      // Photophores
      for (const [x, y] of [[0.24, 0.6], [0.32, 0.54], [0.41, 0.5], [0.5, 0.48], [0.58, 0.5]] as const) f.ellipse(x, y, 0.016, 0.016, M.glow, 3);
      f.seamLine(P(0.2, 0.66), P(0.5, 0.58), [M.main]);
      // Near legs: webbed, clawed
      blob(f, [P(0.22, 0.7), P(0.38, 0.68), P(0.42, 0.84), P(0.44, 0.96), P(0.22, 0.96), P(0.22, 0.84)], M.main, 4);
      blob(f, [P(0.56, 0.68), P(0.7, 0.68), P(0.72, 0.86), P(0.76, 0.96), P(0.56, 0.96), P(0.56, 0.84)], M.main, 4);
      for (const x of [0.38, 0.43]) horn(f, P(x, 0.96), P(x + 0.03, 0.94), P(x + 0.07, 0.98), 0, M.second, 5);
      for (const x of [0.71, 0.76]) horn(f, P(x, 0.96), P(x + 0.03, 0.94), P(x + 0.07, 0.98), 0, M.second, 5);
      // Head with a big jaw
      blob(f, [P(0.56, 0.44), P(0.62, 0.28), P(0.8, 0.22), P(0.96, 0.3), P(0.98, 0.46), P(0.9, 0.6), P(0.7, 0.64), P(0.58, 0.58)], M.main, 3);
      f.poly([P(0.7, 0.5), P(0.98, 0.46), P(0.96, 0.54), P(0.78, 0.58)], M.dark, 4);
      for (const x of [0.8, 0.86, 0.92]) f.triangle(P(x, 0.48), P(x + 0.04, 0.475), P(x + 0.02, 0.53), M.second, 5);
      for (const x of [0.82, 0.88]) f.triangle(P(x, 0.57), P(x + 0.04, 0.56), P(x + 0.025, 0.515), M.second, 5);
      // The lure
      tube(f, [P(0.72, 0.26), P(0.74, 0.1), P(0.86, 0.04), P(0.94, 0.1)], [0.012, 0.012, 0.01, 0.008], M.main, 4);
      f.ellipse(0.94, 0.15, 0.04, 0.04, M.glow, 5);
      f.ellipse(0.93, 0.14, 0.014, 0.014, M.second, 6);
      // Near gills with glowing tips
      frond(f, P(0.62, 0.3), P(0.46, 0.04), 0.03, M.accent, 4, true, true);
      frond(f, P(0.6, 0.38), P(0.3, 0.26), 0.032, M.accent, 4, true, true);
      frond(f, P(0.6, 0.48), P(0.36, 0.48), 0.03, M.accent, 4, true, true);
      bubble(f, 0.06, 0.16, 0.03);
      bubble(f, 0.14, 0.06, 0.02);
      return [{ x: 0.8, y: 0.36, r: 0.055, angry: true }];
    },
  },

  // Supremo: an ice leviathan coiled upright, gill crown turned to crystal, freezing packets mid-air.
  "leviatan-glacial": {
    colours: glacial,
    draw: (f) => leviathan(f, false),
  },

  // Despertar: violet-white, crowned, before a stopped clock of ice; shards hang frozen around it.
  "leviatan-glacial-cero-absoluto": {
    colours: absolute,
    draw: (f) => leviathan(f, true),
  },

  // Élite (forja): a burnt-out forge dragon of cracked charcoal rock, smoke and smouldering lava.
  escoria: {
    colours: {
      main: ["#2c2632", "#4a4250", "#6c6272", "#968c98"],
      second: ["#5c2a2c", "#8e3c30", "#bc5c3a", "#ec8e5a"],
      accent: ["#3a3238", "#62565c", "#8e7e80", "#bcaaa8"],
      dark: ["#4a4656", "#6a6676", "#908c9c", "#b8b4c2"],
      glow: "#ff8a2a",
      iris: "#ffb43a",
    },
    draw(f) {
      // Smoke rising from the back
      smoke(f, [[0.2, 0.3, 0.07], [0.14, 0.18, 0.06], [0.2, 0.08, 0.05], [0.3, 0.04, 0.035]]);
      // Tail ending in an ember, not a flame
      tube(f, [P(0.3, 0.76), P(0.14, 0.8), P(0.04, 0.72), P(0.05, 0.62)], [0.06, 0.045, 0.03, 0.015], M.main, 0);
      f.ellipse(0.05, 0.6, 0.025, 0.03, M.glow, 1);
      // Far wing, tattered
      f.poly([P(0.4, 0.4), P(0.32, 0.06), P(0.26, 0.2), P(0.2, 0.14), P(0.16, 0.28), P(0.06, 0.3), P(0.3, 0.48)], M.main, 0);
      f.ellipse(0.34, 0.88, 0.1, 0.09, M.main, 0);
      // Body
      blob(f, [P(0.22, 0.76), P(0.24, 0.48), P(0.42, 0.34), P(0.66, 0.4), P(0.74, 0.62), P(0.64, 0.84), P(0.36, 0.88)], M.main, 1);
      f.seamLine(P(0.28, 0.5), P(0.34, 0.6), [M.main]);
      f.seamLine(P(0.34, 0.6), P(0.3, 0.72), [M.main]);
      f.seamLine(P(0.34, 0.6), P(0.44, 0.64), [M.main]);
      f.seamLine(P(0.4, 0.44), P(0.46, 0.5), [M.main]);
      // Cracked chest plate with a dim furnace
      blob(f, [P(0.46, 0.8), P(0.46, 0.52), P(0.6, 0.44), P(0.72, 0.56), P(0.7, 0.74), P(0.6, 0.84)], M.accent, 2);
      f.ellipse(0.59, 0.64, 0.045, 0.055, M.second, 3);
      f.ellipse(0.59, 0.65, 0.022, 0.03, M.glow, 4);
      f.seamLine(P(0.5, 0.54), P(0.56, 0.6), [M.accent]);
      f.seamLine(P(0.62, 0.7), P(0.66, 0.8), [M.accent]);
      // Near wing: torn membrane of cooled lava
      f.poly([P(0.42, 0.44), P(0.44, 0.06), P(0.38, 0.2), P(0.34, 0.12), P(0.3, 0.26), P(0.22, 0.2), P(0.22, 0.32), P(0.1, 0.36), P(0.18, 0.4), P(0.36, 0.5)], M.second, 2);
      f.line(P(0.42, 0.42), P(0.43, 0.08), M.main, 1, 3);
      f.line(P(0.4, 0.42), P(0.33, 0.14), M.main, 1, 3);
      f.line(P(0.38, 0.44), P(0.2, 0.22), M.main, 1, 3);
      f.seamLine(P(0.3, 0.3), P(0.36, 0.36), [M.second]);
      // Legs
      blob(f, [P(0.5, 0.74), P(0.66, 0.74), P(0.7, 0.9), P(0.72, 0.96), P(0.5, 0.96), P(0.48, 0.84)], M.main, 3);
      f.seamLine(P(0.56, 0.78), P(0.6, 0.9), [M.main]);
      for (const x of [0.64, 0.7]) horn(f, P(x, 0.96), P(x + 0.03, 0.94), P(x + 0.08, 0.98), 0, M.accent, 4);
      blob(f, [P(0.66, 0.5), P(0.82, 0.56), P(0.88, 0.64), P(0.78, 0.68), P(0.66, 0.6)], M.main, 4);
      horn(f, P(0.86, 0.62), P(0.88, 0.66), P(0.94, 0.68), 0.01, M.accent, 5);
      // Head, one horn snapped
      blob(f, [P(0.54, 0.36), P(0.6, 0.2), P(0.76, 0.14), P(0.94, 0.24), P(0.97, 0.34), P(0.82, 0.42), P(0.64, 0.44)], M.main, 3);
      blob(f, [P(0.78, 0.36), P(0.92, 0.3), P(0.97, 0.33), P(0.88, 0.4)], M.accent, 4);
      f.seamLine(P(0.64, 0.24), P(0.7, 0.34), [M.main]);
      f.seamLine(P(0.84, 0.36), P(0.9, 0.36), [M.accent]);
      horn(f, P(0.62, 0.2), P(0.68, 0.16), P(0.56, 0.0), -0.06, M.accent, 4);
      f.poly([P(0.7, 0.16), P(0.75, 0.15), P(0.76, 0.08), P(0.73, 0.1), P(0.71, 0.07)], M.accent, 4);
      // Smoke from the nostril and floating embers
      smoke(f, [[0.97, 0.18, 0.025], [0.93, 0.1, 0.03]]);
      for (const [x, y] of [[0.12, 0.44], [0.48, 0.06], [0.86, 0.04]] as const) f.ellipse(x, y, 0.012, 0.012, M.glow, 5);
      return [{ x: 0.8, y: 0.24, r: 0.055, angry: true }];
    },
  },

  // Élite (eco): a sleek ninja hare, speaker ears muffled with wraps, scarf flowing behind.
  silencio: {
    colours: {
      main: ["#6a84b8", "#a6c2ea", "#d8e8ff", "#ffffff"],
      second: ["#8e9ec8", "#c8d4f0", "#eef2ff", "#ffffff"],
      accent: ["#1e2650", "#323f74", "#4e5e9e", "#7a8cc8"],
      dark: ["#262c4e", "#3e4878", "#5c6aa0", "#8a98c6"],
      glow: "#8ee8ff",
      iris: "#40c4ff",
    },
    draw(f) {
      // Scarf trailing back
      blob(f, [P(0.58, 0.46), P(0.42, 0.4), P(0.26, 0.44), P(0.12, 0.36), P(0.02, 0.4), P(0.12, 0.5), P(0.04, 0.56), P(0.22, 0.54), P(0.4, 0.52), P(0.58, 0.54)], M.accent, 0);
      // Far ear swept back, its speaker bell wrapped shut
      tube(f, [P(0.66, 0.3), P(0.56, 0.16), P(0.46, 0.1)], [0.035, 0.035, 0.03], M.main, 0);
      f.ellipse(0.42, 0.08, 0.05, 0.055, M.accent, 1);
      f.ellipse(0.41, 0.08, 0.035, 0.04, M.second, 2);
      f.line(P(0.38, 0.06), P(0.44, 0.1), M.accent, 1, 3);
      // Far legs
      blob(f, [P(0.6, 0.66), P(0.68, 0.7), P(0.7, 0.9), P(0.74, 0.96), P(0.6, 0.96), P(0.6, 0.84)], M.second, 0);
      // Tail puff and body, low and ready
      f.ellipse(0.13, 0.64, 0.06, 0.06, M.second, 0);
      blob(f, [P(0.16, 0.74), P(0.22, 0.54), P(0.4, 0.46), P(0.58, 0.48), P(0.68, 0.62), P(0.6, 0.8), P(0.34, 0.86), P(0.2, 0.84)], M.main, 1);
      blob(f, [P(0.4, 0.82), P(0.54, 0.7), P(0.64, 0.64), P(0.66, 0.74), P(0.56, 0.84)], M.second, 2);
      // Big hind leg with a long foot flat on the ground
      blob(f, [P(0.18, 0.72), P(0.28, 0.6), P(0.42, 0.66), P(0.44, 0.82), P(0.4, 0.9), P(0.56, 0.92), P(0.58, 0.97), P(0.2, 0.97), P(0.16, 0.86)], M.main, 3);
      f.line(P(0.26, 0.97), P(0.56, 0.97), M.accent, 1, 4);
      // Near arm forward, a wrapped paw raised to stop the sound
      blob(f, [P(0.6, 0.6), P(0.72, 0.64), P(0.82, 0.62), P(0.88, 0.56), P(0.9, 0.62), P(0.82, 0.7), P(0.62, 0.7)], M.main, 3);
      f.ellipse(0.88, 0.57, 0.04, 0.045, M.accent, 4);
      f.line(P(0.85, 0.54), P(0.91, 0.6), M.dark, 1, 5);
      // Head: round, compact
      blob(f, [P(0.58, 0.44), P(0.6, 0.3), P(0.72, 0.23), P(0.86, 0.26), P(0.95, 0.37), P(0.9, 0.47), P(0.72, 0.52)], M.main, 3);
      // Face veil over the muzzle, its ties fluttering back
      blob(f, [P(0.7, 0.42), P(0.86, 0.38), P(0.97, 0.39), P(0.93, 0.48), P(0.76, 0.52), P(0.64, 0.5)], M.accent, 4);
      f.line(P(0.66, 0.44), P(0.5, 0.38), M.accent, 2, 4);
      f.line(P(0.66, 0.46), P(0.48, 0.48), M.accent, 2, 4);
      f.seamLine(P(0.72, 0.46), P(0.92, 0.42), [M.accent]);
      // Near ear swept back, inner ear dark, wrapped speaker bell
      tube(f, [P(0.72, 0.28), P(0.68, 0.14), P(0.62, 0.07)], [0.045, 0.042, 0.035], M.main, 4);
      f.line(P(0.71, 0.24), P(0.66, 0.11), M.dark, 1, 5);
      f.ellipse(0.58, 0.07, 0.06, 0.055, M.accent, 5);
      f.ellipse(0.575, 0.07, 0.045, 0.042, M.second, 6);
      f.line(P(0.54, 0.04), P(0.61, 0.1), M.accent, 1, 7);
      f.line(P(0.61, 0.04), P(0.54, 0.1), M.accent, 1, 7);
      // Muted sound: hushed glow dots in front of the paw
      for (const [x, y] of [[0.95, 0.5], [0.97, 0.58], [0.95, 0.66]] as const) f.ellipse(x, y, 0.01, 0.01, M.glow, 5);
      return [{ x: 0.79, y: 0.33, r: 0.055, angry: true }];
    },
  },

  // Élite (pliegue): an origami fox soaked in night ink, black paper dripping into a puddle.
  "tinta-negra": {
    colours: {
      main: ["#1e1e3c", "#34345e", "#525290", "#8282c0"],
      second: ["#7c7c98", "#b8b8cc", "#e0e0ec", "#ffffff"],
      accent: ["#3c1a5c", "#622c90", "#8e4cc4", "#c490f0"],
      dark: ["#0c0c1a", "#1a1a32", "#2a2a4c", "#3e3e6a"],
      glow: "#c88aff",
      iris: "#e04aff",
    },
    draw(f) {
      // Ink puddle
      f.ellipse(0.48, 0.95, 0.38, 0.035, M.dark, 0);
      // Big folded tail curling up behind
      f.poly([P(0.36, 0.86), P(0.14, 0.88), P(0.04, 0.7), P(0.06, 0.46), P(0.18, 0.3), P(0.24, 0.5), P(0.3, 0.7)], M.main, 0);
      f.poly([P(0.06, 0.46), P(0.18, 0.3), P(0.24, 0.5), P(0.12, 0.6)], M.accent, 1);
      f.poly([P(0.06, 0.46), P(0.1, 0.32), P(0.18, 0.3)], M.second, 2);
      f.line(P(0.04, 0.7), P(0.3, 0.7), M.dark, 1, 2);
      // Ink drips from the tail
      f.line(P(0.1, 0.86), P(0.1, 0.92), M.main, 1, 2);
      // Far legs
      f.poly([P(0.48, 0.64), P(0.56, 0.64), P(0.56, 0.95), P(0.48, 0.95)], M.main, 0);
      // Body, sitting
      f.poly([P(0.26, 0.94), P(0.28, 0.68), P(0.42, 0.48), P(0.58, 0.42), P(0.68, 0.62), P(0.64, 0.94)], M.main, 1);
      f.poly([P(0.56, 0.44), P(0.68, 0.62), P(0.66, 0.8), P(0.54, 0.62)], M.second, 2);
      f.poly([P(0.6, 0.6), P(0.67, 0.66), P(0.66, 0.8), P(0.58, 0.68)], M.accent, 3);
      f.line(P(0.42, 0.48), P(0.48, 0.94), M.dark, 1, 2);
      // Hind haunch
      f.poly([P(0.24, 0.94), P(0.26, 0.74), P(0.38, 0.66), P(0.48, 0.8), P(0.46, 0.95)], M.main, 3);
      f.line(P(0.26, 0.74), P(0.46, 0.94), M.dark, 1, 4);
      // Near foreleg
      f.poly([P(0.58, 0.66), P(0.68, 0.66), P(0.7, 0.92), P(0.76, 0.96), P(0.58, 0.96)], M.main, 3);
      f.line(P(0.66, 0.8), P(0.66, 0.9), M.accent, 1, 4);
      // Head with folded ears and a pointed snout
      f.triangle(P(0.58, 0.26), P(0.62, 0.02), P(0.7, 0.22), M.main, 3);
      f.poly([P(0.56, 0.44), P(0.56, 0.28), P(0.64, 0.2), P(0.8, 0.22), P(0.97, 0.34), P(0.82, 0.4), P(0.66, 0.48)], M.main, 4);
      f.poly([P(0.8, 0.22), P(0.97, 0.34), P(0.82, 0.34)], M.accent, 5);
      f.poly([P(0.56, 0.44), P(0.66, 0.48), P(0.82, 0.4), P(0.7, 0.38)], M.dark, 5);
      f.triangle(P(0.66, 0.22), P(0.78, 0.0), P(0.78, 0.24), M.main, 5);
      f.triangle(P(0.7, 0.2), P(0.77, 0.06), P(0.77, 0.21), M.accent, 6);
      // Unsoaked paper still shows on the ear tip and cheek
      f.triangle(P(0.76, 0.04), P(0.78, 0.0), P(0.78, 0.08), M.second, 7);
      f.triangle(P(0.6, 0.36), P(0.66, 0.42), P(0.58, 0.42), M.second, 6);
      // Ink dripping from jaw and chest
      f.line(P(0.82, 0.4), P(0.82, 0.5), M.main, 1, 6);
      f.ellipse(0.82, 0.52, 0.016, 0.022, M.main, 6);
      f.line(P(0.64, 0.8), P(0.64, 0.88), M.accent, 1, 6);
      f.ellipse(0.9, 0.42, 0.012, 0.016, M.main, 6);
      f.seamLine(P(0.3, 0.86), P(0.42, 0.7), [M.main]);
      for (const [x, y] of [[0.88, 0.1], [0.94, 0.2], [0.36, 0.16]] as const) f.ellipse(x, y, 0.01, 0.01, M.glow, 5);
      return [{ x: 0.74, y: 0.3, r: 0.05, angry: true }];
    },
  },

  // Élite (glitch): a jester puppet turned hero; strings cut, code-blade raised, cape flying.
  "bufon-leal": {
    colours: {
      main: ["#2a3a8c", "#3a64cc", "#6c9cee", "#b2d6ff"],
      second: ["#b06e2a", "#f0b03a", "#ffd870", "#fff4c4"],
      accent: ["#8a1a3c", "#d63c4c", "#ff7a6a", "#ffc4b0"],
      dark: ["#4a2e2c", "#7c503c", "#aa7650", "#d6a67a"],
      glow: "#5cffd0",
      iris: "#2affc4",
    },
    draw(f) {
      // Cape flying back
      blob(f, [P(0.44, 0.34), P(0.3, 0.38), P(0.16, 0.5), P(0.04, 0.72), P(0.1, 0.78), P(0.14, 0.92), P(0.26, 0.84), P(0.36, 0.86), P(0.44, 0.6)], M.accent, 0);
      // Cut strings, still trailing from the cross-bar stub
      f.line(P(0.34, 0.02), P(0.36, 0.2), M.second, 1, 0);
      f.line(P(0.24, 0.08), P(0.32, 0.3), M.second, 1, 0);
      // Far leg (back), wooden knee
      tube(f, [P(0.44, 0.66), P(0.36, 0.8), P(0.3, 0.94)], [0.04, 0.035, 0.035], M.second, 1);
      f.ellipse(0.27, 0.95, 0.06, 0.03, M.dark, 2);
      f.ellipse(0.37, 0.8, 0.03, 0.03, M.dark, 2);
      // Far arm back with a cut string
      tube(f, [P(0.44, 0.42), P(0.34, 0.5), P(0.26, 0.52)], [0.03, 0.028, 0.025], M.main, 1);
      f.ellipse(0.24, 0.52, 0.03, 0.03, M.dark, 2);
      f.line(P(0.24, 0.5), P(0.22, 0.4), M.second, 1, 2);
      f.line(P(0.21, 0.39), P(0.2, 0.37), M.second, 1, 2);
      // Torso: harlequin tunic
      blob(f, [P(0.4, 0.68), P(0.4, 0.42), P(0.5, 0.34), P(0.6, 0.38), P(0.62, 0.56), P(0.58, 0.7)], M.main, 2);
      f.poly([P(0.51, 0.38), P(0.57, 0.48), P(0.51, 0.58), P(0.45, 0.48)], M.second, 3);
      f.poly([P(0.51, 0.58), P(0.56, 0.66), P(0.51, 0.7), P(0.46, 0.66)], M.accent, 3);
      f.rect(0.4, 0.62, 0.61, 0.66, M.dark, 4);
      // Ruffled collar
      for (const x of [0.43, 0.49, 0.55, 0.61]) f.ellipse(x, 0.36, 0.035, 0.03, M.second, 4);
      // Near leg striding forward
      tube(f, [P(0.54, 0.66), P(0.62, 0.8), P(0.64, 0.92)], [0.045, 0.04, 0.035], M.accent, 4);
      f.ellipse(0.62, 0.8, 0.03, 0.03, M.dark, 5);
      blob(f, [P(0.6, 0.9), P(0.7, 0.9), P(0.78, 0.92), P(0.82, 0.88), P(0.82, 0.96), P(0.6, 0.97)], M.dark, 5);
      // Code-blade raised forward
      f.poly([P(0.74, 0.44), P(0.94, 0.08), P(0.97, 0.06), P(0.95, 0.12), P(0.77, 0.47)], M.glow, 4);
      f.line(P(0.7, 0.42), P(0.82, 0.5), M.second, 2, 5);
      // Near arm holding it
      tube(f, [P(0.56, 0.42), P(0.64, 0.5), P(0.74, 0.46)], [0.035, 0.03, 0.03], M.main, 5);
      f.ellipse(0.64, 0.5, 0.025, 0.025, M.dark, 6);
      f.ellipse(0.75, 0.46, 0.035, 0.035, M.second, 6);
      f.line(P(0.74, 0.43), P(0.72, 0.32), M.second, 1, 6);
      f.line(P(0.715, 0.3), P(0.71, 0.28), M.second, 1, 6);
      // Head: a carved wooden mask
      f.ellipse(0.58, 0.24, 0.11, 0.1, M.dark, 5);
      f.poly([P(0.6, 0.28), P(0.68, 0.3), P(0.62, 0.32)], M.accent, 6);
      f.line(P(0.6, 0.3), P(0.68, 0.29), M.accent, 1, 6);
      // Jester hat: two floppy points with bells
      blob(f, [P(0.46, 0.2), P(0.44, 0.1), P(0.36, 0.04), P(0.24, 0.1), P(0.3, 0.12), P(0.4, 0.14), P(0.48, 0.24)], M.accent, 6);
      blob(f, [P(0.5, 0.16), P(0.58, 0.06), P(0.72, 0.02), P(0.84, 0.08), P(0.76, 0.1), P(0.64, 0.12), P(0.6, 0.18)], M.main, 6);
      f.rect(0.46, 0.15, 0.7, 0.19, M.second, 7);
      f.ellipse(0.23, 0.11, 0.03, 0.03, M.second, 8);
      f.ellipse(0.86, 0.09, 0.03, 0.03, M.second, 8);
      // A glitch tear across the body: it is still made of broken code
      f.glitchRows([0.56, 0.57], 1);
      f.glitchRows([0.86], -1);
      return [{ x: 0.63, y: 0.23, r: 0.05, angry: true }];
    },
  },

  // Fusión: a fire dragon in a beetle paladin's armour — rhino horn helm, elytra shell wings, flame mantle.
  "emperador-crisol": {
    colours: {
      main: ["#8e2431", "#d8443a", "#f27a4a", "#ffb27a"],
      second: ["#b47a2a", "#eebc4a", "#ffe08a", "#fff6cc"],
      accent: ["#3c3450", "#665c80", "#a098b8", "#e6e0f2"],
      dark: ["#103a3c", "#1c6058", "#2c8c78", "#62c4a6"],
      glow: "#ffd04a",
      iris: "#ff9a1a",
    },
    draw(f) {
      // Elytra shell halves spread open behind like a mantle, flame between them
      blob(f, [P(0.4, 0.34), P(0.24, 0.18), P(0.08, 0.16), P(0.04, 0.34), P(0.14, 0.52), P(0.34, 0.48)], M.glow, 0);
      blob(f, [P(0.38, 0.32), P(0.24, 0.24), P(0.12, 0.28), P(0.16, 0.42), P(0.32, 0.44)], M.main, 1);
      tube(f, [P(0.42, 0.3), P(0.28, 0.14), P(0.1, 0.04)], [0.05, 0.08, 0.02], M.dark, 2);
      f.line(P(0.4, 0.27), P(0.12, 0.05), M.second, 1, 3);
      tube(f, [P(0.38, 0.4), P(0.2, 0.48), P(0.03, 0.62)], [0.05, 0.08, 0.02], M.dark, 2);
      f.line(P(0.36, 0.37), P(0.05, 0.6), M.second, 1, 3);
      // Tail with a flame tip
      tube(f, [P(0.34, 0.82), P(0.2, 0.9), P(0.08, 0.86)], [0.07, 0.05, 0.025], M.main, 2);
      blob(f, [P(0.02, 0.9), P(0.02, 0.76), P(0.06, 0.68), P(0.08, 0.76), P(0.12, 0.72), P(0.12, 0.86)], M.glow, 3);
      // Far leg
      blob(f, [P(0.34, 0.74), P(0.46, 0.74), P(0.48, 0.96), P(0.3, 0.96)], M.main, 2);
      // Torso
      blob(f, [P(0.32, 0.8), P(0.3, 0.5), P(0.42, 0.32), P(0.6, 0.32), P(0.7, 0.5), P(0.68, 0.78), P(0.5, 0.86)], M.main, 3);
      // Gold breastplate with a forge core, belt
      blob(f, [P(0.44, 0.76), P(0.42, 0.5), P(0.54, 0.38), P(0.68, 0.46), P(0.68, 0.7), P(0.58, 0.78)], M.second, 4);
      f.ellipse(0.56, 0.56, 0.05, 0.06, M.accent, 5);
      f.ellipse(0.56, 0.56, 0.03, 0.04, M.glow, 6);
      f.rect(0.34, 0.74, 0.7, 0.79, M.accent, 6);
      f.rect(0.5, 0.74, 0.56, 0.79, M.second, 7);
      // Near leg with a gold greave and talons
      blob(f, [P(0.5, 0.78), P(0.64, 0.78), P(0.68, 0.92), P(0.7, 0.96), P(0.48, 0.96), P(0.48, 0.86)], M.main, 7);
      f.rect(0.5, 0.84, 0.66, 0.89, M.second, 8);
      for (const x of [0.64, 0.7]) horn(f, P(x, 0.96), P(x + 0.03, 0.94), P(x + 0.08, 0.98), 0, M.accent, 8);
      // Flaming lance held upright
      f.line(P(0.88, 0.16), P(0.88, 0.97), M.accent, 2, 6);
      f.poly([P(0.85, 0.18), P(0.88, 0.04), P(0.91, 0.18)], M.second, 7);
      blob(f, [P(0.86, 0.06), P(0.84, 0.0), P(0.88, 0.01), P(0.92, 0.0), P(0.9, 0.06)], M.glow, 7);
      f.rect(0.84, 0.2, 0.93, 0.23, M.second, 7);
      // Elytra pauldron and gauntlet arm gripping the lance
      tube(f, [P(0.56, 0.44), P(0.7, 0.54), P(0.84, 0.5)], [0.05, 0.045, 0.04], M.main, 8);
      f.ellipse(0.87, 0.5, 0.045, 0.045, M.accent, 9);
      blob(f, [P(0.46, 0.4), P(0.52, 0.32), P(0.66, 0.34), P(0.7, 0.44), P(0.6, 0.48), P(0.5, 0.48)], M.dark, 9);
      f.line(P(0.5, 0.42), P(0.68, 0.42), M.second, 1, 10);
      // Head in a gold helm
      blob(f, [P(0.48, 0.28), P(0.52, 0.16), P(0.66, 0.12), P(0.78, 0.16), P(0.84, 0.26), P(0.74, 0.34), P(0.56, 0.36)], M.main, 8);
      blob(f, [P(0.7, 0.28), P(0.8, 0.24), P(0.84, 0.27), P(0.76, 0.33)], M.second, 9);
      blob(f, [P(0.48, 0.26), P(0.5, 0.15), P(0.62, 0.1), P(0.74, 0.12), P(0.72, 0.17), P(0.6, 0.19), P(0.54, 0.28)], M.second, 9);
      f.seamLine(P(0.52, 0.18), P(0.7, 0.13), [M.second]);
      // Beetle horn rising from the helm, curving forward; swept dragon horn behind
      horn(f, P(0.56, 0.14), P(0.7, 0.12), P(0.82, 0.02), 0.06, M.dark, 10);
      f.line(P(0.64, 0.1), P(0.76, 0.02), M.second, 1, 11);
      horn(f, P(0.5, 0.18), P(0.54, 0.14), P(0.36, 0.06), -0.03, M.accent, 10);
      return [{ x: 0.72, y: 0.21, r: 0.045, angry: true }];
    },
  },

  // Fusión: a many-tailed origami fox of indigo paper before a black eclipse; light folds and glitches.
  "eclipse-plegado": {
    colours: {
      main: ["#221c50", "#383486", "#5a56b8", "#908ee4"],
      second: ["#8a8ab2", "#cacbe8", "#eeeefa", "#ffffff"],
      accent: ["#6a1a5c", "#aa3a8e", "#e26cc2", "#ffb4ea"],
      dark: ["#06061a", "#10102e", "#1c1c46", "#2a2a60"],
      glow: "#ffd88a",
      iris: "#ff5ad0",
    },
    draw(f) {
      // The eclipse: a black disc with a burning corona
      f.ellipse(0.36, 0.32, 0.3, 0.3, M.glow, 0);
      f.ellipse(0.37, 0.33, 0.27, 0.27, M.dark, 1);
      // Three folded tails fanning up
      for (const [tx, ty, c] of [[0.02, 0.2, M.accent], [0.12, 0.04, M.main], [0.32, 0.02, M.accent]] as const) {
        f.poly([P(0.34, 0.74), P(0.26, 0.6), P(tx, ty), P(0.36, 0.56)], c, 2);
        f.poly([P(tx, ty), P(tx + 0.04, ty + 0.08), P(tx + 0.1, ty + 0.04)], M.second, 3);
      }
      // Far legs
      f.poly([P(0.36, 0.7), P(0.46, 0.7), P(0.46, 0.96), P(0.34, 0.96)], M.main, 2);
      f.poly([P(0.62, 0.66), P(0.7, 0.66), P(0.7, 0.96), P(0.6, 0.96)], M.main, 2);
      // Body: folded chest and flank
      f.poly([P(0.24, 0.84), P(0.26, 0.6), P(0.44, 0.46), P(0.66, 0.42), P(0.76, 0.6), P(0.7, 0.8), P(0.5, 0.86)], M.main, 3);
      f.poly([P(0.62, 0.44), P(0.76, 0.6), P(0.72, 0.78), P(0.6, 0.62)], M.second, 4);
      f.line(P(0.44, 0.46), P(0.5, 0.86), M.dark, 1, 4);
      f.seamLine(P(0.3, 0.62), P(0.44, 0.52), [M.main]);
      // Near legs
      f.poly([P(0.24, 0.76), P(0.36, 0.68), P(0.42, 0.82), P(0.4, 0.96), P(0.28, 0.96)], M.main, 5);
      f.poly([P(0.64, 0.7), P(0.74, 0.7), P(0.76, 0.92), P(0.82, 0.97), P(0.64, 0.97)], M.main, 5);
      f.line(P(0.7, 0.78), P(0.7, 0.92), M.accent, 1, 6);
      // Head: long folded muzzle, tall ears, a shadow crest
      f.triangle(P(0.6, 0.3), P(0.62, 0.04), P(0.72, 0.26), M.main, 5);
      f.poly([P(0.58, 0.46), P(0.6, 0.3), P(0.68, 0.22), P(0.82, 0.24), P(0.98, 0.36), P(0.84, 0.42), P(0.68, 0.5)], M.main, 6);
      f.poly([P(0.82, 0.24), P(0.98, 0.36), P(0.84, 0.36)], M.second, 7);
      f.poly([P(0.6, 0.46), P(0.68, 0.5), P(0.84, 0.42), P(0.72, 0.4)], M.accent, 7);
      f.triangle(P(0.68, 0.24), P(0.8, 0.0), P(0.8, 0.26), M.main, 7);
      f.triangle(P(0.72, 0.22), P(0.79, 0.07), P(0.79, 0.23), M.accent, 8);
      // Crescent of folded light on the brow
      f.poly([P(0.64, 0.26), P(0.72, 0.18), P(0.78, 0.2), P(0.7, 0.24)], M.glow, 8);
      // Glitched paper scraps around it
      for (const [x, y, s] of [[0.9, 0.1, 0.03], [0.94, 0.62, 0.025], [0.1, 0.86, 0.03]] as const) f.triangle(P(x - s, y), P(x + s, y - s), P(x, y + s), M.second, 4);
      f.glitchRows([0.48, 0.49], 2);
      f.glitchRows([0.2, 0.62], -1);
      return [{ x: 0.76, y: 0.32, r: 0.05, angry: true }];
    },
  },

  // Fusión: a brass war machine played like an orchestra — organ pipes, speaker heart, trumpet cannon, gears.
  "orquesta-omega": {
    colours: {
      main: ["#7a4a1e", "#c28c3a", "#eec262", "#fff2b4"],
      second: ["#2a5a6c", "#4a8c9c", "#7cc2ca", "#c4f2f2"],
      accent: ["#6c1a2c", "#aa3242", "#e25c5c", "#ffaaa2"],
      dark: ["#1e1e30", "#34344c", "#525270", "#7c7c9c"],
      glow: "#7affb2",
      iris: "#3affa0",
    },
    draw(f) {
      // Organ pipes on the back
      for (const [x, top] of [[0.1, 0.16], [0.17, 0.06], [0.24, 0.02], [0.31, 0.1]] as const) {
        f.rect(x - 0.03, top, x + 0.03, 0.56, M.main, 0);
        f.rect(x - 0.03, top, x + 0.03, top + 0.03, M.dark, 1);
      }
      // Big gear behind the shoulder
      gear(f, 0.3, 0.36, 0.16, 9, M.second, 1, M.dark);
      // Far leg
      f.rect(0.28, 0.66, 0.4, 0.9, M.dark, 1);
      f.rect(0.24, 0.9, 0.44, 0.97, M.dark, 2);
      // Drum torso
      blob(f, [P(0.26, 0.68), P(0.26, 0.38), P(0.44, 0.28), P(0.7, 0.32), P(0.78, 0.5), P(0.72, 0.72), P(0.46, 0.76)], M.main, 2);
      f.band(0.4, 0.43, M.main, M.accent, 0.2, 0.8);
      f.band(0.64, 0.67, M.main, M.accent, 0.2, 0.8);
      // Speaker heart
      f.ellipse(0.52, 0.54, 0.12, 0.12, M.dark, 3);
      f.ring(0.52, 0.54, 0.1, M.second, 1, 4);
      f.ellipse(0.52, 0.54, 0.05, 0.05, M.second, 4);
      f.ellipse(0.52, 0.54, 0.02, 0.02, M.glow, 5);
      // Near leg: piston
      f.rect(0.5, 0.72, 0.64, 0.82, M.main, 4);
      f.rect(0.53, 0.82, 0.61, 0.9, M.second, 5);
      blob(f, [P(0.46, 0.9), P(0.66, 0.88), P(0.76, 0.92), P(0.76, 0.97), P(0.46, 0.97)], M.main, 5);
      // Cymbal shield on the far arm is hidden; near arm becomes a trumpet cannon
      tube(f, [P(0.64, 0.4), P(0.74, 0.46), P(0.84, 0.46)], [0.05, 0.04, 0.03], M.main, 5);
      f.poly([P(0.82, 0.43), P(0.94, 0.32), P(0.98, 0.34), P(0.98, 0.58), P(0.94, 0.6), P(0.82, 0.5)], M.main, 6);
      f.ellipse(0.96, 0.46, 0.02, 0.1, M.dark, 7);
      for (const x of [0.72, 0.76, 0.8]) f.ellipse(x, 0.42, 0.012, 0.016, M.second, 7);
      // Head: a helm with a gear crest and visor eye
      gear(f, 0.62, 0.12, 0.08, 7, M.second, 5);
      blob(f, [P(0.52, 0.3), P(0.54, 0.16), P(0.66, 0.12), P(0.8, 0.16), P(0.84, 0.26), P(0.72, 0.32)], M.main, 6);
      f.rect(0.62, 0.2, 0.84, 0.25, M.dark, 7);
      // Music it plays
      for (const [x, y] of [[0.88, 0.08], [0.94, 0.16]] as const) {
        f.ellipse(x, y + 0.04, 0.02, 0.016, M.glow, 6);
        f.line(P(x + 0.015, y + 0.04), P(x + 0.015, y - 0.02), M.glow, 1, 6);
      }
      f.line(P(0.885, 0.06), P(0.955, 0.14), M.glow, 1, 6);
      f.seamLine(P(0.28, 0.58), P(0.4, 0.58), [M.main]);
      return [{ x: 0.76, y: 0.225, r: 0.04, angry: true }];
    },
  },

  // Fusión: a stone rhino titan with ice growing through its armour; the ground freezes and cracks.
  "tormenta-telurica": {
    colours: {
      main: ["#4c3e4c", "#7c6a6a", "#a8968a", "#d6c6b0"],
      second: ["#4a86c2", "#8ad0f2", "#c8f0ff", "#ffffff"],
      accent: ["#4a4460", "#6e6888", "#9a94b4", "#cec8e2"],
      dark: ["#1c2a4e", "#2e4474", "#4a68a2", "#7a9ccc"],
      glow: "#bff8ff",
      iris: "#5ad8ff",
    },
    draw(f) {
      // Frozen, cracked ground
      f.poly([P(0.02, 0.98), P(0.06, 0.92), P(0.94, 0.92), P(0.98, 0.98)], M.dark, 0);
      f.seamLine(P(0.1, 0.95), P(0.3, 0.97), [M.dark]);
      f.seamLine(P(0.6, 0.94), P(0.86, 0.97), [M.dark]);
      // Ice crystals breaking through the back
      for (const [bx, by, tx, ty, w] of [[0.2, 0.36, 0.08, 0.06, 0.05], [0.32, 0.3, 0.3, 0.0, 0.06], [0.44, 0.3, 0.52, 0.04, 0.05], [0.12, 0.44, 0.02, 0.28, 0.035]] as const)
        crystal(f, P(bx, by), P(tx, ty), w, M.second, 0, M.glow);
      // Far legs
      f.rect(0.16, 0.66, 0.28, 0.94, M.accent, 1);
      f.rect(0.56, 0.66, 0.68, 0.94, M.accent, 1);
      // Tail stub
      f.ellipse(0.06, 0.56, 0.04, 0.05, M.main, 1);
      // Massive body
      blob(f, [P(0.06, 0.6), P(0.12, 0.38), P(0.34, 0.28), P(0.6, 0.3), P(0.76, 0.42), P(0.78, 0.66), P(0.6, 0.78), P(0.3, 0.8), P(0.1, 0.74)], M.main, 2);
      // Armour plates
      blob(f, [P(0.14, 0.5), P(0.2, 0.38), P(0.36, 0.34), P(0.4, 0.46), P(0.3, 0.56), P(0.18, 0.58)], M.accent, 3);
      blob(f, [P(0.44, 0.42), P(0.5, 0.32), P(0.66, 0.34), P(0.72, 0.46), P(0.6, 0.56), P(0.48, 0.54)], M.accent, 3);
      f.seamLine(P(0.2, 0.5), P(0.34, 0.42), [M.accent]);
      f.seamLine(P(0.5, 0.46), P(0.66, 0.42), [M.accent]);
      f.seamLine(P(0.3, 0.38), P(0.26, 0.5), [M.accent]);
      // Near legs: pillars capped in ice
      blob(f, [P(0.22, 0.62), P(0.38, 0.62), P(0.4, 0.8), P(0.42, 0.95), P(0.2, 0.95), P(0.2, 0.78)], M.main, 4);
      blob(f, [P(0.6, 0.6), P(0.76, 0.6), P(0.78, 0.8), P(0.8, 0.95), P(0.58, 0.95), P(0.58, 0.78)], M.main, 4);
      f.rect(0.2, 0.88, 0.42, 0.95, M.second, 5);
      f.rect(0.58, 0.88, 0.8, 0.95, M.second, 5);
      for (const x of [0.24, 0.32, 0.4, 0.62, 0.7, 0.78]) f.triangle(P(x - 0.02, 0.95), P(x + 0.02, 0.95), P(x, 0.98), M.second, 6);
      // Head lowered to charge
      blob(f, [P(0.66, 0.42), P(0.74, 0.32), P(0.88, 0.36), P(0.98, 0.52), P(0.94, 0.66), P(0.8, 0.7), P(0.68, 0.62)], M.main, 5);
      f.ellipse(0.72, 0.36, 0.04, 0.06, M.accent, 6);
      // Great ice horn and a stone horn
      crystal(f, P(0.92, 0.52), P(0.98, 0.18), 0.05, M.second, 6, M.glow);
      horn(f, P(0.82, 0.4), P(0.86, 0.38), P(0.86, 0.26), 0.01, M.accent, 6);
      f.seamLine(P(0.76, 0.6), P(0.92, 0.62), [M.main]);
      // Frost breath
      for (const [x, y] of [[0.9, 0.78], [0.96, 0.74]] as const) spark(f, x, y, 0.02, M.second);
      return [{ x: 0.82, y: 0.48, r: 0.045, angry: true }];
    },
  },
};

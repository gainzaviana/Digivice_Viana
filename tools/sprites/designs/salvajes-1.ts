import { Material as M, type Point } from "../../../src/art/forge";
import { blob, horn, P, type Design } from "../style";

/**
 * Salvajes (1): twenty standalone wild species of the Red. Each one carries a small "data" touch
 * (a glowing seam, pixel pattern or circuit mark) in its affinity's glow colour.
 */
type F = Parameters<Design["draw"]>[0];

// Affinity glows.
const PULSO = "#ffc04a";
const SENAL = "#5ef2ff";
const RUIDO = "#ff4fd8";

const PX = 1 / 64;
/** A square of `s` pixels (a loose bit, a spot, a spark). */
const dot = (f: F, x: number, y: number, m: M, s = 1, lift = 4) => f.rect(x, y, x + s * PX, y + s * PX, m, lift);

/** Open Catmull-Rom through the points (for smooth limbs, tails, tentacles). */
function curve(pts: Point[], steps = 4): Point[] {
  if (pts.length < 3) return pts;
  const out: Point[] = [];
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[Math.max(0, i - 1)], p1 = pts[i], p2 = pts[i + 1], p3 = pts[Math.min(pts.length - 1, i + 2)];
    for (let s = 0; s < steps; s++) {
      const t = s / steps, t2 = t * t, t3 = t2 * t;
      out.push([0, 1].map((c) => 0.5 * (2 * p1[c] + (-p0[c] + p2[c]) * t + (2 * p0[c] - 5 * p1[c] + 4 * p2[c] - p3[c]) * t2 + (-p0[c] + 3 * p1[c] - 3 * p2[c] + p3[c]) * t3)) as unknown as Point);
    }
  }
  out.push(pts[pts.length - 1]);
  return out;
}

/** A tapered limb along a smooth path; `w` is the width at the start and end (or per control point). */
function limb(f: F, pts: Point[], w: [number, number], m: M, lift = 0) {
  const c = curve(pts);
  const L: Point[] = [], R: Point[] = [];
  c.forEach((p, i) => {
    const a = c[Math.max(0, i - 1)], b = c[Math.min(c.length - 1, i + 1)];
    let dx = b[0] - a[0], dy = b[1] - a[1];
    const l = Math.hypot(dx, dy) || 1;
    dx /= l; dy /= l;
    const h = (w[0] + (w[1] - w[0]) * (i / (c.length - 1))) / 2;
    L.push([p[0] - dy * h, p[1] + dx * h]);
    R.push([p[0] + dy * h, p[1] - dx * h]);
  });
  f.poly([...L, ...R.reverse()], m, lift);
}

/** An arc of a circle as a thin limb (sound waves, webs, sparks). */
function arc(f: F, cx: number, cy: number, r: number, a0: number, a1: number, m: M, w = 0.025, lift = 3) {
  const pts: Point[] = [];
  for (let i = 0; i <= 6; i++) { const a = a0 + ((a1 - a0) * i) / 6; pts.push([cx + Math.cos(a) * r, cy + Math.sin(a) * r]); }
  limb(f, pts, [w, w], m, lift);
}

/** A zigzag spark made of glow lines. */
function zap(f: F, pts: Point[]) {
  for (let i = 0; i < pts.length - 1; i++) f.line(pts[i], pts[i + 1], M.glow, 1, 5);
}

export const salvajes1: Record<string, Design> = {
  // ───────────── Stage 1 (novato) ─────────────

  // Bitbicho: a lime beetle whose back crumbles into loose, floating bits.
  bitbicho: {
    colours: {
      main: ["#3d7a3c", "#78bf3e", "#b2e35a", "#ecff9e"],
      second: ["#1d4652", "#2c6c6c", "#469a86", "#7ccaa2"],
      accent: ["#2a2048", "#45367a", "#6a56a8", "#9a86d0"],
      dark: ["#221d38", "#383058", "#544c7a", "#7870a0"],
      glow: RUIDO,
      iris: "#ff4fd8",
    },
    draw(f) {
      // Far legs
      for (const x of [0.3, 0.46, 0.6]) limb(f, [P(x, 0.7), P(x + 0.03, 0.82), P(x - 0.01, 0.93)], [0.04, 0.025], M.dark);
      // Under-body
      blob(f, [P(0.18, 0.74), P(0.4, 0.66), P(0.64, 0.6), P(0.72, 0.7), P(0.54, 0.8), P(0.26, 0.82)], M.second);
      // Shell (elytra)
      blob(f, [P(0.1, 0.62), P(0.14, 0.42), P(0.3, 0.28), P(0.52, 0.27), P(0.68, 0.38), P(0.7, 0.58), P(0.54, 0.74), P(0.24, 0.78)], M.main, 1);
      f.seamLine(P(0.66, 0.4), P(0.42, 0.42), [M.main]);
      f.seamLine(P(0.42, 0.42), P(0.18, 0.56), [M.main]);
      for (const [x, y] of [[0.3, 0.38], [0.36, 0.52], [0.5, 0.56], [0.24, 0.62], [0.56, 0.34]] as const) dot(f, x, y, M.second, 2, 3);
      // Loose bits drifting off the back
      for (const [x, y, s, m] of [[0.06, 0.4, 3, M.main], [0.1, 0.26, 2, M.main], [0.2, 0.16, 3, M.main], [0.04, 0.16, 2, M.glow], [0.3, 0.1, 2, M.glow], [0.14, 0.06, 1, M.glow]] as const) dot(f, x, y, m, s, 2);
      // Near legs
      for (const x of [0.34, 0.5, 0.64]) limb(f, [P(x, 0.72), P(x + 0.05, 0.84), P(x + 0.03, 0.96)], [0.05, 0.03], M.accent, 3);
      // Head and mandibles
      f.ellipse(0.76, 0.54, 0.13, 0.13, M.second, 2);
      f.seamLine(P(0.66, 0.6), P(0.74, 0.64), [M.second]);
      horn(f, P(0.82, 0.64), P(0.86, 0.6), P(0.96, 0.7), 0.02, M.accent, 4);
      horn(f, P(0.8, 0.66), P(0.84, 0.66), P(0.9, 0.78), 0.02, M.accent, 4);
      // Antennae with signal tips
      limb(f, [P(0.76, 0.44), P(0.82, 0.3), P(0.92, 0.22)], [0.03, 0.02], M.accent, 4);
      limb(f, [P(0.7, 0.44), P(0.68, 0.3), P(0.74, 0.18)], [0.03, 0.02], M.accent, 3);
      dot(f, 0.92, 0.2, M.glow, 2, 5);
      dot(f, 0.73, 0.16, M.glow, 2, 5);
      return [{ x: 0.81, y: 0.5, r: 0.07 }];
    },
  },

  // Pixelito: a little cube of light with a mood-coloured top and an antenna pixel.
  pixelito: {
    colours: {
      main: ["#2a74a0", "#3cbfd2", "#7aeee2", "#d2fff4"],
      second: ["#a84a88", "#ee7cb6", "#ffb0d4", "#ffe6f2"],
      accent: ["#b07a1e", "#f0c040", "#ffe27a", "#fff8c8"],
      dark: ["#1e3a6a", "#2a588e", "#3a78ac", "#5a98c8"],
      glow: SENAL,
      iris: "#2a8cff",
    },
    draw(f) {
      // Feet and arms
      f.ellipse(0.34, 0.9, 0.08, 0.06, M.dark);
      f.ellipse(0.6, 0.9, 0.08, 0.06, M.dark);
      // Cube: side, front, top
      f.poly([P(0.72, 0.36), P(0.88, 0.2), P(0.88, 0.68), P(0.72, 0.86)], M.dark, 0);
      f.poly([P(0.14, 0.36), P(0.72, 0.36), P(0.72, 0.86), P(0.14, 0.86)], M.main, 1);
      f.poly([P(0.14, 0.36), P(0.3, 0.2), P(0.88, 0.2), P(0.72, 0.36)], M.second, 1);
      // Pixel grid on the top and a seam across the front
      for (const [x, y] of [[0.36, 0.26], [0.5, 0.3], [0.62, 0.24], [0.74, 0.28]] as const) dot(f, x, y, M.glow, 2, 3);
      f.seamLine(P(0.18, 0.8), P(0.68, 0.8), [M.main]);
      dot(f, 0.2, 0.42, M.glow, 2, 3);
      dot(f, 0.76, 0.5, M.glow, 1, 3);
      dot(f, 0.8, 0.62, M.glow, 1, 3);
      // Stubby arms
      f.ellipse(0.1, 0.64, 0.05, 0.06, M.main, 2);
      f.ellipse(0.92, 0.58, 0.04, 0.06, M.dark, 2);
      // Mouth and blush
      f.line(P(0.4, 0.68), P(0.44, 0.71), M.dark, 1, 3);
      f.line(P(0.44, 0.71), P(0.5, 0.71), M.dark, 1, 3);
      f.line(P(0.5, 0.71), P(0.54, 0.68), M.dark, 1, 3);
      dot(f, 0.24, 0.64, M.second, 2, 3);
      dot(f, 0.62, 0.64, M.second, 2, 3);
      // Antenna with a little light cube
      limb(f, [P(0.56, 0.24), P(0.58, 0.14), P(0.64, 0.08)], [0.025, 0.02], M.dark, 3);
      f.rect(0.6, 0.03, 0.7, 0.12, M.accent, 4);
      dot(f, 0.62, 0.05, M.glow, 2, 5);
      // Mood sparkles
      dot(f, 0.04, 0.28, M.accent, 2, 2);
      dot(f, 0.9, 0.08, M.second, 2, 2);
      return [{ x: 0.32, y: 0.54, r: 0.08 }, { x: 0.56, y: 0.54, r: 0.08 }];
    },
  },

  // Caracolchon: a soft peach snail carrying a rolled-up striped mattress as its shell.
  caracolchon: {
    colours: {
      main: ["#b45a62", "#ea8c7c", "#ffbb9c", "#ffe4cc"],
      second: ["#8e9ac4", "#d4dcf2", "#f4f6ff", "#ffffff"],
      accent: ["#2c3c86", "#3e5cb0", "#5a80d4", "#8aaaf0"],
      dark: ["#4a2a40", "#6a3a56", "#8a5070", "#aa6c8a"],
      glow: PULSO,
      iris: "#3a5cd0",
    },
    draw(f) {
      // Far eye stalk
      limb(f, [P(0.8, 0.46), P(0.76, 0.32), P(0.74, 0.22)], [0.05, 0.035], M.main);
      f.ellipse(0.74, 0.21, 0.04, 0.04, M.main);
      // Foot and head
      blob(f, [P(0.04, 0.95), P(0.08, 0.86), P(0.4, 0.8), P(0.66, 0.74), P(0.72, 0.52), P(0.82, 0.42), P(0.94, 0.46), P(0.96, 0.66), P(0.9, 0.86), P(0.8, 0.96), P(0.4, 0.97)], M.main);
      // Mattress shell: rolled cushion with ticking stripes
      f.ellipse(0.4, 0.5, 0.32, 0.31, M.second, 1);
      const spiral: Point[] = [];
      for (let i = 0; i <= 22; i++) { const t = i / 22, a = -0.6 + t * Math.PI * 3.4, r = 0.27 * (1 - t * 0.85); spiral.push([0.42 + Math.cos(a) * r, 0.52 + Math.sin(a) * r]); }
      limb(f, spiral, [0.05, 0.03], M.accent, 2);
      // Quilting buttons and glowing stitch
      for (const [x, y] of [[0.22, 0.32], [0.6, 0.3], [0.16, 0.6], [0.66, 0.62], [0.4, 0.76]] as const) f.ellipse(x, y, 0.025, 0.025, M.dark, 3);
      f.seamLine(P(0.14, 0.42), P(0.3, 0.26), [M.second]);
      f.seamLine(P(0.5, 0.22), P(0.66, 0.34), [M.second]);
      f.seamLine(P(0.2, 0.74), P(0.34, 0.8), [M.second]);
      // Near eye stalk and smile
      limb(f, [P(0.86, 0.48), P(0.88, 0.34), P(0.87, 0.22)], [0.06, 0.04], M.main, 2);
      f.ellipse(0.87, 0.2, 0.06, 0.06, M.main, 3);
      f.line(P(0.88, 0.6), P(0.94, 0.62), M.dark, 1, 3);
      dot(f, 0.84, 0.56, M.second, 2, 3);
      return [{ x: 0.875, y: 0.2, r: 0.065 }, { x: 0.745, y: 0.21, r: 0.045 }];
    },
  },

  // Murciclic: a round indigo bat with rose wings, sharp ears and glowing click-waves.
  murciclic: {
    colours: {
      main: ["#2c2a5c", "#4a4892", "#6e6cc2", "#a4a2ea"],
      second: ["#7a2c5a", "#b4487e", "#e070a4", "#ffaacc"],
      accent: ["#b4a6c4", "#e6dcf0", "#fff8ff", "#ffffff"],
      dark: ["#1e1c38", "#302c56", "#48427e", "#6c64a4"],
      glow: RUIDO,
      iris: "#ff3ac8",
    },
    draw(f) {
      // Wings (membrane, then finger bones)
      f.poly([P(0.4, 0.42), P(0.24, 0.24), P(0.03, 0.3), P(0.04, 0.64), P(0.12, 0.56), P(0.18, 0.7), P(0.26, 0.6), P(0.32, 0.74), P(0.42, 0.62)], M.second);
      f.poly([P(0.62, 0.42), P(0.78, 0.24), P(0.97, 0.3), P(0.96, 0.64), P(0.88, 0.56), P(0.82, 0.7), P(0.74, 0.6), P(0.68, 0.74), P(0.6, 0.62)], M.second);
      for (const [a, b] of [[P(0.4, 0.42), P(0.04, 0.32)], [P(0.36, 0.44), P(0.12, 0.56)], [P(0.38, 0.48), P(0.26, 0.6)]] as const) f.line(a, b, M.dark, 1, 1);
      for (const [a, b] of [[P(0.62, 0.42), P(0.96, 0.32)], [P(0.66, 0.44), P(0.88, 0.56)], [P(0.64, 0.48), P(0.74, 0.6)]] as const) f.line(a, b, M.dark, 1, 1);
      horn(f, P(0.22, 0.26), P(0.26, 0.24), P(0.2, 0.16), -0.01, M.dark, 1);
      horn(f, P(0.76, 0.24), P(0.8, 0.26), P(0.82, 0.16), 0.01, M.dark, 1);
      // Feet
      horn(f, P(0.42, 0.86), P(0.46, 0.84), P(0.42, 0.95), 0, M.dark, 1);
      horn(f, P(0.56, 0.84), P(0.6, 0.86), P(0.6, 0.95), 0, M.dark, 1);
      // Body and fluffy chest
      f.ellipse(0.51, 0.66, 0.15, 0.2, M.main, 1);
      blob(f, [P(0.42, 0.58), P(0.52, 0.52), P(0.62, 0.58), P(0.6, 0.74), P(0.52, 0.8), P(0.44, 0.74)], M.second, 2);
      f.seamLine(P(0.46, 0.62), P(0.58, 0.62), [M.second]);
      f.seamLine(P(0.48, 0.7), P(0.56, 0.7), [M.second]);
      // Ears
      horn(f, P(0.34, 0.34), P(0.44, 0.28), P(0.26, 0.04), -0.03, M.main, 2);
      horn(f, P(0.58, 0.28), P(0.68, 0.34), P(0.76, 0.04), 0.03, M.main, 2);
      horn(f, P(0.36, 0.3), P(0.41, 0.28), P(0.3, 0.12), -0.02, M.second, 3);
      horn(f, P(0.62, 0.28), P(0.66, 0.3), P(0.72, 0.12), 0.02, M.second, 3);
      // Head, nose leaf, fangs
      f.ellipse(0.52, 0.4, 0.17, 0.14, M.main, 2);
      horn(f, P(0.5, 0.47), P(0.56, 0.47), P(0.53, 0.42), 0, M.second, 3);
      horn(f, P(0.46, 0.5), P(0.49, 0.5), P(0.475, 0.56), 0, M.accent, 3);
      horn(f, P(0.56, 0.5), P(0.59, 0.5), P(0.575, 0.56), 0, M.accent, 3);
      // Click waves
      arc(f, 0.82, 0.12, 0.06, -1.0, 0.8, M.glow, 0.02, 4);
      arc(f, 0.82, 0.12, 0.11, -0.8, 0.6, M.glow, 0.02, 4);
      return [{ x: 0.44, y: 0.38, r: 0.065 }, { x: 0.6, y: 0.38, r: 0.065 }];
    },
  },

  // Ranadin: a crouched orange frog with a puffed throat sac and Morse dots and dashes on its back.
  ranadin: {
    colours: {
      main: ["#a8402c", "#e6742e", "#ffa84a", "#ffd88c"],
      second: ["#c09a5c", "#f0d08c", "#fff0ba", "#fffbe6"],
      accent: ["#1e2a5c", "#2e4488", "#4466b2", "#6a90da"],
      dark: ["#3a1e2a", "#5a2c3a", "#7a3e4a", "#9a5a5a"],
      glow: PULSO,
      iris: "#30b86a",
    },
    draw(f) {
      // Far arm
      limb(f, [P(0.62, 0.7), P(0.62, 0.84), P(0.6, 0.94)], [0.06, 0.04], M.main);
      // Back leg: long webbed foot
      blob(f, [P(0.06, 0.95), P(0.12, 0.9), P(0.36, 0.9), P(0.44, 0.95)], M.main);
      for (const x of [0.06, 0.13]) horn(f, P(x + 0.04, 0.92), P(x + 0.06, 0.95), P(x, 0.97), 0, M.main, 0);
      // Body
      blob(f, [P(0.12, 0.74), P(0.2, 0.52), P(0.44, 0.38), P(0.7, 0.32), P(0.9, 0.42), P(0.94, 0.58), P(0.82, 0.72), P(0.56, 0.84), P(0.26, 0.86)], M.main, 0);
      blob(f, [P(0.46, 0.8), P(0.6, 0.66), P(0.84, 0.62), P(0.8, 0.74), P(0.6, 0.84)], M.second, 1);
      // Morse code on the back (·−·−·)
      dot(f, 0.26, 0.56, M.glow, 2, 2);
      f.rect(0.31, 0.5, 0.39, 0.53, M.glow, 2);
      dot(f, 0.43, 0.46, M.glow, 2, 2);
      f.rect(0.49, 0.41, 0.57, 0.44, M.glow, 2);
      dot(f, 0.61, 0.38, M.glow, 2, 2);
      // Navy spots
      for (const [x, y, r] of [[0.3, 0.68, 0.04], [0.42, 0.6, 0.03], [0.2, 0.64, 0.025]] as const) f.ellipse(x, y, r, r, M.accent, 2);
      // Thigh
      blob(f, [P(0.12, 0.88), P(0.14, 0.72), P(0.28, 0.62), P(0.44, 0.66), P(0.48, 0.78), P(0.36, 0.86)], M.main, 2);
      f.ellipse(0.3, 0.7, 0.03, 0.025, M.accent, 3);
      // Throat sac
      f.ellipse(0.84, 0.66, 0.1, 0.08, M.second, 2);
      f.seamLine(P(0.78, 0.66), P(0.9, 0.66), [M.second]);
      // Near arm with toe pads
      limb(f, [P(0.66, 0.68), P(0.72, 0.82), P(0.72, 0.94)], [0.07, 0.05], M.main, 3);
      for (const x of [0.68, 0.73, 0.78]) f.ellipse(x, 0.95, 0.025, 0.02, M.accent, 4);
      // Eye bump and mouth
      f.ellipse(0.68, 0.32, 0.11, 0.1, M.main, 2);
      f.line(P(0.7, 0.52), P(0.94, 0.5), M.dark, 1, 3);
      dot(f, 0.9, 0.44, M.dark, 1, 3);
      return [{ x: 0.69, y: 0.3, r: 0.085 }];
    },
  },

  // Topocable: a mauve mole with huge pink digging claws, a cable collar and a plug for a tail.
  topocable: {
    colours: {
      main: ["#784a72", "#ac7896", "#d6a4b2", "#f8d4cc"],
      second: ["#a8741a", "#e4ac2e", "#ffd45e", "#fff2ae"],
      accent: ["#b04a6c", "#e8789c", "#ffa8be", "#ffe2ea"],
      dark: ["#261a2c", "#3c2a42", "#563e5c", "#745878"],
      glow: SENAL,
      iris: "#40c8ff",
    },
    draw(f) {
      // Cable tail ending in a plug
      limb(f, [P(0.2, 0.78), P(0.08, 0.82), P(0.06, 0.66), P(0.12, 0.5)], [0.05, 0.05], M.second);
      f.seamLine(P(0.06, 0.78), P(0.07, 0.62), [M.second]);
      f.rect(0.08, 0.36, 0.17, 0.5, M.dark, 1);
      f.rect(0.09, 0.29, 0.1, 0.36, M.second, 2);
      f.rect(0.14, 0.29, 0.15, 0.36, M.second, 2);
      // Far claw
      blob(f, [P(0.6, 0.78), P(0.7, 0.74), P(0.76, 0.86), P(0.66, 0.9)], M.accent);
      for (const x of [0.7, 0.75]) horn(f, P(x, 0.84), P(x + 0.03, 0.82), P(x + 0.08, 0.92), 0.01, M.accent, 0);
      // Hind foot
      f.ellipse(0.3, 0.92, 0.1, 0.05, M.accent);
      // Body
      blob(f, [P(0.14, 0.78), P(0.16, 0.5), P(0.32, 0.32), P(0.56, 0.28), P(0.74, 0.38), P(0.86, 0.52), P(0.84, 0.66), P(0.7, 0.82), P(0.44, 0.92), P(0.22, 0.9)], M.main, 0);
      // Fur tufts on the back
      for (const [x, y] of [[0.3, 0.33], [0.42, 0.28], [0.54, 0.27]] as const) horn(f, P(x - 0.03, y + 0.02), P(x + 0.03, y + 0.01), P(x - 0.04, y - 0.04), -0.01, M.main, 1);
      // Cable collar with signal seam
      limb(f, [P(0.58, 0.32), P(0.56, 0.5), P(0.6, 0.66), P(0.56, 0.84)], [0.07, 0.06], M.second, 2);
      f.seamLine(P(0.57, 0.38), P(0.57, 0.62), [M.second]);
      f.rect(0.52, 0.82, 0.62, 0.9, M.dark, 3);
      dot(f, 0.54, 0.84, M.glow, 2, 4);
      // Head and snout
      blob(f, [P(0.6, 0.44), P(0.68, 0.34), P(0.8, 0.4), P(0.9, 0.5), P(0.96, 0.58), P(0.9, 0.64), P(0.76, 0.66), P(0.62, 0.6)], M.main, 3);
      f.ellipse(0.93, 0.57, 0.04, 0.04, M.accent, 4);
      for (const [a, b] of [[P(0.86, 0.6), P(0.96, 0.68)], [P(0.84, 0.6), P(0.92, 0.72)]] as const) f.line(a, b, M.dark, 1, 5);
      // Near digging claw
      blob(f, [P(0.62, 0.7), P(0.74, 0.66), P(0.82, 0.76), P(0.76, 0.86), P(0.64, 0.84)], M.accent, 5);
      for (const [x, y] of [[0.76, 0.72], [0.8, 0.78], [0.76, 0.84]] as const) horn(f, P(x, y), P(x + 0.02, y + 0.03), P(x + 0.12, y + 0.06), 0.01, M.second, 6);
      return [{ x: 0.76, y: 0.46, r: 0.045 }];
    },
  },

  // Polillux: a lilac moth with screen-pixel eyespots, fluffy collar and feathery antennae.
  polillux: {
    colours: {
      main: ["#7c62a6", "#b89ad6", "#e0ccf2", "#fff4ff"],
      second: ["#c4ae8e", "#f0e2c2", "#fffaf0", "#ffffff"],
      accent: ["#1c5a7c", "#2a8aaa", "#4cc0d2", "#9af0f0"],
      dark: ["#3a2a4a", "#5a4068", "#7a5a8a", "#9a7aac"],
      glow: SENAL,
      iris: "#2a6cff",
    },
    draw(f) {
      // Hind wings
      blob(f, [P(0.44, 0.56), P(0.24, 0.6), P(0.12, 0.76), P(0.24, 0.9), P(0.42, 0.8)], M.main);
      blob(f, [P(0.56, 0.56), P(0.76, 0.6), P(0.88, 0.76), P(0.76, 0.9), P(0.58, 0.8)], M.main);
      f.ellipse(0.26, 0.76, 0.04, 0.04, M.accent, 1);
      f.ellipse(0.74, 0.76, 0.04, 0.04, M.accent, 1);
      // Fore wings
      blob(f, [P(0.44, 0.46), P(0.3, 0.2), P(0.1, 0.12), P(0.03, 0.26), P(0.08, 0.5), P(0.26, 0.62), P(0.44, 0.58)], M.main, 1);
      blob(f, [P(0.56, 0.46), P(0.7, 0.2), P(0.9, 0.12), P(0.97, 0.26), P(0.92, 0.5), P(0.74, 0.62), P(0.56, 0.58)], M.main, 1);
      f.line(P(0.42, 0.48), P(0.12, 0.2), M.dark, 1, 2);
      f.line(P(0.58, 0.48), P(0.88, 0.2), M.dark, 1, 2);
      // Pixel eyespots
      for (const cx of [0.2, 0.8]) {
        f.ellipse(cx, 0.38, 0.08, 0.08, M.dark, 2);
        f.rect(cx - 0.05, 0.33, cx + 0.05, 0.43, M.accent, 3);
        dot(f, cx - 0.02, 0.36, M.glow, 2, 4);
      }
      f.seamLine(P(0.08, 0.5), P(0.24, 0.58), [M.main]);
      f.seamLine(P(0.92, 0.5), P(0.76, 0.58), [M.main]);
      // Body
      f.ellipse(0.5, 0.66, 0.08, 0.2, M.dark, 2);
      f.band(0.66, 0.68, M.dark, M.second);
      f.band(0.74, 0.76, M.dark, M.second);
      // Legs
      f.line(P(0.46, 0.8), P(0.42, 0.95), M.dark, 1, 3);
      f.line(P(0.54, 0.8), P(0.58, 0.95), M.dark, 1, 3);
      // Antennae (feathery)
      limb(f, [P(0.46, 0.3), P(0.4, 0.14), P(0.3, 0.05)], [0.02, 0.02], M.dark, 3);
      limb(f, [P(0.56, 0.3), P(0.62, 0.14), P(0.72, 0.05)], [0.02, 0.02], M.dark, 3);
      for (const t of [0.1, 0.16, 0.22]) {
        f.line(P(0.43 - (0.22 - t) * 0.6, t), P(0.38 - (0.22 - t) * 0.6, t - 0.04), M.dark, 1, 3);
        f.line(P(0.59 + (0.22 - t) * 0.6, t), P(0.64 + (0.22 - t) * 0.6, t - 0.04), M.dark, 1, 3);
      }
      // Fluffy collar and head
      blob(f, [P(0.36, 0.44), P(0.4, 0.36), P(0.5, 0.4), P(0.6, 0.36), P(0.64, 0.44), P(0.6, 0.54), P(0.5, 0.56), P(0.4, 0.54)], M.second, 3);
      f.ellipse(0.51, 0.34, 0.1, 0.08, M.second, 4);
      return [{ x: 0.46, y: 0.34, r: 0.055 }, { x: 0.57, y: 0.34, r: 0.055 }];
    },
  },

  // Cangrejal: a blue crab with one oversized orange claw holding a glowing data packet.
  cangrejal: {
    colours: {
      main: ["#244680", "#3a70b2", "#62a2da", "#aadaf8"],
      second: ["#b89e7e", "#e8d4b0", "#fff0d4", "#fffaf0"],
      accent: ["#a8441e", "#e8702e", "#ffa04e", "#ffd090"],
      dark: ["#2a2440", "#423a60", "#5e5484", "#7e76a8"],
      glow: PULSO,
      iris: "#ff8a1a",
    },
    draw(f) {
      // Far legs
      for (const [x, d] of [[0.3, -1], [0.7, 1]] as const) for (const k of [0, 1]) limb(f, [P(x + d * k * 0.04, 0.62), P(x + d * (0.12 + k * 0.04), 0.66), P(x + d * (0.16 + k * 0.04), 0.94)], [0.04, 0.015], M.main, 0);
      // Eye stalks
      limb(f, [P(0.42, 0.44), P(0.4, 0.3)], [0.03, 0.03], M.main, 0);
      limb(f, [P(0.58, 0.44), P(0.6, 0.3)], [0.03, 0.03], M.main, 0);
      f.ellipse(0.4, 0.27, 0.05, 0.05, M.main, 1);
      f.ellipse(0.6, 0.27, 0.05, 0.05, M.main, 1);
      // Shell with a belly plate and circuit marks
      blob(f, [P(0.18, 0.6), P(0.24, 0.44), P(0.5, 0.38), P(0.76, 0.44), P(0.82, 0.6), P(0.7, 0.76), P(0.5, 0.8), P(0.3, 0.76)], M.main, 1);
      blob(f, [P(0.32, 0.72), P(0.5, 0.66), P(0.68, 0.72), P(0.5, 0.8)], M.second, 2);
      f.seamLine(P(0.34, 0.5), P(0.44, 0.5), [M.main]);
      f.seamLine(P(0.44, 0.5), P(0.48, 0.56), [M.main]);
      f.seamLine(P(0.56, 0.48), P(0.66, 0.54), [M.main]);
      dot(f, 0.66, 0.54, M.glow, 2, 3);
      for (const x of [0.22, 0.3, 0.7, 0.78]) horn(f, P(x - 0.03, 0.48), P(x + 0.03, 0.46), P(x, 0.4), 0, M.main, 1);
      // Near legs
      for (const [x, d] of [[0.26, -1], [0.74, 1]] as const) limb(f, [P(x, 0.7), P(x + d * 0.08, 0.76), P(x + d * 0.1, 0.96)], [0.045, 0.015], M.main, 2);
      // Small claw (left)
      limb(f, [P(0.24, 0.56), P(0.14, 0.5), P(0.12, 0.42)], [0.05, 0.05], M.main, 2);
      horn(f, P(0.08, 0.42), P(0.16, 0.42), P(0.08, 0.28), -0.01, M.accent, 3);
      horn(f, P(0.12, 0.44), P(0.17, 0.42), P(0.18, 0.32), 0.01, M.accent, 3);
      // Big claw (right) holding a data packet
      limb(f, [P(0.76, 0.56), P(0.86, 0.5), P(0.86, 0.4)], [0.07, 0.06], M.main, 2);
      f.rect(0.82, 0.1, 0.95, 0.22, M.dark, 2);
      f.seamLine(P(0.83, 0.15), P(0.94, 0.15), [M.dark]);
      f.seamLine(P(0.88, 0.11), P(0.88, 0.21), [M.dark]);
      blob(f, [P(0.76, 0.38), P(0.8, 0.26), P(0.84, 0.18), P(0.88, 0.3), P(0.92, 0.4), P(0.84, 0.44)], M.accent, 3);
      horn(f, P(0.9, 0.34), P(0.94, 0.4), P(0.97, 0.2), 0.01, M.accent, 4);
      // Mouth
      f.line(P(0.46, 0.6), P(0.54, 0.6), M.dark, 1, 3);
      return [{ x: 0.4, y: 0.26, r: 0.06 }, { x: 0.6, y: 0.26, r: 0.06 }];
    },
  },

  // Hongolin: a teal toadstool sprout with glitching spots that drip corrupt code.
  hongolin: {
    colours: {
      main: ["#1c566a", "#2c8a8c", "#4cbca2", "#9ae8c2"],
      second: ["#a08aa8", "#d6c6da", "#f4ecf4", "#ffffff"],
      accent: ["#3a2052", "#5a347a", "#7a4c9c", "#9c6cba"],
      dark: ["#2a1e3a", "#40305a", "#5c4a7c", "#7a68a0"],
      glow: RUIDO,
      iris: "#ffd23a",
    },
    draw(f) {
      // Baby mushrooms
      f.rect(0.1, 0.84, 0.14, 0.95, M.second, 0);
      f.ellipse(0.12, 0.83, 0.06, 0.04, M.main, 1);
      f.rect(0.86, 0.88, 0.89, 0.95, M.second, 0);
      f.ellipse(0.875, 0.87, 0.045, 0.03, M.main, 1);
      // Feet
      f.ellipse(0.4, 0.92, 0.08, 0.05, M.dark);
      f.ellipse(0.62, 0.92, 0.08, 0.05, M.dark);
      // Stem body
      blob(f, [P(0.32, 0.88), P(0.32, 0.6), P(0.4, 0.46), P(0.62, 0.46), P(0.7, 0.6), P(0.7, 0.88), P(0.5, 0.92)], M.second, 1);
      // Arms
      limb(f, [P(0.34, 0.66), P(0.24, 0.74), P(0.22, 0.8)], [0.06, 0.05], M.second, 2);
      limb(f, [P(0.68, 0.66), P(0.78, 0.7), P(0.82, 0.64)], [0.06, 0.05], M.second, 2);
      // Gills under the cap
      blob(f, [P(0.14, 0.44), P(0.5, 0.38), P(0.88, 0.44), P(0.7, 0.52), P(0.3, 0.52)], M.accent, 2);
      // Cap with a wavy rim
      blob(f, [P(0.05, 0.44), P(0.1, 0.24), P(0.3, 0.08), P(0.56, 0.05), P(0.8, 0.12), P(0.95, 0.3), P(0.94, 0.44), P(0.8, 0.46), P(0.66, 0.42), P(0.5, 0.46), P(0.34, 0.42), P(0.2, 0.47)], M.main, 3);
      // Spots: soft, glitching and dripping
      for (const [x, y, r] of [[0.28, 0.2, 0.06], [0.56, 0.16, 0.05], [0.8, 0.28, 0.045], [0.14, 0.34, 0.035]] as const) f.ellipse(x, y, r, r * 0.8, M.second, 4);
      for (const [x, y, s] of [[0.42, 0.28, 2], [0.66, 0.3, 2], [0.44, 0.1, 1], [0.36, 0.34, 1]] as const) dot(f, x, y, M.glow, s, 5);
      f.rect(0.34, 0.44, 0.36, 0.52, M.glow, 5);
      f.rect(0.68, 0.44, 0.7, 0.5, M.glow, 5);
      dot(f, 0.34, 0.55, M.glow, 2, 5);
      // Mouth
      f.line(P(0.54, 0.74), P(0.6, 0.74), M.dark, 1, 3);
      return [{ x: 0.5, y: 0.62, r: 0.07 }, { x: 0.64, y: 0.62, r: 0.06 }];
    },
  },

  // Pajarrafaga: a tiny yellow speed-bird with blue swept wings and a signal trail.
  pajarrafaga: {
    colours: {
      main: ["#c07a1a", "#f2b42a", "#ffdc5c", "#fff4aa"],
      second: ["#1a3a8a", "#2a5cc8", "#4a8cf2", "#8ac2ff"],
      accent: ["#b03a1e", "#ee6a2a", "#ff9a4a", "#ffd090"],
      dark: ["#1c2040", "#2c3460", "#424e84", "#5e6ca8"],
      glow: SENAL,
      iris: "#1a6aff",
    },
    draw(f) {
      // Speed trail
      for (const [y, x0, x1] of [[0.36, 0.06, 0.34], [0.48, 0.03, 0.3], [0.6, 0.1, 0.34], [0.7, 0.2, 0.4]] as const) f.line(P(x0, y), P(x1, y), M.glow, 2, 0);
      for (const [x, y] of [[0.04, 0.6], [0.12, 0.72], [0.02, 0.38]] as const) dot(f, x, y, M.glow, 1, 0);
      // Far wing (raised)
      f.poly([P(0.56, 0.42), P(0.5, 0.26), P(0.4, 0.12), P(0.28, 0.04), P(0.3, 0.12), P(0.22, 0.1), P(0.28, 0.2), P(0.2, 0.2), P(0.32, 0.3), P(0.42, 0.44)], M.dark);
      // Tail feathers
      f.poly([P(0.42, 0.56), P(0.2, 0.5), P(0.24, 0.56), P(0.16, 0.6), P(0.24, 0.64), P(0.18, 0.7), P(0.44, 0.66)], M.second);
      // Body and belly
      blob(f, [P(0.36, 0.6), P(0.46, 0.44), P(0.64, 0.38), P(0.8, 0.46), P(0.78, 0.66), P(0.6, 0.76), P(0.42, 0.72)], M.main, 1);
      blob(f, [P(0.5, 0.72), P(0.62, 0.6), P(0.76, 0.58), P(0.72, 0.7), P(0.6, 0.76)], M.accent, 2);
      // Tucked feet
      horn(f, P(0.5, 0.74), P(0.54, 0.74), P(0.44, 0.84), 0, M.accent, 2);
      horn(f, P(0.56, 0.74), P(0.6, 0.74), P(0.52, 0.86), 0, M.accent, 2);
      // Head with a swept crest
      f.ellipse(0.74, 0.38, 0.14, 0.13, M.main, 2);
      horn(f, P(0.7, 0.26), P(0.76, 0.26), P(0.6, 0.12), -0.02, M.second, 3);
      horn(f, P(0.74, 0.26), P(0.8, 0.27), P(0.72, 0.1), -0.01, M.second, 3);
      // Beak
      f.poly([P(0.86, 0.36), P(0.97, 0.42), P(0.86, 0.46)], M.accent, 3);
      // Near wing swept back
      f.poly([P(0.66, 0.5), P(0.54, 0.46), P(0.36, 0.38), P(0.12, 0.3), P(0.22, 0.38), P(0.1, 0.4), P(0.24, 0.46), P(0.14, 0.5), P(0.34, 0.54), P(0.6, 0.6)], M.second, 3);
      f.seamLine(P(0.3, 0.44), P(0.6, 0.52), [M.second]);
      // Cheek
      dot(f, 0.76, 0.44, M.accent, 2, 4);
      return [{ x: 0.78, y: 0.35, r: 0.065 }];
    },
  },

  // ───────────── Stage 2 (avanzado) ─────────────

  // Aranared: an indigo spider in front of its connection-thread web, red glitch mark on its back.
  aranared: {
    colours: {
      main: ["#34306a", "#524ca0", "#7a72cc", "#aaa2ee"],
      second: ["#8a1a3c", "#d02e50", "#ff5c6c", "#ffa4a4"],
      accent: ["#8a92b4", "#c2cae2", "#e8eef8", "#ffffff"],
      dark: ["#1e1c3a", "#302c5c", "#46407e", "#625ca2"],
      glow: RUIDO,
      iris: "#ff3a5a",
    },
    draw(f) {
      // Web: radial threads and rings, a few of them live (glowing)
      for (let k = 0; k < 8; k++) {
        const a = (k / 8) * Math.PI * 2 + 0.2;
        f.line(P(0.5, 0.36), P(0.5 + Math.cos(a) * 0.5, 0.36 + Math.sin(a) * 0.5), k % 3 === 0 ? M.glow : M.accent, 1, 0);
      }
      for (const r of [0.14, 0.25, 0.36]) f.ring(0.5, 0.36, r, M.accent, 1, 0);
      f.seamLine(P(0.2, 0.2), P(0.36, 0.12), [M.accent]);
      // Legs: knee high, foot planted
      const leg = (d: number, k: number, m: M, lift: number) => {
        const kx = [0.18, 0.26, 0.32, 0.36][k], ky = [0.32, 0.2, 0.24, 0.38][k], fx = [0.3, 0.39, 0.45, 0.47][k];
        limb(f, [P(0.5 + d * 0.1, 0.62), P(0.5 + d * kx, ky), P(0.5 + d * (kx * 0.4 + fx * 0.6), (ky + 0.96) / 2 - 0.06), P(0.5 + d * fx, 0.96)], [0.055, 0.02], m, lift);
      };
      for (const k of [1, 3]) { leg(-1, k, M.dark, 0); leg(1, k, M.dark, 0); }
      // Abdomen with a glitched arrow mark
      f.ellipse(0.5, 0.36, 0.21, 0.19, M.main, 1);
      f.poly([P(0.44, 0.22), P(0.56, 0.22), P(0.53, 0.3), P(0.6, 0.3), P(0.5, 0.48), P(0.4, 0.3), P(0.47, 0.3)], M.second, 2);
      f.seamLine(P(0.36, 0.34), P(0.44, 0.34), [M.main]);
      f.seamLine(P(0.56, 0.34), P(0.66, 0.34), [M.main]);
      dot(f, 0.34, 0.28, M.glow, 1, 3);
      dot(f, 0.66, 0.42, M.glow, 1, 3);
      // Near legs
      for (const k of [0, 2]) { leg(-1, k, M.main, 2); leg(1, k, M.main, 2); }
      // Head (cephalothorax), fangs, small eyes
      f.ellipse(0.52, 0.64, 0.16, 0.13, M.main, 3);
      horn(f, P(0.44, 0.72), P(0.5, 0.74), P(0.46, 0.86), 0.01, M.accent, 4);
      horn(f, P(0.55, 0.74), P(0.61, 0.72), P(0.6, 0.86), -0.01, M.accent, 4);
      for (const [x, y] of [[0.42, 0.56], [0.62, 0.56], [0.47, 0.53], [0.57, 0.53]] as const) dot(f, x, y, M.second, 2, 5);
      return [{ x: 0.45, y: 0.63, r: 0.06, angry: true }, { x: 0.59, y: 0.63, r: 0.06, angry: true }];
    },
  },

  // Gaviotaje: a scarred thief gull with black wingtips, clutching a stolen data packet.
  gaviotaje: {
    colours: {
      main: ["#8c9aba", "#c8d4e8", "#eef4fc", "#ffffff"],
      second: ["#3c4c6e", "#5c7098", "#8aa0c6", "#b8cce8"],
      accent: ["#c07a1a", "#f0c02a", "#ffe060", "#fff8b0"],
      dark: ["#1c1e2e", "#2e3248", "#464c68", "#666e8e"],
      glow: SENAL,
      iris: "#ffb020",
    },
    draw(f) {
      // Far wing
      f.poly([P(0.54, 0.48), P(0.6, 0.3), P(0.7, 0.14), P(0.8, 0.04), P(0.78, 0.16), P(0.72, 0.32), P(0.66, 0.5)], M.second);
      f.poly([P(0.7, 0.14), P(0.8, 0.04), P(0.78, 0.16), P(0.75, 0.2)], M.dark, 1);
      // Tail
      f.poly([P(0.32, 0.56), P(0.1, 0.5), P(0.06, 0.58), P(0.12, 0.6), P(0.08, 0.66), P(0.32, 0.66)], M.main);
      f.poly([P(0.1, 0.5), P(0.06, 0.58), P(0.12, 0.6), P(0.08, 0.66), P(0.14, 0.66), P(0.14, 0.52)], M.dark, 1);
      // Legs and the stolen packet
      f.line(P(0.5, 0.66), P(0.48, 0.8), M.accent, 2, 0);
      f.line(P(0.58, 0.66), P(0.58, 0.8), M.accent, 2, 0);
      f.rect(0.4, 0.8, 0.66, 0.96, M.dark, 1);
      f.seamLine(P(0.41, 0.88), P(0.65, 0.88), [M.dark]);
      f.seamLine(P(0.53, 0.81), P(0.53, 0.95), [M.dark]);
      for (const x of [0.44, 0.5, 0.56, 0.62]) horn(f, P(x - 0.02, 0.79), P(x + 0.02, 0.79), P(x, 0.85), 0, M.accent, 2);
      // Body
      blob(f, [P(0.26, 0.6), P(0.36, 0.48), P(0.6, 0.44), P(0.76, 0.5), P(0.78, 0.62), P(0.6, 0.7), P(0.36, 0.68)], M.main, 1);
      // Near wing, raised, with black tip and live feather shafts
      f.poly([P(0.58, 0.52), P(0.46, 0.38), P(0.32, 0.22), P(0.16, 0.1), P(0.04, 0.06), P(0.1, 0.14), P(0.07, 0.2), P(0.18, 0.24), P(0.15, 0.3), P(0.26, 0.34), P(0.24, 0.42), P(0.36, 0.46), P(0.42, 0.56)], M.second, 2);
      f.poly([P(0.16, 0.1), P(0.04, 0.06), P(0.1, 0.14), P(0.07, 0.2), P(0.18, 0.24), P(0.15, 0.3), P(0.22, 0.3), P(0.24, 0.16)], M.dark, 3);
      f.poly([P(0.58, 0.52), P(0.46, 0.38), P(0.4, 0.36), P(0.46, 0.5)], M.main, 3);
      f.seamLine(P(0.48, 0.44), P(0.2, 0.2), [M.second]);
      f.seamLine(P(0.42, 0.48), P(0.26, 0.38), [M.second]);
      // Head, hooked beak with a dark notch
      f.ellipse(0.78, 0.38, 0.13, 0.12, M.main, 2);
      f.poly([P(0.86, 0.38), P(0.96, 0.39), P(0.97, 0.46), P(0.93, 0.44), P(0.86, 0.47)], M.accent, 3);
      dot(f, 0.92, 0.43, M.dark, 1, 4);
      // Scar across the eye
      f.line(P(0.74, 0.26), P(0.84, 0.42), M.second, 1, 4);
      return [{ x: 0.8, y: 0.35, r: 0.06, angry: true }];
    },
  },

  // Sapotron: a huge violet toad with yellow warts, battery glands and an electrified tongue.
  sapotron: {
    colours: {
      main: ["#2c2a6c", "#4a44aa", "#7068da", "#a8a0ff"],
      second: ["#b8801a", "#f0c03a", "#ffe070", "#fff8c2"],
      accent: ["#a02a5a", "#e04a80", "#ff80a8", "#ffc2d6"],
      dark: ["#1a1838", "#28245a", "#3a347c", "#504aa0"],
      glow: PULSO,
      iris: "#ffb020",
    },
    draw(f) {
      // Far arm
      limb(f, [P(0.54, 0.7), P(0.54, 0.84), P(0.52, 0.95)], [0.08, 0.06], M.dark);
      // Body
      blob(f, [P(0.03, 0.88), P(0.06, 0.6), P(0.2, 0.38), P(0.42, 0.26), P(0.62, 0.23), P(0.78, 0.3), P(0.85, 0.44), P(0.8, 0.58), P(0.64, 0.76), P(0.36, 0.92), P(0.08, 0.95)], M.main);
      // Throat and belly
      blob(f, [P(0.4, 0.92), P(0.44, 0.72), P(0.6, 0.56), P(0.84, 0.48), P(0.84, 0.58), P(0.74, 0.74), P(0.58, 0.9)], M.second, 1);
      f.seamLine(P(0.56, 0.64), P(0.8, 0.54), [M.second]);
      f.seamLine(P(0.5, 0.76), P(0.7, 0.68), [M.second]);
      // Warts
      for (const [x, y, r] of [[0.18, 0.5, 0.03], [0.28, 0.4, 0.025], [0.12, 0.64, 0.025], [0.32, 0.54, 0.03], [0.22, 0.6, 0.02], [0.38, 0.44, 0.02]] as const) f.ellipse(x, y, r, r, M.second, 2);
      // Battery gland behind the eye
      f.ellipse(0.44, 0.32, 0.09, 0.05, M.dark, 2);
      for (const x of [0.38, 0.43, 0.48]) f.rect(x, 0.3, x + 0.03, 0.35, M.glow, 3);
      // Back leg
      blob(f, [P(0.05, 0.94), P(0.08, 0.72), P(0.2, 0.64), P(0.32, 0.7), P(0.34, 0.86), P(0.26, 0.94)], M.main, 2);
      for (const x of [0.26, 0.32, 0.38]) horn(f, P(x, 0.92), P(x + 0.03, 0.9), P(x + 0.06, 0.96), 0, M.main, 3);
      // Mouth and electrified tongue
      f.poly([P(0.5, 0.45), P(0.87, 0.4), P(0.86, 0.47), P(0.66, 0.48)], M.dark, 2);
      limb(f, [P(0.8, 0.45), P(0.9, 0.42), P(0.96, 0.5), P(0.94, 0.62)], [0.05, 0.07], M.accent, 3);
      f.ellipse(0.92, 0.64, 0.05, 0.045, M.accent, 4);
      zap(f, [P(0.84, 0.46), P(0.88, 0.44), P(0.9, 0.48), P(0.94, 0.48), P(0.93, 0.56)]);
      zap(f, [P(0.97, 0.68), P(0.94, 0.74), P(0.97, 0.78), P(0.94, 0.84)]);
      zap(f, [P(0.86, 0.72), P(0.82, 0.76), P(0.85, 0.8)]);
      zap(f, [P(0.94, 0.3), P(0.97, 0.34), P(0.94, 0.38)]);
      // Near arm with fat toes
      limb(f, [P(0.6, 0.62), P(0.68, 0.8), P(0.66, 0.94)], [0.1, 0.07], M.main, 3);
      for (const x of [0.63, 0.69, 0.74]) f.ellipse(x, 0.95, 0.03, 0.022, M.main, 4);
      // Eye bump
      f.ellipse(0.62, 0.24, 0.1, 0.09, M.main, 3);
      return [{ x: 0.63, y: 0.23, r: 0.075, angry: true }];
    },
  },

  // Cactuson: a grumpy saguaro guard with a pink flower, cream spines and an amber circuit.
  cactuson: {
    colours: {
      main: ["#1e5a42", "#2e8a4e", "#5ab85e", "#a4e07e"],
      second: ["#a02a6a", "#e0508a", "#ff88b2", "#ffd2e2"],
      accent: ["#b0a070", "#e8d8a0", "#fff4d2", "#ffffff"],
      dark: ["#123a2a", "#1c5236", "#286a42", "#3a8450"],
      glow: PULSO,
      iris: "#ff6a3a",
    },
    draw(f) {
      // Feet
      f.ellipse(0.38, 0.93, 0.1, 0.05, M.dark);
      f.ellipse(0.62, 0.93, 0.1, 0.05, M.dark);
      // Left arm (raised)
      limb(f, [P(0.32, 0.62), P(0.16, 0.6), P(0.11, 0.48), P(0.12, 0.3)], [0.12, 0.11], M.main, 0);
      f.line(P(0.1, 0.34), P(0.09, 0.5), M.dark, 1, 1);
      // Body
      blob(f, [P(0.29, 0.92), P(0.27, 0.42), P(0.34, 0.2), P(0.5, 0.13), P(0.66, 0.2), P(0.73, 0.42), P(0.71, 0.92), P(0.5, 0.95)], M.main, 1);
      for (const x of [0.37, 0.5, 0.63]) f.line(P(x, 0.2 + Math.abs(x - 0.5) * 0.6), P(x + (x - 0.5) * 0.1, 0.9), M.dark, 1, 2);
      // Amber circuit in the trunk
      f.seamLine(P(0.43, 0.88), P(0.43, 0.74), [M.main]);
      f.seamLine(P(0.43, 0.74), P(0.56, 0.68), [M.main]);
      f.seamLine(P(0.56, 0.68), P(0.56, 0.6), [M.main]);
      dot(f, 0.55, 0.58, M.glow, 2, 3);
      // Right arm: forward, a "stop" fist
      limb(f, [P(0.68, 0.6), P(0.84, 0.62), P(0.9, 0.52), P(0.9, 0.42)], [0.12, 0.11], M.main, 3);
      f.line(P(0.9, 0.46), P(0.88, 0.56), M.dark, 1, 4);
      // Spines
      for (const [x, y, d] of [[0.27, 0.5, -1], [0.27, 0.7, -1], [0.73, 0.48, 1], [0.73, 0.78, 1], [0.06, 0.4, -1], [0.06, 0.54, -1], [0.96, 0.44, 1], [0.34, 0.2, -1], [0.66, 0.2, 1]] as const)
        horn(f, P(x - 0.01, y), P(x + 0.01, y + 0.02), P(x + d * 0.04, y - 0.02), 0, M.accent, 5);
      for (const [x, y] of [[0.4, 0.62], [0.47, 0.82], [0.6, 0.78], [0.66, 0.62], [0.33, 0.8]] as const) dot(f, x, y, M.accent, 1, 5);
      // Flower crown
      for (const [x, y] of [[0.42, 0.12], [0.5, 0.06], [0.58, 0.12], [0.46, 0.16], [0.56, 0.17]] as const) f.ellipse(x, y, 0.05, 0.04, M.second, 4);
      f.ellipse(0.51, 0.12, 0.03, 0.025, M.glow, 5);
      // Grumpy mouth
      f.line(P(0.44, 0.52), P(0.48, 0.5), M.dark, 1, 4);
      f.line(P(0.48, 0.5), P(0.56, 0.5), M.dark, 1, 4);
      f.line(P(0.56, 0.5), P(0.6, 0.53), M.dark, 1, 4);
      return [{ x: 0.42, y: 0.38, r: 0.065, angry: true }, { x: 0.6, y: 0.38, r: 0.065, angry: true }];
    },
  },

  // Golem-disco: a golem of stacked discs with spinning CD arms and a visor face.
  "golem-disco": {
    colours: {
      main: ["#56668c", "#96a6c6", "#d0dcee", "#ffffff"],
      second: ["#6a4c9c", "#9c7ed2", "#caaef2", "#f4e6ff"],
      accent: ["#1a6a8a", "#2aa8c8", "#5ae0f0", "#c4ffff"],
      dark: ["#1e2236", "#30364e", "#48506e", "#68728e"],
      glow: SENAL,
      iris: "#2ad4ff",
    },
    draw(f) {
      const disc = (cx: number, cy: number, rx: number, ry: number, th: number, lift: number) => {
        f.ellipse(cx, cy + th, rx, ry, M.main, lift);
        f.ellipse(cx, cy, rx, ry, M.second, lift);
        f.ellipse(cx, cy, rx * 0.22, ry * 0.4, M.dark, lift);
        f.seamLine(P(cx - rx * 0.7, cy + th + ry * 0.7), P(cx + rx * 0.7, cy + th + ry * 0.7), [M.main]);
      };
      // Legs
      for (const x of [0.36, 0.64]) { disc(x, 0.9, 0.11, 0.035, 0.03, 0); disc(x + 0.01, 0.82, 0.09, 0.03, 0.03, 0); }
      // Torso stack (slightly twisted)
      disc(0.5, 0.7, 0.24, 0.065, 0.05, 1);
      disc(0.48, 0.6, 0.29, 0.07, 0.05, 1);
      disc(0.52, 0.5, 0.27, 0.07, 0.05, 1);
      disc(0.5, 0.4, 0.22, 0.06, 0.05, 1);
      // CD arms, spinning
      for (const [cx, cy] of [[0.13, 0.62], [0.87, 0.58]] as const) {
        f.ellipse(cx, cy - 0.12, 0.06, 0.04, M.dark, 2);
        f.ellipse(cx, cy, 0.13, 0.13, M.main, 3);
        f.ring(cx, cy, 0.1, M.second, 2, 4);
        f.ring(cx, cy, 0.06, M.accent, 1, 4);
        f.ellipse(cx, cy, 0.03, 0.03, M.dark, 5);
        dot(f, cx - 0.06, cy - 0.08, M.glow, 1, 5);
      }
      arc(f, 0.87, 0.58, 0.16, -1.2, -0.2, M.glow, 0.02, 0);
      arc(f, 0.13, 0.62, 0.16, 2.0, 3.0, M.glow, 0.02, 0);
      // Head: domed disc with a visor
      disc(0.5, 0.31, 0.19, 0.05, 0.04, 2);
      f.ellipse(0.5, 0.21, 0.16, 0.13, M.main, 3);
      f.rect(0.36, 0.17, 0.66, 0.27, M.dark, 4);
      f.line(P(0.5, 0.1), P(0.5, 0.03), M.dark, 1, 4);
      dot(f, 0.49, 0.03, M.glow, 2, 5);
      return [{ x: 0.43, y: 0.22, r: 0.055, angry: true }, { x: 0.59, y: 0.22, r: 0.055, angry: true }];
    },
  },

  // Medusonica: a rose jellyfish with frilled violet arms, emitting dizzying waves.
  medusonica: {
    colours: {
      main: ["#9a3a8c", "#d866b8", "#f8a0da", "#ffe2f4"],
      second: ["#5a3aa2", "#8a60d2", "#b890f2", "#e4d0ff"],
      accent: ["#3a78a8", "#5ab0da", "#90e0f2", "#e0ffff"],
      dark: ["#3a1e4a", "#5a2e6a", "#7a428a", "#9a5aaa"],
      glow: SENAL,
      iris: "#2ad4ff",
    },
    draw(f) {
      // Waves
      for (const r of [0.4, 0.47]) { arc(f, 0.5, 0.3, r, -0.6, 0.5, M.glow, 0.02, 0); arc(f, 0.5, 0.3, r, Math.PI - 0.5, Math.PI + 0.6, M.glow, 0.02, 0); }
      // Thin tentacles
      for (const [x, s] of [[0.22, 1], [0.34, -1], [0.66, 1], [0.78, -1]] as const)
        limb(f, [P(x, 0.44), P(x + s * 0.04, 0.58), P(x - s * 0.03, 0.72), P(x + s * 0.03, 0.84), P(x, 0.95)], [0.035, 0.015], M.accent, 0);
      // Frilled oral arms
      limb(f, [P(0.44, 0.44), P(0.38, 0.58), P(0.46, 0.7), P(0.4, 0.84)], [0.1, 0.03], M.second, 1);
      limb(f, [P(0.56, 0.44), P(0.62, 0.58), P(0.54, 0.7), P(0.6, 0.86)], [0.1, 0.03], M.second, 1);
      // Bell with a scalloped rim
      blob(f, [P(0.12, 0.46), P(0.14, 0.24), P(0.3, 0.08), P(0.5, 0.04), P(0.7, 0.08), P(0.86, 0.24), P(0.88, 0.46), P(0.78, 0.5), P(0.67, 0.45), P(0.56, 0.51), P(0.44, 0.45), P(0.33, 0.51), P(0.22, 0.45)], M.main, 2);
      blob(f, [P(0.2, 0.42), P(0.5, 0.36), P(0.8, 0.42), P(0.78, 0.46), P(0.5, 0.44), P(0.22, 0.46)], M.dark, 3);
      // Inner glow organs and sheen
      for (const [x, y] of [[0.34, 0.16], [0.5, 0.12], [0.66, 0.16]] as const) f.ellipse(x, y, 0.04, 0.03, M.second, 3);
      f.seamLine(P(0.3, 0.16), P(0.38, 0.16), [M.second]);
      f.seamLine(P(0.46, 0.12), P(0.54, 0.12), [M.second]);
      f.seamLine(P(0.62, 0.16), P(0.7, 0.16), [M.second]);
      for (const x of [0.2, 0.32, 0.44, 0.56, 0.68, 0.8]) dot(f, x, 0.4, M.glow, 1, 4);
      return [{ x: 0.42, y: 0.3, r: 0.07, angry: true }, { x: 0.6, y: 0.3, r: 0.07, angry: true }];
    },
  },

  // Lobocifra: a snarling slate wolf with a violet mane and glowing cipher marks on its flank.
  lobocifra: {
    colours: {
      main: ["#3a4066", "#5e6a98", "#8e9cc6", "#c6d0ea"],
      second: ["#8a8aaa", "#c6c6de", "#eeeef8", "#ffffff"],
      accent: ["#2c1e4e", "#48307e", "#6c4aaa", "#9c76d2"],
      dark: ["#1c1c30", "#2c2c48", "#42425e", "#5e5e7c"],
      glow: RUIDO,
      iris: "#ffd23a",
    },
    draw(f) {
      // Bushy tail
      blob(f, [P(0.26, 0.5), P(0.14, 0.44), P(0.05, 0.3), P(0.06, 0.18), P(0.14, 0.24), P(0.2, 0.34), P(0.32, 0.42)], M.main);
      blob(f, [P(0.06, 0.18), P(0.12, 0.22), P(0.1, 0.3), P(0.05, 0.28)], M.accent, 1);
      // Far legs
      limb(f, [P(0.3, 0.62), P(0.24, 0.8), P(0.28, 0.95)], [0.07, 0.04], M.dark);
      limb(f, [P(0.62, 0.62), P(0.6, 0.8), P(0.62, 0.95)], [0.07, 0.04], M.dark);
      // Body and pale belly
      blob(f, [P(0.2, 0.62), P(0.26, 0.44), P(0.46, 0.38), P(0.66, 0.36), P(0.76, 0.5), P(0.7, 0.66), P(0.48, 0.72), P(0.26, 0.72)], M.main, 1);
      blob(f, [P(0.34, 0.7), P(0.5, 0.64), P(0.68, 0.58), P(0.72, 0.66), P(0.5, 0.74)], M.second, 2);
      // Back stripe and cipher marks
      blob(f, [P(0.24, 0.48), P(0.4, 0.38), P(0.62, 0.34), P(0.6, 0.4), P(0.42, 0.44), P(0.28, 0.52)], M.accent, 2);
      for (const [x, y0, y1] of [[0.36, 0.5, 0.58], [0.39, 0.52, 0.56], [0.42, 0.5, 0.58], [0.47, 0.5, 0.53], [0.47, 0.56, 0.58], [0.52, 0.49, 0.57]] as const) f.seamLine(P(x, y0), P(x, y1), [M.main]);
      // Near hind leg
      blob(f, [P(0.2, 0.7), P(0.24, 0.54), P(0.36, 0.52), P(0.42, 0.64), P(0.36, 0.76), P(0.26, 0.78)], M.main, 3);
      limb(f, [P(0.32, 0.72), P(0.36, 0.84), P(0.34, 0.95)], [0.08, 0.05], M.main, 3);
      f.ellipse(0.37, 0.95, 0.05, 0.025, M.main, 4);
      // Near fore leg with claws
      limb(f, [P(0.68, 0.56), P(0.72, 0.78), P(0.74, 0.94)], [0.1, 0.05], M.main, 3);
      f.ellipse(0.77, 0.95, 0.05, 0.025, M.main, 4);
      for (const x of [0.8, 0.83]) horn(f, P(x, 0.94), P(x + 0.02, 0.94), P(x + 0.04, 0.97), 0, M.dark, 5);
      // Mane ruff
      for (const [x, y] of [[0.6, 0.3], [0.62, 0.4], [0.62, 0.5]] as const) horn(f, P(x + 0.04, y - 0.04), P(x + 0.06, y + 0.04), P(x - 0.05, y + 0.01), -0.01, M.main, 3);
      // Far ear
      horn(f, P(0.7, 0.24), P(0.74, 0.22), P(0.64, 0.06), -0.02, M.dark, 3);
      // Head, snout, open jaw with fangs
      blob(f, [P(0.64, 0.36), P(0.7, 0.24), P(0.82, 0.22), P(0.9, 0.3), P(0.97, 0.34), P(0.96, 0.4), P(0.86, 0.42), P(0.74, 0.48)], M.main, 4);
      f.poly([P(0.78, 0.42), P(0.96, 0.4), P(0.92, 0.46), P(0.8, 0.5)], M.dark, 5);
      blob(f, [P(0.76, 0.46), P(0.9, 0.46), P(0.92, 0.5), P(0.8, 0.54)], M.second, 5);
      horn(f, P(0.86, 0.4), P(0.88, 0.4), P(0.87, 0.45), 0, M.second, 6);
      horn(f, P(0.9, 0.47), P(0.92, 0.47), P(0.91, 0.43), 0, M.second, 6);
      f.ellipse(0.96, 0.34, 0.025, 0.025, M.dark, 6);
      f.seamLine(P(0.74, 0.28), P(0.86, 0.32), [M.main]);
      // Near ear
      horn(f, P(0.74, 0.24), P(0.8, 0.23), P(0.72, 0.04), -0.02, M.main, 5);
      horn(f, P(0.755, 0.22), P(0.78, 0.22), P(0.74, 0.1), -0.01, M.accent, 6);
      return [{ x: 0.82, y: 0.31, r: 0.05, angry: true }];
    },
  },

  // Buhoraculo: a stern blue owl with a cream facial disc and a glowing foresight sigil.
  buhoraculo: {
    colours: {
      main: ["#1a3c5e", "#2c5e8a", "#4c8ab4", "#86c2de"],
      second: ["#b0a080", "#e8dcb8", "#fff6dc", "#ffffff"],
      accent: ["#a86a1a", "#e8a02a", "#ffd050", "#fff0a0"],
      dark: ["#1a1a3a", "#2a2c5c", "#40467e", "#5c66a6"],
      glow: SENAL,
      iris: "#2ad4ff",
    },
    draw(f) {
      // Cable perch
      limb(f, [P(0.03, 0.92), P(0.5, 0.9), P(0.97, 0.93)], [0.05, 0.05], M.dark, 0);
      f.seamLine(P(0.04, 0.92), P(0.2, 0.92), [M.dark]);
      f.seamLine(P(0.78, 0.92), P(0.96, 0.93), [M.dark]);
      // Ear tufts
      horn(f, P(0.22, 0.22), P(0.32, 0.16), P(0.1, 0.02), -0.03, M.main, 0);
      horn(f, P(0.68, 0.16), P(0.78, 0.22), P(0.92, 0.02), 0.03, M.main, 0);
      // Body
      blob(f, [P(0.24, 0.86), P(0.17, 0.58), P(0.2, 0.32), P(0.3, 0.16), P(0.5, 0.11), P(0.7, 0.16), P(0.8, 0.32), P(0.83, 0.58), P(0.76, 0.86), P(0.5, 0.9)], M.main, 1);
      // Chest with chevrons
      blob(f, [P(0.34, 0.58), P(0.5, 0.52), P(0.66, 0.58), P(0.64, 0.82), P(0.5, 0.88), P(0.36, 0.82)], M.second, 2);
      for (const [x, y] of [[0.42, 0.64], [0.56, 0.64], [0.48, 0.74], [0.42, 0.82], [0.56, 0.82]] as const) {
        f.line(P(x - 0.025, y - 0.02), P(x, y), M.main, 1, 3);
        f.line(P(x, y), P(x + 0.025, y - 0.02), M.main, 1, 3);
      }
      // Folded wings with live feather lines
      blob(f, [P(0.16, 0.46), P(0.24, 0.42), P(0.33, 0.6), P(0.32, 0.86), P(0.22, 0.86), P(0.13, 0.66)], M.dark, 3);
      blob(f, [P(0.84, 0.46), P(0.76, 0.42), P(0.67, 0.6), P(0.68, 0.86), P(0.78, 0.86), P(0.87, 0.66)], M.dark, 3);
      f.seamLine(P(0.2, 0.56), P(0.26, 0.8), [M.dark]);
      f.seamLine(P(0.8, 0.56), P(0.74, 0.8), [M.dark]);
      // Talons on the perch
      for (const x of [0.38, 0.44, 0.56, 0.62]) horn(f, P(x - 0.02, 0.86), P(x + 0.02, 0.86), P(x, 0.94), 0, M.accent, 4);
      // Facial disc, brows, beak
      f.ellipse(0.37, 0.35, 0.14, 0.13, M.second, 3);
      f.ellipse(0.63, 0.35, 0.14, 0.13, M.second, 3);
      f.poly([P(0.22, 0.22), P(0.5, 0.3), P(0.78, 0.22), P(0.76, 0.18), P(0.5, 0.24), P(0.24, 0.18)], M.main, 4);
      f.poly([P(0.46, 0.4), P(0.54, 0.4), P(0.5, 0.52)], M.accent, 5);
      // Foresight sigil
      f.poly([P(0.5, 0.12), P(0.54, 0.17), P(0.5, 0.22), P(0.46, 0.17)], M.glow, 5);
      return [{ x: 0.37, y: 0.36, r: 0.09, angry: true }, { x: 0.63, y: 0.36, r: 0.09, angry: true }];
    },
  },

  // Escorpiolag: a maroon scorpion with bone plates and a loading-spinner around its sting.
  escorpiolag: {
    colours: {
      main: ["#4c1a3c", "#82284e", "#ba4a5e", "#ec8c7e"],
      second: ["#a08060", "#d8b888", "#f4e0b0", "#fff8e2"],
      accent: ["#5a2a8a", "#8a44c2", "#b870ea", "#e8b2ff"],
      dark: ["#2a1426", "#401e38", "#5a2c4c", "#7a4062"],
      glow: RUIDO,
      iris: "#ffe03a",
    },
    draw(f) {
      // Far legs and far pincer
      for (const x of [0.3, 0.4, 0.5, 0.6]) limb(f, [P(x, 0.72), P(x + 0.02, 0.8), P(x - 0.03, 0.95)], [0.04, 0.02], M.dark);
      limb(f, [P(0.66, 0.7), P(0.78, 0.76), P(0.84, 0.72)], [0.06, 0.05], M.dark);
      horn(f, P(0.82, 0.68), P(0.86, 0.76), P(0.96, 0.7), -0.01, M.dark, 1);
      // Tail segments, arching over the back
      const tail: [number, number, number][] = [[0.22, 0.66, 0.08], [0.13, 0.54, 0.075], [0.12, 0.4, 0.07], [0.17, 0.27, 0.065], [0.27, 0.18, 0.06], [0.39, 0.14, 0.055]];
      for (const [x, y, r] of tail) f.ellipse(x, y, r, r, M.main, 1);
      for (const [x, y] of tail.slice(1)) f.seamLine(P(x - 0.02, y), P(x + 0.02, y), [M.main]);
      // Sting bulb, stinger and loading spinner
      f.ellipse(0.5, 0.15, 0.06, 0.055, M.accent, 2);
      limb(f, [P(0.53, 0.15), P(0.6, 0.18), P(0.63, 0.27)], [0.05, 0.0], M.second, 3);
      for (let k = 0; k < 6; k++) { const a = -2.4 + k * 0.75; dot(f, 0.5 + Math.cos(a) * 0.1 - PX, 0.15 + Math.sin(a) * 0.1 - PX, M.glow, k < 2 ? 1 : 2, 4); }
      // Body with bone plates
      blob(f, [P(0.16, 0.76), P(0.22, 0.62), P(0.44, 0.56), P(0.66, 0.58), P(0.76, 0.66), P(0.7, 0.78), P(0.44, 0.82), P(0.22, 0.82)], M.main, 2);
      for (const x of [0.3, 0.41, 0.52]) blob(f, [P(x, 0.6), P(x + 0.08, 0.58), P(x + 0.08, 0.66), P(x, 0.68)], M.second, 3);
      // Near legs
      for (const x of [0.32, 0.42, 0.52, 0.62]) limb(f, [P(x, 0.74), P(x + 0.04, 0.84), P(x + 0.02, 0.96)], [0.045, 0.02], M.main, 3);
      // Head
      f.ellipse(0.74, 0.66, 0.1, 0.085, M.main, 3);
      // Near pincer, raised
      limb(f, [P(0.7, 0.62), P(0.76, 0.54), P(0.8, 0.48)], [0.07, 0.06], M.main, 4);
      blob(f, [P(0.86, 0.38), P(0.92, 0.32), P(0.97, 0.34), P(0.95, 0.38), P(0.9, 0.4)], M.second, 5);
      blob(f, [P(0.86, 0.5), P(0.93, 0.5), P(0.97, 0.45), P(0.96, 0.52), P(0.9, 0.56)], M.second, 5);
      f.ellipse(0.83, 0.45, 0.075, 0.065, M.second, 6);
      f.seamLine(P(0.78, 0.45), P(0.87, 0.45), [M.second]);
      dot(f, 0.95, 0.33, M.accent, 1, 7);
      dot(f, 0.95, 0.47, M.accent, 1, 7);
      return [{ x: 0.77, y: 0.63, r: 0.05, angry: true }];
    },
  },

  // Ciervoltio: a chestnut deer with spotted back and crackling blue antlers.
  ciervoltio: {
    colours: {
      main: ["#8c3e2a", "#ca6a3a", "#f09c5a", "#ffce92"],
      second: ["#c0a080", "#ecd8b8", "#fff4e0", "#ffffff"],
      accent: ["#5a6aaa", "#8aa8e2", "#c2dcff", "#ffffff"],
      dark: ["#2a1e2a", "#402c3a", "#5a3e4c", "#785a66"],
      glow: PULSO,
      iris: "#ffb020",
    },
    draw(f) {
      // Far antler
      limb(f, [P(0.76, 0.21), P(0.66, 0.18), P(0.54, 0.12), P(0.46, 0.04)], [0.05, 0.025], M.accent, 0);
      for (const [a, b] of [[P(0.64, 0.17), P(0.6, 0.04)], [P(0.55, 0.13), P(0.42, 0.13)], [P(0.71, 0.19), P(0.7, 0.1)]] as const) limb(f, [a, b], [0.035, 0.015], M.accent, 0);
      // Far legs
      limb(f, [P(0.28, 0.64), P(0.24, 0.8), P(0.28, 0.94)], [0.06, 0.03], M.dark);
      limb(f, [P(0.6, 0.64), P(0.62, 0.8), P(0.6, 0.94)], [0.06, 0.03], M.dark);
      // Tail
      f.ellipse(0.18, 0.5, 0.04, 0.05, M.second);
      // Neck
      limb(f, [P(0.6, 0.52), P(0.68, 0.38), P(0.74, 0.3)], [0.16, 0.1], M.main, 0);
      // Body, belly and spots
      blob(f, [P(0.17, 0.6), P(0.22, 0.46), P(0.4, 0.42), P(0.6, 0.42), P(0.7, 0.52), P(0.66, 0.66), P(0.48, 0.7), P(0.24, 0.7)], M.main, 1);
      blob(f, [P(0.3, 0.68), P(0.48, 0.64), P(0.64, 0.62), P(0.6, 0.7), P(0.4, 0.72)], M.second, 2);
      for (const [x, y] of [[0.3, 0.48], [0.38, 0.46], [0.46, 0.47], [0.34, 0.54], [0.42, 0.53], [0.52, 0.5]] as const) dot(f, x, y, M.second, 2, 2);
      f.seamLine(P(0.26, 0.58), P(0.56, 0.58), [M.main]);
      // Near legs with hooves
      blob(f, [P(0.2, 0.66), P(0.24, 0.5), P(0.36, 0.5), P(0.4, 0.62), P(0.34, 0.74), P(0.24, 0.74)], M.main, 3);
      limb(f, [P(0.32, 0.7), P(0.36, 0.82), P(0.33, 0.93)], [0.07, 0.035], M.main, 3);
      f.rect(0.31, 0.92, 0.37, 0.97, M.dark, 4);
      limb(f, [P(0.64, 0.6), P(0.67, 0.8), P(0.67, 0.93)], [0.07, 0.035], M.main, 3);
      f.rect(0.64, 0.92, 0.7, 0.97, M.dark, 4);
      // Chest fluff
      blob(f, [P(0.64, 0.44), P(0.74, 0.42), P(0.74, 0.52), P(0.68, 0.56)], M.second, 3);
      // Ear and head
      horn(f, P(0.72, 0.26), P(0.74, 0.3), P(0.58, 0.24), -0.01, M.main, 3);
      blob(f, [P(0.68, 0.3), P(0.72, 0.22), P(0.82, 0.19), P(0.9, 0.27), P(0.96, 0.34), P(0.92, 0.39), P(0.8, 0.39), P(0.7, 0.36)], M.main, 4);
      blob(f, [P(0.84, 0.36), P(0.92, 0.33), P(0.95, 0.37), P(0.88, 0.39)], M.second, 5);
      f.ellipse(0.95, 0.33, 0.02, 0.02, M.dark, 6);
      // Near antler with tines
      limb(f, [P(0.8, 0.21), P(0.83, 0.12), P(0.78, 0.05), P(0.68, 0.03)], [0.055, 0.025], M.accent, 5);
      for (const [a, b] of [[P(0.83, 0.13), P(0.95, 0.06)], [P(0.8, 0.07), P(0.88, 0.02)], [P(0.82, 0.18), P(0.94, 0.17)]] as const) limb(f, [a, b], [0.04, 0.015], M.accent, 5);
      // Static sparks
      zap(f, [P(0.95, 0.07), P(0.93, 0.1), P(0.96, 0.12), P(0.94, 0.16)]);
      zap(f, [P(0.6, 0.05), P(0.56, 0.06), P(0.58, 0.09), P(0.54, 0.1)]);
      zap(f, [P(0.68, 0.04), P(0.72, 0.08), P(0.7, 0.1), P(0.74, 0.12)]);
      dot(f, 0.4, 0.12, M.glow, 2, 5);
      dot(f, 0.45, 0.03, M.glow, 1, 5);
      return [{ x: 0.82, y: 0.28, r: 0.05, angry: true }];
    },
  },
};

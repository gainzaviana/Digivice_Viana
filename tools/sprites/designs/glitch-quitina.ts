import { Material as M, type Point, type SpriteForge } from "../../../src/art/forge";
import { blob, horn, P, type Colours, type Design } from "../style";

// Glitch: broken-code imps that grow into puppeteers and an error king (Ruido, magenta glow).
const ruido: Colours = {
  main: ["#3a2668", "#6844ae", "#9a72e0", "#d0b4ff"],
  second: ["#1c5f86", "#2fa8c4", "#72e0de", "#d2fff2"],
  accent: ["#5a5478", "#9a94b8", "#d4d0e6", "#fbf8ff"],
  dark: ["#241e46", "#3a326c", "#564e96", "#7a72b8"],
  glow: "#ff3ad8",
  iris: "#b8ff3a",
};

// Quitina: a shy beetle that becomes an iridescent knight (Pulso, amber glow).
const pulso: Colours = {
  main: ["#2c5088", "#2a9096", "#4fcaa0", "#c8f5a0"],
  second: ["#8a4f2a", "#d2963a", "#f4c868", "#fff0b4"],
  accent: ["#3a3266", "#5c5290", "#887ebc", "#c0b8e4"],
  dark: ["#22203e", "#36305c", "#4c467a", "#665e96"],
  glow: "#ffb43a",
  iris: "#ffb43a",
};

type F = SpriteForge;

/** A tapered stroke along a polyline (tails, limbs, ears), widths in canvas units. */
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

/** A mouse-pointer arrow with its tip at (x, y). */
function cursor(f: F, x: number, y: number, s: number, m: M, lift = 0) {
  const pts: Point[] = [[0, 0], [0, 1], [0.27, 0.76], [0.44, 1.1], [0.6, 1.02], [0.43, 0.68], [0.76, 0.68]];
  f.poly(pts.map(([px, py]) => P(x + px * s, y + py * s)), m, lift);
}

/** A tiny error window: frame, title bar and a glowing cross. */
function errWin(f: F, x: number, y: number, w: number, h: number, lift = 0, body: M = M.accent) {
  f.rect(x, y, x + w, y + h, body, lift);
  f.rect(x, y, x + w, y + 0.035, M.dark, lift + 1);
  f.rect(x + w - 0.035, y + 0.006, x + w - 0.008, y + 0.03, M.glow, lift + 2);
  f.line(P(x + 0.03, y + h * 0.55), P(x + w - 0.03, y + h * 0.55), M.glow, 1, lift + 1);
  if (h > 0.12) f.line(P(x + 0.03, y + h * 0.78), P(x + w * 0.6, y + h * 0.78), M.dark, 1, lift + 1);
}

/** A warning triangle with a glowing "!". */
function warn(f: F, x: number, y: number, s: number, lift = 0) {
  f.triangle(P(x, y - s), P(x - s * 0.95, y + s * 0.7), P(x + s * 0.95, y + s * 0.7), M.accent, lift);
  f.line(P(x, y - s * 0.4), P(x, y + s * 0.15), M.glow, 1, lift + 1);
  f.rect(x - 0.005, y + s * 0.35, x + 0.011, y + s * 0.5, M.glow, lift + 1);
}

/** Loading spinner ring: the sign of everything that hangs. */
function spinner(f: F, x: number, y: number, r: number, lift = 0) {
  f.ring(x, y, r, M.accent, 2, lift);
  for (const a of [0.2, 1.4, 2.6]) f.line(P(x + Math.cos(a) * (r - 0.012), y + Math.sin(a) * (r - 0.012)), P(x + Math.cos(a + 0.5) * (r - 0.012), y + Math.sin(a + 0.5) * (r - 0.012)), M.glow, 2, lift + 1);
}

export const glitchQuitina: Record<string, Design> = {};
const G = glitchQuitina;

// ───────────────────────── Glitch line ─────────────────────────

// Brote: a square pixel-sprite with a screen belly, a cursor antenna and stray pixels around it.
G.bichito = {
  colours: ruido,
  draw(f) {
    f.ellipse(0.35, 0.92, 0.09, 0.055, M.main);
    f.ellipse(0.65, 0.92, 0.09, 0.055, M.main);
    stroke(f, [P(0.52, 0.3), P(0.55, 0.18), P(0.62, 0.12)], 0.04, 0.025, M.main);
    cursor(f, 0.62, 0.02, 0.13, M.accent, 1);
    f.triangle(P(0.14, 0.44), P(0.32, 0.3), P(0.07, 0.15), M.main);
    f.triangle(P(0.86, 0.44), P(0.68, 0.3), P(0.93, 0.15), M.main);
    f.triangle(P(0.16, 0.36), P(0.24, 0.31), P(0.11, 0.23), M.second, 1);
    f.triangle(P(0.84, 0.36), P(0.76, 0.31), P(0.89, 0.23), M.second, 1);
    blob(f, [P(0.14, 0.56), P(0.18, 0.32), P(0.5, 0.26), P(0.82, 0.32), P(0.86, 0.6), P(0.8, 0.88), P(0.5, 0.92), P(0.2, 0.88)], M.main);
    f.ellipse(0.13, 0.68, 0.05, 0.07, M.main, 1);
    f.ellipse(0.87, 0.68, 0.05, 0.07, M.main, 1);
    blob(f, [P(0.32, 0.68), P(0.36, 0.63), P(0.64, 0.63), P(0.68, 0.68), P(0.66, 0.84), P(0.34, 0.84)], M.second, 1);
    f.seamLine(P(0.38, 0.7), P(0.45, 0.76), [M.second]);
    f.seamLine(P(0.45, 0.76), P(0.56, 0.76), [M.second]);
    f.seamLine(P(0.56, 0.76), P(0.63, 0.7), [M.second]);
    f.rect(0.04, 0.44, 0.09, 0.49, M.second, 1);
    f.rect(0.9, 0.6, 0.95, 0.65, M.glow, 1);
    f.rect(0.88, 0.48, 0.92, 0.52, M.main, 1);
    f.rect(0.06, 0.82, 0.09, 0.85, M.glow, 1);
    f.glitchRows([0.42], 2);
    f.glitchRows([0.8, 0.82], -2);
    return [{ x: 0.37, y: 0.49, r: 0.085 }, { x: 0.63, y: 0.49, r: 0.085 }];
  },
};

// Novato: a crouching imp with bat ears, a glowing grin and a zigzag cursor-tipped tail.
G.glitchin = {
  colours: ruido,
  draw(f) {
    stroke(f, [P(0.36, 0.8), P(0.2, 0.8), P(0.12, 0.68), P(0.2, 0.58), P(0.1, 0.48), P(0.12, 0.4)], 0.07, 0.03, M.main);
    cursor(f, 0.1, 0.27, 0.13, M.accent, 1);
    // Far ear
    blob(f, [P(0.5, 0.16), P(0.36, 0.02), P(0.24, 0.02), P(0.36, 0.12), P(0.44, 0.24)], M.dark);
    f.ellipse(0.42, 0.9, 0.07, 0.06, M.main);
    blob(f, [P(0.3, 0.84), P(0.3, 0.64), P(0.42, 0.52), P(0.58, 0.54), P(0.66, 0.72), P(0.58, 0.88), P(0.42, 0.9)], M.main);
    blob(f, [P(0.44, 0.86), P(0.44, 0.66), P(0.56, 0.6), P(0.63, 0.74), P(0.56, 0.87)], M.second, 1);
    f.seamLine(P(0.46, 0.74), P(0.62, 0.74), [M.second]);
    f.seamLine(P(0.46, 0.8), P(0.6, 0.8), [M.second]);
    blob(f, [P(0.48, 0.78), P(0.6, 0.8), P(0.64, 0.9), P(0.72, 0.95), P(0.5, 0.97), P(0.46, 0.88)], M.main, 2);
    horn(f, P(0.66, 0.96), P(0.68, 0.92), P(0.78, 0.97), 0, M.accent, 3);
    // Arm raised, claws spread
    stroke(f, [P(0.56, 0.6), P(0.7, 0.66), P(0.8, 0.56)], 0.08, 0.06, M.main, 2);
    horn(f, P(0.78, 0.54), P(0.82, 0.56), P(0.86, 0.46), 0.01, M.accent, 3);
    horn(f, P(0.8, 0.57), P(0.83, 0.59), P(0.92, 0.54), 0.01, M.accent, 3);
    // Head
    blob(f, [P(0.34, 0.38), P(0.38, 0.2), P(0.56, 0.12), P(0.78, 0.16), P(0.92, 0.3), P(0.86, 0.46), P(0.62, 0.54), P(0.42, 0.5)], M.main, 1);
    blob(f, [P(0.5, 0.2), P(0.3, 0.06), P(0.12, 0.04), P(0.26, 0.18), P(0.36, 0.32), P(0.46, 0.3)], M.main, 2);
    blob(f, [P(0.44, 0.22), P(0.3, 0.12), P(0.22, 0.1), P(0.32, 0.2), P(0.4, 0.26)], M.second, 3);
    horn(f, P(0.6, 0.14), P(0.66, 0.13), P(0.64, 0.02), 0.03, M.accent, 2);
    f.seamLine(P(0.66, 0.42), P(0.76, 0.45), [M.main]);
    f.seamLine(P(0.76, 0.45), P(0.88, 0.38), [M.main]);
    f.triangle(P(0.78, 0.45), P(0.81, 0.44), P(0.8, 0.49), M.accent, 3);
    f.glitchRows([0.6, 0.62], 2);
    f.glitchRows([0.84], -2);
    return [{ x: 0.72, y: 0.28, r: 0.075 }];
  },
};

// Avanzado: the imp rides the head of a big blocky data puppet and works its strings.
G.titiriton = {
  colours: ruido,
  draw(f) {
    // Imp tail hanging behind the puppet's head
    stroke(f, [P(0.44, 0.3), P(0.3, 0.32), P(0.22, 0.4), P(0.24, 0.5)], 0.05, 0.03, M.main);
    cursor(f, 0.2, 0.5, 0.11, M.accent, 1);
    // Puppet: far arm and leg
    stroke(f, [P(0.46, 0.62), P(0.38, 0.7), P(0.36, 0.8)], 0.08, 0.07, M.second);
    f.rect(0.31, 0.8, 0.41, 0.87, M.second);
    f.rect(0.47, 0.78, 0.57, 0.96, M.second);
    f.rect(0.44, 0.92, 0.58, 0.97, M.dark, 1);
    // Torso with data seams and a pelvis joint
    f.ellipse(0.6, 0.8, 0.12, 0.05, M.dark, 1);
    blob(f, [P(0.42, 0.6), P(0.46, 0.56), P(0.76, 0.55), P(0.8, 0.6), P(0.76, 0.8), P(0.46, 0.8)], M.second, 1);
    f.seamLine(P(0.48, 0.64), P(0.74, 0.64), [M.second]);
    f.seamLine(P(0.48, 0.71), P(0.58, 0.71), [M.second]);
    f.seamLine(P(0.64, 0.71), P(0.74, 0.71), [M.second]);
    f.ellipse(0.61, 0.71, 0.035, 0.035, M.dark, 2);
    // Near leg
    f.rect(0.62, 0.8, 0.72, 0.95, M.second, 2);
    f.ellipse(0.67, 0.87, 0.04, 0.025, M.dark, 3);
    f.rect(0.6, 0.92, 0.8, 0.97, M.dark, 3);
    // Near arm reaching forward
    f.ellipse(0.78, 0.6, 0.045, 0.045, M.dark, 2);
    stroke(f, [P(0.79, 0.6), P(0.86, 0.66), P(0.88, 0.72)], 0.08, 0.07, M.second, 3);
    f.rect(0.84, 0.72, 0.96, 0.82, M.second, 4);
    f.line(P(0.9, 0.74), P(0.9, 0.81), M.dark, 1, 5);
    // Puppet head: a block with a hinged jaw
    blob(f, [P(0.42, 0.4), P(0.48, 0.34), P(0.8, 0.34), P(0.84, 0.4), P(0.82, 0.54), P(0.44, 0.54)], M.second, 2);
    f.rect(0.66, 0.48, 0.82, 0.54, M.dark, 3);
    f.line(P(0.66, 0.48), P(0.66, 0.57), M.dark, 1, 4);
    f.seamLine(P(0.46, 0.46), P(0.58, 0.46), [M.second]);
    // Imp sitting on top
    blob(f, [P(0.4, 0.34), P(0.4, 0.22), P(0.5, 0.16), P(0.62, 0.2), P(0.62, 0.32), P(0.5, 0.36)], M.main, 3);
    blob(f, [P(0.5, 0.33), P(0.5, 0.24), P(0.58, 0.22), P(0.6, 0.32)], M.second, 4);
    stroke(f, [P(0.52, 0.32), P(0.64, 0.34), P(0.68, 0.42)], 0.06, 0.05, M.main, 5);
    horn(f, P(0.65, 0.42), P(0.7, 0.41), P(0.73, 0.46), 0.01, M.accent, 6);
    // Arm holding the control cross
    stroke(f, [P(0.56, 0.24), P(0.68, 0.24), P(0.8, 0.17)], 0.055, 0.045, M.main, 5);
    f.line(P(0.72, 0.16), P(0.97, 0.16), M.accent, 2, 6);
    f.line(P(0.85, 0.09), P(0.85, 0.24), M.accent, 2, 6);
    // Imp head with bat ear
    blob(f, [P(0.38, 0.14), P(0.42, 0.04), P(0.56, 0.01), P(0.68, 0.05), P(0.72, 0.12), P(0.62, 0.18), P(0.46, 0.19)], M.main, 4);
    blob(f, [P(0.46, 0.06), P(0.3, 0.0), P(0.16, 0.02), P(0.26, 0.08), P(0.4, 0.15)], M.main, 5);
    blob(f, [P(0.42, 0.07), P(0.32, 0.04), P(0.24, 0.04), P(0.32, 0.08), P(0.4, 0.12)], M.second, 6);
    f.seamLine(P(0.6, 0.15), P(0.71, 0.12), [M.main]);
    // Strings
    f.line(P(0.96, 0.17), P(0.92, 0.73), M.glow, 1, 7);
    f.line(P(0.85, 0.24), P(0.8, 0.36), M.glow, 1, 7);
    f.glitchRows([0.44], 2);
    f.glitchRows([0.74, 0.76], -2);
    return [{ x: 0.6, y: 0.09, r: 0.055 }, { x: 0.7, y: 0.42, r: 0.065 }];
  },
};

// Élite: a lanky jester puppeteer in a tattered cloak; strings from his claws make a doll dance.
G.marioneterror = {
  colours: ruido,
  draw(f) {
    // Cloak
    f.poly([P(0.34, 0.3), P(0.58, 0.32), P(0.62, 0.6), P(0.6, 0.86), P(0.5, 0.8), P(0.42, 0.94), P(0.34, 0.82), P(0.24, 0.92), P(0.18, 0.78), P(0.06, 0.86), P(0.1, 0.62), P(0.2, 0.42)], M.dark);
    f.poly([P(0.24, 0.5), P(0.3, 0.5), P(0.22, 0.8), P(0.16, 0.74)], M.dark, 1);
    // Far arm forward-high
    stroke(f, [P(0.5, 0.36), P(0.62, 0.3), P(0.76, 0.28)], 0.06, 0.045, M.main, 1);
    for (const [y, tx, ty] of [[0.26, 0.82, 0.32], [0.29, 0.8, 0.36]] as const) horn(f, P(0.76, y), P(0.77, y + 0.025), P(tx, ty), 0.01, M.accent, 2);
    // Legs
    stroke(f, [P(0.42, 0.68), P(0.4, 0.82), P(0.42, 0.95)], 0.07, 0.05, M.main, 1);
    horn(f, P(0.38, 0.97), P(0.45, 0.92), P(0.52, 0.92), -0.01, M.dark, 2);
    stroke(f, [P(0.5, 0.68), P(0.54, 0.82), P(0.56, 0.94)], 0.08, 0.06, M.main, 2);
    horn(f, P(0.52, 0.97), P(0.59, 0.92), P(0.7, 0.9), -0.02, M.dark, 3);
    // Torso, belly with code stripes, ruff collar
    blob(f, [P(0.36, 0.66), P(0.34, 0.4), P(0.44, 0.3), P(0.58, 0.34), P(0.62, 0.52), P(0.58, 0.72), P(0.44, 0.74)], M.main, 1);
    blob(f, [P(0.46, 0.7), P(0.46, 0.46), P(0.56, 0.42), P(0.6, 0.56), P(0.56, 0.7)], M.second, 2);
    for (const y of [0.5, 0.56, 0.62]) f.seamLine(P(0.47, y), P(0.6, y), [M.second]);
    f.poly([P(0.36, 0.3), P(0.4, 0.38), P(0.44, 0.32), P(0.48, 0.4), P(0.52, 0.33), P(0.57, 0.4), P(0.6, 0.32), P(0.62, 0.28), P(0.4, 0.26)], M.accent, 3);
    // Near arm stretched forward, long claws pointing down
    stroke(f, [P(0.5, 0.42), P(0.64, 0.46), P(0.8, 0.42)], 0.07, 0.05, M.main, 4);
    for (const [x, tx] of [[0.79, 0.8], [0.82, 0.86], [0.85, 0.93]] as const) horn(f, P(x, 0.4), P(x + 0.03, 0.43), P(tx, 0.52), 0.01, M.accent, 5);
    // Head with jester hood
    blob(f, [P(0.4, 0.2), P(0.48, 0.1), P(0.66, 0.08), P(0.8, 0.14), P(0.86, 0.24), P(0.76, 0.32), P(0.54, 0.32), P(0.42, 0.28)], M.main, 3);
    blob(f, [P(0.48, 0.12), P(0.3, 0.02), P(0.12, 0.06), P(0.08, 0.16), P(0.16, 0.12), P(0.3, 0.14), P(0.44, 0.24)], M.dark, 4);
    blob(f, [P(0.58, 0.1), P(0.52, 0.02), P(0.36, 0.0), P(0.3, 0.04), P(0.42, 0.06), P(0.5, 0.14)], M.dark, 5);
    f.ellipse(0.08, 0.17, 0.035, 0.035, M.glow, 5);
    f.ellipse(0.29, 0.05, 0.03, 0.03, M.glow, 6);
    f.seamLine(P(0.62, 0.28), P(0.72, 0.3), [M.main]);
    f.seamLine(P(0.72, 0.3), P(0.85, 0.24), [M.main]);
    f.triangle(P(0.73, 0.3), P(0.76, 0.3), P(0.745, 0.34), M.accent, 4);
    // The dancing doll
    f.rect(0.76, 0.86, 0.79, 0.95, M.second, 1);
    f.rect(0.86, 0.84, 0.89, 0.92, M.second, 1);
    f.rect(0.74, 0.7, 0.9, 0.86, M.second, 2);
    f.rect(0.7, 0.68, 0.74, 0.78, M.second, 2);
    f.rect(0.9, 0.62, 0.94, 0.72, M.second, 2);
    f.rect(0.76, 0.56, 0.9, 0.69, M.accent, 3);
    f.seamLine(P(0.76, 0.78), P(0.9, 0.78), [M.second]);
    for (const [a, b] of [[P(0.8, 0.52), P(0.72, 0.69)], [P(0.86, 0.53), P(0.82, 0.57)], [P(0.93, 0.53), P(0.92, 0.63)], [P(0.82, 0.34), P(0.78, 0.86)]] as const) f.line(a, b, M.glow, 1, 6);
    f.glitchRows([0.8, 0.82], 2);
    f.glitchRows([0.58], -2);
    return [{ x: 0.72, y: 0.19, r: 0.065, angry: true }, { x: 0.86, y: 0.62, r: 0.035 }];
  },
};

// Supremo: the error king. Ermine cape, a crown of warnings trailing an endless error ribbon,
// and a sceptre topped by the loading spinner. `frozen` is the Despertar: a blue screen behind
// him, ice at his feet, everything locked in place.
function errorKing(f: F, frozen: boolean) {
  if (frozen) {
    // The blue screen: a sad face and lines of dump text.
    f.rect(0.01, 0.17, 0.62, 0.66, M.accent);
    f.rect(0.03, 0.19, 0.6, 0.64, M.dark, 1);
    f.rect(0.08, 0.24, 0.11, 0.28, M.glow, 2);
    f.rect(0.08, 0.32, 0.11, 0.36, M.glow, 2);
    f.line(P(0.17, 0.22), P(0.15, 0.27), M.glow, 1, 2);
    f.line(P(0.15, 0.27), P(0.15, 0.33), M.glow, 1, 2);
    f.line(P(0.15, 0.33), P(0.17, 0.38), M.glow, 1, 2);
    for (const [y, w] of [[0.44, 0.24], [0.49, 0.16], [0.54, 0.2]] as const) f.line(P(0.07, y), P(0.07 + w, y), M.glow, 1, 2);
    f.rect(0.07, 0.58, 0.1, 0.61, M.glow, 2);
    f.rect(0.12, 0.58, 0.2, 0.61, M.glow, 2);
  } else {
    errWin(f, 0.02, 0.36, 0.2, 0.14);
    errWin(f, 0.12, 0.22, 0.16, 0.1, 1);
  }
  // Endless error ribbon from the crown
  const rib = [P(0.56, 0.15), P(0.42, 0.1), P(0.3, 0.15), P(0.18, 0.09), P(0.06, 0.13), P(0.0, 0.1)];
  stroke(f, rib, 0.075, 0.06, M.accent, 1);
  for (let i = 0; i < rib.length - 1; i++) {
    const [a, b] = [rib[i], rib[i + 1]];
    const m = (t: number) => P(a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t + 0.004);
    f.seamLine(m(0.1), m(0.35), [M.accent]);
    f.seamLine(m(0.55), m(0.85), [M.accent]);
  }
  // Cape
  f.poly([P(0.38, 0.4), P(0.6, 0.38), P(0.66, 0.96), P(0.06, 0.96), P(0.14, 0.7), P(0.26, 0.5)], frozen ? M.second : M.dark, 1);
  f.poly([P(0.06, 0.96), P(0.14, 0.7), P(0.2, 0.62), P(0.18, 0.96)], M.main, 2);
  // Legs
  f.ellipse(0.44, 0.9, 0.08, 0.07, M.main, 1);
  blob(f, [P(0.5, 0.76), P(0.64, 0.78), P(0.66, 0.92), P(0.72, 0.96), P(0.5, 0.97), P(0.48, 0.86)], M.main, 2);
  horn(f, P(0.66, 0.97), P(0.68, 0.93), P(0.78, 0.97), 0, M.accent, 3);
  // Body with a code robe
  blob(f, [P(0.32, 0.8), P(0.3, 0.52), P(0.42, 0.4), P(0.62, 0.42), P(0.72, 0.6), P(0.68, 0.82), P(0.5, 0.88)], M.main, 1);
  blob(f, [P(0.48, 0.86), P(0.46, 0.5), P(0.6, 0.46), P(0.7, 0.6), P(0.66, 0.82)], M.second, 2);
  for (const [y, w] of [[0.56, 0.12], [0.62, 0.08], [0.76, 0.14], [0.8, 0.1]] as const) f.seamLine(P(0.5, y), P(0.5 + w, y), [M.second]);
  f.rect(0.46, 0.67, 0.72, 0.71, M.dark, 3);
  f.rect(0.57, 0.66, 0.62, 0.72, M.accent, 4);
  // Ermine collar
  blob(f, [P(0.32, 0.46), P(0.4, 0.38), P(0.62, 0.38), P(0.72, 0.44), P(0.62, 0.5), P(0.4, 0.5)], M.accent, 3);
  for (const x of [0.4, 0.5, 0.6]) f.rect(x, 0.43, x + 0.02, 0.46, M.dark, 4);
  // Sceptre with the spinner
  f.line(P(0.88, 0.28), P(0.88, 0.97), M.accent, 2, 4);
  spinner(f, 0.88, 0.18, 0.1, 5);
  f.ellipse(0.88, 0.18, 0.03, 0.03, M.glow, 6);
  // Near arm grasping the sceptre
  stroke(f, [P(0.6, 0.52), P(0.74, 0.62), P(0.84, 0.56)], 0.09, 0.07, M.main, 5);
  f.ellipse(0.87, 0.56, 0.045, 0.04, M.main, 6);
  horn(f, P(0.88, 0.58), P(0.9, 0.6), P(0.94, 0.62), 0.01, M.accent, 7);
  // Head
  blob(f, [P(0.42, 0.32), P(0.48, 0.22), P(0.66, 0.18), P(0.82, 0.24), P(0.86, 0.34), P(0.76, 0.42), P(0.56, 0.44), P(0.44, 0.4)], M.main, 4);
  blob(f, [P(0.5, 0.28), P(0.36, 0.2), P(0.22, 0.26), P(0.36, 0.28), P(0.46, 0.36)], M.main, 5);
  f.seamLine(P(0.66, 0.39), P(0.74, 0.41), [M.main]);
  f.seamLine(P(0.74, 0.41), P(0.84, 0.35), [M.main]);
  f.triangle(P(0.74, 0.41), P(0.77, 0.41), P(0.755, 0.45), M.accent, 5);
  // Crown of warnings
  f.poly([P(0.48, 0.22), P(0.47, 0.06), P(0.54, 0.12), P(0.6, 0.01), P(0.66, 0.12), P(0.73, 0.01), P(0.78, 0.12), P(0.82, 0.06), P(0.8, 0.22)], M.accent, 6);
  f.rect(0.48, 0.18, 0.8, 0.22, M.dark, 7);
  f.seamLine(P(0.5, 0.2), P(0.79, 0.2), [M.dark]);
  for (const x of [0.47, 0.6, 0.73, 0.82]) f.rect(x - 0.012, x === 0.47 || x === 0.82 ? 0.05 : 0.0, x + 0.012, (x === 0.47 || x === 0.82 ? 0.05 : 0.0) + 0.03, M.glow, 7);
  warn(f, 0.635, 0.13, 0.04, 8);
  if (frozen) {
    // Ice locking the floor and floating shards
    for (const [x, h, w] of [[0.08, 0.16, 0.05], [0.18, 0.1, 0.04], [0.3, 0.08, 0.035], [0.76, 0.12, 0.04], [0.95, 0.18, 0.05]] as const) {
      f.triangle(P(x - w, 0.98), P(x + w, 0.98), P(x + w * 0.3, 0.98 - h), M.accent, 8);
      f.line(P(x, 0.97), P(x + w * 0.2, 0.98 - h * 0.6), M.glow, 1, 9);
    }
    for (const [x, y] of [[0.66, 0.02], [0.96, 0.4], [0.72, 0.58], [0.04, 0.7]] as const) {
      f.line(P(x - 0.025, y), P(x + 0.025, y), M.glow, 1, 9);
      f.line(P(x, y - 0.025), P(x, y + 0.025), M.glow, 1, 9);
    }
    f.glitchRows([0.3, 0.32], 3);
    f.glitchRows([0.62], -2);
    f.glitchRows([0.86, 0.88], 2);
  } else {
    f.glitchRows([0.64], 2);
    f.glitchRows([0.86, 0.88], -2);
  }
  return [{ x: 0.7, y: 0.29, r: 0.06, angry: true }];
}

G["rey-del-error"] = { colours: ruido, draw: (f) => errorKing(f, false) };

// Despertar: the blue screen of death made flesh. Frozen blues, white light, ice everywhere.
G["rey-del-error-pantalla-azul"] = {
  colours: {
    main: ["#1c2a8a", "#2f56d6", "#5e8cff", "#b4d0ff"],
    second: ["#6a8ad8", "#c8dcff", "#eef6ff", "#ffffff"],
    accent: ["#4a7ab8", "#9fd4f4", "#dff6ff", "#ffffff"],
    dark: ["#06127a", "#0a2ab4", "#1440d0", "#2a5ae8"],
    glow: "#ffffff",
    iris: "#4ae8ff",
  },
  draw: (f) => errorKing(f, true),
};

// ───────────────────────── Quitina line ─────────────────────────

const leg = (f: F, pts: Point[], w: number, m: M, lift: number, claw = true) => {
  stroke(f, pts, w, w * 0.7, m, lift);
  const e = pts[pts.length - 1];
  if (claw) horn(f, P(e[0] - 0.015, e[1] - 0.01), P(e[0] + 0.015, e[1] - 0.02), P(e[0] + 0.05, e[1] + 0.01), 0, m, lift + 1);
};

// Brote: a tiny beetle peeking out from under a big round shell, antennae drooping shyly.
G.escarbi = {
  colours: pulso,
  draw(f) {
    for (const s of [-1, 1]) {
      leg(f, [P(0.5 + s * 0.2, 0.8), P(0.5 + s * 0.32, 0.86), P(0.5 + s * 0.36, 0.95)], 0.05, M.accent, 0, false);
      leg(f, [P(0.5 + s * 0.1, 0.84), P(0.5 + s * 0.16, 0.9), P(0.5 + s * 0.18, 0.96)], 0.055, M.accent, 0, false);
    }
    f.ellipse(0.5, 0.82, 0.3, 0.1, M.second);
    // Face peeking out
    f.ellipse(0.5, 0.74, 0.25, 0.15, M.accent, 1);
    for (const s of [-1, 1]) stroke(f, [P(0.5 + s * 0.12, 0.64), P(0.5 + s * 0.3, 0.62), P(0.5 + s * 0.42, 0.7)], 0.03, 0.025, M.accent, 2);
    f.ellipse(0.08, 0.71, 0.035, 0.035, M.glow, 3);
    f.ellipse(0.92, 0.71, 0.035, 0.035, M.glow, 3);
    horn(f, P(0.46, 0.84), P(0.5, 0.84), P(0.44, 0.9), 0, M.second, 2);
    horn(f, P(0.5, 0.84), P(0.54, 0.84), P(0.56, 0.9), 0, M.second, 2);
    // Shell: gold rim, iridescent dome, split and glowing spots
    blob(f, [P(0.06, 0.62), P(0.1, 0.36), P(0.3, 0.16), P(0.5, 0.12), P(0.7, 0.16), P(0.9, 0.36), P(0.94, 0.62), P(0.7, 0.6), P(0.5, 0.64), P(0.3, 0.6)], M.second, 2);
    blob(f, [P(0.1, 0.56), P(0.14, 0.36), P(0.32, 0.18), P(0.5, 0.14), P(0.68, 0.18), P(0.86, 0.36), P(0.9, 0.56), P(0.7, 0.54), P(0.5, 0.58), P(0.3, 0.54)], M.main, 3);
    f.line(P(0.5, 0.16), P(0.5, 0.56), M.dark, 1, 4);
    f.ellipse(0.32, 0.4, 0.04, 0.035, M.glow, 4);
    f.ellipse(0.68, 0.4, 0.04, 0.035, M.glow, 4);
    f.ellipse(0.24, 0.5, 0.025, 0.025, M.glow, 4);
    f.ellipse(0.76, 0.5, 0.025, 0.025, M.glow, 4);
    return [{ x: 0.39, y: 0.73, r: 0.08 }, { x: 0.61, y: 0.73, r: 0.08 }];
  },
};

// Novato: a sturdy six-legged beetle with a domed, ridged shell and a blunt little horn.
G.corazita = {
  colours: pulso,
  draw(f) {
    // Far legs
    leg(f, [P(0.3, 0.7), P(0.22, 0.84), P(0.2, 0.95)], 0.06, M.dark, 0);
    leg(f, [P(0.5, 0.72), P(0.46, 0.84), P(0.46, 0.95)], 0.06, M.dark, 0);
    leg(f, [P(0.66, 0.72), P(0.7, 0.84), P(0.72, 0.94)], 0.06, M.dark, 0);
    // Underside
    blob(f, [P(0.16, 0.7), P(0.4, 0.66), P(0.74, 0.64), P(0.72, 0.8), P(0.4, 0.84), P(0.2, 0.8)], M.second, 1);
    for (const x of [0.32, 0.44, 0.56]) f.line(P(x, 0.7), P(x + 0.01, 0.82), M.second, 1, 2);
    // Head with horn, mandibles and antenna
    stroke(f, [P(0.76, 0.46), P(0.72, 0.34), P(0.76, 0.26)], 0.025, 0.02, M.accent, 1);
    f.ellipse(0.77, 0.26, 0.025, 0.025, M.glow, 2);
    blob(f, [P(0.64, 0.6), P(0.68, 0.44), P(0.82, 0.41), P(0.95, 0.52), P(0.93, 0.7), P(0.78, 0.76), P(0.66, 0.72)], M.accent, 2);
    horn(f, P(0.88, 0.72), P(0.92, 0.67), P(0.98, 0.78), 0.01, M.second, 3);
    horn(f, P(0.84, 0.45), P(0.93, 0.5), P(0.94, 0.27), 0.03, M.main, 3);
    // Shell: gold rim, dome, pronotum
    blob(f, [P(0.04, 0.72), P(0.06, 0.44), P(0.24, 0.22), P(0.48, 0.16), P(0.66, 0.24), P(0.74, 0.44), P(0.74, 0.7), P(0.4, 0.74)], M.second, 3);
    blob(f, [P(0.07, 0.68), P(0.09, 0.44), P(0.25, 0.25), P(0.47, 0.19), P(0.63, 0.26), P(0.7, 0.44), P(0.7, 0.66), P(0.4, 0.7)], M.main, 4);
    f.line(P(0.46, 0.21), P(0.3, 0.42), M.dark, 1, 5);
    f.line(P(0.3, 0.42), P(0.22, 0.66), M.dark, 1, 5);
    f.seamLine(P(0.52, 0.24), P(0.38, 0.44), [M.main]);
    f.seamLine(P(0.38, 0.44), P(0.32, 0.66), [M.main]);
    f.seamLine(P(0.18, 0.4), P(0.12, 0.6), [M.main]);
    blob(f, [P(0.6, 0.3), P(0.7, 0.32), P(0.76, 0.44), P(0.76, 0.62), P(0.68, 0.64), P(0.62, 0.48)], M.main, 5);
    // Near legs
    leg(f, [P(0.24, 0.74), P(0.16, 0.86), P(0.12, 0.96)], 0.065, M.accent, 6);
    leg(f, [P(0.44, 0.76), P(0.38, 0.86), P(0.36, 0.96)], 0.065, M.accent, 6);
    leg(f, [P(0.62, 0.74), P(0.64, 0.86), P(0.62, 0.96)], 0.065, M.accent, 6);
    return [{ x: 0.8, y: 0.57, r: 0.07 }];
  },
};

// Avanzado: an upright beetle whose wing cases unfold behind it into a two-plate wall.
G.bastion = {
  colours: pulso,
  draw(f) {
    // The wall: two unfolded wing cases with gold rims and glowing ribs
    blob(f, [P(0.04, 0.84), P(0.02, 0.4), P(0.1, 0.12), P(0.26, 0.04), P(0.38, 0.14), P(0.42, 0.7), P(0.3, 0.9)], M.second);
    blob(f, [P(0.06, 0.8), P(0.05, 0.4), P(0.12, 0.15), P(0.26, 0.07), P(0.36, 0.16), P(0.39, 0.68), P(0.3, 0.86)], M.main, 1);
    blob(f, [P(0.16, 0.92), P(0.14, 0.44), P(0.22, 0.18), P(0.38, 0.1), P(0.52, 0.2), P(0.54, 0.74), P(0.42, 0.94)], M.second, 2);
    blob(f, [P(0.18, 0.88), P(0.17, 0.44), P(0.24, 0.21), P(0.38, 0.13), P(0.5, 0.22), P(0.51, 0.72), P(0.41, 0.9)], M.main, 3);
    for (const y of [0.34, 0.5, 0.66, 0.8]) f.seamLine(P(0.2, y), P(0.5, y - 0.03), [M.main]);
    f.seamLine(P(0.08, 0.3), P(0.14, 0.28), [M.main]);
    f.seamLine(P(0.07, 0.5), P(0.14, 0.48), [M.main]);
    f.seamLine(P(0.07, 0.66), P(0.14, 0.64), [M.main]);
    // Far leg and lower arm
    leg(f, [P(0.54, 0.78), P(0.52, 0.88), P(0.52, 0.96)], 0.08, M.dark, 4);
    // Body: dark carapace, segmented gold belly
    blob(f, [P(0.46, 0.8), P(0.44, 0.5), P(0.54, 0.34), P(0.7, 0.36), P(0.76, 0.56), P(0.72, 0.8), P(0.58, 0.86)], M.accent, 4);
    blob(f, [P(0.58, 0.82), P(0.58, 0.5), P(0.68, 0.44), P(0.74, 0.58), P(0.7, 0.8)], M.second, 5);
    for (const y of [0.56, 0.64, 0.72]) f.line(P(0.59, y), P(0.73, y), M.second, 1, 6);
    // Near leg
    leg(f, [P(0.62, 0.78), P(0.68, 0.88), P(0.68, 0.96)], 0.09, M.accent, 7);
    // Lower arm and raised upper arm
    leg(f, [P(0.62, 0.6), P(0.74, 0.68), P(0.82, 0.64)], 0.06, M.accent, 7);
    // Pronotum plate
    blob(f, [P(0.46, 0.4), P(0.52, 0.28), P(0.7, 0.26), P(0.78, 0.36), P(0.7, 0.46), P(0.54, 0.48)], M.main, 8);
    f.seamLine(P(0.52, 0.38), P(0.72, 0.36), [M.main]);
    leg(f, [P(0.68, 0.42), P(0.8, 0.5), P(0.88, 0.42)], 0.075, M.accent, 9);
    // Head with a big swept horn and mandibles
    blob(f, [P(0.64, 0.28), P(0.68, 0.18), P(0.8, 0.16), P(0.9, 0.24), P(0.88, 0.34), P(0.76, 0.36), P(0.66, 0.34)], M.accent, 9);
    horn(f, P(0.82, 0.19), P(0.9, 0.24), P(0.8, 0.0), 0.08, M.main, 10);
    horn(f, P(0.88, 0.32), P(0.9, 0.28), P(0.97, 0.36), 0.01, M.second, 10);
    return [{ x: 0.76, y: 0.26, r: 0.06 }];
  },
};

// Élite: a beetle knight behind a shell-shaped shield, sword raised, wing cases worn as a cape.
G.egida = {
  colours: pulso,
  draw(f) {
    // Sword raised behind
    stroke(f, [P(0.43, 0.24), P(0.32, 0.12), P(0.22, 0.02)], 0.05, 0.025, M.main, 0);
    f.seamLine(P(0.42, 0.22), P(0.24, 0.03), [M.main]);
    f.line(P(0.38, 0.3), P(0.48, 0.2), M.second, 2, 1);
    // Cape of wing cases
    blob(f, [P(0.44, 0.3), P(0.24, 0.38), P(0.1, 0.62), P(0.04, 0.96), P(0.3, 0.97), P(0.4, 0.8), P(0.48, 0.5)], M.second, 1);
    blob(f, [P(0.43, 0.33), P(0.26, 0.4), P(0.13, 0.62), P(0.08, 0.93), P(0.28, 0.94), P(0.37, 0.78), P(0.45, 0.52)], M.main, 2);
    f.line(P(0.36, 0.38), P(0.2, 0.92), M.dark, 1, 3);
    f.seamLine(P(0.3, 0.48), P(0.2, 0.7), [M.main]);
    f.seamLine(P(0.2, 0.7), P(0.16, 0.9), [M.main]);
    // Far arm holding the sword
    stroke(f, [P(0.54, 0.4), P(0.46, 0.34), P(0.43, 0.26)], 0.07, 0.06, M.accent, 3);
    // Far leg
    leg(f, [P(0.48, 0.72), P(0.46, 0.84), P(0.46, 0.95)], 0.09, M.dark, 3);
    // Torso and breastplate
    blob(f, [P(0.4, 0.74), P(0.4, 0.46), P(0.5, 0.34), P(0.66, 0.36), P(0.72, 0.56), P(0.66, 0.78), P(0.5, 0.8)], M.accent, 4);
    blob(f, [P(0.48, 0.64), P(0.48, 0.44), P(0.58, 0.38), P(0.68, 0.44), P(0.66, 0.62), P(0.56, 0.68)], M.main, 5);
    f.rect(0.42, 0.66, 0.68, 0.71, M.second, 6);
    // Near leg: armoured thigh, gold knee, greave, clawed foot
    blob(f, [P(0.52, 0.7), P(0.64, 0.7), P(0.66, 0.82), P(0.56, 0.84)], M.main, 6);
    f.ellipse(0.61, 0.83, 0.04, 0.035, M.second, 7);
    blob(f, [P(0.56, 0.84), P(0.66, 0.84), P(0.68, 0.94), P(0.56, 0.95)], M.main, 7);
    f.rect(0.54, 0.93, 0.72, 0.97, M.accent, 8);
    horn(f, P(0.69, 0.97), P(0.71, 0.93), P(0.78, 0.97), 0, M.accent, 9);
    // Pauldron
    f.ellipse(0.56, 0.4, 0.08, 0.06, M.second, 7);
    f.ellipse(0.56, 0.39, 0.065, 0.045, M.main, 8);
    // Head: helmet with a great horn and mandibles
    blob(f, [P(0.56, 0.28), P(0.58, 0.18), P(0.7, 0.13), P(0.82, 0.18), P(0.86, 0.28), P(0.78, 0.36), P(0.62, 0.36)], M.main, 8);
    blob(f, [P(0.72, 0.2), P(0.75, 0.1), P(0.72, 0.04), P(0.66, 0.01), P(0.76, 0.01), P(0.82, 0.08), P(0.84, 0.2)], M.main, 9);
    f.seamLine(P(0.79, 0.16), P(0.76, 0.06), [M.main]);
    f.line(P(0.58, 0.25), P(0.66, 0.24), M.second, 1, 9);
    blob(f, [P(0.68, 0.22), P(0.82, 0.21), P(0.86, 0.3), P(0.7, 0.31)], M.accent, 9);
    horn(f, P(0.82, 0.32), P(0.86, 0.28), P(0.94, 0.36), 0.01, M.second, 10);
    // Shield: gold rim, shell face, glowing crest and rim studs
    f.ellipse(0.8, 0.62, 0.17, 0.27, M.second, 10);
    f.ellipse(0.8, 0.62, 0.135, 0.235, M.main, 11);
    f.line(P(0.8, 0.4), P(0.8, 0.84), M.dark, 1, 12);
    f.seamLine(P(0.72, 0.6), P(0.88, 0.6), [M.main]);
    f.seamLine(P(0.76, 0.48), P(0.76, 0.74), [M.main]);
    f.seamLine(P(0.84, 0.48), P(0.84, 0.74), [M.main]);
    f.poly([P(0.8, 0.53), P(0.85, 0.6), P(0.8, 0.67), P(0.75, 0.6)], M.glow, 13);
    for (const [x, y] of [[0.8, 0.35], [0.66, 0.5], [0.94, 0.5], [0.66, 0.74], [0.94, 0.74], [0.8, 0.89]] as const) f.rect(x - 0.015, y - 0.015, x + 0.015, y + 0.015, M.second, 13);
    return [{ x: 0.75, y: 0.26, r: 0.055, angry: true }];
  },
};

// Supremo: an iridescent paladin with a pincer helm, spread wing cases, a tower shield and a lance.
// `solar` is the Despertar: golden armour, a halo and a lance of pure light.
function paladin(f: F, solar: boolean) {
  if (solar) {
    for (let i = 0; i < 16; i++) {
      const a = (i / 16) * Math.PI * 2;
      f.line(P(0.66 + Math.cos(a) * 0.22, 0.24 + Math.sin(a) * 0.22), P(0.66 + Math.cos(a) * (i % 2 ? 0.27 : 0.32), 0.24 + Math.sin(a) * (i % 2 ? 0.27 : 0.32)), M.glow, 1);
    }
  }
  // Far wing case raised behind, ridged
  blob(f, [P(0.48, 0.36), P(0.34, 0.12), P(0.2, 0.02), P(0.08, 0.04), P(0.08, 0.22), P(0.24, 0.48), P(0.42, 0.54)], M.second, 1);
  blob(f, [P(0.46, 0.38), P(0.33, 0.14), P(0.21, 0.05), P(0.11, 0.07), P(0.11, 0.22), P(0.25, 0.46), P(0.41, 0.51)], M.main, 2);
  f.line(P(0.44, 0.42), P(0.14, 0.08), M.dark, 1, 3);
  f.seamLine(P(0.38, 0.28), P(0.2, 0.08), [M.main]);
  f.seamLine(P(0.36, 0.46), P(0.14, 0.2), [M.main]);
  // Lower wing case as a cape
  blob(f, [P(0.46, 0.4), P(0.26, 0.5), P(0.12, 0.74), P(0.04, 0.97), P(0.36, 0.97), P(0.44, 0.76)], M.second, 3);
  blob(f, [P(0.45, 0.43), P(0.27, 0.52), P(0.15, 0.74), P(0.08, 0.94), P(0.34, 0.94), P(0.42, 0.75)], M.main, 4);
  f.line(P(0.4, 0.5), P(0.2, 0.93), M.dark, 1, 5);
  f.seamLine(P(0.32, 0.56), P(0.16, 0.9), [M.main]);
  if (solar) f.ring(0.66, 0.24, 0.22, M.glow, 2, 5);
  // Lance in the far hand, behind the shield
  if (solar) {
    f.line(P(0.94, 0.97), P(0.94, 0.12), M.second, 5, 5);
    f.line(P(0.94, 0.97), P(0.94, 0.1), M.glow, 3, 6);
    f.poly([P(0.94, 0.0), P(0.99, 0.12), P(0.94, 0.22), P(0.89, 0.12)], M.second, 6);
    f.poly([P(0.94, 0.03), P(0.97, 0.12), P(0.94, 0.19), P(0.91, 0.12)], M.glow, 7);
  } else {
    f.line(P(0.94, 0.97), P(0.94, 0.12), M.accent, 2, 5);
    f.poly([P(0.94, 0.0), P(0.98, 0.08), P(0.96, 0.16), P(0.92, 0.16), P(0.9, 0.08)], M.main, 6);
    f.seamLine(P(0.94, 0.03), P(0.94, 0.14), [M.main]);
    f.line(P(0.89, 0.17), P(0.99, 0.17), M.second, 2, 6);
  }
  stroke(f, [P(0.6, 0.42), P(0.76, 0.46), P(0.92, 0.44)], 0.07, 0.06, M.accent, 6);
  f.ellipse(0.94, 0.44, 0.035, 0.035, M.main, 7);
  // Far leg
  leg(f, [P(0.48, 0.72), P(0.46, 0.84), P(0.46, 0.95)], 0.1, M.dark, 7);
  // Torso, breastplate, belt
  blob(f, [P(0.38, 0.76), P(0.38, 0.46), P(0.48, 0.32), P(0.66, 0.32), P(0.72, 0.54), P(0.66, 0.78), P(0.5, 0.82)], M.accent, 8);
  blob(f, [P(0.44, 0.66), P(0.44, 0.44), P(0.56, 0.36), P(0.68, 0.42), P(0.66, 0.62), P(0.54, 0.7)], M.main, 9);
  f.seamLine(P(0.47, 0.48), P(0.56, 0.42), [M.main]);
  f.seamLine(P(0.47, 0.56), P(0.6, 0.5), [M.main]);
  f.rect(0.4, 0.67, 0.68, 0.72, M.second, 10);
  f.rect(0.52, 0.66, 0.57, 0.73, M.glow, 11);
  // Tasset plates
  f.poly([P(0.4, 0.72), P(0.52, 0.72), P(0.5, 0.82), P(0.42, 0.8)], M.main, 11);
  // Near leg
  blob(f, [P(0.52, 0.7), P(0.64, 0.7), P(0.66, 0.82), P(0.56, 0.84)], M.main, 11);
  f.ellipse(0.61, 0.83, 0.045, 0.035, M.second, 12);
  blob(f, [P(0.55, 0.84), P(0.67, 0.84), P(0.69, 0.94), P(0.55, 0.95)], M.main, 12);
  f.rect(0.53, 0.93, 0.73, 0.97, M.accent, 13);
  horn(f, P(0.7, 0.97), P(0.72, 0.93), P(0.79, 0.97), 0, M.accent, 14);
  // Pauldron, layered
  f.ellipse(0.52, 0.38, 0.11, 0.075, M.second, 12);
  f.ellipse(0.52, 0.37, 0.095, 0.06, M.main, 13);
  f.line(P(0.44, 0.4), P(0.6, 0.4), M.dark, 1, 14);
  // Head: great forked horn sweeping up from the helm, crest spikes and a lower pincer
  horn(f, P(0.52, 0.2), P(0.56, 0.16), P(0.4, 0.1), -0.02, M.second, 13);
  horn(f, P(0.56, 0.16), P(0.6, 0.13), P(0.48, 0.04), -0.02, M.second, 13);
  blob(f, [P(0.52, 0.28), P(0.54, 0.18), P(0.66, 0.13), P(0.78, 0.16), P(0.84, 0.26), P(0.76, 0.35), P(0.58, 0.35)], M.main, 14);
  blob(f, [P(0.7, 0.2), P(0.73, 0.1), P(0.7, 0.04), P(0.62, 0.01), P(0.74, 0.0), P(0.81, 0.07), P(0.84, 0.2)], M.main, 15);
  horn(f, P(0.78, 0.07), P(0.81, 0.11), P(0.9, 0.03), -0.01, M.main, 16);
  f.seamLine(P(0.78, 0.17), P(0.74, 0.05), [M.main]);
  horn(f, P(0.78, 0.32), P(0.84, 0.28), P(0.9, 0.2), -0.01, M.second, 15);
  f.line(P(0.54, 0.25), P(0.64, 0.23), M.second, 1, 15);
  blob(f, [P(0.64, 0.21), P(0.8, 0.2), P(0.84, 0.29), P(0.66, 0.3)], M.accent, 15);
  // Tower shield
  blob(f, [P(0.6, 0.42), P(0.74, 0.37), P(0.9, 0.42), P(0.9, 0.78), P(0.75, 0.96), P(0.6, 0.78)], M.second, 16);
  blob(f, [P(0.63, 0.45), P(0.75, 0.41), P(0.87, 0.45), P(0.87, 0.76), P(0.75, 0.91), P(0.63, 0.76)], M.main, 17);
  f.line(P(0.75, 0.42), P(0.75, 0.9), M.dark, 1, 18);
  f.ellipse(0.75, 0.6, 0.06, 0.05, M.second, 18);
  f.ellipse(0.75, 0.6, 0.035, 0.03, M.glow, 19);
  for (const [a, b] of [[P(0.75, 0.46), P(0.75, 0.53)], [P(0.75, 0.67), P(0.75, 0.86)], [P(0.66, 0.6), P(0.69, 0.6)], [P(0.81, 0.6), P(0.85, 0.6)], [P(0.67, 0.5), P(0.71, 0.55)], [P(0.83, 0.5), P(0.79, 0.55)]] as const) f.seamLine(a, b, [M.main]);
  if (solar) {
    for (const [x, y] of [[0.08, 0.66], [0.98, 0.56], [0.3, 0.04], [0.04, 0.04]] as const) {
      f.line(P(x - 0.03, y), P(x + 0.03, y), M.glow, 1, 20);
      f.line(P(x, y - 0.03), P(x, y + 0.03), M.glow, 1, 20);
    }
  }
  return [{ x: 0.74, y: 0.25, r: 0.05, angry: true }];
}

G["paladin-quitina"] = { colours: pulso, draw: (f) => paladin(f, false) };

G["paladin-quitina-coraza-solar"] = {
  colours: {
    main: ["#b0582c", "#e8a03a", "#ffd76a", "#fffbe0"],
    second: ["#8a6ab8", "#d8c4ff", "#f6f0ff", "#ffffff"],
    accent: ["#4a2a5a", "#7a4a7e", "#b07aa6", "#e8b8d0"],
    dark: ["#3a1e40", "#5a3058", "#7e4a72", "#a46a94"],
    glow: "#fff4a0",
    iris: "#ff6a1a",
  },
  draw: (f) => paladin(f, true),
};

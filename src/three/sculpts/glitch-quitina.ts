import type { Sculpt, Shape, V3 } from "../sculpt";

// Glitch (broken-code imps, magenta glow) and Quitina (beetle knights, amber glow).

const ruido = {
  body: "#7b55cc", deep: "#5a3fa6", screen: "#33b2cc", ear: "#4cd2d6", dark: "#2e2858",
  metal: "#aaa4c8", cream: "#ece6fa", pink: "#ff3ad8", teal: "#3fb8c8",
};
const IRIS_G = "#b8ff3a";

const pulso = {
  shell: "#2aa09c", stripe: "#2f62a8", rim: "#e3a23e", gold: "#f6c864", body: "#5c5290",
  dark: "#38305e", belly: "#d99a3e", glow: "#ffb43a", steel: "#d4d0e6",
};
const IRIS_Q = "#ffb43a";

/** Chained tapered capsules through the points (tails, hoods, ribbons). */
function chain(pts: V3[], r0: number, r1: number, col: string, k = 0.03): Shape[] {
  const out: Shape[] = [];
  for (let i = 0; i < pts.length - 1; i++) {
    const t0 = i / (pts.length - 1), t1 = (i + 1) / (pts.length - 1);
    out.push({ t: "cap", a: pts[i], b: pts[i + 1], r: [r0 + (r1 - r0) * t0, r0 + (r1 - r0) * t1], col, k });
  }
  return out;
}

// ───────────────────────── Glitch line ─────────────────────────

function errorKing(frozen: boolean): Sculpt {
  const palette = frozen
    ? { body: "#3a62dc", deep: "#1f3cb4", robe: "#d6e6ff", dark: "#0c2a9e", metal: "#a8dcf6", err: "#ffffff", ermine: "#f2f8ff", screen: "#1846d8", ice: "#c8f0ff" }
    : { body: "#7b55cc", deep: "#4c3690", robe: "#33b2cc", dark: "#2e2858", metal: "#aaa4c8", err: "#ff3ad8", ermine: "#ece6fa", screen: "#2e2858", ice: "#c8f0ff" };
  const shapes: Shape[] = [
    // Cape
    { t: "ell", c: [-0.2, 0.36, 0], r: [0.24, 0.36, 0.3], col: "deep" },
    { t: "ell", c: [-0.26, 0.08, 0], r: [0.24, 0.08, 0.32], col: "deep", k: 0.1 },
    // Legs
    { t: "ell", c: [0.06, 0.13, 0.13], r: [0.12, 0.13, 0.1], col: "body", mirror: true, k: 0.06 },
    { t: "ell", c: [0.14, 0.03, 0.14], r: [0.12, 0.04, 0.08], col: "body", mirror: true, k: 0.04 },
    // Body with a code robe
    { t: "ell", c: [0.02, 0.42, 0], r: [0.22, 0.28, 0.22], col: "body", k: 0.08 },
    { t: "ell", c: [0.16, 0.38, 0], r: [0.12, 0.24, 0.15], col: "robe", paint: true },
    { t: "ell", c: [0.2, 0.44, 0], r: [0.06, 0.016, 0.16], col: "err", paint: true },
    { t: "ell", c: [0.2, 0.34, 0], r: [0.06, 0.016, 0.16], col: "err", paint: true },
    // Ermine collar
    { t: "tor", c: [0.06, 0.64, 0], R: 0.15, r: 0.055, col: "ermine", k: 0.02 },
    // Head and snout
    { t: "ell", c: [0.14, 0.8, 0], r: [0.19, 0.15, 0.17], col: "body", k: 0.06 },
    { t: "ell", c: [0.3, 0.75, 0], r: [0.12, 0.09, 0.12], col: "body", k: 0.07 },
    { t: "cap", a: [0.41, 0.73, 0], b: [0.36, 0.71, 0.1], r: [0.016, 0.016], col: "err", paint: true, mirror: true },
    // Crown of warnings
    { t: "tor", c: [0.1, 0.93, 0], R: 0.12, r: 0.035, col: "metal", k: 0.01 },
    { t: "cap", a: [0.21, 0.94, 0], b: [0.25, 1.08, 0], r: [0.045, 0.01], col: "metal", k: 0.01 },
    { t: "cap", a: [0.12, 0.94, 0.11], b: [0.14, 1.06, 0.15], r: [0.04, 0.01], col: "metal", mirror: true, k: 0.01 },
    { t: "ell", c: [0.225, 0.95, 0], r: [0.03, 0.03, 0.03], col: "err", k: 0 },
    // Endless error ribbon from the crown
    ...chain([[-0.02, 0.96, 0], [-0.24, 1.03, 0.06], [-0.46, 0.95, 0.0], [-0.68, 1.02, -0.04]], 0.035, 0.03, "err", 0.03),
    // Error pop-up windows floating behind
    { t: "box", c: [-0.5, 0.7, 0.14], s: [0.1, 0.06, 0.025], round: 0.015, col: "metal", rot: [0, 25, 0], k: 0 },
    // Sceptre with the spinner
    { t: "cap", a: [0.44, 0.0, 0.22], b: [0.44, 0.94, 0.22], r: [0.022, 0.022], col: "metal", k: 0 },
    { t: "tor", c: [0.44, 1.02, 0.22], R: 0.075, r: 0.024, col: "err", rot: [90, 0, 0], k: 0 },
    { t: "ell", c: [0.44, 1.02, 0.22], r: [0.035, 0.035, 0.035], col: "metal", k: 0 },
    // Arms
    { t: "cap", a: [0.1, 0.56, 0.18], b: [0.4, 0.5, 0.22], r: [0.07, 0.05], col: "body", k: 0.05 },
    { t: "ell", c: [0.44, 0.5, 0.22], r: [0.055, 0.06, 0.06], col: "body", k: 0.03 },
    { t: "cap", a: [0.08, 0.56, -0.18], b: [0.24, 0.42, -0.22], r: [0.065, 0.05], col: "body", k: 0.05 },
    // Tail tip peeking out of the cape
  ];
  if (frozen) {
    shapes.push(
      // The blue screen behind him: a sad face and dump lines
      { t: "box", c: [-0.36, 0.64, -0.3], s: [0.27, 0.22, 0.025], round: 0.02, col: "screen", k: 0 },
      { t: "box", c: [-0.36, 0.68, -0.27], s: [0.2, 0.012, 0.01], round: 0.005, col: "err", paint: true },
      // Ice locking the floor
      { t: "cap", a: [0.28, 0.0, 0.2], b: [0.3, 0.2, 0.24], r: [0.06, 0.01], col: "ice", k: 0.01 },
      { t: "cap", a: [0.54, 0.0, 0.08], b: [0.58, 0.14, 0.1], r: [0.05, 0.01], col: "ice", k: 0.01 },
      // Floating shards
      { t: "box", c: [0.6, 0.76, 0.1], s: [0.03, 0.05, 0.03], round: 0.01, col: "err", rot: [0, 0, 30], k: 0 },
    );
  }
  return {
    palette,
    glow: frozen ? ["err", "screen"] : ["err"],
    shapes,
    eyes: [{ at: [0.3, 0.83, 0.09], r: 0.085, iris: frozen ? "#4ae8ff" : IRIS_G, mirror: true, angry: true }],
  };
}

// ───────────────────────── Quitina line ─────────────────────────

function paladin(solar: boolean): Sculpt {
  const palette = solar
    ? { shell: "#f0a83c", stripe: "#ffd76a", rim: "#d8c4ff", gold: "#fff2b0", body: "#6e3a66", dark: "#40203f", glow: "#fff4a0", steel: "#fffbe0", light: "#fff4a0" }
    : { shell: "#2aa09c", stripe: "#2f62a8", rim: "#e3a23e", gold: "#f6c864", body: "#5c5290", dark: "#38305e", glow: "#ffb43a", steel: "#d4d0e6", light: "#3a3266" };
  const shapes: Shape[] = [
    // Wing cases: upper raised, lower as a cape
    { t: "ell", c: [-0.28, 0.74, 0.17], r: [0.32, 0.13, 0.04], col: "shell", rot: [0, 0, -42], mirror: true },
    { t: "ell", c: [-0.28, 0.74, 0.2], r: [0.3, 0.02, 0.05], col: "gold", rot: [0, 0, -42], mirror: true, paint: true },
    { t: "ell", c: [-0.24, 0.3, 0.15], r: [0.28, 0.11, 0.04], col: "shell", rot: [0, 0, 38], mirror: true },
    // Lance in the far hand
    { t: "cap", a: [0.46, 0.0, -0.06], b: [0.46, 1.0, -0.06], r: [0.024, 0.024], col: "light", k: 0 },
    { t: "cap", a: [0.46, 1.0, -0.06], b: [0.46, 1.2, -0.06], r: [0.055, 0.006], col: "steel", k: 0 },
    // Legs
    { t: "cap", a: [0.0, 0.34, 0.1], b: [0.03, 0.12, 0.11], r: [0.08, 0.06], col: "body", mirror: true, k: 0.05 },
    { t: "ell", c: [0.08, 0.04, 0.11], r: [0.11, 0.045, 0.07], col: "dark", mirror: true, k: 0.02 },
    // Torso, breastplate, belt and tassets
    { t: "ell", c: [0.02, 0.5, 0], r: [0.17, 0.2, 0.16], col: "body", k: 0.06 },
    { t: "ell", c: [0.08, 0.54, 0], r: [0.14, 0.15, 0.15], col: "shell", k: 0.02 },
    { t: "tor", c: [0.03, 0.38, 0], R: 0.15, r: 0.03, col: "gold", k: 0.01 },
    // Pauldrons, layered
    { t: "ell", c: [0.0, 0.67, 0.16], r: [0.11, 0.07, 0.1], col: "shell", mirror: true, k: 0.01 },
    // Arms
    { t: "cap", a: [0.04, 0.6, -0.18], b: [0.4, 0.56, -0.08], r: [0.06, 0.05], col: "body", k: 0.04 },
    { t: "cap", a: [0.04, 0.6, 0.18], b: [0.2, 0.44, 0.22], r: [0.06, 0.05], col: "body", k: 0.04 },
    // Head: helm with a great forked horn, crest spikes and a lower pincer
    { t: "ell", c: [0.12, 0.8, 0], r: [0.14, 0.13, 0.13], col: "shell", k: 0.04 },
    { t: "ell", c: [0.24, 0.78, 0], r: [0.04, 0.07, 0.1], col: "dark", paint: true },
    { t: "cap", a: [0.12, 0.88, 0], b: [0.2, 1.06, 0], r: [0.07, 0.04], col: "shell", k: 0.04 },
    { t: "cap", a: [0.2, 1.04, 0], b: [0.32, 1.14, 0], r: [0.04, 0.012], col: "shell", k: 0.02 },
    { t: "cap", a: [0.2, 1.04, 0], b: [0.12, 1.18, 0], r: [0.04, 0.012], col: "shell", k: 0.02 },
    { t: "cap", a: [0.22, 0.7, 0], b: [0.34, 0.76, 0], r: [0.035, 0.01], col: "gold", k: 0.02 },
    { t: "cap", a: [0.02, 0.86, 0], b: [-0.1, 0.98, 0], r: [0.035, 0.008], col: "gold", k: 0.01 },
    // Tower shield: gold rim, shell face, sun crest
    { t: "box", c: [0.31, 0.42, 0.16], s: [0.03, 0.3, 0.17], round: 0.03, col: "rim", k: 0 },
    { t: "box", c: [0.345, 0.42, 0.16], s: [0.03, 0.265, 0.14], round: 0.025, col: "shell", k: 0 },
    { t: "ell", c: [0.38, 0.42, 0.16], r: [0.03, 0.25, 0.022], col: "stripe", paint: true },
    { t: "ell", c: [0.38, 0.46, 0.16], r: [0.03, 0.022, 0.13], col: "stripe", paint: true },
    { t: "ell", c: [0.38, 0.46, 0.16], r: [0.03, 0.075, 0.075], col: "glow", paint: true },
  ];
  if (solar) {
    shapes.push(
      { t: "tor", c: [0.04, 0.9, 0], R: 0.2, r: 0.022, col: "glow", rot: [0, 0, 70], k: 0 },
      { t: "ell", c: [-0.6, 1.0, 0.16], r: [0.035, 0.035, 0.035], col: "glow", k: 0 },
      { t: "ell", c: [0.62, 0.7, 0.2], r: [0.03, 0.03, 0.03], col: "glow", k: 0 },
    );
  }
  return {
    palette,
    glow: solar ? ["glow", "light"] : ["glow"],
    shapes,
    eyes: [{ at: [0.24, 0.82, 0.06], r: 0.07, iris: solar ? "#ff6a1a" : IRIS_Q, mirror: true, angry: true }],
  };
}

export const glitchQuitina: Record<string, Sculpt> = {
  // Brote: a square pixel-sprite with a screen belly, a cursor antenna and stray pixels.
  bichito: {
    palette: ruido,
    glow: ["pink"],
    shapes: [
      { t: "box", c: [0, 0.48, 0], s: [0.31, 0.33, 0.3], round: 0.26, col: "body" },
      { t: "ell", c: [0.06, 0.08, 0.15], r: [0.12, 0.08, 0.09], col: "deep", mirror: true, k: 0.05 },
      { t: "cap", a: [0.04, 0.42, 0.28], b: [0.12, 0.3, 0.37], r: [0.065, 0.055], col: "body", mirror: true, k: 0.05 },
      // Screen belly with a glowing grin
      { t: "ell", c: [0.22, 0.34, 0.08], r: [0.1, 0.13, 0.18], col: "screen", k: 0.02 },
      { t: "cap", a: [0.3, 0.32, 0.14], b: [0.24, 0.36, 0.25], r: [0.02, 0.02], col: "pink", paint: true },
      { t: "cap", a: [0.3, 0.32, 0.14], b: [0.33, 0.36, 0.02], r: [0.02, 0.02], col: "pink", paint: true },
      // Ears with teal insides
      { t: "cap", a: [-0.02, 0.72, 0.17], b: [-0.04, 1.0, 0.27], r: [0.11, 0.02], col: "body", mirror: true, k: 0.05 },
      { t: "ell", c: [0.06, 0.86, 0.22], r: [0.06, 0.08, 0.05], col: "ear", paint: true, mirror: true },
      // Cursor antenna
      { t: "cap", a: [-0.08, 0.78, 0], b: [-0.12, 0.96, 0], r: [0.03, 0.022], col: "dark", k: 0.03 },
      { t: "cap", a: [-0.12, 0.96, 0], b: [-0.04, 1.06, 0], r: [0.022, 0.02], col: "dark", k: 0.01 },
      { t: "cap", a: [-0.05, 1.05, 0], b: [0.03, 1.18, 0], r: [0.055, 0.008], col: "cream", k: 0.01 },
      // Stray pixels
      { t: "box", c: [0.44, 0.66, 0.26], s: [0.035, 0.035, 0.035], round: 0.008, col: "pink", k: 0 },
      { t: "box", c: [-0.4, 0.7, 0.16], s: [0.03, 0.03, 0.03], round: 0.008, col: "teal", k: 0 },
      { t: "box", c: [0.46, 0.18, -0.12], s: [0.03, 0.03, 0.03], round: 0.008, col: "pink", k: 0 },
      { t: "box", c: [-0.42, 0.3, -0.2], s: [0.028, 0.028, 0.028], round: 0.008, col: "pink", k: 0 },
    ],
    eyes: [{ at: [0.28, 0.62, 0.11], r: 0.12, iris: IRIS_G, mirror: true, look: [0.85, 0.05, 0.5] }],
  },
  // Novato: a crouching imp with bat ears, a glowing grin and a zigzag cursor-tipped tail.
  glitchin: {
    palette: ruido,
    glow: ["pink"],
    shapes: [
      { t: "ell", c: [-0.04, 0.32, 0], r: [0.17, 0.21, 0.16], col: "body" },
      { t: "ell", c: [0.06, 0.3, 0], r: [0.1, 0.16, 0.13], col: "screen", paint: true },
      { t: "ell", c: [0.1, 0.32, 0], r: [0.06, 0.014, 0.1], col: "pink", paint: true },
      { t: "ell", c: [0.1, 0.24, 0], r: [0.06, 0.014, 0.1], col: "pink", paint: true },
      // Crouched legs
      { t: "ell", c: [-0.06, 0.16, 0.13], r: [0.14, 0.11, 0.08], col: "body", mirror: true, k: 0.06 },
      { t: "ell", c: [0.06, 0.035, 0.14], r: [0.11, 0.04, 0.065], col: "deep", mirror: true, k: 0.04 },
      // Arms: one raised with claws, one low
      { t: "cap", a: [0.06, 0.44, 0.15], b: [0.2, 0.48, 0.24], r: [0.05, 0.04], col: "body", k: 0.04 },
      { t: "cap", a: [0.2, 0.48, 0.24], b: [0.28, 0.6, 0.26], r: [0.04, 0.035], col: "body", k: 0.03 },
      { t: "cap", a: [0.28, 0.62, 0.26], b: [0.34, 0.7, 0.26], r: [0.022, 0.008], col: "metal", k: 0.01 },
      { t: "cap", a: [0.29, 0.6, 0.26], b: [0.37, 0.64, 0.26], r: [0.022, 0.008], col: "metal", k: 0.01 },
      { t: "cap", a: [0.06, 0.42, -0.15], b: [0.18, 0.34, -0.2], r: [0.05, 0.04], col: "body", k: 0.04 },
      // Head and snout with a grin
      { t: "ell", c: [0.08, 0.68, 0], r: [0.24, 0.21, 0.22], col: "body", k: 0.08 },
      { t: "ell", c: [0.25, 0.62, 0], r: [0.13, 0.11, 0.15], col: "body", k: 0.08 },
      { t: "cap", a: [0.37, 0.58, 0], b: [0.32, 0.61, 0.12], r: [0.017, 0.017], col: "pink", paint: true, mirror: true },
      { t: "cap", a: [0.1, 0.86, 0], b: [0.13, 0.97, 0], r: [0.035, 0.01], col: "dark", k: 0.02 },
      // Bat ears swept back
      { t: "cap", a: [-0.04, 0.8, 0.12], b: [-0.36, 0.98, 0.24], r: [0.1, 0.02], col: "body", mirror: true, k: 0.05 },
      { t: "cap", a: [-0.06, 0.82, 0.18], b: [-0.3, 0.96, 0.27], r: [0.05, 0.012], col: "ear", mirror: true, paint: true },
      // Zigzag tail with a cursor tip
      ...chain([[-0.16, 0.24, 0], [-0.36, 0.3, 0], [-0.3, 0.48, 0], [-0.46, 0.6, 0]], 0.05, 0.03, "body"),
      { t: "cap", a: [-0.44, 0.6, 0], b: [-0.5, 0.78, 0], r: [0.065, 0.012], col: "metal", k: 0.01 },
    ],
    eyes: [{ at: [0.28, 0.72, 0.1], r: 0.1, iris: IRIS_G, mirror: true }],
  },
  // Avanzado: the imp rides the head of a big blocky data puppet and works its strings.
  titiriton: {
    palette: ruido,
    glow: ["pink"],
    shapes: [
      // Puppet legs and feet
      { t: "box", c: [0.0, 0.13, 0.1], s: [0.065, 0.1, 0.06], round: 0.03, col: "teal", mirror: true },
      { t: "box", c: [0.04, 0.03, 0.1], s: [0.1, 0.03, 0.07], round: 0.02, col: "dark", mirror: true, k: 0.01 },
      { t: "ell", c: [0.0, 0.26, 0], r: [0.08, 0.06, 0.13], col: "dark", k: 0.01 },
      // Torso with data seams
      { t: "box", c: [0.0, 0.38, 0], s: [0.13, 0.11, 0.16], round: 0.05, col: "teal", k: 0.01 },
      { t: "ell", c: [0.13, 0.4, 0], r: [0.03, 0.014, 0.13], col: "pink", paint: true },
      { t: "ell", c: [0.13, 0.34, 0], r: [0.03, 0.014, 0.13], col: "pink", paint: true },
      // Arms with joints
      { t: "ell", c: [0.0, 0.45, 0.18], r: [0.05, 0.05, 0.05], col: "dark", mirror: true, k: 0.01 },
      { t: "cap", a: [0.02, 0.43, 0.2], b: [0.12, 0.28, 0.24], r: [0.05, 0.045], col: "teal", mirror: true, k: 0.01 },
      { t: "box", c: [0.14, 0.24, 0.24], s: [0.05, 0.045, 0.04], round: 0.02, col: "teal", mirror: true, k: 0.02 },
      // Puppet head: a block with a hinged jaw
      { t: "box", c: [0.04, 0.6, 0], s: [0.14, 0.1, 0.14], round: 0.04, col: "teal", k: 0.01 },
      { t: "box", c: [0.07, 0.48, 0], s: [0.12, 0.03, 0.12], round: 0.02, col: "dark", k: 0 },
      { t: "box", c: [0.19, 0.53, 0], s: [0.01, 0.012, 0.08], round: 0.005, col: "pink", paint: true },
      // Imp sitting on top
      { t: "ell", c: [-0.04, 0.76, 0], r: [0.1, 0.09, 0.1], col: "body", k: 0.02 },
      { t: "ell", c: [0.02, 0.9, 0], r: [0.16, 0.13, 0.14], col: "body", k: 0.06 },
      { t: "ell", c: [0.16, 0.86, 0], r: [0.09, 0.07, 0.09], col: "body", k: 0.05 },
      { t: "cap", a: [0.245, 0.84, 0], b: [0.2, 0.85, 0.07], r: [0.012, 0.012], col: "pink", paint: true, mirror: true },
      { t: "cap", a: [-0.04, 0.96, 0.08], b: [-0.28, 1.04, 0.16], r: [0.07, 0.015], col: "body", mirror: true, k: 0.04 },
      { t: "cap", a: [-0.04, 0.72, 0.08], b: [0.08, 0.68, 0.12], r: [0.04, 0.03], col: "body", mirror: true, k: 0.04 },
      // Imp tail hanging behind the puppet's head
      ...chain([[-0.12, 0.74, 0], [-0.24, 0.62, 0], [-0.2, 0.46, 0]], 0.035, 0.025, "body"),
      { t: "cap", a: [-0.2, 0.47, 0], b: [-0.22, 0.34, 0], r: [0.05, 0.01], col: "metal", k: 0.01 },
      // Arm raised holding the control cross, strings to the puppet's hands
      { t: "cap", a: [0.06, 0.84, 0.1], b: [0.3, 1.0, 0.04], r: [0.035, 0.028], col: "body", k: 0.03 },
      { t: "cap", a: [0.36, 1.06, -0.15], b: [0.36, 1.06, 0.15], r: [0.024, 0.024], col: "metal", k: 0.02 },
      { t: "cap", a: [0.26, 1.06, 0], b: [0.48, 1.06, 0], r: [0.024, 0.024], col: "metal", k: 0.02 },
      { t: "cap", a: [0.36, 1.04, 0.15], b: [0.17, 0.28, 0.25], r: [0.011, 0.011], col: "pink", mirror: true, k: 0 },
      { t: "cap", a: [0.48, 1.04, 0], b: [0.3, 0.5, 0.12], r: [0.011, 0.011], col: "pink", k: 0 },
    ],
    eyes: [
      { at: [0.2, 0.93, 0.075], r: 0.075, iris: IRIS_G, mirror: true },
      { at: [0.16, 0.62, 0.07], r: 0.06, iris: IRIS_G, mirror: true, look: [0.8, 0.0, 0.6] },
    ],
  },
  // Élite: a lanky jester puppeteer in a tattered cloak; strings from his claws make a doll dance.
  marioneterror: {
    palette: ruido,
    glow: ["pink"],
    shapes: [
      // Tattered cloak
      { t: "ell", c: [-0.2, 0.46, 0], r: [0.15, 0.32, 0.24], col: "dark" },
      { t: "cap", a: [-0.2, 0.3, 0.14], b: [-0.3, 0.02, 0.2], r: [0.09, 0.02], col: "dark", mirror: true, k: 0.06 },
      { t: "cap", a: [-0.26, 0.3, 0], b: [-0.42, 0.04, 0], r: [0.1, 0.02], col: "dark", k: 0.06 },
      // Legs
      { t: "cap", a: [0.0, 0.42, 0.07], b: [0.02, 0.06, 0.08], r: [0.05, 0.035], col: "deep", mirror: true, k: 0.04 },
      { t: "cap", a: [0.0, 0.04, 0.08], b: [0.14, 0.02, 0.1], r: [0.045, 0.02], col: "deep", mirror: true, k: 0.02 },
      // Torso with code stripes and a ruff collar
      { t: "ell", c: [0.0, 0.56, 0], r: [0.12, 0.18, 0.12], col: "body", k: 0.06 },
      { t: "ell", c: [0.08, 0.54, 0], r: [0.07, 0.14, 0.09], col: "screen", paint: true },
      { t: "ell", c: [0.12, 0.58, 0], r: [0.04, 0.012, 0.08], col: "pink", paint: true },
      { t: "ell", c: [0.12, 0.52, 0], r: [0.04, 0.012, 0.08], col: "pink", paint: true },
      { t: "tor", c: [0.02, 0.71, 0], R: 0.1, r: 0.04, col: "metal", k: 0.01 },
      // Head and snout with a grin
      { t: "ell", c: [0.1, 0.83, 0], r: [0.15, 0.12, 0.13], col: "body", k: 0.04 },
      { t: "ell", c: [0.24, 0.79, 0], r: [0.1, 0.07, 0.09], col: "body", k: 0.06 },
      { t: "cap", a: [0.33, 0.77, 0], b: [0.27, 0.79, 0.08], r: [0.014, 0.014], col: "pink", paint: true, mirror: true },
      // Jester hood with a long curled tip
      { t: "ell", c: [0.04, 0.9, 0], r: [0.15, 0.08, 0.15], col: "dark", k: 0.02 },
      ...chain([[0.0, 0.94, 0], [-0.2, 1.04, 0], [-0.38, 0.98, 0], [-0.46, 0.86, 0]], 0.1, 0.03, "dark"),
      { t: "ell", c: [-0.47, 0.83, 0], r: [0.045, 0.045, 0.045], col: "pink", k: 0.01 },
      // Arms stretched forward, long claws
      { t: "cap", a: [0.04, 0.66, 0.12], b: [0.26, 0.64, 0.16], r: [0.04, 0.03], col: "body", k: 0.04 },
      { t: "cap", a: [0.27, 0.64, 0.16], b: [0.32, 0.55, 0.17], r: [0.02, 0.007], col: "metal", k: 0.01 },
      { t: "cap", a: [0.28, 0.64, 0.14], b: [0.35, 0.58, 0.13], r: [0.02, 0.007], col: "metal", k: 0.01 },
      { t: "cap", a: [0.04, 0.66, -0.12], b: [0.22, 0.74, -0.14], r: [0.04, 0.03], col: "body", k: 0.04 },
      { t: "cap", a: [0.22, 0.74, -0.14], b: [0.3, 0.7, -0.08], r: [0.03, 0.02], col: "body", k: 0.02 },
      // The dancing doll and its strings
      { t: "box", c: [0.4, 0.2, 0.02], s: [0.05, 0.07, 0.05], round: 0.025, col: "teal", rot: [0, 0, 8] },
      { t: "ell", c: [0.4, 0.33, 0.02], r: [0.06, 0.055, 0.055], col: "teal", k: 0.01 },
      { t: "cap", a: [0.38, 0.22, 0.08], b: [0.44, 0.32, 0.12], r: [0.022, 0.02], col: "teal", k: 0.02 },
      { t: "cap", a: [0.4, 0.22, -0.06], b: [0.48, 0.14, -0.08], r: [0.022, 0.02], col: "teal", k: 0.02 },
      { t: "cap", a: [0.38, 0.14, 0.04], b: [0.34, 0.02, 0.06], r: [0.022, 0.02], col: "deep", k: 0.02 },
      { t: "cap", a: [0.42, 0.14, -0.02], b: [0.48, 0.04, -0.02], r: [0.022, 0.02], col: "deep", k: 0.02 },
      { t: "cap", a: [0.32, 0.55, 0.17], b: [0.44, 0.32, 0.12], r: [0.012, 0.012], col: "pink", k: 0 },
      { t: "cap", a: [0.35, 0.58, 0.13], b: [0.4, 0.38, 0.02], r: [0.012, 0.012], col: "pink", k: 0 },
      { t: "cap", a: [0.3, 0.7, -0.08], b: [0.48, 0.14, -0.08], r: [0.012, 0.012], col: "pink", k: 0 },
    ],
    eyes: [
      { at: [0.22, 0.86, 0.07], r: 0.075, iris: IRIS_G, mirror: true, angry: true },
      { at: [0.44, 0.34, 0.03], r: 0.03, iris: IRIS_G, mirror: true },
    ],
  },
  // Supremo: the error king with a crown of warnings, an error ribbon and a spinner sceptre.
  "rey-del-error": errorKing(false),
  // Despertar: the blue screen of death made flesh, ice everywhere.
  "rey-del-error-pantalla-azul": errorKing(true),

  // Brote: a tiny beetle peeking out from under a big round shell, antennae drooping.
  escarbi: {
    palette: pulso,
    glow: ["glow"],
    shapes: [
      // Face peeking out
      { t: "ell", c: [0.26, 0.26, 0], r: [0.22, 0.19, 0.24], col: "body" },
      { t: "ell", c: [0.46, 0.18, 0], r: [0.04, 0.02, 0.06], col: "dark", paint: true },
      // Little legs
      { t: "cap", a: [0.12, 0.16, 0.2], b: [0.2, 0.02, 0.3], r: [0.04, 0.03], col: "dark", mirror: true, k: 0.03 },
      { t: "cap", a: [-0.14, 0.18, 0.2], b: [-0.2, 0.02, 0.3], r: [0.04, 0.03], col: "dark", mirror: true, k: 0.03 },
      // Shell: gold rim, iridescent dome with a split and glowing spots
      { t: "ell", c: [-0.04, 0.5, 0], r: [0.46, 0.07, 0.42], col: "rim", k: 0.02 },
      { t: "ell", c: [-0.04, 0.58, 0], r: [0.42, 0.32, 0.38], col: "shell", k: 0.01 },
      { t: "ell", c: [-0.04, 0.86, 0], r: [0.5, 0.2, 0.018], col: "dark", paint: true },
      { t: "ell", c: [0.14, 0.78, 0.2], r: [0.05, 0.05, 0.05], col: "glow", paint: true, mirror: true },
      { t: "ell", c: [-0.2, 0.8, 0.2], r: [0.045, 0.045, 0.045], col: "glow", paint: true, mirror: true },
      { t: "ell", c: [0.02, 0.66, 0.36], r: [0.035, 0.035, 0.035], col: "glow", paint: true, mirror: true },
      // Drooping antennae with gold tips, hanging at the sides of the face
      { t: "cap", a: [0.3, 0.4, 0.16], b: [0.2, 0.32, 0.4], r: [0.022, 0.018], col: "dark", mirror: true, k: 0.02 },
      { t: "ell", c: [0.19, 0.29, 0.42], r: [0.045, 0.045, 0.045], col: "gold", mirror: true, k: 0.01 },
    ],
    eyes: [{ at: [0.36, 0.3, 0.1], r: 0.11, iris: IRIS_Q, mirror: true, look: [0.62, 0.05, 0.78] }],
  },
  // Novato: a sturdy six-legged beetle with a domed, ridged shell and a blunt little horn.
  corazita: {
    palette: pulso,
    glow: ["glow"],
    shapes: [
      // Underside
      { t: "ell", c: [0.0, 0.24, 0], r: [0.34, 0.1, 0.24], col: "belly" },
      // Six legs
      ...[0.18, -0.02, -0.22].map((x): Shape => ({ t: "cap", a: [x, 0.24, 0.16], b: [x + 0.04, 0.02, 0.27], r: [0.045, 0.035], col: "dark", mirror: true, k: 0.03 })),
      // Head with horn, mandibles and antenna
      { t: "ell", c: [0.32, 0.32, 0], r: [0.15, 0.13, 0.15], col: "body", k: 0.06 },
      { t: "cap", a: [0.4, 0.4, 0], b: [0.5, 0.56, 0], r: [0.065, 0.035], col: "body", k: 0.04 },
      { t: "cap", a: [0.42, 0.24, 0.06], b: [0.52, 0.22, 0.03], r: [0.025, 0.01], col: "gold", mirror: true, k: 0.01 },
      { t: "cap", a: [0.34, 0.42, 0.1], b: [0.34, 0.58, 0.16], r: [0.016, 0.016], col: "dark", mirror: true, k: 0.01 },
      { t: "ell", c: [0.34, 0.6, 0.16], r: [0.03, 0.03, 0.03], col: "gold", mirror: true, k: 0.01 },
      // Shell: gold rim, dome, ridges
      { t: "ell", c: [-0.06, 0.32, 0], r: [0.42, 0.06, 0.33], col: "rim", k: 0.02 },
      { t: "ell", c: [-0.06, 0.36, 0], r: [0.4, 0.34, 0.31], col: "shell", k: 0.01 },
      { t: "ell", c: [-0.06, 0.6, 0], r: [0.5, 0.2, 0.016], col: "dark", paint: true },
      { t: "ell", c: [-0.06, 0.5, 0.12], r: [0.5, 0.36, 0.035], col: "stripe", paint: true, mirror: true },
      { t: "ell", c: [-0.06, 0.5, 0.22], r: [0.5, 0.36, 0.016], col: "glow", paint: true, mirror: true },
      { t: "ell", c: [0.25, 0.52, 0], r: [0.12, 0.2, 0.3], col: "stripe", paint: true },
    ],
    eyes: [{ at: [0.42, 0.34, 0.07], r: 0.08, iris: IRIS_Q, mirror: true }],
  },
  // Avanzado: an upright beetle whose wing cases unfold behind it into a two-plate wall.
  bastion: {
    palette: pulso,
    glow: ["glow"],
    shapes: [
      // The wall: two unfolded wing cases with gold rims and glowing ribs
      { t: "ell", c: [-0.25, 0.5, 0.22], r: [0.04, 0.48, 0.24], col: "rim", mirror: true, rot: [0, -12, 0] },
      { t: "ell", c: [-0.2, 0.5, 0.22], r: [0.04, 0.44, 0.2], col: "shell", mirror: true, rot: [0, -12, 0], k: 0 },
      { t: "ell", c: [-0.16, 0.5, 0.24], r: [0.04, 0.4, 0.06], col: "stripe", mirror: true, rot: [0, -12, 0], paint: true },
      { t: "ell", c: [-0.16, 0.66, 0.22], r: [0.06, 0.014, 0.24], col: "glow", mirror: true, paint: true },
      { t: "ell", c: [-0.16, 0.46, 0.22], r: [0.06, 0.014, 0.24], col: "glow", mirror: true, paint: true },
      { t: "ell", c: [-0.16, 0.26, 0.22], r: [0.06, 0.014, 0.24], col: "glow", mirror: true, paint: true },
      // Legs
      { t: "cap", a: [0.04, 0.26, 0.08], b: [0.06, 0.05, 0.1], r: [0.065, 0.05], col: "body", mirror: true, k: 0.05 },
      { t: "ell", c: [0.1, 0.03, 0.1], r: [0.1, 0.035, 0.06], col: "dark", mirror: true, k: 0.02 },
      // Body: carapace with a segmented gold belly
      { t: "ell", c: [0.04, 0.44, 0], r: [0.15, 0.22, 0.14], col: "body", k: 0.06 },
      { t: "ell", c: [0.12, 0.4, 0], r: [0.08, 0.17, 0.11], col: "belly", paint: true },
      { t: "ell", c: [0.18, 0.44, 0], r: [0.04, 0.01, 0.1], col: "dark", paint: true },
      { t: "ell", c: [0.18, 0.36, 0], r: [0.04, 0.01, 0.1], col: "dark", paint: true },
      // Arms: lower and raised upper pair
      { t: "cap", a: [0.06, 0.4, 0.13], b: [0.22, 0.36, 0.18], r: [0.04, 0.03], col: "body", mirror: true, k: 0.04 },
      { t: "cap", a: [0.06, 0.56, 0.14], b: [0.22, 0.6, 0.2], r: [0.045, 0.035], col: "body", mirror: true, k: 0.04 },
      { t: "cap", a: [0.22, 0.6, 0.2], b: [0.27, 0.7, 0.2], r: [0.035, 0.025], col: "body", mirror: true, k: 0.02 },
      // Pronotum plate
      { t: "ell", c: [0.04, 0.66, 0], r: [0.15, 0.08, 0.16], col: "shell", k: 0.03 },
      // Head with a big swept horn and mandibles
      { t: "ell", c: [0.16, 0.77, 0], r: [0.12, 0.11, 0.12], col: "body", k: 0.04 },
      { t: "cap", a: [0.18, 0.84, 0], b: [0.24, 0.98, 0], r: [0.055, 0.035], col: "shell", k: 0.03 },
      { t: "cap", a: [0.24, 0.98, 0], b: [0.18, 1.1, 0], r: [0.035, 0.008], col: "shell", k: 0.02 },
      { t: "cap", a: [0.24, 0.72, 0.05], b: [0.34, 0.7, 0.02], r: [0.025, 0.008], col: "gold", mirror: true, k: 0.01 },
    ],
    eyes: [{ at: [0.24, 0.79, 0.065], r: 0.075, iris: IRIS_Q, mirror: true }],
  },
  // Élite: a beetle knight behind a shell-shaped shield, sword raised, wing cases worn as a cape.
  egida: {
    palette: pulso,
    glow: ["glow"],
    shapes: [
      // Sword raised behind
      { t: "cap", a: [-0.04, 0.68, -0.2], b: [-0.3, 1.06, -0.2], r: [0.035, 0.012], col: "steel", k: 0 },
      { t: "cap", a: [-0.02, 0.7, -0.28], b: [-0.06, 0.64, -0.12], r: [0.022, 0.022], col: "rim", k: 0 },
      // Cape of wing cases
      { t: "ell", c: [-0.18, 0.44, 0.1], r: [0.12, 0.4, 0.14], col: "shell", mirror: true, rot: [0, 0, -12] },
      { t: "ell", c: [-0.2, 0.44, 0.18], r: [0.13, 0.36, 0.015], col: "glow", mirror: true, rot: [0, 0, -12], paint: true },
      { t: "ell", c: [-0.26, 0.44, 0.1], r: [0.04, 0.4, 0.2], col: "stripe", mirror: true, rot: [0, 0, -12], paint: true },
      // Legs: thigh, gold knee, greave, foot
      { t: "cap", a: [0.0, 0.34, 0.1], b: [0.03, 0.14, 0.1], r: [0.07, 0.055], col: "body", mirror: true, k: 0.05 },
      { t: "ell", c: [0.08, 0.04, 0.1], r: [0.11, 0.045, 0.065], col: "dark", mirror: true, k: 0.02 },
      // Torso, breastplate and belt
      { t: "ell", c: [0.02, 0.48, 0], r: [0.15, 0.18, 0.15], col: "body", k: 0.06 },
      { t: "ell", c: [0.07, 0.52, 0], r: [0.12, 0.13, 0.14], col: "shell", k: 0.02 },
      { t: "tor", c: [0.03, 0.37, 0], R: 0.13, r: 0.028, col: "gold", k: 0.01 },
      // Pauldrons
      { t: "ell", c: [0.0, 0.63, 0.14], r: [0.1, 0.065, 0.09], col: "shell", mirror: true, k: 0.02 },
      // Arms
      { t: "cap", a: [0.0, 0.6, -0.15], b: [-0.04, 0.68, -0.2], r: [0.055, 0.045], col: "body", k: 0.04 },
      { t: "cap", a: [0.04, 0.58, 0.16], b: [0.22, 0.46, 0.18], r: [0.055, 0.045], col: "body", k: 0.04 },
      // Helmet with a great horn and mandibles
      { t: "ell", c: [0.1, 0.76, 0], r: [0.13, 0.12, 0.12], col: "shell", k: 0.04 },
      { t: "ell", c: [0.22, 0.75, 0], r: [0.04, 0.07, 0.1], col: "dark", paint: true },
      { t: "cap", a: [0.1, 0.84, 0], b: [0.12, 1.0, 0], r: [0.065, 0.04], col: "shell", k: 0.04 },
      { t: "cap", a: [0.12, 1.0, 0], b: [0.22, 1.08, 0], r: [0.04, 0.01], col: "shell", k: 0.02 },
      { t: "cap", a: [0.22, 0.68, 0.05], b: [0.32, 0.7, 0.02], r: [0.025, 0.008], col: "gold", mirror: true, k: 0.01 },
      // Shield: gold rim, shell face, glowing crest
      { t: "ell", c: [0.3, 0.42, 0.14], r: [0.04, 0.27, 0.19], col: "rim", k: 0 },
      { t: "ell", c: [0.335, 0.42, 0.14], r: [0.035, 0.235, 0.155], col: "shell", k: 0 },
      { t: "ell", c: [0.37, 0.42, 0.14], r: [0.03, 0.24, 0.022], col: "stripe", paint: true },
      { t: "ell", c: [0.37, 0.42, 0.14], r: [0.03, 0.022, 0.16], col: "stripe", paint: true },
      { t: "ell", c: [0.37, 0.42, 0.14], r: [0.03, 0.07, 0.07], col: "glow", paint: true },
    ],
    eyes: [{ at: [0.22, 0.78, 0.06], r: 0.07, iris: IRIS_Q, mirror: true, angry: true }],
  },
  // Supremo: an iridescent paladin with a forked horn helm, spread wing cases, tower shield and lance.
  "paladin-quitina": paladin(false),
  // Despertar: golden armour, a halo and a lance of pure light.
  "paladin-quitina-coraza-solar": paladin(true),
};

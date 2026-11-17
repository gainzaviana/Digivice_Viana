import type { Sculpt, Shape, V3 } from "../sculpt";

// Eco (sound hares, cyan sound seams) and Pliegue (living origami fox, crisp folded facets).

// ───────────────────────────── ECO ─────────────────────────────

const eco = { body: "#6f7ddc", belly: "#f6d8aa", inner: "#ffc9a6", brass: "#eaa83a", gold: "#ffd468", dark: "#2f3766", coat: "#3a4386", glow: "#5ff5e6", white: "#fff7ea" };
const ecoAwake = { body: "#a65ad0", belly: "#fff0f8", inner: "#ffc2ea", brass: "#f2b440", gold: "#ffe07a", dark: "#34245e", coat: "#3a2a6a", glow: "#8ffff2", white: "#ffffff" };

/** A brass speaker set into a surface: rim, dark cone, glowing centre (mirrored pair). */
function speaker(c: V3, r: number, tilt: V3 = [90, 0, 0]): Shape[] {
  return [
    { t: "tor", c, R: r, r: r * 0.32, col: "brass", rot: tilt, k: 0.01, mirror: true },
    { t: "ell", c, r: [r * 0.95, r * 0.95, r * 0.95], col: "dark", paint: true, mirror: true },
    { t: "ell", c, r: [r * 0.38, r * 0.38, r * 0.38], col: "glow", paint: true, mirror: true },
  ];
}

/** The colossal conductor hare (Supremo) and its awakened form. */
function titan(awake: boolean): Sculpt {
  const shapes: Shape[] = [
    // Massive torso and the tail-coat over its back
    { t: "ell", c: [0.02, 0.46, 0], r: [0.28, 0.34, 0.25], col: "body" },
    { t: "ell", c: [-0.1, 0.5, 0], r: [0.26, 0.34, 0.27], col: "coat", k: 0.03 },
    { t: "cap", a: [-0.2, 0.36, 0.12], b: [-0.44, 0.04, 0.16], r: [0.12, 0.05], col: "coat", mirror: true, k: 0.04 },
    // Cream chest with a speaker grille and gold buttons
    { t: "ell", c: [0.2, 0.46, 0], r: [0.14, 0.27, 0.17], col: "belly", paint: true },
    { t: "ell", c: [0.3, 0.42, 0], r: [0.05, 0.08, 0.08], col: "dark", paint: true },
    ...[0.37, 0.42, 0.47].map((y): Shape => ({ t: "cap", a: [0.33, y, 0.07], b: [0.33, y, -0.07], r: [0.012, 0.012], col: "glow", paint: true })),
    ...[0.32, 0.46, 0.6].map((y): Shape => ({ t: "ell", c: [0.2, y, 0.17], r: [0.025, 0.025, 0.025], col: "gold", paint: true })),
    // Thick legs, big feet with drum soles
    { t: "ell", c: [-0.02, 0.2, 0.16], r: [0.22, 0.15, 0.1], col: "body", mirror: true, k: 0.06 },
    { t: "ell", c: [0.14, 0.06, 0.18], r: [0.2, 0.06, 0.09], col: "body", mirror: true, k: 0.04 },
    { t: "box", c: [0.14, 0.012, 0.18], s: [0.18, 0.012, 0.08], round: 0.01, col: "brass", mirror: true, k: 0 },
    // Head, snout and bow tie
    { t: "ell", c: [0.2, 0.86, 0], r: [0.15, 0.14, 0.14], col: "body", k: 0.08 },
    { t: "ell", c: [0.34, 0.82, 0], r: [0.09, 0.06, 0.08], col: "belly", k: 0.04 },
    { t: "ell", c: [0.42, 0.84, 0], r: [0.025, 0.02, 0.03], col: "dark", k: 0.01 },
    { t: "ell", c: [0.28, 0.72, 0.05], r: [0.04, 0.035, 0.06], col: "dark", mirror: true, k: 0.01 },
    // Trumpet ears swept back, bells blasting sound behind
    { t: "cap", a: [0.12, 0.96, 0.07], b: [-0.08, 1.06, 0.1], r: [0.045, 0.035], col: "brass", mirror: true, k: 0.03 },
    { t: "cap", a: [-0.08, 1.06, 0.1], b: [-0.3, 1.02, 0.12], r: [0.035, 0.08], col: "brass", mirror: true, k: 0.01 },
    { t: "ell", c: [-0.32, 1.02, 0.12], r: [0.02, 0.06, 0.06], col: "glow", paint: true, mirror: true },
    // Near arm: elbow out, forearm raised, white glove and a glowing baton
    { t: "cap", a: [0.06, 0.64, 0.24], b: [0.1, 0.6, 0.42], r: [0.08, 0.065], col: "coat", k: 0.06 },
    { t: "cap", a: [0.1, 0.6, 0.42], b: [0.12, 0.86, 0.4], r: [0.065, 0.055], col: "coat", k: 0.03 },
    { t: "ell", c: [0.12, 0.9, 0.4], r: [0.065, 0.065, 0.065], col: "white", k: 0.02 },
    { t: "cap", a: [0.14, 0.92, 0.4], b: [0.3, 1.16, 0.38], r: [0.026, 0.02], col: "glow", k: 0 },
    // Far arm low and back
    { t: "cap", a: [0.06, 0.62, -0.24], b: [0.02, 0.38, -0.3], r: [0.08, 0.065], col: "coat", k: 0.06 },
        // Sound seams through the fur
    { t: "cap", a: [0.06, 0.18, 0.26], b: [0.18, 0.26, 0.24], r: [0.014, 0.014], col: "glow", paint: true },
  ];
  if (awake) {
    shapes.push(
      // A sustained note: shock rings around the colossus, notes in the air
      { t: "tor", c: [-0.04, 0.6, -0.3], R: 0.64, r: 0.022, col: "glow", rot: [90, 0, 0], k: 0 },
      { t: "tor", c: [0.04, 0.02, 0], R: 0.5, r: 0.018, col: "glow", k: 0 },
      { t: "ell", c: [-0.46, 0.92, 0.1], r: [0.045, 0.035, 0.035], col: "glow", k: 0 },
      { t: "cap", a: [-0.42, 0.92, 0.1], b: [-0.42, 1.06, 0.1], r: [0.014, 0.014], col: "glow", k: 0 },
      { t: "ell", c: [0.52, 0.42, 0.24], r: [0.04, 0.032, 0.032], col: "glow", k: 0 },
      { t: "cap", a: [0.555, 0.42, 0.24], b: [0.555, 0.54, 0.24], r: [0.013, 0.013], col: "glow", k: 0 },
      // A golden halo crest over the head
      { t: "tor", c: [0.16, 1.08, 0], R: 0.12, r: 0.02, col: "gold", rot: [0, 0, -20], k: 0 },
    );
  }
  return {
    palette: awake ? ecoAwake : eco,
    glow: ["glow"],
    shapes,
    eyes: [{ at: [0.26, 0.9, 0.11], r: 0.085, iris: awake ? "#ff5ad0" : "#1fc6d4", mirror: true }],
  };
}

const ecoLine: Record<string, Sculpt> = {
  // Brote: a fluffy ball whose floppy ears end in jingle bells.
  tilin: {
    palette: eco,
    glow: ["glow"],
    shapes: [
      { t: "ell", c: [0, 0.4, 0], r: [0.32, 0.33, 0.33], col: "body" },
      { t: "ell", c: [0.14, 0.44, 0], r: [0.22, 0.24, 0.22], col: "body", k: 0.1 },
      { t: "ell", c: [0.16, 0.26, 0], r: [0.24, 0.17, 0.26], col: "belly", paint: true },
      // Fur tufts: crown and cheeks
      { t: "cap", a: [0.02, 0.66, 0], b: [-0.06, 0.84, 0], r: [0.07, 0.015], col: "body", k: 0.05 },
      { t: "cap", a: [-0.06, 0.66, 0.08], b: [-0.12, 0.78, 0.1], r: [0.05, 0.012], col: "body", k: 0.04 },
      { t: "cap", a: [0.04, 0.38, 0.28], b: [0.06, 0.32, 0.42], r: [0.06, 0.012], col: "body", mirror: true, k: 0.04 },
      // Stubby paws and feet
      { t: "ell", c: [0.24, 0.24, 0.2], r: [0.07, 0.06, 0.06], col: "body", mirror: true, k: 0.04 },
      { t: "ell", c: [0.12, 0.05, 0.15], r: [0.1, 0.05, 0.08], col: "body", mirror: true, k: 0.05 },
      // Floppy ears with jingle bells
      { t: "cap", a: [0.0, 0.64, 0.14], b: [-0.03, 0.92, 0.3], r: [0.09, 0.05], col: "body", mirror: true, k: 0.07 },
      { t: "ell", c: [0.05, 0.8, 0.22], r: [0.03, 0.1, 0.05], col: "inner", paint: true, mirror: true, rot: [-30, 0, 0] },
      { t: "ell", c: [-0.03, 1.0, 0.33], r: [0.085, 0.075, 0.085], col: "brass", mirror: true, k: 0.02 },
      { t: "cap", a: [0.06, 0.98, 0.3], b: [0.06, 0.98, 0.37], r: [0.016, 0.016], col: "dark", paint: true, mirror: true },
      { t: "ell", c: [0.06, 0.96, 0.34], r: [0.02, 0.02, 0.02], col: "glow", paint: true, mirror: true },
      { t: "ell", c: [-0.03, 1.08, 0.33], r: [0.02, 0.02, 0.02], col: "brass", mirror: true, k: 0.01 },
      // Nose and little mouth
      { t: "ell", c: [0.365, 0.42, 0], r: [0.03, 0.022, 0.03], col: "dark", k: 0.01 },
      { t: "cap", a: [0.35, 0.36, 0.04], b: [0.355, 0.35, -0.04], r: [0.01, 0.01], col: "dark", paint: true },
    ],
    eyes: [{ at: [0.28, 0.5, 0.075], r: 0.105, iris: "#1fc6d4", mirror: true, look: [1, 0.05, 0.12] }],
  },
  // Novato: a sitting fennec hare with enormous speaker ears.
  ecoli: {
    palette: eco,
    glow: ["glow"],
    shapes: [
      { t: "ell", c: [-0.04, 0.3, 0], r: [0.22, 0.26, 0.2], col: "body" },
      { t: "ell", c: [0.08, 0.3, 0], r: [0.12, 0.2, 0.17], col: "belly", paint: true },
      // Haunches and long feet
      { t: "ell", c: [-0.1, 0.16, 0.12], r: [0.17, 0.13, 0.1], col: "body", mirror: true, k: 0.06 },
      { t: "ell", c: [0.04, 0.035, 0.16], r: [0.15, 0.04, 0.07], col: "body", mirror: true, k: 0.04 },
      { t: "cap", a: [0.08, 0.36, 0.12], b: [0.15, 0.1, 0.12], r: [0.05, 0.045], col: "body", mirror: true, k: 0.04 },
      { t: "ell", c: [0.16, 0.07, 0.12], r: [0.06, 0.04, 0.05], col: "belly", mirror: true, k: 0.02 },
      // Fluffy tail
      { t: "ell", c: [-0.28, 0.16, 0], r: [0.1, 0.1, 0.1], col: "belly", k: 0.04 },
      // Sound seams
      { t: "cap", a: [-0.2, 0.2, 0.2], b: [-0.08, 0.26, 0.2], r: [0.013, 0.013], col: "glow", paint: true, mirror: true },
      // Head and muzzle
      { t: "ell", c: [0.1, 0.64, 0], r: [0.2, 0.18, 0.18], col: "body", k: 0.08 },
      { t: "ell", c: [0.27, 0.59, 0], r: [0.1, 0.075, 0.1], col: "belly", k: 0.05 },
      { t: "ell", c: [0.36, 0.61, 0], r: [0.03, 0.025, 0.03], col: "dark", k: 0.01 },
      // Enormous ears with speaker cones
      { t: "ell", c: [-0.06, 0.98, 0.13], r: [0.13, 0.26, 0.04], col: "body", mirror: true, rot: [-14, 0, 14], k: 0.06 },
      { t: "ell", c: [-0.04, 0.94, 0.16], r: [0.085, 0.2, 0.03], col: "inner", paint: true, mirror: true, rot: [-14, 0, 14] },
      ...speaker([-0.1, 1.06, 0.185], 0.055, [76, 0, 14]),
    ],
    eyes: [{ at: [0.2, 0.68, 0.12], r: 0.095, iris: "#1fc6d4", mirror: true }],
  },
  // Avanzado: a long-legged hare mid-stomp; its feet are drum pads.
  bramaliebre: {
    palette: eco,
    glow: ["glow"],
    shapes: [
      { t: "ell", c: [-0.06, 0.46, 0], r: [0.26, 0.19, 0.18], col: "body", rot: [0, 0, 22] },
      { t: "ell", c: [0.04, 0.44, 0], r: [0.14, 0.15, 0.17], col: "belly", paint: true },
      // Back sound stripes
      ...[-0.2, -0.08].map((x): Shape => ({ t: "cap", a: [x, 0.62, 0.06], b: [x - 0.06, 0.5, 0.18], r: [0.016, 0.016], col: "glow", paint: true, mirror: true })),
      // Tail
      { t: "ell", c: [-0.34, 0.36, 0], r: [0.08, 0.08, 0.08], col: "belly", k: 0.04 },
      // Big thighs, long shins, huge feet with drum soles
      { t: "ell", c: [-0.14, 0.3, 0.14], r: [0.18, 0.15, 0.09], col: "body", mirror: true, k: 0.06 },
      { t: "cap", a: [-0.18, 0.22, 0.15], b: [-0.08, 0.06, 0.15], r: [0.07, 0.05], col: "body", mirror: true, k: 0.04 },
      { t: "ell", c: [0.08, 0.05, 0.15], r: [0.2, 0.045, 0.075], col: "body", mirror: true, k: 0.04 },
      { t: "box", c: [0.1, 0.012, 0.15], s: [0.17, 0.012, 0.065], round: 0.01, col: "brass", mirror: true, k: 0 },
      { t: "ell", c: [0.26, 0.05, 0.15], r: [0.025, 0.03, 0.06], col: "glow", paint: true, mirror: true },
      // Arms reaching forward
      { t: "cap", a: [0.12, 0.58, 0.12], b: [0.3, 0.48, 0.16], r: [0.055, 0.045], col: "body", mirror: true, k: 0.05 },
      { t: "ell", c: [0.32, 0.47, 0.16], r: [0.05, 0.04, 0.045], col: "belly", mirror: true, k: 0.02 },
      // Head and muzzle
      { t: "ell", c: [0.24, 0.74, 0], r: [0.17, 0.15, 0.15], col: "body", k: 0.08 },
      { t: "ell", c: [0.38, 0.69, 0], r: [0.09, 0.065, 0.09], col: "belly", k: 0.05 },
      { t: "ell", c: [0.46, 0.71, 0], r: [0.026, 0.022, 0.028], col: "dark", k: 0.01 },
      // Tall ears swept back, two speakers each
      { t: "ell", c: [0.0, 0.98, 0.1], r: [0.09, 0.24, 0.035], col: "body", mirror: true, rot: [-10, 0, 40], k: 0.06 },
      { t: "ell", c: [0.02, 0.96, 0.13], r: [0.05, 0.17, 0.02], col: "inner", paint: true, mirror: true, rot: [-10, 0, 40] },
      ...speaker([0.04, 0.95, 0.14], 0.045, [80, 0, 40]),
      ...speaker([-0.07, 1.06, 0.13], 0.04, [80, 0, 40]),
    ],
    eyes: [{ at: [0.32, 0.78, 0.11], r: 0.09, iris: "#1fc6d4", mirror: true }],
  },
  // Élite: an armoured warrior hare whose ears are war trumpets.
  trompetrueno: {
    palette: eco,
    glow: ["glow"],
    shapes: [
      { t: "ell", c: [-0.02, 0.44, 0], r: [0.24, 0.25, 0.2], col: "body" },
      // Chest plate with sound seams and a brass belt
      { t: "box", c: [0.12, 0.47, 0], s: [0.12, 0.15, 0.17], round: 0.06, col: "dark", rot: [0, 0, -10], k: 0.02 },
      { t: "cap", a: [0.25, 0.44, 0.1], b: [0.25, 0.44, -0.1], r: [0.014, 0.014], col: "glow", paint: true },
      { t: "cap", a: [0.22, 0.56, 0.12], b: [0.27, 0.52, 0.0], r: [0.013, 0.013], col: "glow", paint: true, mirror: true },
      { t: "tor", c: [0.0, 0.29, 0], R: 0.2, r: 0.032, col: "brass", k: 0.01 },
      // Scarf streaming back from the neck
      { t: "tor", c: [0.1, 0.66, 0], R: 0.12, r: 0.04, col: "gold", rot: [0, 0, -15], k: 0.02 },
      { t: "ell", c: [-0.2, 0.7, 0], r: [0.2, 0.05, 0.1], col: "gold", rot: [0, 10, 12], k: 0.02 },
      { t: "ell", c: [-0.3, 0.6, 0.04], r: [0.16, 0.04, 0.08], col: "gold", rot: [0, -10, -8], k: 0.02 },
      // Tail
      { t: "ell", c: [-0.3, 0.26, 0], r: [0.08, 0.08, 0.08], col: "belly", k: 0.04 },
      // Big thighs, armoured shins and long feet
      { t: "ell", c: [-0.1, 0.24, 0.14], r: [0.2, 0.15, 0.09], col: "body", mirror: true, k: 0.06 },
      { t: "ell", c: [0.08, 0.045, 0.16], r: [0.2, 0.045, 0.075], col: "body", mirror: true, k: 0.04 },
      { t: "box", c: [0.02, 0.12, 0.17], s: [0.06, 0.06, 0.05], round: 0.02, col: "dark", mirror: true, k: 0.01 },
      // Shoulder pauldrons and punching fists with glowing cuffs
      { t: "ell", c: [0.04, 0.6, 0.18], r: [0.1, 0.06, 0.07], col: "dark", mirror: true, k: 0.02 },
      { t: "cap", a: [0.08, 0.54, 0.18], b: [0.34, 0.5, 0.2], r: [0.06, 0.05], col: "body", mirror: true, k: 0.04 },
      { t: "tor", c: [0.33, 0.5, 0.2], R: 0.05, r: 0.018, col: "glow", rot: [0, 0, 90], mirror: true, k: 0 },
      { t: "ell", c: [0.41, 0.5, 0.2], r: [0.07, 0.065, 0.065], col: "belly", mirror: true, k: 0.02 },
      // Head, muzzle and helmet band with a visor seam
      { t: "ell", c: [0.2, 0.8, 0], r: [0.16, 0.14, 0.14], col: "body", k: 0.08 },
      { t: "ell", c: [0.34, 0.76, 0], r: [0.085, 0.06, 0.08], col: "belly", k: 0.04 },
      { t: "ell", c: [0.42, 0.78, 0], r: [0.025, 0.02, 0.028], col: "dark", k: 0.01 },
      { t: "tor", c: [0.16, 0.9, 0], R: 0.135, r: 0.03, col: "dark", rot: [0, 0, -20], k: 0.01 },
      { t: "cap", a: [0.28, 0.86, 0.06], b: [0.28, 0.86, -0.06], r: [0.012, 0.012], col: "glow", paint: true },
      // War-trumpet ears, bells raised
      { t: "cap", a: [0.12, 0.92, 0.07], b: [0.0, 1.08, 0.1], r: [0.045, 0.035], col: "brass", mirror: true, k: 0.02 },
      { t: "cap", a: [0.0, 1.08, 0.1], b: [0.06, 1.22, 0.12], r: [0.035, 0.08], col: "brass", mirror: true, k: 0.01 },
      { t: "ell", c: [0.065, 1.24, 0.12], r: [0.06, 0.02, 0.06], col: "glow", paint: true, mirror: true, rot: [0, 0, -20] },
    ],
    eyes: [{ at: [0.26, 0.82, 0.1], r: 0.085, iris: "#1fc6d4", mirror: true, angry: true }],
  },
  "sinfonia-titan": titan(false),
  "sinfonia-titan-fortissimo": titan(true),
};

// ───────────────────────────── PLIEGUE ─────────────────────────────

const paper = { fur: "#ef6c3c", paper: "#efebf6", fold: "#c9c4de", blue: "#3e94b8", sky: "#72cbdc", dark: "#43365f", robe: "#4a3f72", glow: "#7ff4ff", gold: "#f0b43c" };
const starPaper = { fur: "#4a62c8", paper: "#7e9cf0", fold: "#9a74dc", blue: "#f0b43c", sky: "#ffe080", dark: "#221a4a", robe: "#6a44b0", glow: "#fff6c8", gold: "#ffe080" };

/** A folded fox head facing +x: two crisp facets meeting at a ridge, a paper snout and cone ears. */
function foxHead(c: V3, s: number, mask = false): Shape[] {
  const p = (dx: number, dy: number, dz: number): V3 => [c[0] + dx * s, c[1] + dy * s, c[2] + dz * s];
  return [
    { t: "box", c: p(-0.02, 0, 0.06), s: [0.13 * s, 0.11 * s, 0.08 * s], round: 0.02 * s, col: "fur", rot: [0, -28, 0], mirror: true, k: 0.01 },
    // Cheek ruff and snout fold
    { t: "box", c: p(0.02, -0.08, 0.06), s: [0.1 * s, 0.05 * s, 0.08 * s], round: 0.015 * s, col: "paper", rot: [0, -28, -10], mirror: true, k: 0.01 },
    { t: "cap", a: p(0.06, -0.03, 0), b: p(0.3, -0.04, 0), r: [0.075 * s, 0.022 * s], col: "paper", k: 0.015 },
    { t: "cap", a: p(0.06, 0.0, 0), b: p(0.28, -0.025, 0), r: [0.06 * s, 0.02 * s], col: "fur", paint: true },
    { t: "ell", c: p(0.3, -0.04, 0), r: [0.025 * s, 0.022 * s, 0.025 * s], col: "dark", k: 0.005 },
    // Crease down the forehead
    { t: "box", c: p(0.1, 0.07, 0), s: [0.12 * s, 0.045 * s, 0.01 * s], round: 0, col: "glow", paint: true },
    // Cone ears with paper insides
    { t: "cap", a: p(-0.04, 0.08, 0.08), b: p(-0.05, 0.34, 0.12), r: [0.075 * s, 0.01 * s], col: "fur", mirror: true, k: 0.01 },
    { t: "cap", a: p(0.0, 0.1, 0.085), b: p(-0.03, 0.28, 0.115), r: [0.045 * s, 0.008 * s], col: "paper", paint: true, mirror: true },
    ...(mask ? [{ t: "ell", c: p(0.06, 0.03, 0.08), r: [0.08 * s, 0.05 * s, 0.06 * s], col: "blue", paint: true, mirror: true } as Shape] : []),
  ];
}

/** A pleated folded-air screen: slim panels zig-zagging along z. */
function screen(c: V3, h: number, n: number): Shape[] {
  const out: Shape[] = [];
  for (let i = 0; i < n; i++) {
    const z = c[2] + (i - (n - 1) / 2) * 0.06;
    out.push({ t: "box", c: [c[0], c[1], z], s: [0.016, h, 0.045], round: 0.008, col: i % 2 ? "sky" : "blue", rot: [0, i % 2 ? 35 : -35, 0], k: 0 });
  }
  out.push({ t: "cap", a: [c[0] + 0.03, c[1] + h * 0.1, c[2] - n * 0.035], b: [c[0] + 0.03, c[1] + h * 0.1, c[2] + n * 0.035], r: [0.014, 0.014], col: "glow", paint: true });
  return out;
}

/** A fan of folded tail panels from the root, alternating fur and paper. */
function tailFan(root: V3, len: number, a0: number, a1: number, n: number, glow = false, w = 0.06): Shape[] {
  const out: Shape[] = [];
  for (let i = 0; i < n; i++) {
    const a = ((a0 + ((a1 - a0) * i) / (n - 1)) * Math.PI) / 180;
    const b: V3 = [root[0] + Math.cos(a) * len, root[1] + Math.sin(a) * len, root[2] + (i % 2 ? 0.03 : -0.03)];
    const m0: V3 = [(root[0] + b[0]) / 2, (root[1] + b[1]) / 2, b[2]];
    out.push({ t: "box", c: m0, s: [len / 2, w, 0.022], round: 0.012, col: i % 2 ? "paper" : "fur", rot: [0, 0, (a * 180) / Math.PI], k: 0.005 });
    if (glow) {
      const m: V3 = [root[0] + Math.cos(a) * len * 0.75, root[1] + Math.sin(a) * len * 0.75, b[2]];
      out.push({ t: "cap", a: [m[0], m[1], m[2] - 0.05], b: [m[0], m[1], m[2] + 0.05], r: [0.012, 0.012], col: "glow", paint: true });
    }
  }
  return out;
}

/** A small paper crane with blade wings raised (s ≈ its length). */
function crane(c: V3, s: number): Shape[] {
  const p = (dx: number, dy: number, dz: number): V3 => [c[0] + dx * s, c[1] + dy * s, c[2] + dz * s];
  return [
    { t: "ell", c: p(0, 0, 0), r: [0.4 * s, 0.1 * s, 0.1 * s], col: "paper", k: 0 },
    { t: "ell", c: p(-0.05, 0.2, 0.26), r: [0.14 * s, 0.025, 0.32 * s], col: "fold", rot: [-40, 0, 0], mirror: true, k: 0.01 },
    { t: "cap", a: p(0.25, 0.02, 0), b: p(0.5, 0.3, 0), r: [0.06 * s, 0.03 * s], col: "paper", k: 0.01 },
    { t: "cap", a: p(-0.3, 0.0, 0), b: p(-0.55, 0.18, 0), r: [0.06 * s, 0.025 * s], col: "paper", k: 0.01 },
  ];
}

/** The robed paper sorcerer (Supremo) and its star-paper awakening. */
function sorcerer(star: boolean): Sculpt {
  const shapes: Shape[] = [
    // Fan of folded tails behind
    ...tailFan([-0.12, 0.5, -0.06], 0.42, 100, 200, 5, true, 0.07),
    // Robe flaring to the floor: dark back, paper front panel, blue side panels
    { t: "cap", a: [0, 0.62, 0], b: [0, 0.3, 0], r: [0.15, 0.22], col: "robe", k: 0.02 },
    { t: "box", c: [0, 0.16, 0], s: [0.22, 0.16, 0.22], round: 0.05, col: "robe", rot: [0, 45, 0], k: 0.06 },
    { t: "box", c: [0.24, 0.24, 0], s: [0.06, 0.24, 0.12], round: 0.02, col: "paper", rot: [0, 0, 18], paint: true },
    { t: "box", c: [0.14, 0.24, 0.2], s: [0.08, 0.24, 0.08], round: 0.02, col: "blue", rot: [-18, 0, 0], paint: true, mirror: true },
    { t: "tor", c: [0, 0.03, 0], R: 0.27, r: 0.025, col: "glow", k: 0.01 },
    // Sash with a hanging talisman
    { t: "tor", c: [0, 0.48, 0], R: 0.16, r: 0.03, col: "fur", rot: [0, 0, 8], k: 0.01 },
    { t: "box", c: [0.2, 0.36, 0.06], s: [0.06, 0.08, 0.03], round: 0, col: "paper", paint: true },
    // Pointed paper collar
    { t: "cap", a: [0.04, 0.66, 0.06], b: [0.16, 0.7, 0.24], r: [0.07, 0.012], col: "paper", mirror: true, k: 0.01 },
    { t: "cap", a: [0.0, 0.66, 0.06], b: [-0.12, 0.72, 0.22], r: [0.06, 0.012], col: "paper", mirror: true, k: 0.01 },
    // Wide sleeve reaching to the staff, hand on it
    { t: "cap", a: [0.06, 0.56, 0.14], b: [0.4, 0.5, 0.2], r: [0.06, 0.085], col: "fur", k: 0.03 },
    { t: "ell", c: [0.41, 0.5, 0.2], r: [0.03, 0.08, 0.08], col: "paper", k: 0.005 },
    { t: "ell", c: [0.46, 0.5, 0.2], r: [0.045, 0.045, 0.045], col: "fur", k: 0.01 },
    // Folded staff with a diamond crystal
    { t: "cap", a: [0.5, 0.01, 0.2], b: [0.5, 0.98, 0.2], r: [0.026, 0.022], col: "blue", k: 0 },
    { t: "box", c: [0.5, 1.06, 0.2], s: [0.06, 0.06, 0.03], round: 0.01, col: "paper", rot: [0, 0, 45], k: 0 },
    { t: "ell", c: [0.5, 1.06, 0.2], r: [0.03, 0.03, 0.04], col: "glow", paint: true },
    // Head
    ...foxHead([0.1, 0.82, 0], 1.15),
  ];
  if (star) {
    shapes.push(
      // A starlit glyph ring around it, sparks of cut-out light
      { t: "tor", c: [0, 0.56, -0.26], R: 0.62, r: 0.02, col: "glow", rot: [90, 0, 0], k: 0 },
      ...([[0.2, 0.2, 0.22], [-0.16, 0.32, 0.22], [0.06, 0.12, 0.27]] as V3[]).map((c): Shape => ({ t: "ell", c, r: [0.024, 0.024, 0.024], col: "glow", paint: true })),
    );
  } else {
    shapes.push({ t: "tor", c: [-0.1, 0.86, -0.24], R: 0.32, r: 0.018, col: "glow", rot: [90, 0, 0], k: 0 });
  }
  return {
    palette: star ? starPaper : paper,
    glow: ["glow"],
    shapes,
    eyes: [{ at: [0.16, 0.88, 0.07], r: 0.07, iris: star ? "#ffcc3a" : "#16b8d0", mirror: true, angry: true, look: [0.7, 0.05, 0.7] }],
  };
}

const pliegueLine: Record<string, Sculpt> = {
  // Brote: a scrap of living paper folded into a little fox-ish shape.
  pliegue: {
    palette: paper,
    glow: ["glow"],
    shapes: [
      // Body-head: two crisp facets meeting at a front ridge
      { t: "box", c: [0.0, 0.42, 0.08], s: [0.26, 0.27, 0.14], round: 0.04, col: "fur", rot: [0, -12, 0], mirror: true, k: 0.01 },
      // Paper muzzle chevron folded forward
      { t: "box", c: [0.12, 0.22, 0.08], s: [0.18, 0.11, 0.12], round: 0.03, col: "paper", rot: [0, -24, 0], mirror: true, k: 0.01 },
      { t: "box", c: [0.24, 0.2, 0.0], s: [0.06, 0.07, 0.06], round: 0.02, col: "fold", rot: [0, 45, 0], paint: true },
      { t: "ell", c: [0.3, 0.32, 0], r: [0.035, 0.03, 0.04], col: "dark", k: 0.01 },
      // Crease down the forehead
      { t: "box", c: [0.3, 0.6, 0], s: [0.2, 0.1, 0.012], round: 0, col: "glow", paint: true },
      // Corner dog-ear still folding
      { t: "box", c: [-0.06, 0.66, -0.24], s: [0.07, 0.07, 0.025], round: 0.01, col: "paper", rot: [20, 0, 45], k: 0 },
      // Cone ears
      { t: "cap", a: [-0.02, 0.62, 0.17], b: [-0.04, 1.0, 0.26], r: [0.11, 0.012], col: "fur", mirror: true, k: 0.01 },
      { t: "cap", a: [0.05, 0.66, 0.18], b: [0.0, 0.92, 0.245], r: [0.065, 0.01], col: "paper", paint: true, mirror: true },
      // Feet
      { t: "box", c: [0.08, 0.05, 0.14], s: [0.08, 0.05, 0.06], round: 0.02, col: "fur", mirror: true, k: 0.01 },
      // Tail flap with a paper tip
      { t: "cap", a: [-0.2, 0.28, 0], b: [-0.48, 0.5, 0.04], r: [0.1, 0.015], col: "fur", k: 0.01 },
      { t: "ell", c: [-0.44, 0.47, 0.03], r: [0.07, 0.07, 0.07], col: "paper", paint: true },
    ],
    eyes: [{ at: [0.2, 0.5, 0.075], r: 0.11, iris: "#16b8d0", mirror: true, look: [1, 0.05, 0.12] }],
  },
  // Novato: a sitting paper fox launching a blade-winged crane.
  origamin: {
    palette: paper,
    glow: ["glow"],
    shapes: [
      // Big folded tail
      { t: "box", c: [-0.3, 0.16, 0], s: [0.18, 0.09, 0.08], round: 0.025, col: "fur", rot: [0, 0, 28], k: 0.01 },
      { t: "box", c: [-0.46, 0.34, 0], s: [0.13, 0.08, 0.07], round: 0.025, col: "fur", rot: [0, 0, 62], k: 0.01 },
      { t: "cap", a: [-0.5, 0.42, 0], b: [-0.56, 0.6, 0], r: [0.07, 0.012], col: "paper", k: 0.01 },
      // Upright body, paper chest bib
      { t: "box", c: [-0.02, 0.34, 0], s: [0.13, 0.2, 0.13], round: 0.04, col: "fur", rot: [0, 0, -12], k: 0.01 },
      { t: "box", c: [0.09, 0.38, 0], s: [0.06, 0.17, 0.09], round: 0.03, col: "paper", rot: [0, 0, -12], k: 0.01 },
      // Haunches
      { t: "box", c: [-0.1, 0.13, 0.1], s: [0.16, 0.11, 0.05], round: 0.03, col: "fur", rot: [0, 0, 22], mirror: true, k: 0.01 },
      { t: "box", c: [0.0, 0.025, 0.12], s: [0.1, 0.025, 0.045], round: 0.01, col: "paper", mirror: true, k: 0.005 },
      // Forelegs with paper paws
      { t: "box", c: [0.13, 0.15, 0.07], s: [0.035, 0.14, 0.035], round: 0.012, col: "fur", mirror: true, k: 0.01 },
      { t: "box", c: [0.15, 0.025, 0.07], s: [0.055, 0.025, 0.04], round: 0.01, col: "paper", mirror: true, k: 0.005 },
      // Head
      ...foxHead([0.13, 0.66, 0], 1.0),
      // Crane taking off
      ...crane([0.3, 1.04, 0.08], 0.3),
    ],
    eyes: [{ at: [0.16, 0.7, 0.07], r: 0.075, iris: "#16b8d0", mirror: true, look: [0.7, 0.05, 0.7] }],
  },
  // Avanzado: a prowling paper fox with a pleated tail; folded-air screens deflect blows.
  pliegazorro: {
    palette: paper,
    glow: ["glow"],
    shapes: [
      // Pleated tail
      ...tailFan([-0.26, 0.44, 0], 0.32, 140, 205, 4),
      // Body and belly fold
      { t: "box", c: [-0.04, 0.42, 0], s: [0.26, 0.1, 0.11], round: 0.04, col: "fur", k: 0.01 },
      { t: "box", c: [-0.04, 0.34, 0], s: [0.2, 0.04, 0.1], round: 0.03, col: "paper", paint: true },
      { t: "cap", a: [-0.16, 0.52, 0.06], b: [-0.08, 0.36, 0.12], r: [0.012, 0.012], col: "glow", paint: true, mirror: true },
      // Legs with paper paws
      { t: "box", c: [0.16, 0.2, 0.07], s: [0.04, 0.18, 0.04], round: 0.012, col: "fur", mirror: true, k: 0.01 },
      { t: "box", c: [-0.22, 0.2, 0.07], s: [0.045, 0.18, 0.045], round: 0.012, col: "fur", mirror: true, k: 0.01 },
      { t: "box", c: [0.18, 0.02, 0.07], s: [0.06, 0.02, 0.045], round: 0.008, col: "paper", mirror: true, k: 0.005 },
      { t: "box", c: [-0.2, 0.02, 0.07], s: [0.06, 0.02, 0.05], round: 0.008, col: "paper", mirror: true, k: 0.005 },
      // Neck ruff
      { t: "cap", a: [0.16, 0.46, 0], b: [0.26, 0.6, 0], r: [0.1, 0.07], col: "paper", k: 0.02 },
      // Head
      ...foxHead([0.3, 0.7, 0], 1.0),
      // Folded-air screens: one hanging behind, one shielding in front
      ...screen([-0.48, 0.86, 0], 0.13, 3),
      ...screen([0.56, 0.24, 0.26], 0.18, 3),
    ],
    eyes: [{ at: [0.33, 0.74, 0.07], r: 0.07, iris: "#16b8d0", mirror: true, angry: true, look: [0.7, 0.05, 0.7] }],
  },
  // Élite: a fox of a thousand folds; each fold holds a glowing glyph.
  "mil-pliegues": {
    palette: paper,
    glow: ["glow"],
    shapes: [
      // Great pleated fan of tails with glyph seams
      ...tailFan([-0.26, 0.5, 0], 0.4, 110, 210, 6, true),
      // Body of overlapping folds
      { t: "box", c: [-0.04, 0.46, 0], s: [0.24, 0.11, 0.12], round: 0.04, col: "fur", k: 0.01 },
      { t: "box", c: [0.1, 0.48, 0], s: [0.1, 0.12, 0.13], round: 0.03, col: "blue", rot: [0, 0, -20], k: 0.005 },
      { t: "box", c: [-0.04, 0.37, 0], s: [0.2, 0.04, 0.11], round: 0.03, col: "paper", paint: true },
      { t: "cap", a: [-0.14, 0.56, 0.08], b: [-0.08, 0.42, 0.13], r: [0.012, 0.012], col: "glow", paint: true, mirror: true },
      { t: "cap", a: [-0.08, 0.56, 0.08], b: [-0.14, 0.42, 0.13], r: [0.012, 0.012], col: "glow", paint: true, mirror: true },
      // Legs with paper-blade claws
      { t: "box", c: [0.16, 0.22, 0.08], s: [0.045, 0.2, 0.045], round: 0.012, col: "fur", mirror: true, k: 0.01 },
      { t: "box", c: [-0.2, 0.22, 0.08], s: [0.05, 0.2, 0.05], round: 0.012, col: "fur", mirror: true, k: 0.01 },
      { t: "cap", a: [0.16, 0.26, 0.13], b: [0.16, 0.12, 0.13], r: [0.012, 0.012], col: "glow", paint: true, mirror: true },
      { t: "cap", a: [0.14, 0.025, 0.08], b: [0.3, 0.02, 0.08], r: [0.04, 0.012], col: "paper", mirror: true, k: 0.005 },
      { t: "cap", a: [-0.22, 0.025, 0.08], b: [-0.06, 0.02, 0.08], r: [0.04, 0.012], col: "paper", mirror: true, k: 0.005 },
      // Pleated mane collar
      { t: "cap", a: [0.18, 0.56, 0.04], b: [0.16, 0.64, 0.2], r: [0.06, 0.012], col: "paper", mirror: true, k: 0.01 },
      { t: "cap", a: [0.22, 0.52, 0.04], b: [0.28, 0.5, 0.18], r: [0.06, 0.012], col: "paper", mirror: true, k: 0.01 },
      // Head with a blue fold-mask
      ...foxHead([0.3, 0.78, 0], 1.05, true),
      // Floating spell slips
      { t: "box", c: [-0.44, 1.0, 0.04], s: [0.04, 0.07, 0.012], round: 0.005, col: "paper", rot: [0, 0, 20], k: 0 },
      { t: "box", c: [0.52, 1.12, 0.06], s: [0.04, 0.07, 0.012], round: 0.005, col: "paper", rot: [0, 0, -15], k: 0 },
      { t: "cap", a: [-0.44, 1.04, 0.06], b: [-0.44, 0.96, 0.06], r: [0.014, 0.014], col: "glow", paint: true },
      { t: "cap", a: [0.52, 1.16, 0.08], b: [0.52, 1.08, 0.08], r: [0.014, 0.014], col: "glow", paint: true },
    ],
    eyes: [{ at: [0.33, 0.82, 0.07], r: 0.072, iris: "#16b8d0", mirror: true, angry: true, look: [0.7, 0.05, 0.7] }],
  },
  arcanorigami: sorcerer(false),
  "arcanorigami-papel-estelar": sorcerer(true),
};

export const ecoPliegue: Record<string, Sculpt> = { ...ecoLine, ...pliegueLine };

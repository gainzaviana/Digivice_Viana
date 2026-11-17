import type { Sculpt, Shape, V3 } from "../sculpt";

// Telúrica: a rolling armadillo that grows into a walking mountain (magenta glow cracks).
// Engranaje: a repair drone that grows into a perfect machine (cyan glow, gears and plates).

const earth = { main: "#c4622e", seam: "#6e2c3c", skin: "#c49674", rock: "#6a80a6", crystal: "#b4c8e0", snow: "#f4dcae", dark: "#3c3048", glow: "#ff4fd2" };
const tectonic = { main: "#6a4490", seam: "#2c1e44", skin: "#c27088", rock: "#4a3866", crystal: "#e486e6", snow: "#ffd4f4", dark: "#241a34", glow: "#ff74e6" };
const metal = { main: "#5f86cc", light: "#9ec4ee", brass: "#e6a444", dark: "#2e3a56", steel: "#c4cee2", glow: "#4af2ff" };
const overclock = { main: "#b8434e", light: "#f08a5a", brass: "#ff9a32", dark: "#3c2a44", steel: "#eceef8", glow: "#8afcff" };

/** A thin vertical paint slab across x (armour-band seams). */
const seamX = (x: number, y: number, h: number, col = "seam", w = 0.013, tilt = 0): Shape =>
  ({ t: "box", c: [x, y, 0], s: [w, h, 0.6], round: 0, col, paint: true, rot: [0, 0, tilt] });
/** A glowing crack painted through the whole depth (shows on both flanks). */
const crack = (c: V3, h: number, tilt: number, col = "glow"): Shape =>
  ({ t: "box", c, s: [0.013, h, 0.6], round: 0, col, paint: true, rot: [0, 0, tilt] });

// ───────────────────────────── Telúrica ─────────────────────────────

/** The walking mountain (Supremo and Despertar). */
function coloso(awake: boolean): Sculpt {
  const shapes: Shape[] = [
    // Armoured body
    { t: "ell", c: [-0.08, 0.38, 0], r: [0.4, 0.2, 0.3], col: "main" },
    seamX(-0.3, 0.36, 0.2), seamX(-0.14, 0.36, 0.2), seamX(0.02, 0.36, 0.2),
    // Mountain on its back
    { t: "cap", a: [-0.12, 0.46, 0], b: [-0.1, 1.0, 0], r: [0.3, 0.025], col: "rock", k: 0.06 },
    { t: "cap", a: [-0.3, 0.46, 0.05], b: [-0.28, 0.84, 0.03], r: [0.2, 0.025], col: "rock", k: 0.05 },
    { t: "cap", a: [0.06, 0.46, -0.03], b: [0.08, 0.8, -0.02], r: [0.17, 0.025], col: "rock", k: 0.05 },
    { t: "ell", c: [-0.1, 0.95, 0], r: [0.07, 0.07, 0.07], col: "snow", paint: true },
    { t: "ell", c: [-0.28, 0.8, 0.03], r: [0.06, 0.06, 0.06], col: "snow", paint: true },
    { t: "ell", c: [0.08, 0.76, -0.02], r: [0.06, 0.06, 0.06], col: "snow", paint: true },
    crack([-0.14, 0.74, 0], 0.12, 12), crack([-0.13, 0.6, 0], 0.08, -14), crack([-0.24, 0.6, 0], 0.09, 10),
    // Crystals on the slopes
    { t: "cap", a: [0.0, 0.58, 0.18], b: [0.08, 0.78, 0.24], r: [0.045, 0.01], col: "crystal", k: 0.02 },
    { t: "cap", a: [-0.36, 0.54, 0.16], b: [-0.44, 0.72, 0.2], r: [0.045, 0.01], col: "crystal", k: 0.02 },
    { t: "cap", a: [-0.04, 0.56, -0.16], b: [0.02, 0.72, -0.22], r: [0.04, 0.01], col: "crystal", k: 0.02 },
    // Tail
    { t: "cap", a: [-0.42, 0.34, 0], b: [-0.56, 0.2, 0], r: [0.08, 0.035], col: "main", k: 0.05 },
    // Pillar legs with knee plates
    { t: "cap", a: [0.12, 0.3, 0.17], b: [0.13, 0.05, 0.18], r: [0.09, 0.1], col: "skin", mirror: true, k: 0.04 },
    { t: "cap", a: [-0.28, 0.3, 0.17], b: [-0.29, 0.05, 0.18], r: [0.09, 0.1], col: "skin", mirror: true, k: 0.04 },
    { t: "ell", c: [0.13, 0.26, 0.2], r: [0.11, 0.07, 0.1], col: "main", mirror: true, k: 0.015 },
    { t: "ell", c: [-0.28, 0.26, 0.2], r: [0.11, 0.07, 0.1], col: "main", mirror: true, k: 0.015 },
    // Head: heavy brow plate, great horn, tusks
    { t: "ell", c: [0.3, 0.4, 0], r: [0.17, 0.15, 0.15], col: "skin", k: 0.07 },
    { t: "ell", c: [0.44, 0.34, 0], r: [0.1, 0.09, 0.1], col: "skin", k: 0.06 },
    { t: "ell", c: [0.28, 0.52, 0], r: [0.15, 0.07, 0.15], col: "main", k: 0.015, rot: [0, 0, -12] },
    { t: "cap", a: [0.46, 0.4, 0], b: [0.54, 0.76, 0], r: [0.065, 0.012], col: "rock", k: 0.02 },
    { t: "cap", a: [0.36, 0.55, 0], b: [0.4, 0.68, 0], r: [0.035, 0.01], col: "rock", k: 0.02 },
    { t: "cap", a: [0.46, 0.29, 0.07], b: [0.53, 0.25, 0.1], r: [0.03, 0.012], col: "snow", mirror: true, k: 0.02 },
    { t: "ell", c: [0.535, 0.33, 0], r: [0.03, 0.03, 0.04], col: "dark", k: 0.01 },
    crack([0.12, 0.38, 0], 0.07, -8),
  ];
  if (awake) {
    shapes.push(
      { t: "cap", a: [-0.2, 0.6, 0.12], b: [-0.18, 0.86, 0.16], r: [0.05, 0.01], col: "crystal", k: 0.02 },
      { t: "cap", a: [-0.42, 0.44, 0.2], b: [-0.52, 0.6, 0.26], r: [0.035, 0.008], col: "crystal", k: 0.02 },
      { t: "cap", a: [-0.24, 0.58, -0.16], b: [-0.3, 0.8, -0.2], r: [0.045, 0.01], col: "crystal", k: 0.02 },
      // Floating tectonic plates with magma beneath
      { t: "box", c: [0.36, 0.9, 0.06], s: [0.17, 0.035, 0.12], round: 0.025, col: "main", k: 0, rot: [8, 0, 14] },
      { t: "box", c: [0.36, 0.86, 0.06], s: [0.12, 0.03, 0.1], round: 0.02, col: "glow", paint: true, rot: [8, 0, 14] },
      { t: "box", c: [-0.5, 0.9, -0.1], s: [0.12, 0.03, 0.1], round: 0.025, col: "main", k: 0, rot: [-10, 0, -18] },
      { t: "box", c: [-0.5, 0.86, -0.1], s: [0.08, 0.025, 0.08], round: 0.02, col: "glow", paint: true, rot: [-10, 0, -18] },
      crack([0.13, 0.13, 0], 0.07, 10), crack([-0.28, 0.13, 0], 0.07, -10),
    );
  }
  return {
    palette: awake ? tectonic : earth,
    glow: ["glow"],
    shapes,
    eyes: [{ at: [0.36, 0.44, 0.08], r: 0.065, iris: awake ? "#ff3ac0" : "#e83aa8", mirror: true, angry: true }],
  };
}

// ───────────────────────────── Engranaje ─────────────────────────────

/** A gear standing in the xy plane (faces the camera): rim, teeth and hub. */
function gear(c: V3, R: number, teeth: number, col: string, hub: string, rot = 0): Shape[] {
  const out: Shape[] = [
    { t: "tor", c, R, r: R * 0.26, col, rot: [90, 0, 0], k: 0.01 },
    { t: "ell", c, r: [R * 0.32, R * 0.32, R * 0.3], col: hub, k: 0 },
  ];
  for (let i = 0; i < teeth; i++) {
    const a = rot + (i * 360) / teeth, ar = (a * Math.PI) / 180;
    out.push({ t: "box", c: [c[0] + Math.cos(ar) * R * 1.22, c[1] + Math.sin(ar) * R * 1.22, c[2]], s: [R * 0.18, R * 0.14, R * 0.2], round: 0.01, col, k: 0.005, rot: [0, 0, a] });
  }
  return out;
}

/** The perfect machine (Supremo and Despertar). */
function deus(hot: boolean): Sculpt {
  const shapes: Shape[] = [
    // Legs: plated, brass knees, silver boots
    { t: "box", c: [0.0, 0.2, 0.09], s: [0.07, 0.17, 0.065], round: 0.04, col: "main", mirror: true, k: 0.02 },
    { t: "ell", c: [0.05, 0.24, 0.1], r: [0.045, 0.045, 0.045], col: "brass", mirror: true, k: 0.01 },
    { t: "box", c: [0.04, 0.025, 0.09], s: [0.12, 0.025, 0.07], round: 0.02, col: "steel", mirror: true, k: 0.01 },
    // Waist and V-torso, brass collar, calculating core
    { t: "box", c: [0.0, 0.42, 0], s: [0.09, 0.06, 0.1], round: 0.04, col: "dark", k: 0.03 },
    { t: "cap", a: [0.0, 0.5, 0], b: [0.02, 0.66, 0], r: [0.11, 0.17], col: "main", k: 0.05 },
    { t: "tor", c: [0.02, 0.76, 0], R: 0.1, r: 0.03, col: "brass", k: 0.01 },
    { t: "tor", c: [0.15, 0.62, 0], R: 0.055, r: 0.018, col: "brass", rot: [0, 0, 90], k: 0.01 },
    { t: "ell", c: [0.16, 0.62, 0], r: [0.035, 0.045, 0.045], col: "glow", k: 0.01 },
    // Shoulder pauldrons and arms
    { t: "ell", c: [0.0, 0.76, 0.17], r: [0.1, 0.07, 0.08], col: "brass", mirror: true, k: 0.02, rot: [20, 0, 0] },
    { t: "cap", a: [0.02, 0.7, 0.2], b: [0.12, 0.54, 0.22], r: [0.045, 0.04], col: "dark", mirror: true, k: 0.02 },
    { t: "cap", a: [0.12, 0.54, 0.22], b: [0.3, 0.6, 0.22], r: [0.05, 0.045], col: "main", mirror: true, k: 0.02 },
    { t: "ell", c: [0.33, 0.6, 0.22], r: [0.04, 0.035, 0.05], col: "steel", mirror: true, k: 0.02 },
    // Head: helmet, swept crest, visor, jaw
    { t: "ell", c: [0.06, 0.89, 0], r: [0.13, 0.1, 0.11], col: "main", k: 0.03 },
    { t: "ell", c: [0.15, 0.88, 0], r: [0.06, 0.035, 0.09], col: "dark", paint: true },
    { t: "box", c: [0.13, 0.81, 0], s: [0.04, 0.03, 0.05], round: 0.02, col: "brass", k: 0.02 },
    { t: "cap", a: [0.0, 0.94, 0.04], b: [-0.2, 1.0, 0.07], r: [0.035, 0.008], col: "steel", mirror: true, k: 0.02 },
    // Plate wings fanned behind, glowing edges
    ...[16, -18].map((a): Shape => ({ t: "ell", c: [-0.26, 0.66 + a * 0.004, 0.16], r: [0.24, 0.045, 0.02], col: "steel", mirror: true, k: 0.0, rot: [0, -20, a] })),
    { t: "cap", a: [-0.1, 0.7, 0.17], b: [-0.44, 0.62, 0.26], r: [0.016, 0.016], col: "glow", paint: true },
    // Floating data cube
    { t: "box", c: [0.44, 0.72, 0.22], s: [0.045, 0.045, 0.045], round: 0.012, col: "glow", k: 0, rot: [20, 30, 15] },
    // Gear halo with its glowing ring
    ...gear([-0.12, 0.9, -0.06], 0.22, 8, "brass", "dark", 0),
    { t: "tor", c: [-0.12, 0.9, -0.03], R: 0.12, r: 0.016, col: "glow", rot: [90, 0, 0], k: 0 },
  ];
  if (hot) {
    shapes.push(
      { t: "cap", a: [-0.1, 0.74, 0.12], b: [-0.3, 1.0, 0.14], r: [0.045, 0.04], col: "dark", k: 0.02 },
      { t: "ell", c: [-0.34, 1.08, 0.14], r: [0.09, 0.065, 0.08], col: "steel", k: 0.06 },
      { t: "ell", c: [-0.44, 1.13, 0.1], r: [0.07, 0.06, 0.06], col: "steel", k: 0.06 },
      crack([0.06, 0.6, 0], 0.08, -15), crack([0.02, 0.18, 0], 0.08, 6),
    );
  }
  return {
    palette: hot ? overclock : metal,
    glow: ["glow"],
    shapes,
    eyes: [{ at: [0.12, 0.89, 0.05], r: 0.06, iris: hot ? "#ff5a2a" : "#14c8f0", mirror: true, angry: hot }],
  };
}

export const teluricaEngranaje: Record<string, Sculpt> = {
  // Brote: a banded armour ball with its little face peeking out.
  bolarmi: {
    palette: earth,
    glow: ["glow"],
    shapes: [
      { t: "ell", c: [-0.06, 0.44, 0], r: [0.42, 0.42, 0.4], col: "main" },
      seamX(-0.4, 0.5, 0.5), seamX(-0.27, 0.5, 0.5), seamX(-0.14, 0.5, 0.5), seamX(-0.02, 0.62, 0.3),
      crack([-0.28, 0.7, 0], 0.08, 14),
      { t: "ell", c: [0.24, 0.38, 0], r: [0.24, 0.25, 0.25], col: "skin", k: 0.06 },
      { t: "ell", c: [0.46, 0.31, 0], r: [0.09, 0.075, 0.09], col: "skin", k: 0.06 },
      { t: "ell", c: [0.545, 0.33, 0], r: [0.03, 0.025, 0.035], col: "dark", k: 0.01 },
      { t: "ell", c: [0.08, 0.62, 0.17], r: [0.05, 0.07, 0.04], col: "skin", mirror: true, k: 0.04, rot: [-20, 0, 0] },
      { t: "cap", a: [0.26, 0.56, 0], b: [0.34, 0.78, 0], r: [0.05, 0.012], col: "rock", k: 0.02 },
      { t: "ell", c: [0.32, 0.07, 0.13], r: [0.08, 0.06, 0.07], col: "skin", mirror: true, k: 0.05 },
      { t: "ell", c: [-0.24, 0.06, 0.17], r: [0.08, 0.05, 0.07], col: "skin", mirror: true, k: 0.05 },
      { t: "cap", a: [-0.44, 0.2, 0], b: [-0.58, 0.1, 0], r: [0.06, 0.03], col: "main", k: 0.05 },
    ],
    eyes: [{ at: [0.32, 0.43, 0.1], r: 0.11, iris: "#e83aa8", mirror: true, look: [0.7, 0.06, 0.7] }],
  },
  // Novato: an armadillo on all fours, banded shell and a forehead horn.
  rodacorno: {
    palette: earth,
    glow: ["glow"],
    shapes: [
      { t: "ell", c: [-0.1, 0.42, 0], r: [0.36, 0.3, 0.3], col: "main" },
      { t: "box", c: [-0.1, 0.15, 0], s: [0.5, 0.04, 0.5], round: 0, col: "skin", paint: true },
      seamX(-0.36, 0.5, 0.3), seamX(-0.24, 0.5, 0.3), seamX(-0.12, 0.5, 0.3), seamX(0.0, 0.5, 0.3), seamX(0.12, 0.52, 0.28),
      { t: "ell", c: [-0.24, 0.715, 0], r: [0.025, 0.025, 0.025], col: "rock", k: 0.01 },
      { t: "ell", c: [-0.1, 0.725, 0], r: [0.025, 0.025, 0.025], col: "rock", k: 0.01 },
      { t: "ell", c: [0.04, 0.71, 0], r: [0.025, 0.025, 0.025], col: "rock", k: 0.01 },
      { t: "cap", a: [0.12, 0.24, 0.15], b: [0.13, 0.05, 0.16], r: [0.07, 0.075], col: "skin", mirror: true, k: 0.05 },
      { t: "cap", a: [-0.3, 0.24, 0.15], b: [-0.31, 0.05, 0.16], r: [0.07, 0.075], col: "skin", mirror: true, k: 0.05 },
      { t: "ell", c: [0.2, 0.025, 0.16], r: [0.03, 0.025, 0.06], col: "rock", mirror: true, k: 0.01 },
      { t: "ell", c: [-0.23, 0.025, 0.16], r: [0.03, 0.025, 0.06], col: "rock", mirror: true, k: 0.01 },
      { t: "ell", c: [0.32, 0.38, 0], r: [0.16, 0.15, 0.15], col: "skin", k: 0.08 },
      { t: "cap", a: [0.38, 0.34, 0], b: [0.56, 0.28, 0], r: [0.1, 0.05], col: "skin", k: 0.06 },
      { t: "ell", c: [0.575, 0.285, 0], r: [0.03, 0.03, 0.035], col: "dark", k: 0.01 },
      { t: "ell", c: [0.3, 0.5, 0], r: [0.13, 0.06, 0.13], col: "main", k: 0.015, rot: [0, 0, -10] },
      { t: "cap", a: [0.38, 0.52, 0], b: [0.48, 0.82, 0], r: [0.05, 0.01], col: "rock", k: 0.02 },
      { t: "ell", c: [0.22, 0.55, 0.12], r: [0.035, 0.07, 0.03], col: "skin", mirror: true, k: 0.03, rot: [-20, 0, 15] },
      { t: "cap", a: [-0.42, 0.32, 0], b: [-0.58, 0.08, 0], r: [0.06, 0.025], col: "main", k: 0.05 },
      { t: "box", c: [-0.5, 0.2, 0], s: [0.012, 0.1, 0.1], round: 0, col: "seam", paint: true, rot: [0, 0, -35] },
    ],
    eyes: [{ at: [0.4, 0.42, 0.07], r: 0.08, iris: "#e83aa8", mirror: true, look: [0.7, 0.06, 0.7] }],
  },
  // Avanzado: a plated rhino, riveted shoulder guard and twin horns.
  rinoblindo: {
    palette: earth,
    glow: ["glow"],
    shapes: [
      { t: "ell", c: [-0.1, 0.46, 0], r: [0.36, 0.22, 0.24], col: "skin" },
      // Saddle bands and the shoulder guard
      { t: "ell", c: [-0.2, 0.52, 0], r: [0.25, 0.18, 0.26], col: "main", k: 0.015 },
      seamX(-0.36, 0.56, 0.2), seamX(-0.26, 0.58, 0.2), seamX(-0.16, 0.6, 0.2), seamX(-0.06, 0.6, 0.2),
      { t: "ell", c: [0.08, 0.54, 0], r: [0.17, 0.19, 0.28], col: "main", k: 0.015 },
      crack([0.1, 0.5, 0], 0.08, -10), crack([-0.3, 0.52, 0], 0.07, 8),
      // Legs with knee plates
      { t: "cap", a: [0.12, 0.32, 0.15], b: [0.13, 0.04, 0.16], r: [0.075, 0.085], col: "skin", mirror: true, k: 0.04 },
      { t: "cap", a: [-0.3, 0.32, 0.15], b: [-0.31, 0.04, 0.16], r: [0.075, 0.085], col: "skin", mirror: true, k: 0.04 },
      { t: "ell", c: [0.13, 0.22, 0.17], r: [0.09, 0.055, 0.085], col: "main", mirror: true, k: 0.015 },
      { t: "ell", c: [-0.3, 0.22, 0.17], r: [0.09, 0.055, 0.085], col: "main", mirror: true, k: 0.015 },
      // Tail with a tuft
      { t: "cap", a: [-0.44, 0.5, 0], b: [-0.52, 0.34, 0], r: [0.03, 0.022], col: "skin", k: 0.03 },
      { t: "ell", c: [-0.53, 0.3, 0], r: [0.035, 0.05, 0.035], col: "main", k: 0.03 },
      // Head: long and low, helmeted, big nose horn
      { t: "ell", c: [0.32, 0.46, 0], r: [0.16, 0.13, 0.13], col: "skin", k: 0.07 },
      { t: "ell", c: [0.46, 0.38, 0], r: [0.1, 0.09, 0.1], col: "skin", k: 0.06 },
      { t: "ell", c: [0.3, 0.56, 0], r: [0.14, 0.06, 0.13], col: "main", k: 0.015, rot: [0, 0, -12] },
      { t: "ell", c: [0.22, 0.62, 0.1], r: [0.03, 0.06, 0.025], col: "skin", mirror: true, k: 0.03, rot: [-20, 0, 10] },
      { t: "cap", a: [0.48, 0.44, 0], b: [0.56, 0.84, 0], r: [0.065, 0.012], col: "rock", k: 0.02 },
      { t: "cap", a: [0.38, 0.58, 0], b: [0.42, 0.72, 0], r: [0.035, 0.01], col: "rock", k: 0.02 },
      { t: "ell", c: [0.555, 0.37, 0], r: [0.03, 0.03, 0.04], col: "dark", k: 0.01 },
    ],
    eyes: [{ at: [0.38, 0.48, 0.08], r: 0.07, iris: "#e83aa8", mirror: true, angry: true }],
  },
  // Élite: a hunched quake beast, boulders and crystals on its hump, huge stomping feet.
  terremotor: {
    palette: earth,
    glow: ["glow"],
    shapes: [
      { t: "ell", c: [-0.12, 0.44, 0], r: [0.36, 0.24, 0.27], col: "main" },
      { t: "ell", c: [0.06, 0.56, 0], r: [0.25, 0.25, 0.28], col: "main", k: 0.1 },
      seamX(-0.36, 0.48, 0.3), seamX(-0.22, 0.5, 0.36), seamX(-0.08, 0.5, 0.4), seamX(0.06, 0.5, 0.4),
      crack([-0.28, 0.4, 0], 0.09, -8), crack([-0.05, 0.48, 0], 0.1, 10),
      // Boulders and crystals on the hump
      { t: "box", c: [-0.26, 0.66, 0], s: [0.12, 0.07, 0.15], round: 0.05, col: "rock", k: 0.02, rot: [0, 10, 12] },
      { t: "box", c: [0.04, 0.8, 0], s: [0.13, 0.09, 0.16], round: 0.06, col: "rock", k: 0.02, rot: [0, -8, -6] },
      { t: "cap", a: [-0.14, 0.7, 0.08], b: [-0.2, 0.98, 0.1], r: [0.055, 0.01], col: "crystal", k: 0.02 },
      { t: "cap", a: [-0.08, 0.72, -0.08], b: [-0.08, 0.9, -0.1], r: [0.04, 0.01], col: "crystal", k: 0.02 },
      { t: "cap", a: [0.14, 0.82, 0.04], b: [0.22, 0.98, 0.06], r: [0.04, 0.01], col: "crystal", k: 0.02 },
      { t: "ell", c: [-0.2, 0.96, 0.1], r: [0.03, 0.05, 0.03], col: "glow", paint: true },
      { t: "ell", c: [0.21, 0.96, 0.06], r: [0.03, 0.04, 0.03], col: "glow", paint: true },
      // Pillar legs, stone anklets
      { t: "cap", a: [0.16, 0.36, 0.17], b: [0.17, 0.05, 0.18], r: [0.09, 0.11], col: "skin", mirror: true, k: 0.04 },
      { t: "cap", a: [-0.28, 0.32, 0.16], b: [-0.29, 0.05, 0.17], r: [0.085, 0.1], col: "skin", mirror: true, k: 0.04 },
      { t: "ell", c: [0.17, 0.3, 0.2], r: [0.12, 0.07, 0.11], col: "main", mirror: true, k: 0.015 },
      { t: "ell", c: [-0.28, 0.26, 0.19], r: [0.11, 0.07, 0.1], col: "main", mirror: true, k: 0.015 },
      { t: "tor", c: [0.17, 0.09, 0.18], R: 0.1, r: 0.025, col: "rock", mirror: true, k: 0.01 },
      { t: "tor", c: [-0.29, 0.09, 0.17], R: 0.095, r: 0.025, col: "rock", mirror: true, k: 0.01 },
      // Tail
      { t: "cap", a: [-0.44, 0.38, 0], b: [-0.58, 0.24, 0], r: [0.07, 0.03], col: "main", k: 0.05 },
      // Head with brow plate, horn and tusks
      { t: "ell", c: [0.34, 0.5, 0], r: [0.16, 0.14, 0.14], col: "skin", k: 0.07 },
      { t: "ell", c: [0.48, 0.42, 0], r: [0.1, 0.09, 0.1], col: "skin", k: 0.06 },
      { t: "ell", c: [0.32, 0.62, 0], r: [0.15, 0.065, 0.14], col: "main", k: 0.015, rot: [0, 0, -14] },
      { t: "cap", a: [0.5, 0.48, 0], b: [0.58, 0.9, 0], r: [0.065, 0.012], col: "rock", k: 0.02 },
      { t: "cap", a: [0.4, 0.64, 0], b: [0.44, 0.8, 0], r: [0.04, 0.01], col: "rock", k: 0.02 },
      { t: "cap", a: [0.48, 0.37, 0.07], b: [0.56, 0.32, 0.1], r: [0.03, 0.012], col: "snow", mirror: true, k: 0.02 },
      { t: "ell", c: [0.575, 0.41, 0], r: [0.03, 0.03, 0.04], col: "dark", k: 0.01 },
    ],
    eyes: [{ at: [0.4, 0.52, 0.08], r: 0.07, iris: "#e83aa8", mirror: true, angry: true }],
  },
  // Supremo: a walking mountain with magma rivers and crystal slopes.
  "coloso-telurico": coloso(false),
  // Despertar: obsidian and magma, holding floating tectonic plates like shields.
  "coloso-telurico-placa-tectonica": coloso(true),

  // Brote: a round drone with a rotor, a visor and a thruster.
  bip: {
    palette: metal,
    glow: ["glow"],
    shapes: [
      { t: "ell", c: [0, 0.5, 0], r: [0.34, 0.31, 0.33], col: "main" },
      { t: "ell", c: [0.2, 0.55, 0], r: [0.2, 0.14, 0.3], col: "dark", paint: true },
      { t: "box", c: [0, 0.36, 0], s: [0.5, 0.02, 0.5], round: 0, col: "brass", paint: true },
      { t: "cap", a: [0, 0.26, 0], b: [0, 0.14, 0], r: [0.13, 0.07], col: "dark", k: 0.03 },
      { t: "cap", a: [0, 0.12, 0], b: [0, 0.0, 0], r: [0.065, 0.012], col: "glow", k: 0.0 },
      // Rotor
      { t: "cap", a: [0, 0.78, 0], b: [0, 0.92, 0], r: [0.025, 0.025], col: "dark", k: 0.02 },
      { t: "ell", c: [0, 0.93, 0], r: [0.05, 0.03, 0.05], col: "brass", k: 0.01 },
      { t: "box", c: [0, 0.93, 0], s: [0.32, 0.014, 0.04], round: 0.012, col: "steel", k: 0.01, rot: [0, 20, 0] },
      { t: "box", c: [0, 0.93, 0], s: [0.32, 0.014, 0.04], round: 0.012, col: "steel", k: 0.01, rot: [0, 110, 0] },
      // Antenna
      { t: "cap", a: [0.16, 0.76, 0.06], b: [0.26, 0.9, 0.1], r: [0.015, 0.012], col: "steel", k: 0.02 },
      { t: "ell", c: [0.27, 0.92, 0.1], r: [0.035, 0.035, 0.035], col: "glow", k: 0.01 },
      // Side gears as ears
      { t: "tor", c: [-0.02, 0.5, 0.33], R: 0.06, r: 0.025, col: "brass", rot: [90, 0, 0], k: 0.02, mirror: true },
      { t: "ell", c: [-0.02, 0.5, 0.34], r: [0.035, 0.035, 0.03], col: "dark", k: 0.01, mirror: true },
      ...[0, 60, 120].map((a): Shape => ({ t: "box", c: [-0.02, 0.5, 0.33], s: [0.1, 0.025, 0.02], round: 0.01, col: "brass", mirror: true, k: 0.01, rot: [0, 0, a] })),
      // Rivets on the belt
      { t: "ell", c: [0.3, 0.35, 0.1], r: [0.02, 0.02, 0.02], col: "steel", k: 0.005, mirror: true },
    ],
    eyes: [{ at: [0.2, 0.56, 0.11], r: 0.11, iris: "#14c8f0", mirror: true }],
  },
  // Novato: a little repair robot, a nut on its chest and a wrench in hand.
  tuerkin: {
    palette: metal,
    glow: ["glow"],
    shapes: [
      // Legs and brass feet
      { t: "box", c: [0.0, 0.1, 0.08], s: [0.05, 0.08, 0.045], round: 0.025, col: "dark", mirror: true, k: 0.02 },
      { t: "ell", c: [0.04, 0.03, 0.08], r: [0.09, 0.035, 0.06], col: "brass", mirror: true, k: 0.02 },
      // Body with a brass belt and a chest nut
      { t: "box", c: [0.0, 0.3, 0], s: [0.14, 0.14, 0.15], round: 0.07, col: "main", k: 0.03 },
      { t: "box", c: [0, 0.2, 0], s: [0.3, 0.02, 0.3], round: 0, col: "brass", paint: true },
      { t: "tor", c: [0.14, 0.32, 0], R: 0.05, r: 0.022, col: "brass", rot: [0, 0, 90], k: 0.01 },
      { t: "ell", c: [0.14, 0.32, 0], r: [0.03, 0.03, 0.03], col: "dark", k: 0.0 },
      // Arms; the near one holds a wrench
      { t: "cap", a: [0.02, 0.38, 0.15], b: [0.12, 0.26, 0.2], r: [0.035, 0.03], col: "main", mirror: true, k: 0.03 },
      { t: "ell", c: [0.14, 0.24, 0.21], r: [0.04, 0.04, 0.04], col: "brass", mirror: true, k: 0.02 },
      { t: "cap", a: [0.12, 0.2, 0.24], b: [0.3, 0.46, 0.24], r: [0.022, 0.022], col: "steel", k: 0.01 },
      { t: "tor", c: [0.32, 0.5, 0.24], R: 0.045, r: 0.022, col: "steel", rot: [90, 0, 0], k: 0.01 },
      { t: "box", c: [0.35, 0.54, 0.24], s: [0.03, 0.03, 0.05], round: 0, col: "steel", cut: true, rot: [0, 0, 35] },
      // Big head with visor, ear gears and antenna
      { t: "box", c: [0.04, 0.66, 0], s: [0.24, 0.18, 0.21], round: 0.13, col: "main", k: 0.05 },
      { t: "ell", c: [0.24, 0.66, 0], r: [0.12, 0.1, 0.18], col: "dark", paint: true },
      { t: "tor", c: [-0.06, 0.66, 0.21], R: 0.06, r: 0.022, col: "brass", rot: [90, 0, 0], k: 0.02, mirror: true },
      { t: "ell", c: [-0.06, 0.66, 0.22], r: [0.03, 0.03, 0.03], col: "dark", k: 0.01, mirror: true },
      { t: "cap", a: [-0.04, 0.82, 0], b: [-0.08, 0.96, 0], r: [0.015, 0.012], col: "steel", k: 0.02 },
      { t: "ell", c: [-0.085, 0.98, 0], r: [0.035, 0.035, 0.035], col: "glow", k: 0.01 },
      { t: "ell", c: [0.08, 0.84, 0.08], r: [0.02, 0.02, 0.02], col: "steel", k: 0.005, mirror: true },
    ],
    eyes: [{ at: [0.24, 0.67, 0.09], r: 0.09, iris: "#14c8f0", mirror: true }],
  },
  // Avanzado: a stocky robot with a giant thinking gear on its back.
  engranajon: {
    palette: metal,
    glow: ["glow"],
    shapes: [
      ...gear([-0.2, 0.64, -0.02], 0.22, 10, "brass", "dark", 6),
      { t: "ell", c: [-0.2, 0.64, 0.04], r: [0.045, 0.045, 0.04], col: "glow", k: 0 },
      // Legs and feet
      { t: "box", c: [0.02, 0.12, 0.09], s: [0.06, 0.09, 0.055], round: 0.03, col: "dark", mirror: true, k: 0.02 },
      { t: "ell", c: [0.05, 0.03, 0.09], r: [0.1, 0.035, 0.07], col: "main", mirror: true, k: 0.02 },
      // Body with a data slot
      { t: "box", c: [0.02, 0.36, 0], s: [0.17, 0.16, 0.17], round: 0.08, col: "main", k: 0.03 },
      { t: "box", c: [0, 0.23, 0], s: [0.3, 0.02, 0.3], round: 0, col: "brass", paint: true },
      { t: "box", c: [0.19, 0.34, 0], s: [0.04, 0.045, 0.1], round: 0.01, col: "dark", paint: true },
      { t: "box", c: [0.19, 0.35, 0], s: [0.05, 0.01, 0.07], round: 0, col: "glow", paint: true },
      // Arms with claw hands
      { t: "ell", c: [0.06, 0.48, 0.18], r: [0.06, 0.06, 0.06], col: "brass", mirror: true, k: 0.02 },
      { t: "cap", a: [0.08, 0.46, 0.2], b: [0.22, 0.34, 0.22], r: [0.04, 0.035], col: "main", mirror: true, k: 0.03 },
      { t: "ell", c: [0.24, 0.32, 0.22], r: [0.045, 0.045, 0.045], col: "brass", mirror: true, k: 0.02 },
      { t: "cap", a: [0.26, 0.32, 0.22], b: [0.34, 0.36, 0.22], r: [0.018, 0.006], col: "steel", mirror: true, k: 0.01 },
      { t: "cap", a: [0.26, 0.3, 0.22], b: [0.33, 0.25, 0.22], r: [0.018, 0.006], col: "steel", mirror: true, k: 0.01 },
      // Head with visor and twin antennae
      { t: "box", c: [0.1, 0.66, 0], s: [0.22, 0.14, 0.18], round: 0.11, col: "main", k: 0.05 },
      { t: "ell", c: [0.26, 0.67, 0], r: [0.12, 0.08, 0.16], col: "dark", paint: true },
      { t: "cap", a: [0.04, 0.78, 0.07], b: [0.0, 0.92, 0.1], r: [0.014, 0.012], col: "steel", mirror: true, k: 0.02 },
      { t: "ell", c: [0.0, 0.94, 0.1], r: [0.03, 0.03, 0.03], col: "glow", mirror: true, k: 0.01 },
    ],
    eyes: [{ at: [0.26, 0.68, 0.08], r: 0.085, iris: "#14c8f0", mirror: true }],
  },
  // Élite: an android of salvaged plates, with piston fists.
  androforja: {
    palette: metal,
    glow: ["glow"],
    shapes: [
      // Legs with knee pistons
      { t: "box", c: [0.0, 0.3, 0.09], s: [0.07, 0.09, 0.065], round: 0.04, col: "main", mirror: true, k: 0.02 },
      { t: "box", c: [0.02, 0.12, 0.09], s: [0.065, 0.1, 0.06], round: 0.035, col: "dark", mirror: true, k: 0.02 },
      { t: "ell", c: [0.06, 0.22, 0.1], r: [0.045, 0.04, 0.045], col: "brass", mirror: true, k: 0.01 },
      { t: "ell", c: [0.06, 0.025, 0.09], r: [0.12, 0.03, 0.07], col: "main", mirror: true, k: 0.02 },
      // Abdomen and torso, brass chest plate
      { t: "box", c: [0.0, 0.43, 0], s: [0.09, 0.06, 0.1], round: 0.04, col: "dark", k: 0.02 },
      { t: "box", c: [0.0, 0.6, 0], s: [0.15, 0.13, 0.17], round: 0.09, col: "main", k: 0.04 },
      { t: "box", c: [0.13, 0.62, 0], s: [0.04, 0.08, 0.1], round: 0.03, col: "brass", k: 0.01, rot: [0, 0, -10] },
      { t: "ell", c: [0.17, 0.66, 0.06], r: [0.015, 0.015, 0.015], col: "steel", k: 0.005, mirror: true },
      { t: "box", c: [0.0, 0.5, 0], s: [0.3, 0.012, 0.3], round: 0, col: "glow", paint: true },
      // Shoulders, piston forearms and heavy fists
      { t: "ell", c: [0.0, 0.68, 0.2], r: [0.09, 0.08, 0.08], col: "brass", mirror: true, k: 0.02 },
      { t: "cap", a: [0.02, 0.62, 0.22], b: [0.1, 0.5, 0.24], r: [0.035, 0.03], col: "dark", mirror: true, k: 0.02 },
      { t: "box", c: [0.18, 0.5, 0.24], s: [0.08, 0.05, 0.05], round: 0.03, col: "main", mirror: true, k: 0.02 },
      { t: "cap", a: [0.24, 0.5, 0.24], b: [0.3, 0.5, 0.24], r: [0.02, 0.02], col: "steel", mirror: true, k: 0.01 },
      { t: "box", c: [0.36, 0.5, 0.24], s: [0.06, 0.07, 0.065], round: 0.035, col: "brass", mirror: true, k: 0.01 },
      { t: "box", c: [0.42, 0.5, 0.24], s: [0.01, 0.05, 0.07], round: 0, col: "dark", paint: true, mirror: true },
      // Head: helmet, swept crest, visor, jaw grill
      { t: "ell", c: [0.08, 0.84, 0], r: [0.13, 0.1, 0.1], col: "main", k: 0.04 },
      { t: "ell", c: [0.17, 0.85, 0], r: [0.07, 0.035, 0.09], col: "dark", paint: true },
      { t: "box", c: [0.15, 0.76, 0], s: [0.05, 0.035, 0.06], round: 0.02, col: "brass", k: 0.02 },
      { t: "box", c: [0.2, 0.76, 0], s: [0.012, 0.025, 0.07], round: 0, col: "dark", paint: true },
      { t: "cap", a: [0.0, 0.92, 0], b: [-0.18, 0.98, 0], r: [0.04, 0.008], col: "steel", k: 0.02 },
      { t: "ell", c: [0.04, 0.88, 0.1], r: [0.02, 0.02, 0.02], col: "steel", k: 0.005, mirror: true },
    ],
    eyes: [{ at: [0.14, 0.86, 0.05], r: 0.06, iris: "#14c8f0", mirror: true, angry: true }],
  },
  // Supremo: a perfect machine with a gear halo and a calculating core.
  "deus-maquina": deus(false),
  // Despertar: overheated, venting steam, running past its limits.
  "deus-maquina-overclock": deus(true),
};

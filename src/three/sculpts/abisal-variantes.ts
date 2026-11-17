import type { Sculpt, Shape, V3 } from "../sculpt";

// Abisal line (axolotl → deep sea → ice leviathan), the alternate Élite forms and the four fusions.

const lerp = (a: V3, b: V3, t: number): V3 => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];

/**
 * An axolotl gill frond on both sides of the head: a stalk with little feathery tufts on its
 * edges and a round tip (tufts = how many side bobbles; 0 for a plain frond).
 */
function frond(a: V3, b: V3, r: number, col: string, tufts = 2, tip?: string): Shape[] {
  const d: V3 = [b[0] - a[0], b[1] - a[1], b[2] - a[2]];
  // Perpendicular in the y-z plane, so the tufts show as a frilly edge.
  const l = Math.hypot(d[2], d[1]) || 1;
  const n: V3 = [0, d[2] / l, -d[1] / l];
  const out: Shape[] = [
    { t: "cap", a, b, r: [r, r * 0.8], col, mirror: true, k: 0.03 },
    { t: "ell", c: b, r: [r * 1.25, r * 1.25, r * 1.25], col: tip ?? col, mirror: true, k: 0.02 },
  ];
  const ts = tufts === 1 ? [0.55] : [0.4, 0.72];
  if (tufts > 0) ts.forEach((t, i) => {
    const s = i % 2 === 0 ? 1 : -1, m = lerp(a, b, t);
    out.push({ t: "ell", c: [m[0] + n[0] * r * s, m[1] + n[1] * r * s, m[2] + n[2] * r * s], r: [r * 0.95, r * 0.95, r * 0.95], col, mirror: true, k: 0.025 });
  });
  return out;
}

/** A pointed crystal or spike. */
const spike = (a: V3, b: V3, r: number, col: string, mirror = false, k = 0.015): Shape => ({ t: "cap", a, b, r: [r, 0.006], col, mirror, k });

/** A chain of capsules through points (tails, coiled bodies). */
function chain(pts: V3[], rs: number[], col: string, k = 0.05): Shape[] {
  const out: Shape[] = [];
  for (let i = 0; i < pts.length - 1; i++) out.push({ t: "cap", a: pts[i], b: pts[i + 1], r: [rs[i], rs[i + 1]], col, k });
  return out;
}

// MARK: Palettes

const shallow = { body: "#5eaee0", belly: "#f6dcc0", gill: "#ec7a9c", cheek: "#ffaac0", dark: "#22407a", shine: "#dcf6ff", mouth: "#c84a78", glow: "#ffc24a", wave: "#3a74b8" };
const deep = { body: "#30509a", belly: "#94a6d8", spine: "#9a52b4", dark: "#0e1634", fang: "#eef2ff", glow: "#ffc04a", gill: "#b06ac4" };

/** Ice leviathan (Supremo) and its Despertar: a serpent coiled upright, crystal gill crown. */
function leviathan(awake: boolean): Sculpt {
  const pal = awake
    ? { body: "#9c92e2", belly: "#e8f0ff", crystal: "#a6f2ff", fin: "#52ccf0", dark: "#3c307c", glow: "#ffe27a", ring: "#52ccf0", frost: "#ffffff" }
    : { body: "#64a2da", belly: "#dff2ff", crystal: "#c2d2ff", fin: "#8698e4", dark: "#2c4480", glow: "#ffcc5a", ring: "#52ccf0", frost: "#f4fcff" };
  const pts: V3[] = [[-0.46, 0.44, -0.12], [-0.42, 0.2, -0.08], [-0.24, 0.08, -0.02], [0, 0.1, 0.03], [0.12, 0.26, 0.03], [0.07, 0.46, 0], [0.11, 0.62, 0], [0.2, 0.74, 0]];
  const shapes: Shape[] = [
    ...chain(pts, [0.045, 0.09, 0.125, 0.135, 0.13, 0.115, 0.1, 0.085], "body", 0.07),
    // Head with a long snout and a pale jaw.
    { t: "ell", c: [0.3, 0.81, 0], r: [0.17, 0.12, 0.13], col: "body", rot: [0, 0, -8], k: 0.08 },
    { t: "ell", c: [0.45, 0.77, 0], r: [0.13, 0.07, 0.09], col: "body", k: 0.06 },
    { t: "ell", c: [0.42, 0.72, 0], r: [0.16, 0.04, 0.1], col: "belly", paint: true },
    { t: "cap", a: [0.36, 0.745, 0.08], b: [0.56, 0.75, 0.03], r: [0.012, 0.012], col: "dark", paint: true, mirror: true },
    // Belly scutes along the neck and the coil.
    { t: "cap", a: [0.2, 0.24, 0.02], b: [0.22, 0.66, 0.02], r: [0.085, 0.07], col: "belly", paint: true },
    { t: "cap", a: [-0.34, 0.02, 0.06], b: [0.06, 0.0, 0.08], r: [0.1, 0.1], col: "belly", paint: true },
    // Glowing scale seams.
    { t: "cap", a: [-0.36, 0.2, 0.08], b: [-0.2, 0.18, 0.12], r: [0.014, 0.014], col: "glow", paint: true },
    { t: "cap", a: [0.06, 0.3, 0.15], b: [0.04, 0.42, 0.12], r: [0.014, 0.014], col: "glow", paint: true },
    // Crystal tail fluke.
    spike([-0.46, 0.42, -0.12], [-0.56, 0.64, -0.14], 0.05, "fin"),
    spike([-0.46, 0.42, -0.12], [-0.32, 0.6, -0.1], 0.045, "fin"),
    // Back crystals.
    spike([-0.36, 0.26, -0.08], [-0.48, 0.32, -0.1], 0.035, "crystal"),
    spike([-0.04, 0.42, 0], [-0.18, 0.48, 0], 0.045, "crystal"),
    spike([-0.01, 0.56, 0], [-0.15, 0.64, 0], 0.045, "crystal"),
    spike([0.05, 0.68, 0], [-0.06, 0.8, 0], 0.04, "crystal"),
    // Flippers.
    { t: "ell", c: [0.22, 0.34, 0.14], r: [0.15, 0.05, 0.035], col: "fin", rot: [20, 0, -30], mirror: true, k: 0.03 },
    // Gill crown turned to ice, with glowing tips.
    spike([0.2, 0.86, 0.07], [0.18, 1.08, 0.12], 0.04, "crystal", true),
    spike([0.18, 0.84, 0.08], [0.02, 1.0, 0.16], 0.04, "crystal", true),
    spike([0.18, 0.8, 0.08], [0.0, 0.84, 0.18], 0.038, "crystal", true),
    { t: "ell", c: [0.185, 1.04, 0.115], r: [0.022, 0.022, 0.022], col: "glow", paint: true, mirror: true },
    { t: "ell", c: [0.05, 0.97, 0.15], r: [0.022, 0.022, 0.022], col: "glow", paint: true, mirror: true },
  ];
  if (!awake) {
    // Frozen packets in its breath.
    shapes.push({ t: "box", c: [0.66, 0.66, 0.08], s: [0.03, 0.03, 0.03], round: 0.006, col: "frost", rot: [30, 0, 45] });
    shapes.push({ t: "box", c: [0.6, 0.56, 0.12], s: [0.024, 0.024, 0.024], round: 0.006, col: "frost", rot: [10, 30, 45] });
  } else {
    // A stopped clock of ice behind it, a crystal crown and orbiting shards.
    shapes.push(
      { t: "tor", c: [-0.12, 0.54, -0.26], R: 0.44, r: 0.03, col: "ring", rot: [90, 0, 0], k: 0 },
      { t: "cap", a: [-0.12, 0.54, -0.26], b: [-0.12, 0.84, -0.26], r: [0.025, 0.015], col: "dark", k: 0.02 },
      { t: "cap", a: [-0.12, 0.54, -0.26], b: [-0.3, 0.66, -0.26], r: [0.025, 0.015], col: "dark", k: 0.02 },
      spike([0.3, 0.9, 0], [0.36, 1.12, 0], 0.04, "frost"),
      spike([0.26, 0.9, 0], [0.22, 1.1, 0], 0.035, "frost"),
      { t: "box", c: [-0.5, 0.96, 0.1], s: [0.03, 0.05, 0.03], round: 0.008, col: "crystal", rot: [0, 0, 30] },
      { t: "box", c: [0.56, 0.4, 0.14], s: [0.025, 0.045, 0.025], round: 0.008, col: "crystal", rot: [0, 0, -20] },
    );
  }
  return {
    palette: pal,
    glow: awake ? ["glow", "ring"] : ["glow"],
    shapes,
    eyes: [{ at: [0.33, 0.86, 0.075], r: 0.075, iris: awake ? "#ff5ad0" : "#ffb43a", mirror: true, angry: true, look: [0.55, 0.08, 0.83] }],
  };
}

export const abisalVariantes: Record<string, Sculpt> = {
  // Brote: a round blue bubble with a face, frilly pink gill tufts and a baby bubble.
  burbuja: {
    palette: shallow,
    glow: ["glow"],
    shapes: [
      { t: "ell", c: [0, 0.42, 0], r: [0.4, 0.4, 0.38], col: "body" },
      { t: "ell", c: [0.16, 0.2, 0], r: [0.3, 0.16, 0.3], col: "belly", paint: true },
      { t: "ell", c: [0.14, 0.04, 0.15], r: [0.09, 0.05, 0.08], col: "body", mirror: true, k: 0.06 },
      ...frond([-0.04, 0.66, 0.26], [-0.1, 0.92, 0.42], 0.035, "gill"),
      ...frond([-0.06, 0.54, 0.32], [-0.12, 0.64, 0.58], 0.035, "gill"),
      ...frond([-0.06, 0.4, 0.33], [-0.12, 0.36, 0.58], 0.032, "gill"),
      { t: "ell", c: [0.12, 0.74, 0.18], r: [0.14, 0.05, 0.08], col: "shine", paint: true, rot: [0, 30, 25] },
      { t: "ell", c: [0.33, 0.37, 0.22], r: [0.05, 0.03, 0.05], col: "cheek", paint: true, mirror: true },
      { t: "ell", c: [0.4, 0.32, 0], r: [0.04, 0.04, 0.065], col: "dark", paint: true },
      { t: "ell", c: [0.4, 0.29, 0], r: [0.04, 0.02, 0.035], col: "mouth", paint: true },
      { t: "tor", c: [0.32, 0.98, 0.22], R: 0.05, r: 0.018, col: "shine", rot: [90, 0, 0], k: 0 },
    ],
    eyes: [{ at: [0.3, 0.5, 0.13], r: 0.14, iris: "#ffa82a", mirror: true }],
  },

  // Novato: a cheerful upright axolotl, frilly gills fanning from the back of its head, waving.
  ajolin: {
    palette: shallow,
    glow: ["glow"],
    shapes: [
      { t: "ell", c: [0, 0.32, 0], r: [0.19, 0.24, 0.18], col: "body" },
      { t: "ell", c: [0.1, 0.3, 0], r: [0.13, 0.19, 0.17], col: "belly", paint: true },
      { t: "cap", a: [0.04, 0.14, 0.1], b: [0.08, 0.04, 0.12], r: [0.07, 0.065], col: "body", mirror: true, k: 0.05 },
      { t: "ell", c: [0.13, 0.03, 0.12], r: [0.1, 0.035, 0.075], col: "body", mirror: true, k: 0.03 },
      { t: "cap", a: [0.08, 0.42, 0.14], b: [0.26, 0.52, 0.22], r: [0.05, 0.042], col: "body", k: 0.05 },
      { t: "ell", c: [0.28, 0.53, 0.22], r: [0.05, 0.045, 0.045], col: "body", k: 0.02 },
      { t: "cap", a: [0.06, 0.4, -0.14], b: [0.18, 0.28, -0.2], r: [0.05, 0.042], col: "body", k: 0.05 },
      // Wide flat head.
      { t: "ell", c: [0.12, 0.7, 0], r: [0.3, 0.21, 0.27], col: "body", k: 0.08 },
      { t: "cap", a: [0.33, 0.63, 0.14], b: [0.41, 0.615, 0], r: [0.013, 0.013], col: "dark", paint: true, mirror: true },
      { t: "ell", c: [0.32, 0.67, 0.19], r: [0.045, 0.03, 0.045], col: "cheek", paint: true, mirror: true },
      // Gills: three frilly fronds per side, fanning up and back from behind the cheeks.
      ...frond([0.02, 0.82, 0.19], [-0.06, 1.04, 0.28], 0.032, "gill"),
      ...frond([-0.03, 0.75, 0.22], [-0.24, 0.9, 0.32], 0.032, "gill", 1),
      ...frond([-0.04, 0.66, 0.21], [-0.26, 0.66, 0.3], 0.03, "gill", 1),
      // Tail with a pink fin.
      { t: "cap", a: [-0.14, 0.26, 0], b: [-0.34, 0.16, 0], r: [0.11, 0.06], col: "body", k: 0.06 },
      { t: "cap", a: [-0.34, 0.16, 0], b: [-0.5, 0.22, 0], r: [0.06, 0.025], col: "body", k: 0.04 },
      { t: "ell", c: [-0.36, 0.2, 0], r: [0.2, 0.1, 0.03], col: "gill", rot: [0, 0, -12], k: 0.04 },
      // A bubble and a spark.
      { t: "tor", c: [0.46, 0.4, 0.22], R: 0.06, r: 0.02, col: "shine", rot: [90, 0, 0], k: 0 },
      { t: "ell", c: [0.44, 1.0, 0.12], r: [0.03, 0.03, 0.03], col: "glow", k: 0 },
    ],
    eyes: [{ at: [0.3, 0.76, 0.12], r: 0.1, iris: "#ffa82a", mirror: true }],
  },

  // Avanzado: a four-legged axolotl riding a curling wave of data.
  marealote: {
    palette: shallow,
    glow: ["glow"],
    shapes: [
      { t: "ell", c: [-0.02, 0.4, 0], r: [0.32, 0.19, 0.21], col: "body" },
      { t: "ell", c: [0.04, 0.28, 0], r: [0.3, 0.1, 0.2], col: "belly", paint: true },
      { t: "cap", a: [0.18, 0.34, 0.13], b: [0.22, 0.07, 0.15], r: [0.08, 0.085], col: "body", mirror: true, k: 0.05 },
      { t: "cap", a: [-0.2, 0.34, 0.13], b: [-0.18, 0.07, 0.15], r: [0.085, 0.085], col: "body", mirror: true, k: 0.05 },
      { t: "ell", c: [0.34, 0.62, 0], r: [0.27, 0.22, 0.24], col: "body", k: 0.1 },
      { t: "cap", a: [0.5, 0.53, 0.12], b: [0.57, 0.52, 0], r: [0.012, 0.012], col: "dark", paint: true, mirror: true },
      { t: "ell", c: [0.5, 0.57, 0.16], r: [0.04, 0.026, 0.04], col: "cheek", paint: true, mirror: true },
      { t: "ell", c: [-0.06, 0.6, 0], r: [0.24, 0.08, 0.03], col: "gill", k: 0.03 },
      ...frond([0.24, 0.72, 0.15], [0.16, 0.98, 0.26], 0.032, "gill", 1),
      ...frond([0.2, 0.66, 0.18], [-0.02, 0.82, 0.3], 0.032, "gill", 1),
      ...frond([0.2, 0.58, 0.18], [-0.02, 0.56, 0.3], 0.03, "gill", 0),
      { t: "cap", a: [-0.3, 0.42, 0], b: [-0.56, 0.5, 0], r: [0.11, 0.04], col: "body", k: 0.06 },
      { t: "ell", c: [-0.5, 0.5, 0], r: [0.17, 0.1, 0.03], col: "gill", rot: [0, 0, 10], k: 0.04 },
      ...[-0.16, 0.0, 0.14].map((x): Shape => ({ t: "ell", c: [x, 0.58, 0.08], r: [0.028, 0.028, 0.03], col: "glow", paint: true })),
      // The wave curling over its back.
      ...chain([[-0.62, 0.0, -0.24], [-0.68, 0.6, -0.24], [-0.46, 0.94, -0.24], [-0.14, 1.0, -0.24], [0.04, 0.86, -0.22]], [0.15, 0.12, 0.1, 0.07, 0.035], "wave", 0.06),
      { t: "cap", a: [-0.56, 0.12, -0.11], b: [-0.6, 0.56, -0.13], r: [0.018, 0.018], col: "glow", paint: true },
      { t: "cap", a: [-0.44, 0.88, -0.14], b: [-0.2, 0.94, -0.16], r: [0.016, 0.016], col: "glow", paint: true },
      { t: "ell", c: [-0.06, 1.0, -0.2], r: [0.045, 0.045, 0.045], col: "shine", k: 0.03 },
    ],
    eyes: [{ at: [0.46, 0.66, 0.1], r: 0.095, iris: "#ffa82a", mirror: true }],
  },

  // Élite: a heavy deep-sea axolotl with a glowing lure, fangs, photophores and ragged spines.
  abisalote: {
    palette: deep,
    glow: ["glow"],
    shapes: [
      { t: "ell", c: [-0.04, 0.42, 0], r: [0.34, 0.24, 0.24], col: "body" },
      { t: "ell", c: [0.04, 0.27, 0], r: [0.32, 0.12, 0.22], col: "belly", paint: true },
      { t: "cap", a: [0.18, 0.36, 0.15], b: [0.22, 0.07, 0.17], r: [0.1, 0.09], col: "body", mirror: true, k: 0.05 },
      { t: "cap", a: [-0.22, 0.36, 0.15], b: [-0.22, 0.07, 0.17], r: [0.105, 0.09], col: "body", mirror: true, k: 0.05 },
      { t: "ell", c: [0.28, 0.04, 0.17], r: [0.12, 0.045, 0.1], col: "body", mirror: true, k: 0.03 },
      { t: "ell", c: [-0.16, 0.04, 0.17], r: [0.12, 0.045, 0.1], col: "body", mirror: true, k: 0.03 },
      // Big head and heavy jaw with fangs.
      { t: "ell", c: [0.32, 0.66, 0], r: [0.28, 0.23, 0.26], col: "body", k: 0.1 },
      { t: "ell", c: [0.38, 0.5, 0], r: [0.22, 0.1, 0.2], col: "body", k: 0.06 },
      { t: "ell", c: [0.56, 0.54, 0], r: [0.06, 0.035, 0.17], col: "dark", paint: true },
      { t: "cap", a: [0.55, 0.57, 0.09], b: [0.57, 0.5, 0.1], r: [0.024, 0.004], col: "fang", mirror: true, k: 0.01 },
      { t: "cap", a: [0.54, 0.5, 0.14], b: [0.56, 0.56, 0.14], r: [0.02, 0.004], col: "fang", mirror: true, k: 0.01 },
      // The lure.
      ...chain([[0.28, 0.82, 0], [0.36, 1.0, 0], [0.56, 1.02, 0], [0.62, 0.92, 0]], [0.028, 0.022, 0.02, 0.018], "spine", 0.03),
      { t: "ell", c: [0.63, 0.87, 0], r: [0.05, 0.05, 0.05], col: "glow", k: 0.02 },
      // Ragged back spines.
      spike([0.06, 0.6, 0], [-0.02, 0.84, 0], 0.06, "spine"),
      spike([-0.1, 0.62, 0], [-0.2, 0.88, 0], 0.065, "spine"),
      spike([-0.26, 0.58, 0], [-0.38, 0.78, 0], 0.06, "spine"),
      // Photophores.
      { t: "ell", c: [-0.14, 0.46, 0.22], r: [0.028, 0.028, 0.04], col: "glow", paint: true, mirror: true },
      { t: "ell", c: [0.04, 0.48, 0.22], r: [0.028, 0.028, 0.04], col: "glow", paint: true, mirror: true },
      // Long gills trailing back with glowing tips.
      ...frond([0.16, 0.76, 0.17], [-0.06, 0.98, 0.26], 0.03, "gill", 0, "glow"),
      ...frond([0.12, 0.68, 0.2], [-0.16, 0.8, 0.32], 0.03, "gill", 0, "glow"),
      // Tail with a ragged fin.
      { t: "cap", a: [-0.34, 0.44, 0], b: [-0.62, 0.5, 0], r: [0.12, 0.05], col: "body", k: 0.06 },
      { t: "ell", c: [-0.56, 0.54, 0], r: [0.16, 0.15, 0.03], col: "spine", rot: [0, 0, 25], k: 0.04 },
    ],
    eyes: [{ at: [0.44, 0.72, 0.11], r: 0.085, iris: "#ffd060", mirror: true, angry: true }],
  },

  "leviatan-glacial": leviathan(false),
  "leviatan-glacial-cero-absoluto": leviathan(true),

  // Élite (forja): a burnt-out forge dragon of cracked charcoal rock, smoke and a dim chest furnace.
  escoria: {
    palette: { body: "#4a4250", belly: "#6c6272", plate: "#5c2a2c", wing: "#8e3c30", horn: "#968c98", lava: "#ff8a2a", ember: "#ffb43a", smoke: "#62565c", dark: "#1e1a24" },
    glow: ["lava", "ember"],
    shapes: [
      { t: "ell", c: [-0.04, 0.4, 0], r: [0.25, 0.3, 0.23], col: "body" },
      { t: "ell", c: [0.1, 0.36, 0], r: [0.16, 0.24, 0.18], col: "belly", paint: true },
      { t: "box", c: [0.16, 0.5, 0], s: [0.07, 0.13, 0.13], round: 0.05, col: "plate", k: 0.02 },
      { t: "ell", c: [0.225, 0.5, 0], r: [0.03, 0.06, 0.06], col: "ember", k: 0.01 },
      { t: "ell", c: [0.0, 0.2, 0.16], r: [0.18, 0.16, 0.1], col: "body", mirror: true, k: 0.06 },
      { t: "ell", c: [0.13, 0.04, 0.18], r: [0.15, 0.045, 0.08], col: "body", mirror: true, k: 0.04 },
      { t: "cap", a: [0.1, 0.54, 0.16], b: [0.24, 0.34, 0.2], r: [0.065, 0.05], col: "body", mirror: true, k: 0.04 },
      // Neck, head, a snapped horn.
      { t: "cap", a: [0.02, 0.6, 0], b: [0.14, 0.78, 0], r: [0.13, 0.1], col: "body", k: 0.08 },
      { t: "ell", c: [0.22, 0.85, 0], r: [0.18, 0.13, 0.14], col: "body", k: 0.07 },
      { t: "ell", c: [0.37, 0.8, 0], r: [0.12, 0.08, 0.1], col: "body", k: 0.06 },
      { t: "cap", a: [0.36, 0.76, 0.08], b: [0.47, 0.765, 0.03], r: [0.012, 0.012], col: "dark", paint: true, mirror: true },
      spike([0.12, 0.94, 0.07], [-0.02, 1.1, 0.1], 0.045, "horn"),
      { t: "cap", a: [0.12, 0.94, -0.07], b: [0.06, 1.01, -0.09], r: [0.045, 0.03], col: "horn", k: 0.015 },
      // Tattered wings of cooled lava.
      { t: "cap", a: [-0.1, 0.62, 0.14], b: [-0.3, 1.06, 0.28], r: [0.04, 0.02], col: "body", mirror: true, k: 0.04 },
      { t: "ell", c: [-0.24, 0.84, 0.22], r: [0.14, 0.3, 0.03], col: "wing", rot: [-30, 0, 32], mirror: true, k: 0.03 },
      // Tail ending in an ember.
      ...chain([[-0.2, 0.16, 0], [-0.46, 0.1, 0], [-0.56, 0.26, 0]], [0.1, 0.06, 0.04], "body", 0.05),
      { t: "ell", c: [-0.56, 0.3, 0], r: [0.05, 0.05, 0.05], col: "ember", k: 0.02 },
      // Lava cracks.
      { t: "cap", a: [-0.06, 0.62, 0.2], b: [0.0, 0.42, 0.22], r: [0.014, 0.014], col: "lava", paint: true, mirror: true },
      { t: "cap", a: [0.0, 0.42, 0.22], b: [-0.08, 0.26, 0.24], r: [0.014, 0.014], col: "lava", paint: true },
      { t: "cap", a: [0.18, 0.92, 0.12], b: [0.3, 0.86, 0.12], r: [0.012, 0.012], col: "lava", paint: true },
      { t: "cap", a: [-0.2, 0.74, 0.26], b: [-0.3, 0.96, 0.3], r: [0.014, 0.014], col: "lava", paint: true, mirror: true },
      // Smoke rising from its back.
      { t: "ell", c: [-0.22, 0.92, -0.04], r: [0.07, 0.07, 0.07], col: "smoke", k: 0.03 },
      { t: "ell", c: [-0.28, 1.04, -0.02], r: [0.06, 0.06, 0.06], col: "smoke", k: 0.03 },
    ],
    eyes: [{ at: [0.3, 0.89, 0.08], r: 0.072, iris: "#ffb43a", mirror: true, angry: true }],
  },

  // Élite (eco): a ninja hare crouched to spring, ears swept back with wrapped bells, flowing scarf.
  silencio: {
    palette: { body: "#a6c2ea", light: "#e2eeff", wrap: "#323f74", inner: "#4e5e9e", glow: "#8ee8ff" },
    glow: ["glow"],
    shapes: [
      { t: "ell", c: [-0.06, 0.3, 0], r: [0.24, 0.22, 0.19], col: "body", rot: [0, 0, 15] },
      { t: "ell", c: [0.07, 0.28, 0], r: [0.13, 0.18, 0.16], col: "light", paint: true },
      { t: "ell", c: [-0.12, 0.18, 0.14], r: [0.18, 0.15, 0.08], col: "body", mirror: true, k: 0.06 },
      { t: "ell", c: [0.03, 0.035, 0.15], r: [0.19, 0.04, 0.07], col: "body", mirror: true, k: 0.04 },
      { t: "cap", a: [0.12, 0.4, 0.12], b: [0.32, 0.5, 0.15], r: [0.05, 0.045], col: "body", k: 0.04 },
      { t: "ell", c: [0.35, 0.52, 0.15], r: [0.06, 0.055, 0.055], col: "wrap", k: 0.02 },
      { t: "cap", a: [0.12, 0.36, -0.12], b: [0.18, 0.08, -0.13], r: [0.05, 0.045], col: "body", k: 0.04 },
      { t: "ell", c: [-0.32, 0.24, 0], r: [0.08, 0.08, 0.08], col: "light", k: 0.04 },
      // Head with a face veil.
      { t: "ell", c: [0.18, 0.62, 0], r: [0.17, 0.16, 0.16], col: "body", k: 0.08 },
      { t: "ell", c: [0.33, 0.55, 0], r: [0.08, 0.065, 0.15], col: "wrap", paint: true },
      // Scarf around the neck, trailing back.
      { t: "tor", c: [0.08, 0.48, 0], R: 0.12, r: 0.04, col: "wrap", rot: [0, 0, -25], k: 0.02 },
      ...chain([[0.0, 0.5, 0.08], [-0.3, 0.62, 0.12], [-0.56, 0.58, 0.08]], [0.05, 0.035, 0.02], "wrap", 0.03),
      // Ears swept back, wrapped bells at the tips.
      { t: "cap", a: [0.12, 0.74, 0.08], b: [-0.12, 0.94, 0.12], r: [0.06, 0.035], col: "body", mirror: true, k: 0.05 },
      { t: "cap", a: [0.08, 0.79, 0.13], b: [-0.08, 0.92, 0.16], r: [0.025, 0.02], col: "inner", paint: true, mirror: true },
      { t: "ell", c: [-0.16, 0.97, 0.13], r: [0.06, 0.06, 0.06], col: "wrap", mirror: true, k: 0.03 },
      // Hushed sound dots.
      { t: "ell", c: [0.46, 0.58, 0.16], r: [0.024, 0.024, 0.024], col: "glow", k: 0 },
      { t: "ell", c: [0.48, 0.48, 0.16], r: [0.022, 0.022, 0.022], col: "glow", k: 0 },
    ],
    eyes: [{ at: [0.28, 0.67, 0.08], r: 0.075, iris: "#40c4ff", mirror: true, angry: true }],
  },

  // Élite (pliegue): an origami fox soaked in night ink, dripping into a puddle.
  "tinta-negra": {
    palette: { ink: "#34345e", fold: "#525290", deep: "#1a1a32", paper: "#e0e0ec", purple: "#8e4cc4", glow: "#c88aff" },
    glow: ["glow"],
    shapes: [
      { t: "ell", c: [0, 0.02, 0], r: [0.44, 0.03, 0.3], col: "deep", k: 0.02 },
      { t: "box", c: [0.02, 0.32, 0], s: [0.14, 0.24, 0.14], round: 0.05, col: "ink", rot: [0, 0, -12], k: 0.04 },
      { t: "box", c: [0.13, 0.34, 0], s: [0.05, 0.18, 0.1], round: 0.03, col: "fold", rot: [0, 0, -12], paint: true },
      { t: "box", c: [-0.08, 0.16, 0.12], s: [0.15, 0.12, 0.06], round: 0.04, col: "ink", rot: [0, 0, 20], mirror: true, k: 0.03 },
      { t: "box", c: [0.13, 0.17, 0.08], s: [0.045, 0.16, 0.045], round: 0.025, col: "ink", mirror: true, k: 0.02 },
      { t: "box", c: [0.17, 0.035, 0.08], s: [0.07, 0.035, 0.05], round: 0.02, col: "ink", mirror: true, k: 0.02 },
      // Big folded tail curling up behind.
      { t: "box", c: [-0.28, 0.3, -0.04], s: [0.1, 0.22, 0.08], round: 0.05, col: "ink", rot: [0, 0, 25], k: 0.04 },
      { t: "cap", a: [-0.36, 0.46, -0.04], b: [-0.44, 0.76, -0.04], r: [0.1, 0.01], col: "purple", k: 0.03 },
      // Head with folded ears and a pointed snout.
      { t: "box", c: [0.18, 0.66, 0], s: [0.1, 0.09, 0.1], round: 0.045, col: "ink", k: 0.05 },
      { t: "cap", a: [0.24, 0.64, 0], b: [0.46, 0.61, 0], r: [0.075, 0.014], col: "ink", k: 0.03 },
      { t: "cap", a: [0.15, 0.74, 0.06], b: [0.1, 0.98, 0.08], r: [0.065, 0.008], col: "ink", mirror: true, k: 0.02 },
      { t: "ell", c: [0.12, 0.84, 0.11], r: [0.03, 0.08, 0.02], col: "purple", paint: true, mirror: true },
      { t: "ell", c: [0.105, 0.96, 0.08], r: [0.03, 0.04, 0.03], col: "paper", paint: true, mirror: true },
      { t: "ell", c: [0.28, 0.6, 0.1], r: [0.045, 0.035, 0.03], col: "paper", paint: true },
      // Ink drips from jaw, chest and tail.
      { t: "cap", a: [0.34, 0.6, 0.03], b: [0.35, 0.48, 0.03], r: [0.014, 0.024], col: "deep", k: 0.02 },
      { t: "cap", a: [0.18, 0.44, 0.09], b: [0.2, 0.3, 0.1], r: [0.016, 0.026], col: "deep", k: 0.02 },
      { t: "cap", a: [-0.3, 0.2, 0.05], b: [-0.32, 0.08, 0.06], r: [0.016, 0.026], col: "deep", k: 0.02 },
      // Glowing violet seams.
      { t: "cap", a: [0.1, 0.3, 0.13], b: [0.06, 0.14, 0.14], r: [0.012, 0.012], col: "glow", paint: true },
      { t: "cap", a: [-0.3, 0.36, 0.06], b: [-0.24, 0.2, 0.06], r: [0.012, 0.012], col: "glow", paint: true },
    ],
    eyes: [{ at: [0.27, 0.7, 0.07], r: 0.068, iris: "#e04aff", mirror: true, angry: true }],
  },

  // Élite (glitch): a jester puppet turned hero; strings cut, code-blade raised, cape flying.
  "bufon-leal": {
    palette: { tunic: "#3a64cc", gold: "#f0b03a", red: "#d63c4c", wood: "#c08a5c", boot: "#7c503c", blade: "#5cffd0", glow: "#5cffd0" },
    glow: ["blade", "glow"],
    shapes: [
      { t: "ell", c: [-0.26, 0.5, -0.06], r: [0.2, 0.26, 0.04], col: "red", rot: [0, 25, -35], k: 0.04 },
      { t: "ell", c: [0, 0.5, 0], r: [0.13, 0.17, 0.12], col: "tunic", k: 0.04 },
      { t: "box", c: [0.1, 0.5, 0.08], s: [0.04, 0.04, 0.08], round: 0.01, col: "red", rot: [0, 0, 45], paint: true },
      { t: "box", c: [0.02, 0.44, 0.1], s: [0.11, 0.012, 0.06], round: 0.005, col: "glow", paint: true },
      { t: "box", c: [0, 0.38, 0], s: [0.2, 0.02, 0.2], round: 0.005, col: "gold", paint: true },
      { t: "tor", c: [0, 0.665, 0], R: 0.085, r: 0.035, col: "gold", k: 0 },
      // Near leg striding forward, far leg back.
      ...chain([[0.04, 0.36, 0.07], [0.15, 0.2, 0.08], [0.18, 0.06, 0.08]], [0.05, 0.045, 0.04], "red", 0.03),
      { t: "ell", c: [0.15, 0.2, 0.08], r: [0.05, 0.05, 0.05], col: "wood", k: 0.01 },
      { t: "ell", c: [0.23, 0.035, 0.08], r: [0.1, 0.035, 0.05], col: "boot", k: 0.02 },
      { t: "cap", a: [0.3, 0.04, 0.08], b: [0.36, 0.1, 0.08], r: [0.03, 0.015], col: "boot", k: 0.02 },
      ...chain([[-0.04, 0.36, -0.07], [-0.13, 0.2, -0.08], [-0.2, 0.06, -0.08]], [0.05, 0.045, 0.04], "red", 0.03),
      { t: "ell", c: [-0.13, 0.2, -0.08], r: [0.05, 0.05, 0.05], col: "wood", k: 0.01 },
      { t: "ell", c: [-0.15, 0.035, -0.08], r: [0.1, 0.035, 0.05], col: "boot", k: 0.02 },
      // Near arm raising the code-blade.
      ...chain([[0.06, 0.6, 0.12], [0.2, 0.54, 0.16], [0.3, 0.62, 0.16]], [0.04, 0.035, 0.03], "tunic", 0.03),
      { t: "ell", c: [0.31, 0.63, 0.16], r: [0.04, 0.04, 0.04], col: "wood", k: 0.02 },
      { t: "cap", a: [0.27, 0.67, 0.16], b: [0.36, 0.58, 0.16], r: [0.022, 0.022], col: "gold", k: 0.01 },
      { t: "cap", a: [0.32, 0.64, 0.16], b: [0.58, 1.0, 0.16], r: [0.032, 0.01], col: "blade", k: 0.01 },
      // Far arm back with a cut string.
      { t: "cap", a: [-0.06, 0.6, -0.12], b: [-0.2, 0.5, -0.16], r: [0.04, 0.035], col: "tunic", k: 0.03 },
      { t: "ell", c: [-0.22, 0.49, -0.16], r: [0.04, 0.04, 0.04], col: "wood", k: 0.02 },
      { t: "cap", a: [-0.23, 0.5, -0.16], b: [-0.26, 0.74, -0.16], r: [0.016, 0.016], col: "gold", k: 0.01 },
      // Wooden mask head and a two-pointed jester hat with bells.
      { t: "ell", c: [0.04, 0.82, 0], r: [0.12, 0.13, 0.12], col: "wood", k: 0.04 },
      { t: "tor", c: [0.03, 0.89, 0], R: 0.11, r: 0.022, col: "gold", rot: [0, 0, -10], k: 0.01 },
      ...chain([[0.0, 0.92, 0.04], [-0.16, 1.02, 0.12], [-0.22, 0.92, 0.16]], [0.07, 0.035, 0.025], "red", 0.03),
      { t: "ell", c: [-0.22, 0.89, 0.16], r: [0.035, 0.035, 0.035], col: "gold", k: 0.01 },
      ...chain([[0.04, 0.93, -0.03], [0.2, 1.05, -0.06], [0.3, 0.96, -0.06]], [0.07, 0.035, 0.025], "tunic", 0.03),
      { t: "ell", c: [0.31, 0.93, -0.06], r: [0.035, 0.035, 0.035], col: "gold", k: 0.01 },
    ],
    eyes: [{ at: [0.12, 0.83, 0.065], r: 0.07, iris: "#2affc4", mirror: true }],
  },

  // Fusión: a fire dragon in a beetle paladin's armour: rhino-horn helm, elytra mantle, flame, lance.
  "emperador-crisol": {
    palette: { body: "#d8443a", belly: "#f27a4a", gold: "#eebc4a", shell: "#1c6058", stripe: "#2c8c78", steel: "#665c80", flame: "#ffb03a", core: "#fff6cc", dark: "#3c3450" },
    glow: ["flame", "core"],
    shapes: [
      // Flame mantle between the opened elytra.
      { t: "ell", c: [-0.28, 0.58, 0], r: [0.16, 0.28, 0.08], col: "flame", k: 0.04 },
      spike([-0.3, 0.76, 0], [-0.36, 1.02, 0], 0.08, "flame"),
      { t: "ell", c: [-0.22, 0.62, 0.17], r: [0.12, 0.34, 0.04], col: "shell", rot: [-25, 0, 32], mirror: true, k: 0.03 },
      { t: "ell", c: [-0.2, 0.62, 0.21], r: [0.03, 0.3, 0.03], col: "stripe", rot: [-25, 0, 32], paint: true },
      // Torso and golden breastplate with a forge core.
      { t: "ell", c: [0, 0.46, 0], r: [0.2, 0.24, 0.18], col: "body", k: 0.05 },
      { t: "box", c: [0.11, 0.47, 0], s: [0.1, 0.16, 0.14], round: 0.07, col: "gold", k: 0.01 },
      { t: "ell", c: [0.205, 0.5, 0], r: [0.03, 0.05, 0.05], col: "core", k: 0.01 },
      { t: "box", c: [0.04, 0.3, 0], s: [0.2, 0.028, 0.22], round: 0.01, col: "dark", paint: true },
      // Legs with gold greaves and talons.
      { t: "ell", c: [0.02, 0.2, 0.12], r: [0.14, 0.12, 0.09], col: "body", mirror: true, k: 0.05 },
      { t: "cap", a: [0.09, 0.15, 0.13], b: [0.1, 0.06, 0.14], r: [0.06, 0.06], col: "gold", mirror: true, k: 0.01 },
      { t: "ell", c: [0.16, 0.03, 0.14], r: [0.11, 0.035, 0.07], col: "body", mirror: true, k: 0.02 },
      // Tail with a flame tip.
      ...chain([[-0.16, 0.2, 0], [-0.42, 0.08, 0], [-0.54, 0.2, 0]], [0.1, 0.06, 0.04], "body", 0.05),
      { t: "ell", c: [-0.56, 0.28, 0], r: [0.05, 0.08, 0.05], col: "flame", k: 0.02 },
      // Elytra pauldrons, arm and gauntlet gripping the lance.
      { t: "ell", c: [0.02, 0.66, 0.16], r: [0.1, 0.07, 0.08], col: "shell", mirror: true, k: 0.02 },
      { t: "cap", a: [0.04, 0.62, 0.18], b: [0.2, 0.5, 0.22], r: [0.055, 0.045], col: "body", k: 0.04 },
      { t: "ell", c: [0.24, 0.52, 0.22], r: [0.055, 0.055, 0.055], col: "gold", k: 0.02 },
      { t: "cap", a: [0.26, 0.02, 0.22], b: [0.26, 1.02, 0.22], r: [0.024, 0.024], col: "steel", k: 0.01 },
      { t: "cap", a: [0.26, 1.0, 0.22], b: [0.26, 1.18, 0.22], r: [0.05, 0.006], col: "gold", k: 0.01 },
      // Head in a gold helm with a beetle horn; swept dragon horns.
      { t: "cap", a: [0.04, 0.66, 0], b: [0.12, 0.8, 0], r: [0.11, 0.09], col: "body", k: 0.06 },
      { t: "ell", c: [0.14, 0.86, 0], r: [0.15, 0.12, 0.13], col: "body", k: 0.06 },
      { t: "ell", c: [0.28, 0.81, 0], r: [0.1, 0.07, 0.09], col: "body", k: 0.05 },
      { t: "ell", c: [0.25, 0.78, 0], r: [0.12, 0.03, 0.08], col: "belly", paint: true },
      { t: "ell", c: [0.1, 0.95, 0], r: [0.12, 0.06, 0.12], col: "gold", k: 0.01 },
      ...chain([[0.12, 0.98, 0], [0.18, 1.12, 0], [0.3, 1.17, 0]], [0.05, 0.03, 0.008], "gold", 0.02),
      spike([0.02, 0.92, 0.09], [-0.14, 1.0, 0.13], 0.03, "steel", true),
    ],
    eyes: [{ at: [0.24, 0.87, 0.08], r: 0.07, iris: "#ff9a1a", mirror: true, angry: true }],
  },

  // Fusión: a many-tailed origami fox of indigo paper before a black eclipse; glitched paper scraps.
  "eclipse-plegado": {
    palette: { paper: "#383486", light: "#5a56b8", white: "#cacbe8", magenta: "#aa3a8e", pink: "#e26cc2", black: "#10102e", corona: "#ffd88a" },
    glow: ["corona"],
    shapes: [
      // The eclipse.
      { t: "ell", c: [-0.18, 0.7, -0.3], r: [0.36, 0.36, 0.03], col: "black", k: 0 },
      { t: "tor", c: [-0.18, 0.7, -0.3], R: 0.37, r: 0.03, col: "corona", rot: [90, 0, 0], k: 0.01 },
      // Body and folded chest.
      { t: "box", c: [0, 0.42, 0], s: [0.26, 0.12, 0.13], round: 0.08, col: "paper", k: 0.04 },
      { t: "box", c: [0.2, 0.48, 0], s: [0.1, 0.16, 0.12], round: 0.06, col: "paper", rot: [0, 0, -15], k: 0.05 },
      { t: "box", c: [0.27, 0.46, 0], s: [0.04, 0.12, 0.08], round: 0.03, col: "white", rot: [0, 0, -15], paint: true },
      { t: "box", c: [-0.02, 0.48, 0.12], s: [0.18, 0.06, 0.02], round: 0.01, col: "light", rot: [0, 0, -8], paint: true, mirror: true },
      // Legs with magenta socks.
      { t: "box", c: [0.18, 0.17, 0.08], s: [0.045, 0.17, 0.045], round: 0.03, col: "paper", mirror: true, k: 0.03 },
      { t: "box", c: [-0.18, 0.17, 0.08], s: [0.05, 0.17, 0.05], round: 0.03, col: "paper", mirror: true, k: 0.03 },
      { t: "box", c: [0, 0.06, 0.08], s: [0.3, 0.05, 0.06], round: 0.01, col: "magenta", paint: true, mirror: true },
      // Three folded tails fanning up.
      spike([-0.22, 0.48, 0], [-0.34, 0.92, 0], 0.09, "paper", false, 0.04),
      spike([-0.22, 0.48, 0.05], [-0.54, 0.78, 0.12], 0.08, "paper", false, 0.04),
      spike([-0.22, 0.48, -0.05], [-0.5, 0.66, -0.14], 0.08, "paper", false, 0.04),
      { t: "ell", c: [-0.33, 0.86, 0], r: [0.04, 0.07, 0.05], col: "pink", paint: true },
      { t: "ell", c: [-0.5, 0.75, 0.11], r: [0.06, 0.05, 0.05], col: "pink", paint: true },
      // Head: long folded muzzle, tall ears, shadow crest, crescent on the brow.
      { t: "box", c: [0.32, 0.72, 0], s: [0.11, 0.09, 0.1], round: 0.05, col: "paper", k: 0.05 },
      { t: "cap", a: [0.38, 0.7, 0], b: [0.6, 0.65, 0], r: [0.075, 0.014], col: "paper", k: 0.03 },
      { t: "ell", c: [0.46, 0.64, 0], r: [0.1, 0.03, 0.06], col: "white", paint: true },
      spike([0.28, 0.8, 0.06], [0.24, 1.06, 0.08], 0.065, "paper", true, 0.02),
      { t: "ell", c: [0.26, 0.92, 0.1], r: [0.03, 0.08, 0.02], col: "magenta", paint: true, mirror: true },
      spike([0.24, 0.8, 0], [0.08, 0.94, 0], 0.05, "black", false, 0.02),
      { t: "ell", c: [0.4, 0.8, 0], r: [0.03, 0.02, 0.06], col: "corona", paint: true },
      { t: "ell", c: [0.36, 0.66, 0.1], r: [0.04, 0.03, 0.03], col: "magenta", paint: true },
      // Glitched paper scraps.
      { t: "box", c: [0.56, 0.98, 0.1], s: [0.035, 0.025, 0.012], round: 0.005, col: "white", rot: [20, 30, 25] },
      { t: "box", c: [-0.56, 0.4, 0.18], s: [0.03, 0.022, 0.012], round: 0.005, col: "white", rot: [-20, 10, -30] },
      { t: "box", c: [0.6, 0.36, 0.16], s: [0.028, 0.02, 0.012], round: 0.005, col: "light", rot: [10, -30, 15] },
    ],
    eyes: [{ at: [0.4, 0.75, 0.065], r: 0.065, iris: "#ff5ad0", mirror: true, angry: true }],
  },

  // Fusión: a brass war machine played like an orchestra: organ pipes, speaker heart, trumpet cannon.
  "orquesta-omega": {
    palette: { brass: "#d69c42", pale: "#f4d27a", teal: "#4a8c9c", red: "#c23a48", dark: "#34344c", glow: "#7affb2" },
    glow: ["glow"],
    shapes: [
      // Organ pipes on the back.
      ...([[-0.12, 0.92], [-0.04, 1.04], [0.04, 0.98], [0.12, 0.86]] as const).map(([z, h]): Shape => ({ t: "cap", a: [-0.24, 0.4, z], b: [-0.26, h, z], r: [0.045, 0.045], col: "brass", k: 0.02 })),
      ...([[-0.12, 0.92], [-0.04, 1.04], [0.04, 0.98], [0.12, 0.86]] as const).map(([z, h]): Shape => ({ t: "ell", c: [-0.26, h + 0.04, z], r: [0.05, 0.05, 0.05], col: "dark", paint: true })),
      // Drum torso with red bands and a speaker heart.
      { t: "ell", c: [0, 0.5, 0], r: [0.26, 0.24, 0.22], col: "brass", k: 0.03 },
      { t: "box", c: [0, 0.62, 0], s: [0.3, 0.022, 0.3], round: 0.005, col: "red", paint: true },
      { t: "box", c: [0, 0.38, 0], s: [0.3, 0.022, 0.3], round: 0.005, col: "red", paint: true },
      { t: "tor", c: [0.08, 0.5, 0.19], R: 0.085, r: 0.026, col: "teal", rot: [90, 0, 0], k: 0.01 },
      { t: "ell", c: [0.08, 0.5, 0.19], r: [0.05, 0.05, 0.035], col: "glow", k: 0.01 },
      { t: "tor", c: [-0.12, 0.68, 0.14], R: 0.09, r: 0.032, col: "teal", rot: [90, 0, 0], k: 0.01 },
      // Piston legs and brass feet.
      { t: "cap", a: [-0.04, 0.32, 0.12], b: [-0.04, 0.08, 0.12], r: [0.065, 0.06], col: "dark", mirror: true, k: 0.02 },
      { t: "box", c: [0.04, 0.04, 0.12], s: [0.13, 0.04, 0.07], round: 0.03, col: "brass", mirror: true, k: 0.02 },
      // Trumpet cannon arm.
      { t: "ell", c: [0.12, 0.62, 0.2], r: [0.07, 0.07, 0.07], col: "pale", k: 0.03 },
      { t: "cap", a: [0.14, 0.6, 0.21], b: [0.3, 0.57, 0.21], r: [0.05, 0.04], col: "brass", k: 0.03 },
      { t: "cap", a: [0.3, 0.57, 0.21], b: [0.5, 0.59, 0.21], r: [0.04, 0.12], col: "pale", k: 0.03 },
      { t: "ell", c: [0.55, 0.59, 0.21], r: [0.07, 0.085, 0.085], col: "dark", cut: true, k: 0.01 },
      { t: "ell", c: [0.47, 0.59, 0.21], r: [0.05, 0.1, 0.1], col: "dark", paint: true },
      // Helm with a visor and a gear crest.
      { t: "cap", a: [0.04, 0.7, 0], b: [0.1, 0.8, 0], r: [0.08, 0.07], col: "dark", k: 0.03 },
      { t: "ell", c: [0.14, 0.86, 0], r: [0.17, 0.1, 0.14], col: "brass", k: 0.04 },
      { t: "box", c: [0.26, 0.87, 0], s: [0.06, 0.05, 0.14], round: 0.03, col: "dark", paint: true },
      { t: "tor", c: [0.06, 0.98, 0], R: 0.07, r: 0.03, col: "teal", rot: [90, 0, 0], k: 0.02 },
      // Music it plays.
      { t: "ell", c: [0.44, 1.04, 0.12], r: [0.045, 0.032, 0.03], col: "glow", rot: [0, 0, 20], k: 0 },
      { t: "cap", a: [0.48, 1.05, 0.12], b: [0.49, 1.2, 0.12], r: [0.02, 0.02], col: "glow", k: 0.01 },
      { t: "ell", c: [-0.42, 1.08, 0.1], r: [0.04, 0.03, 0.03], col: "glow", rot: [0, 0, 20], k: 0 },
      { t: "cap", a: [-0.385, 1.09, 0.1], b: [-0.38, 1.22, 0.1], r: [0.02, 0.02], col: "glow", k: 0.01 },
    ],
    eyes: [{ at: [0.26, 0.87, 0.06], r: 0.07, iris: "#3affa0", mirror: true, angry: true }],
  },

  // Fusión: a stone rhino titan with ice growing through its armour, on frozen cracked ground.
  "tormenta-telurica": {
    palette: { stone: "#96827a", light: "#c4b29e", plate: "#5a5478", ice: "#8ad0f2", icel: "#d4f4ff", ground: "#2e4474", glow: "#bff8ff" },
    glow: ["glow"],
    shapes: [
      { t: "ell", c: [0, 0.02, 0], r: [0.6, 0.035, 0.34], col: "ground", k: 0.02 },
      { t: "cap", a: [-0.4, 0.05, 0.2], b: [-0.1, 0.05, 0.28], r: [0.014, 0.014], col: "glow", paint: true },
      { t: "cap", a: [0.36, 0.05, 0.24], b: [0.5, 0.05, 0.12], r: [0.014, 0.014], col: "glow", paint: true },
      { t: "ell", c: [-0.04, 0.48, 0], r: [0.38, 0.24, 0.25], col: "stone" },
      { t: "ell", c: [0, 0.32, 0], r: [0.34, 0.1, 0.22], col: "light", paint: true },
      { t: "ell", c: [-0.18, 0.54, 0.12], r: [0.16, 0.15, 0.14], col: "plate", mirror: true, k: 0.02 },
      { t: "ell", c: [0.1, 0.55, 0.12], r: [0.14, 0.14, 0.14], col: "plate", mirror: true, k: 0.02 },
      { t: "cap", a: [-0.24, 0.6, 0.25], b: [-0.12, 0.5, 0.27], r: [0.012, 0.012], col: "glow", paint: true, mirror: true },
      { t: "cap", a: [0.06, 0.62, 0.25], b: [0.14, 0.52, 0.26], r: [0.012, 0.012], col: "glow", paint: true, mirror: true },
      // Pillar legs capped in ice.
      { t: "cap", a: [0.22, 0.36, 0.15], b: [0.22, 0.1, 0.15], r: [0.1, 0.1], col: "stone", mirror: true, k: 0.05 },
      { t: "cap", a: [-0.24, 0.36, 0.15], b: [-0.24, 0.1, 0.15], r: [0.105, 0.1], col: "stone", mirror: true, k: 0.05 },
      { t: "ell", c: [0.22, 0.08, 0.15], r: [0.12, 0.05, 0.12], col: "ice", mirror: true, k: 0.02 },
      { t: "ell", c: [-0.24, 0.08, 0.15], r: [0.12, 0.05, 0.12], col: "ice", mirror: true, k: 0.02 },
      { t: "cap", a: [-0.4, 0.5, 0], b: [-0.48, 0.42, 0], r: [0.05, 0.03], col: "stone", k: 0.03 },
      // Ice crystals breaking through the back.
      spike([-0.26, 0.64, 0.03], [-0.32, 0.98, 0.05], 0.075, "ice"),
      spike([-0.08, 0.68, -0.03], [-0.06, 1.04, -0.05], 0.08, "ice"),
      spike([0.08, 0.66, 0.03], [0.16, 0.94, 0.06], 0.07, "ice"),
      spike([-0.36, 0.6, -0.04], [-0.5, 0.84, -0.06], 0.06, "ice"),
      { t: "cap", a: [-0.08, 0.76, 0.03], b: [-0.06, 0.98, 0.0], r: [0.02, 0.012], col: "icel", paint: true },
      // Head lowered to charge, a great ice horn and a stone horn.
      { t: "ell", c: [0.38, 0.44, 0], r: [0.18, 0.15, 0.15], col: "stone", k: 0.08 },
      { t: "ell", c: [0.53, 0.37, 0], r: [0.11, 0.09, 0.1], col: "stone", k: 0.06 },
      { t: "cap", a: [0.6, 0.31, 0.06], b: [0.64, 0.32, 0], r: [0.012, 0.012], col: "plate", paint: true, mirror: true },
      spike([0.3, 0.56, 0.1], [0.24, 0.66, 0.14], 0.035, "stone", true),
      spike([0.56, 0.42, 0], [0.66, 0.76, 0], 0.07, "ice", false, 0.02),
      spike([0.45, 0.54, 0], [0.47, 0.66, 0], 0.045, "light", false, 0.02),
      // Frost breath.
      { t: "box", c: [0.74, 0.3, 0.1], s: [0.028, 0.028, 0.028], round: 0.006, col: "icel", rot: [30, 0, 45] },
      { t: "box", c: [0.7, 0.22, 0.16], s: [0.022, 0.022, 0.022], round: 0.006, col: "icel", rot: [10, 30, 45] },
    ],
    eyes: [{ at: [0.47, 0.48, 0.1], r: 0.065, iris: "#5ad8ff", mirror: true, angry: true }],
  },
};

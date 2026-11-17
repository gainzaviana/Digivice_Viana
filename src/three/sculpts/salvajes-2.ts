import type { Sculpt, Shape, V3 } from "../sculpt";

// Salvajes II: the strong wild Ecos (élite) and the bosses (supremo) of the Red, as toon sculpts.
// Glow by affinity: Pulso = warm amber, Señal = cyan, Ruido = magenta.

const PULSO = "#ffc23a";
const SENAL = "#4ef0ff";
const RUIDO = "#ff4ad8";

/** A chain of tapered capsules through points [x, y, z, r] (tails, necks, tentacles, coils). */
function chain(pts: [number, number, number, number][], col: string, k = 0.03, mirror = false): Shape[] {
  const out: Shape[] = [];
  for (let i = 0; i < pts.length - 1; i++) {
    const [ax, ay, az, ar] = pts[i], [bx, by, bz, br] = pts[i + 1];
    out.push({ t: "cap", a: [ax, ay, az], b: [bx, by, bz], r: [ar, br], col, k, mirror });
  }
  return out;
}
/** A thin painted line through points (seams, circuit traces, cracks). */
function line(pts: V3[], col: string, w = 0.016): Shape[] {
  const out: Shape[] = [];
  for (let i = 0; i < pts.length - 1; i++) out.push({ t: "cap", a: pts[i], b: pts[i + 1], r: [w, w], col, paint: true });
  return out;
}

/** Tortuga-archivo's drawer fronts: rows of crisp boxes hugging its dome, each with a brass handle. */
function drawers(): Shape[] {
  const out: Shape[] = [];
  const rows: [number, number[]][] = [[0.4, [-0.1, 0.6, 1.3, 2.0]], [0.56, [0.25, 0.95, 1.65]], [0.7, [0.6, 1.4]]];
  for (const [y, angles] of rows) {
    const rr = 0.34 * Math.sqrt(Math.max(0, 1 - ((y - 0.48) / 0.32) ** 2));
    for (const a of angles) {
      const x = -0.02 + Math.cos(a) * rr, z = Math.sin(a) * rr;
      out.push({ t: "box", c: [x, y, z], s: [0.03, 0.05, 0.085], round: 0.02, rot: [0, -(a * 180) / Math.PI, 0], col: "drawer", k: 0.01 });
      out.push({ t: "ell", c: [-0.02 + Math.cos(a) * (rr + 0.03), y, Math.sin(a) * (rr + 0.03)], r: [0.025, 0.014, 0.025], col: "brass", paint: true });
    }
  }
  return out;
}

export const salvajes2: Record<string, Sculpt> = {
  // MARK: Élite

  // Lion-bat on all fours: golden mane ring, raised bat wings with bone fingers, scorpion tail arching over the back.
  "manticora-spam": {
    palette: { body: "#9a4278", light: "#c66a9a", mane: "#ee9440", belly: "#f8b85e", wing: "#4e3270", bone: "#ece0e2", dark: "#2e1a40", glow: RUIDO },
    glow: ["glow"],
    shapes: [
      { t: "ell", c: [-0.02, 0.42, 0], r: [0.3, 0.16, 0.16], col: "body" },
      { t: "ell", c: [0.04, 0.32, 0], r: [0.22, 0.08, 0.13], col: "belly", paint: true },
      { t: "cap", a: [0.18, 0.36, 0.1], b: [0.2, 0.06, 0.11], r: [0.07, 0.06], col: "body", mirror: true, k: 0.05 },
      { t: "cap", a: [-0.2, 0.38, 0.1], b: [-0.22, 0.06, 0.11], r: [0.08, 0.06], col: "body", mirror: true, k: 0.05 },
      { t: "tor", c: [0.28, 0.62, 0], R: 0.13, r: 0.07, rot: [0, 0, 80], col: "mane", k: 0.06 },
      { t: "ell", c: [0.26, 0.6, 0], r: [0.08, 0.17, 0.17], col: "mane", k: 0.06 },
      { t: "ell", c: [0.38, 0.65, 0], r: [0.15, 0.14, 0.14], col: "body", k: 0.06 },
      { t: "ell", c: [0.51, 0.6, 0], r: [0.08, 0.065, 0.09], col: "light", k: 0.05 },
      { t: "cap", a: [0.58, 0.6, 0.03], b: [0.58, 0.6, -0.03], r: [0.018, 0.018], col: "dark", paint: true },
      { t: "cap", a: [0.3, 0.76, 0.08], b: [0.26, 0.9, 0.12], r: [0.035, 0.01], col: "bone", mirror: true, k: 0.02 },
      // wings
      { t: "ell", c: [-0.06, 0.78, 0.17], r: [0.2, 0.24, 0.03], rot: [-18, 0, 22], col: "wing", mirror: true, k: 0.05 },
      { t: "cap", a: [0.04, 0.58, 0.16], b: [0.02, 1.0, 0.24], r: [0.03, 0.018], col: "bone", mirror: true, k: 0.02 },
      // scorpion tail
      ...chain([[-0.3, 0.46, 0, 0.075], [-0.43, 0.64, 0, 0.065], [-0.43, 0.86, 0, 0.055], [-0.3, 1.0, 0, 0.05]], "body", 0.05),
      { t: "ell", c: [-0.24, 1.02, 0], r: [0.055, 0.05, 0.05], col: "bone", k: 0.02 },
      { t: "cap", a: [-0.2, 1.02, 0], b: [-0.1, 0.96, 0], r: [0.035, 0.008], col: "bone", k: 0.02 },
      { t: "ell", c: [-0.44, 0.75, 0], r: [0.08, 0.016, 0.08], col: "glow", paint: true },
      { t: "ell", c: [-0.37, 0.94, 0], r: [0.016, 0.07, 0.07], rot: [0, 0, 40], col: "glow", paint: true },
      ...line([[-0.24, 0.46, 0.15], [-0.04, 0.47, 0.16], [0.06, 0.5, 0.15], [0.14, 0.54, 0.12]], "glow", 0.016),
    ],
    eyes: [{ at: [0.44, 0.7, 0.07], r: 0.075, iris: "#ffcc33", mirror: true, angry: true }],
  },

  // Griffin: tawny lion body, white eagle head with an orange beak, raised white wings ruled with cyan data buses.
  "grifo-bus": {
    palette: { body: "#c08a4c", belly: "#ecc488", white: "#eef0fa", grey: "#b4bad8", beak: "#ff9a3a", talon: "#de6a2a", dark: "#3a3456", glow: SENAL },
    glow: ["glow"],
    shapes: [
      { t: "ell", c: [-0.04, 0.42, 0], r: [0.3, 0.15, 0.15], col: "body" },
      { t: "ell", c: [0.0, 0.32, 0], r: [0.24, 0.07, 0.12], col: "belly", paint: true },
      { t: "ell", c: [0.22, 0.52, 0], r: [0.14, 0.17, 0.14], col: "white", k: 0.08 },
      { t: "cap", a: [0.2, 0.36, 0.09], b: [0.22, 0.06, 0.1], r: [0.065, 0.05], col: "white", mirror: true, k: 0.05 },
      { t: "cap", a: [0.22, 0.06, 0.1], b: [0.3, 0.02, 0.1], r: [0.05, 0.025], col: "talon", mirror: true, k: 0.02 },
      { t: "cap", a: [-0.22, 0.38, 0.09], b: [-0.24, 0.06, 0.1], r: [0.08, 0.055], col: "body", mirror: true, k: 0.05 },
      // head
      { t: "ell", c: [0.34, 0.74, 0], r: [0.15, 0.14, 0.13], col: "white", k: 0.08 },
      { t: "cap", a: [0.44, 0.74, 0], b: [0.58, 0.64, 0], r: [0.06, 0.02], col: "beak", k: 0.02 },
      { t: "ell", c: [0.48, 0.73, 0], r: [0.05, 0.05, 0.06], col: "beak", k: 0.02 },
      { t: "cap", a: [0.2, 0.82, 0], b: [0.1, 0.9, 0], r: [0.06, 0.02], col: "grey", k: 0.04 },
      { t: "ell", c: [0.36, 0.82, 0], r: [0.1, 0.03, 0.12], col: "grey", paint: true },
      // wings
      { t: "ell", c: [-0.06, 0.8, 0.14], r: [0.16, 0.3, 0.035], rot: [-14, 0, 28], col: "white", mirror: true, k: 0.05 },
      { t: "ell", c: [-0.14, 0.86, 0.13], r: [0.1, 0.26, 0.03], rot: [-14, 0, 40], col: "grey", mirror: true, k: 0.03 },
      ...line([[0.02, 0.58, 0.18], [-0.08, 0.82, 0.2], [-0.14, 1.0, 0.2]], "glow", 0.014),
      ...line([[-0.04, 0.6, 0.18], [-0.18, 0.78, 0.18]], "glow", 0.014),
      // tail
      ...chain([[-0.32, 0.46, 0, 0.035], [-0.44, 0.32, 0, 0.03], [-0.46, 0.18, 0, 0.03]], "body", 0.03),
      { t: "ell", c: [-0.46, 0.14, 0], r: [0.05, 0.07, 0.05], col: "grey", k: 0.03 },
      ...line([[-0.2, 0.4, 0.15], [0.0, 0.4, 0.15], [0.06, 0.46, 0.14]], "glow", 0.014),
    ],
    eyes: [{ at: [0.42, 0.78, 0.07], r: 0.07, iris: "#ff9a2a", mirror: true, angry: true }],
  },

  // Bull warrior standing upright: bronze hide, gold breastplate with a glowing labyrinth, bone horns, a double axe.
  "minotauro-kernel": {
    palette: { body: "#9a5238", light: "#c87e5a", plate: "#dcaa44", trim: "#9c6a28", pants: "#4a3442", horn: "#f0e4c2", muzzle: "#e6c8a2", dark: "#241a26", glow: PULSO },
    glow: ["glow"],
    shapes: [
      { t: "cap", a: [0.0, 0.28, 0.1], b: [0.02, 0.06, 0.11], r: [0.085, 0.075], col: "pants", mirror: true, k: 0.05 },
      { t: "box", c: [0.04, 0.04, 0.11], s: [0.1, 0.04, 0.07], round: 0.03, col: "dark", mirror: true, k: 0.02 },
      { t: "ell", c: [0, 0.34, 0], r: [0.17, 0.1, 0.18], col: "pants", k: 0.05 },
      { t: "ell", c: [0, 0.56, 0], r: [0.2, 0.22, 0.22], col: "body", k: 0.08 },
      { t: "box", c: [0.12, 0.56, 0], s: [0.08, 0.15, 0.15], round: 0.06, col: "plate", k: 0.02 },
      { t: "tor", c: [0.0, 0.38, 0], R: 0.19, r: 0.03, col: "trim", k: 0.02 },
      ...line([[0.205, 0.5, 0.0], [0.205, 0.6, 0.0], [0.205, 0.6, 0.08], [0.205, 0.48, 0.08], [0.205, 0.48, -0.08], [0.205, 0.66, -0.08], [0.205, 0.66, 0.1]], "glow", 0.016),
      { t: "ell", c: [0.02, 0.76, 0], r: [0.14, 0.08, 0.26], col: "body", k: 0.06 },
      { t: "ell", c: [0.02, 0.76, 0.22], r: [0.09, 0.07, 0.07], col: "plate", mirror: true, k: 0.02 },
      { t: "cap", a: [0.02, 0.72, 0.26], b: [0.1, 0.5, 0.3], r: [0.075, 0.065], col: "body", mirror: true, k: 0.05 },
      { t: "ell", c: [0.12, 0.46, 0.31], r: [0.075, 0.07, 0.07], col: "plate", mirror: true, k: 0.03 },
      // head
      { t: "ell", c: [0.12, 0.87, 0], r: [0.15, 0.14, 0.15], col: "body", k: 0.07 },
      { t: "ell", c: [0.26, 0.82, 0], r: [0.09, 0.075, 0.1], col: "muzzle", k: 0.05 },
      { t: "tor", c: [0.34, 0.79, 0], R: 0.035, r: 0.012, rot: [0, 0, 90], col: "plate", k: 0 },
      { t: "cap", a: [0.06, 0.94, 0.1], b: [0.08, 1.0, 0.24], r: [0.04, 0.03], col: "horn", mirror: true, k: 0.03 },
      { t: "cap", a: [0.08, 1.0, 0.24], b: [0.14, 1.08, 0.28], r: [0.03, 0.008], col: "horn", mirror: true, k: 0.01 },
      { t: "cap", a: [0.06, 0.88, 0.12], b: [0.04, 0.86, 0.19], r: [0.03, 0.02], col: "body", mirror: true, k: 0.03 },
      // axe
      { t: "cap", a: [0.11, 0.66, 0.36], b: [0.14, 0.02, 0.36], r: [0.022, 0.022], col: "trim", k: 0.01 },
      { t: "ell", c: [0.14, 0.16, 0.36], r: [0.04, 0.11, 0.025], col: "plate", k: 0.01 },
      { t: "ell", c: [0.06, 0.17, 0.36], r: [0.06, 0.1, 0.022], col: "plate", k: 0.01 },
      { t: "ell", c: [0.22, 0.17, 0.36], r: [0.06, 0.1, 0.022], col: "plate", k: 0.01 },
    ],
    eyes: [{ at: [0.2, 0.92, 0.07], r: 0.07, iris: "#ff5a2a", mirror: true, angry: true }],
  },

  // A banded serpent coiled into a perfect upright loop, biting its own tail around a glowing restart arrow.
  "serpiente-bucle": {
    palette: { body: "#2a8a74", light: "#5cc492", belly: "#e4eaa0", band: "#9a52c4", dark: "#203448", glow: RUIDO },
    glow: ["glow"],
    shapes: [
      { t: "tor", c: [0, 0.48, 0], R: 0.37, r: 0.095, rot: [90, 0, 0], col: "body" },
      { t: "tor", c: [0, 0.48, 0.02], R: 0.29, r: 0.04, rot: [90, 0, 0], col: "belly", paint: true },
      ...[0, 1, 2, 3, 4, 5, 6, 7].map((i): Shape => {
        const a = (i / 8) * Math.PI * 2 + 0.3;
        return { t: "ell", c: [Math.cos(a) * 0.37, 0.48 + Math.sin(a) * 0.37, 0], r: [0.13, 0.028, 0.13], rot: [0, 0, (a * 180) / Math.PI], col: "band", paint: true };
      }),
      // head at the top, biting the tail
      { t: "ell", c: [0.1, 0.9, 0], r: [0.17, 0.1, 0.12], rot: [0, 0, -10], col: "body", k: 0.06 },
      { t: "ell", c: [0.2, 0.84, 0], r: [0.1, 0.035, 0.1], col: "belly", paint: true },
      { t: "ell", c: [0.08, 0.97, 0], r: [0.1, 0.04, 0.1], col: "light", paint: true },
      { t: "cap", a: [-0.04, 0.96, 0.06], b: [-0.16, 1.02, 0.08], r: [0.03, 0.008], col: "band", mirror: true, k: 0.02 },
      { t: "cap", a: [-0.08, 0.86, 0], b: [-0.18, 0.84, 0], r: [0.05, 0.02], col: "light", k: 0.04 },
      ...line([[0.0, 0.93, 0.115], [0.12, 0.9, 0.11]], "glow", 0.012),
      // the restart arrow
      { t: "tor", c: [0, 0.48, 0], R: 0.13, r: 0.03, rot: [90, 0, 0], col: "glow", k: 0 },
      { t: "box", c: [0.1, 0.56, 0], s: [0.06, 0.06, 0.035], round: 0.02, rot: [0, 0, 45], col: "dark", cut: true, k: 0 },
      { t: "cap", a: [0.07, 0.6, 0], b: [0.17, 0.62, 0], r: [0.03, 0.015], col: "glow", k: 0 },
      { t: "cap", a: [0.07, 0.6, 0], b: [0.1, 0.7, 0], r: [0.03, 0.015], col: "glow", k: 0 },
    ],
    eyes: [{ at: [0.16, 0.94, 0.05], r: 0.06, iris: "#ffe03a", mirror: true, angry: true }],
  },

  // Hulking basalt golem: stone plates over a molten core, glowing cracks, horn-vents on its shoulders.
  golemagma: {
    palette: { stone: "#4e4662", light: "#665c7c", plate: "#9a6a50", core: "#ff8a30", hot: "#ffd27a", dark: "#2e2a3c", glow: PULSO },
    glow: ["core", "hot", "glow"],
    shapes: [
      { t: "cap", a: [-0.04, 0.3, 0.13], b: [-0.02, 0.08, 0.14], r: [0.12, 0.11], col: "stone", mirror: true, k: 0.05 },
      { t: "ell", c: [0.0, 0.06, 0.14], r: [0.13, 0.065, 0.12], col: "dark", mirror: true, k: 0.03 },
      { t: "ell", c: [0, 0.56, 0], r: [0.28, 0.3, 0.26], col: "stone", k: 0.08 },
      { t: "ell", c: [0.2, 0.58, 0], r: [0.12, 0.13, 0.13], col: "core", k: 0.03 },
      { t: "ell", c: [0.27, 0.6, 0.02], r: [0.06, 0.07, 0.07], col: "hot", paint: true },
      { t: "box", c: [0.17, 0.74, 0.08], s: [0.1, 0.05, 0.1], round: 0.04, rot: [0, 0, -14], col: "plate", k: 0.02 },
      { t: "box", c: [0.2, 0.42, -0.06], s: [0.09, 0.05, 0.1], round: 0.04, rot: [0, 0, 14], col: "plate", k: 0.02 },
      // head
      { t: "ell", c: [0.24, 0.86, 0], r: [0.14, 0.12, 0.13], col: "stone", k: 0.07 },
      { t: "ell", c: [0.34, 0.83, 0], r: [0.06, 0.035, 0.09], col: "dark", paint: true },
      // shoulders + arms
      { t: "ell", c: [0.0, 0.74, 0.26], r: [0.15, 0.13, 0.13], col: "light", mirror: true, k: 0.06 },
      { t: "cap", a: [0.04, 0.68, 0.32], b: [0.18, 0.3, 0.4], r: [0.095, 0.085], col: "stone", mirror: true, k: 0.05 },
      { t: "ell", c: [0.2, 0.2, 0.41], r: [0.12, 0.11, 0.11], col: "light", mirror: true, k: 0.04 },
      // horn-vents
      { t: "cap", a: [-0.04, 0.84, 0.26], b: [-0.08, 1.02, 0.3], r: [0.045, 0.02], col: "plate", mirror: true, k: 0.02 },
      { t: "ell", c: [-0.08, 1.03, 0.3], r: [0.03, 0.03, 0.03], col: "glow", mirror: true, k: 0.01 },
      { t: "cap", a: [-0.16, 0.8, 0.1], b: [-0.2, 0.98, 0.1], r: [0.05, 0.02], col: "plate", k: 0.02 },
      { t: "ell", c: [-0.2, 0.99, 0.1], r: [0.03, 0.03, 0.03], col: "glow", k: 0.01 },
      // glowing cracks
      ...line([[-0.08, 0.84, 0.36], [-0.02, 0.72, 0.39], [0.04, 0.66, 0.41]], "glow", 0.013),
      ...line([[0.1, 0.4, 0.42], [0.14, 0.32, 0.43], [0.12, 0.24, 0.45]], "glow", 0.013),
      ...line([[-0.06, 0.36, 0.25], [-0.04, 0.22, 0.25], [0.02, 0.14, 0.26]], "glow", 0.013),
      ...line([[0.06, 0.32, 0.22], [0.18, 0.36, 0.18]], "glow", 0.013),
    ],
    eyes: [{ at: [0.3, 0.9, 0.06], r: 0.065, iris: "#ffd23a", mirror: true, angry: true }],
  },
  // Crimson-gold phoenix standing inside a glowing restart ring; blue-white flame tips on wings, crest and plumes.
  "fenix-reinicio": {
    palette: { body: "#e0465a", light: "#ff7466", gold: "#f6b43a", belly: "#ffde6c", tip: "#8cc6fa", dark: "#7a2448", ring: PULSO },
    glow: ["ring", "tip"],
    shapes: [
      { t: "tor", c: [0, 0.52, 0], R: 0.47, r: 0.024, rot: [90, 0, 0], col: "ring", k: 0 },
      { t: "cap", a: [0.06, 0.96, 0], b: [0.16, 1.02, 0], r: [0.04, 0.012], col: "ring", k: 0 },
      { t: "cap", a: [0.06, 0.96, 0], b: [0.12, 0.88, 0], r: [0.04, 0.012], col: "ring", k: 0 },
      { t: "ell", c: [0, 0.5, 0], r: [0.14, 0.19, 0.13], rot: [0, 0, -12], col: "body" },
      { t: "ell", c: [0.07, 0.46, 0], r: [0.09, 0.15, 0.11], col: "belly", paint: true },
      { t: "cap", a: [0.06, 0.62, 0], b: [0.12, 0.76, 0], r: [0.07, 0.06], col: "body", k: 0.06 },
      { t: "ell", c: [0.16, 0.8, 0], r: [0.11, 0.095, 0.095], col: "body", k: 0.06 },
      { t: "cap", a: [0.24, 0.8, 0], b: [0.36, 0.76, 0], r: [0.04, 0.012], col: "gold", k: 0.02 },
      ...chain([[0.1, 0.86, 0, 0.04], [-0.02, 0.96, 0, 0.03], [-0.12, 1.0, 0, 0.015]], "gold", 0.03),
      ...chain([[0.08, 0.84, 0.04, 0.035], [-0.06, 0.88, 0.08, 0.025], [-0.16, 0.86, 0.1, 0.012]], "gold", 0.03, true),
      { t: "ell", c: [-0.13, 1.0, 0], r: [0.035, 0.035, 0.035], col: "tip", k: 0.01 },
      // wings
      { t: "ell", c: [-0.08, 0.66, 0.15], r: [0.1, 0.26, 0.035], rot: [-20, 0, 34], col: "body", mirror: true, k: 0.05 },
      { t: "ell", c: [-0.12, 0.68, 0.17], r: [0.06, 0.2, 0.02], rot: [-20, 0, 34], col: "gold", paint: true, mirror: true },
      { t: "ell", c: [-0.24, 0.86, 0.22], r: [0.05, 0.07, 0.04], rot: [-20, 0, 34], col: "tip", mirror: true, k: 0.02 },
      // legs
      { t: "cap", a: [0.0, 0.34, 0.05], b: [0.02, 0.03, 0.06], r: [0.03, 0.022], col: "gold", mirror: true, k: 0.03 },
      { t: "cap", a: [0.02, 0.03, 0.06], b: [0.1, 0.02, 0.06], r: [0.024, 0.012], col: "gold", mirror: true, k: 0.02 },
      // tail plumes
      ...chain([[-0.1, 0.38, 0, 0.06], [-0.24, 0.24, 0, 0.05], [-0.32, 0.1, 0, 0.03]], "gold", 0.04),
      { t: "ell", c: [-0.34, 0.07, 0], r: [0.045, 0.045, 0.04], col: "tip", k: 0.02 },
      ...chain([[-0.1, 0.4, 0.04, 0.045], [-0.26, 0.32, 0.12, 0.035], [-0.38, 0.22, 0.16, 0.02]], "body", 0.04, true),
      { t: "ell", c: [-0.4, 0.2, 0.17], r: [0.035, 0.035, 0.035], col: "tip", mirror: true, k: 0.02 },
    ],
    eyes: [{ at: [0.22, 0.84, 0.05], r: 0.055, iris: "#ff6a1a", mirror: true, angry: true }],
  },

  // Heavy cobalt hydra on stout legs: one neck forks into three heads, a glowing node at every branch.
  "hidra-fork": {
    palette: { body: "#4658b0", light: "#7088d8", belly: "#ecdc9c", spike: "#d24a98", dark: "#262a54", glow: RUIDO },
    glow: ["glow"],
    shapes: [
      { t: "ell", c: [-0.06, 0.36, 0], r: [0.31, 0.21, 0.25], col: "body" },
      { t: "ell", c: [0.0, 0.24, 0], r: [0.24, 0.09, 0.17], col: "belly", paint: true },
      { t: "cap", a: [0.12, 0.26, 0.13], b: [0.14, 0.05, 0.15], r: [0.085, 0.075], col: "body", mirror: true, k: 0.05 },
      { t: "cap", a: [-0.22, 0.26, 0.13], b: [-0.22, 0.05, 0.15], r: [0.09, 0.08], col: "body", mirror: true, k: 0.05 },
      { t: "ell", c: [0.16, 0.04, 0.15], r: [0.1, 0.045, 0.085], col: "light", mirror: true, k: 0.03 },
      { t: "ell", c: [-0.2, 0.04, 0.15], r: [0.1, 0.045, 0.085], col: "light", mirror: true, k: 0.03 },
      ...chain([[-0.32, 0.32, 0, 0.1], [-0.48, 0.18, 0, 0.06], [-0.56, 0.06, 0, 0.02]], "body", 0.06),
      ...[[-0.24, 0.52], [-0.08, 0.54], [0.06, 0.52]].map(([x, y]): Shape => ({ t: "cap", a: [x, y - 0.04, 0], b: [x - 0.04, y + 0.1, 0], r: [0.04, 0.008], col: "spike", k: 0.02 })),
      // the process tree of necks
      ...chain([[0.14, 0.42, 0, 0.1], [0.22, 0.6, 0, 0.075]], "body", 0.07),
      { t: "ell", c: [0.22, 0.62, 0], r: [0.055, 0.055, 0.055], col: "glow", k: 0.02 },
      ...chain([[0.22, 0.62, 0, 0.055], [0.36, 0.66, 0.02, 0.05], [0.44, 0.66, 0.04, 0.05]], "body", 0.04),
      { t: "ell", c: [0.5, 0.67, 0.04], r: [0.1, 0.075, 0.08], col: "body", k: 0.04 },
      { t: "cap", a: [0.54, 0.65, 0.04], b: [0.64, 0.63, 0.04], r: [0.055, 0.04], col: "body", k: 0.04 },
      { t: "ell", c: [0.6, 0.6, 0.04], r: [0.08, 0.022, 0.07], col: "belly", paint: true },
      ...chain([[0.22, 0.62, 0, 0.055], [0.2, 0.78, 0, 0.05]], "body", 0.04),
      { t: "ell", c: [0.2, 0.8, 0], r: [0.045, 0.045, 0.045], col: "glow", k: 0.02 },
      ...chain([[0.2, 0.8, 0, 0.045], [0.12, 0.92, -0.08, 0.04], [0.14, 1.0, -0.1, 0.04]], "body", 0.04),
      { t: "ell", c: [0.2, 1.03, -0.1], r: [0.1, 0.075, 0.08], col: "body", k: 0.04 },
      { t: "cap", a: [0.24, 1.01, -0.1], b: [0.34, 0.99, -0.1], r: [0.055, 0.04], col: "body", k: 0.04 },
      { t: "ell", c: [0.3, 0.96, -0.1], r: [0.08, 0.022, 0.07], col: "belly", paint: true },
      ...chain([[0.2, 0.8, 0, 0.045], [0.3, 0.86, 0.1, 0.04], [0.36, 0.88, 0.12, 0.04]], "body", 0.04),
      { t: "ell", c: [0.4, 0.91, 0.12], r: [0.1, 0.075, 0.08], col: "body", k: 0.04 },
      { t: "cap", a: [0.44, 0.89, 0.12], b: [0.54, 0.87, 0.12], r: [0.055, 0.04], col: "body", k: 0.04 },
      { t: "ell", c: [0.5, 0.84, 0.12], r: [0.08, 0.022, 0.07], col: "belly", paint: true },
      ...line([[0.14, 0.44, 0.1], [0.2, 0.6, 0.075]], "glow", 0.014),
    ],
    eyes: [
      { at: [0.5, 0.71, 0.04], r: 0.05, iris: "#ff3a7a", angry: true, look: [0.5, 0.1, 0.85] },
      { at: [0.2, 1.07, -0.1], r: 0.05, iris: "#ff3a7a", angry: true, look: [0.5, 0.1, 0.85] },
      { at: [0.4, 0.95, 0.12], r: 0.05, iris: "#ff3a7a", angry: true, look: [0.5, 0.1, 0.85] },
    ],
  },

  // Shaggy frost yeti: ice-crystal spikes on its back and shoulders, a blue face and a glowing padlock on its chest.
  "yeti-criptografico": {
    palette: { fur: "#b4c2ea", shade: "#8696cc", face: "#5868ae", ice: "#7ad8f2", lock: "#3a8ccc", dark: "#2c3a66", glow: SENAL },
    glow: ["glow"],
    shapes: [
      { t: "cap", a: [0.0, 0.3, 0.12], b: [0.02, 0.08, 0.13], r: [0.11, 0.1], col: "fur", mirror: true, k: 0.05 },
      { t: "ell", c: [0.05, 0.05, 0.13], r: [0.12, 0.05, 0.09], col: "face", mirror: true, k: 0.03 },
      { t: "ell", c: [0, 0.54, 0], r: [0.25, 0.3, 0.25], col: "fur", k: 0.08 },
      { t: "ell", c: [-0.1, 0.52, 0], r: [0.18, 0.3, 0.27], col: "shade", paint: true },
      { t: "ell", c: [0.14, 0.84, 0], r: [0.15, 0.13, 0.15], col: "fur", k: 0.08 },
      { t: "ell", c: [0.27, 0.83, 0], r: [0.07, 0.1, 0.11], col: "face", paint: true },
      { t: "ell", c: [0.0, 0.74, 0.26], r: [0.12, 0.11, 0.11], col: "fur", mirror: true, k: 0.06 },
      { t: "cap", a: [0.04, 0.68, 0.3], b: [0.12, 0.36, 0.35], r: [0.1, 0.095], col: "fur", mirror: true, k: 0.05 },
      { t: "ell", c: [0.14, 0.28, 0.35], r: [0.1, 0.09, 0.09], col: "face", mirror: true, k: 0.03 },
      // padlock
      { t: "tor", c: [0.22, 0.6, 0], R: 0.06, r: 0.02, rot: [90, 0, 0], col: "lock", k: 0.01 },
      { t: "box", c: [0.22, 0.46, 0], s: [0.05, 0.09, 0.1], round: 0.03, col: "lock", k: 0.02 },
      { t: "ell", c: [0.27, 0.48, 0], r: [0.02, 0.03, 0.03], col: "glow", paint: true },
      { t: "cap", a: [0.27, 0.46, 0], b: [0.27, 0.41, 0], r: [0.014, 0.014], col: "glow", paint: true },
      { t: "tor", c: [0.26, 0.46, 0], R: 0.085, r: 0.01, rot: [0, 0, 90], col: "glow", paint: true },
      // ice crystals
      { t: "cap", a: [-0.16, 0.7, 0], b: [-0.3, 0.86, 0], r: [0.05, 0.008], col: "ice", k: 0.02 },
      { t: "cap", a: [-0.08, 0.8, 0.1], b: [-0.16, 1.0, 0.14], r: [0.05, 0.008], col: "ice", mirror: true, k: 0.02 },
      { t: "cap", a: [-0.2, 0.52, 0.1], b: [-0.36, 0.6, 0.14], r: [0.045, 0.008], col: "ice", mirror: true, k: 0.02 },
      { t: "cap", a: [-0.02, 0.84, 0.28], b: [-0.06, 0.98, 0.34], r: [0.04, 0.008], col: "ice", mirror: true, k: 0.02 },
      { t: "cap", a: [0.04, 0.9, 0.08], b: [0.0, 1.04, 0.14], r: [0.035, 0.008], col: "ice", mirror: true, k: 0.02 },
      ...line([[0.05, 0.3, 0.2], [0.06, 0.18, 0.2], [0.1, 0.12, 0.2]], "glow", 0.012),
    ],
    eyes: [{ at: [0.26, 0.86, 0.055], r: 0.065, iris: "#3ae0ff", mirror: true }],
  },

  // Crimson kraken: a tall mantle with glowing seams, tentacles spread on the ground, two raised to clutch data packets.
  "kraken-paquete": {
    palette: { body: "#b83e5c", light: "#e06a78", spot: "#ffc0b4", under: "#ffd8ca", packet: "#4ec2ca", dark: "#4e1e40", glow: SENAL },
    glow: ["glow"],
    shapes: [
      { t: "ell", c: [-0.06, 0.72, 0], r: [0.21, 0.27, 0.2], rot: [0, 0, 22], col: "body" },
      { t: "ell", c: [0.08, 0.46, 0], r: [0.17, 0.14, 0.16], col: "body", k: 0.08 },
      ...[[-0.04, 0.86, 0.17], [-0.14, 0.7, 0.17], [0.04, 0.68, 0.18], [-0.1, 0.92, 0.1]].map((c): Shape => ({ t: "ell", c: c as V3, r: [0.03, 0.03, 0.03], col: "spot", paint: true, mirror: true })),
      ...line([[0.04, 0.9, 0.16], [-0.02, 0.76, 0.19], [0.06, 0.62, 0.17]], "glow", 0.012),
      ...line([[-0.02, 0.76, 0.19], [-0.14, 0.62, 0.15]], "glow", 0.012),
      // ground tentacles
      ...chain([[0.14, 0.38, 0.06, 0.06], [0.3, 0.14, 0.1, 0.042], [0.5, 0.05, 0.1, 0.02]], "body", 0.04, true),
      ...chain([[0.02, 0.36, 0.1, 0.06], [0.04, 0.12, 0.26, 0.042], [0.14, 0.05, 0.38, 0.02]], "body", 0.04, true),
      ...chain([[-0.04, 0.38, 0.06, 0.06], [-0.22, 0.14, 0.17, 0.042], [-0.38, 0.06, 0.24, 0.02]], "body", 0.04, true),
      // raised arms with packets
      ...chain([[0.18, 0.46, 0.1, 0.05], [0.34, 0.52, 0.2, 0.04], [0.4, 0.66, 0.24, 0.03]], "light", 0.04),
      { t: "box", c: [0.42, 0.74, 0.24], s: [0.06, 0.06, 0.06], round: 0.015, rot: [10, 20, 0], col: "packet", k: 0.01 },
      ...line([[0.42, 0.7, 0.305], [0.42, 0.78, 0.305]], "glow", 0.012),
      ...line([[0.38, 0.74, 0.305], [0.46, 0.74, 0.305]], "glow", 0.012),
      ...chain([[-0.1, 0.44, -0.1, 0.05], [-0.26, 0.5, -0.2, 0.04], [-0.34, 0.64, -0.22, 0.03]], "light", 0.04),
      { t: "box", c: [-0.36, 0.72, -0.22], s: [0.06, 0.06, 0.06], round: 0.015, rot: [10, 20, 0], col: "packet", k: 0.01 },
      { t: "ell", c: [-0.36, 0.72, -0.15], r: [0.03, 0.03, 0.02], col: "glow", paint: true },
    ],
    eyes: [{ at: [0.16, 0.5, 0.07], r: 0.065, iris: "#ffd23a", mirror: true, angry: true, look: [0.92, 0.05, 0.3] }],
  },

  // Ancient tortoise: a copper shell built like a cabinet of archive drawers with glowing seams and brass handles.
  "tortuga-archivo": {
    palette: { skin: "#5e7c96", light: "#84a0b4", shell: "#d88a4a", drawer: "#a04e2a", brass: "#ecc46a", rim: "#ecd294", dark: "#2c2a3a", glow: PULSO },
    glow: ["glow"],
    shapes: [
      { t: "ell", c: [-0.02, 0.48, 0], r: [0.36, 0.32, 0.34], col: "shell", k: 0.03 },
      { t: "box", c: [-0.02, 0.18, 0], s: [0.36, 0.1, 0.34], round: 0.1, col: "skin", cut: true, k: 0 },
      { t: "cap", a: [0.18, 0.26, 0.17], b: [0.2, 0.04, 0.19], r: [0.1, 0.09], col: "skin", mirror: true, k: 0.04 },
      { t: "cap", a: [-0.2, 0.26, 0.17], b: [-0.2, 0.04, 0.19], r: [0.1, 0.09], col: "skin", mirror: true, k: 0.04 },
      { t: "tor", c: [-0.02, 0.28, 0], R: 0.35, r: 0.045, col: "rim", k: 0.02 },
      { t: "box", c: [-0.02, 0.84, 0], s: [0.1, 0.05, 0.1], round: 0.025, col: "brass", k: 0.02 },
      { t: "box", c: [-0.02, 0.9, 0], s: [0.06, 0.03, 0.06], round: 0.02, col: "brass", k: 0 },
      // drawer fronts (on the camera side) with brass handles
      ...drawers(),
      { t: "tor", c: [-0.02, 0.48, 0], R: 0.345, r: 0.016, col: "glow", paint: true },
      { t: "tor", c: [-0.02, 0.635, 0], R: 0.3, r: 0.016, col: "glow", paint: true },
      // head
      { t: "cap", a: [0.26, 0.3, 0], b: [0.42, 0.42, 0], r: [0.08, 0.07], col: "skin", k: 0.04 },
      { t: "ell", c: [0.48, 0.47, 0], r: [0.11, 0.09, 0.095], col: "skin", k: 0.06 },
      { t: "ell", c: [0.56, 0.42, 0], r: [0.06, 0.03, 0.08], col: "light", paint: true },
      { t: "cap", a: [-0.36, 0.26, 0], b: [-0.46, 0.18, 0], r: [0.05, 0.015], col: "skin", k: 0.04 },
    ],
    eyes: [{ at: [0.52, 0.52, 0.05], r: 0.06, iris: "#ffb43a", mirror: true }],
  },

  // Ghost of forgotten pages: a browser-tab hood, a white page face with one cyan eye, page stacks and pixel fragments.
  "fantasma-cache": {
    palette: { body: "#9aa6e4", light: "#c0caf2", hood: "#2a5a80", page: "#f4f2e6", ink: "#82a6c2", dark: "#262a52", glow: SENAL },
    glow: ["glow"],
    shapes: [
      { t: "ell", c: [0, 0.6, 0], r: [0.22, 0.24, 0.2], col: "body" },
      { t: "ell", c: [0.1, 0.56, 0], r: [0.14, 0.18, 0.18], col: "light", paint: true },
      ...chain([[-0.06, 0.46, 0, 0.14], [-0.16, 0.28, 0, 0.1], [-0.1, 0.12, 0, 0.065], [0.04, 0.06, 0, 0.035]], "body", 0.06),
      ...chain([[-0.04, 0.44, 0.08, 0.08], [-0.2, 0.3, 0.16, 0.05], [-0.3, 0.2, 0.2, 0.02]], "body", 0.05, true),
      { t: "box", c: [-0.02, 0.84, 0], s: [0.22, 0.09, 0.2], round: 0.06, col: "hood", k: 0.04 },
      { t: "box", c: [-0.06, 0.94, 0.06], s: [0.1, 0.03, 0.08], round: 0.025, col: "hood", k: 0.02 },
      ...[-0.08, 0, 0.08].map((x): Shape => ({ t: "box", c: [x, 0.86, 0.2], s: [0.025, 0.025, 0.02], round: 0.008, col: "glow", paint: true })),
      { t: "box", c: [0.2, 0.64, 0], s: [0.05, 0.11, 0.11], round: 0.03, col: "page", k: 0.02 },
      // arms reaching forward
      ...chain([[0.1, 0.56, 0.14, 0.06], [0.3, 0.52, 0.2, 0.045], [0.42, 0.56, 0.2, 0.04]], "body", 0.05, true),
      { t: "ell", c: [0.46, 0.57, 0.2], r: [0.05, 0.045, 0.045], col: "light", mirror: true, k: 0.03 },
      // page stacks
      { t: "box", c: [-0.18, 0.66, 0.2], s: [0.1, 0.06, 0.035], round: 0.015, rot: [0, 0, -12], col: "page", k: 0.02 },
      { t: "box", c: [-0.12, 0.46, 0.2], s: [0.09, 0.05, 0.035], round: 0.015, rot: [0, 0, 8], col: "page", k: 0.02 },
      ...line([[-0.25, 0.67, 0.236], [-0.11, 0.64, 0.236]], "ink", 0.01),
      ...line([[-0.24, 0.7, 0.236], [-0.12, 0.67, 0.236]], "ink", 0.01),
      ...line([[-0.19, 0.46, 0.236], [-0.05, 0.48, 0.236]], "ink", 0.01),
      // pixel fragments
      ...[[0.56, 0.7, 0.1], [0.5, 0.42, 0.26], [-0.3, 0.84, 0.14], [0.6, 0.5, -0.1]].map((c): Shape => ({ t: "box", c: c as V3, s: [0.025, 0.025, 0.025], round: 0.006, col: "glow", k: 0 })),
    ],
    eyes: [{ at: [0.2, 0.66, 0], r: 0.085, iris: "#4ef0ff", look: [0.8, 0.0, 0.6] }],
  },
  // MARK: Supremo

  // Crowned plum-and-gold queen bee: striped abdomen, four glassy wings, a gold sceptre and two virus drones.
  "reina-colmena": {
    palette: { body: "#8a3480", light: "#b24a94", gold: "#f0cc3a", wing: "#bfe4f8", leg: "#33244a", orb: "#ff6ae0", drone: "#4e3a6a", glow: RUIDO },
    glow: ["glow", "orb"],
    shapes: [
      { t: "ell", c: [0.04, 0.6, 0], r: [0.12, 0.14, 0.12], col: "body" },
      { t: "ell", c: [-0.2, 0.36, 0], r: [0.26, 0.15, 0.15], rot: [0, 0, 38], col: "body", k: 0.06 },
      ...[-0.06, 0.06, 0.18].map((d): Shape => ({ t: "box", c: [-0.2 - d * 0.79, 0.36 - d * 0.62, 0], s: [0.04, 0.2, 0.2], round: 0.01, rot: [0, 0, 38], col: "gold", paint: true })),
      { t: "cap", a: [-0.38, 0.2, 0], b: [-0.48, 0.1, 0], r: [0.04, 0.008], col: "leg", k: 0.02 },
      { t: "ell", c: [0.04, 0.6, 0], r: [0.13, 0.04, 0.13], col: "gold", paint: true },
      // head and crown
      { t: "ell", c: [0.16, 0.82, 0], r: [0.12, 0.11, 0.11], col: "body", k: 0.06 },
      { t: "ell", c: [0.24, 0.76, 0], r: [0.06, 0.04, 0.08], col: "light", paint: true },
      { t: "tor", c: [0.14, 0.92, 0], R: 0.07, r: 0.022, col: "gold", k: 0.02 },
      ...[[0.21, 0], [0.16, 0.07], [0.16, -0.07], [0.08, 0.05], [0.08, -0.05]].map(([x, z]): Shape => ({ t: "cap", a: [x, 0.93, z], b: [x, 1.02, z], r: [0.022, 0.006], col: "gold", k: 0.01 })),
      { t: "ell", c: [0.14, 0.96, 0], r: [0.03, 0.03, 0.03], col: "glow", k: 0.01 },
      ...chain([[0.22, 0.9, 0.05, 0.014], [0.3, 1.0, 0.08, 0.012], [0.4, 1.02, 0.1, 0.012]], "leg", 0.01, true),
      { t: "ell", c: [0.41, 1.02, 0.1], r: [0.025, 0.025, 0.025], col: "glow", mirror: true, k: 0.01 },
      // wings
      { t: "ell", c: [-0.12, 0.84, 0.14], r: [0.2, 0.09, 0.025], rot: [-22, 0, 38], col: "wing", mirror: true, k: 0.04 },
      { t: "ell", c: [-0.16, 0.7, 0.16], r: [0.16, 0.07, 0.025], rot: [-22, 0, 12], col: "wing", mirror: true, k: 0.04 },
      // legs and arms
      { t: "cap", a: [0.02, 0.5, 0.08], b: [0.0, 0.26, 0.12], r: [0.025, 0.02], col: "leg", mirror: true, k: 0.02 },
      { t: "cap", a: [0.0, 0.26, 0.12], b: [0.04, 0.02, 0.12], r: [0.02, 0.018], col: "leg", mirror: true, k: 0.01 },
      { t: "cap", a: [0.12, 0.58, 0.08], b: [0.26, 0.5, 0.18], r: [0.025, 0.022], col: "leg", k: 0.02 },
      // sceptre
      { t: "cap", a: [0.28, 0.02, 0.18], b: [0.28, 0.86, 0.18], r: [0.02, 0.02], col: "gold", k: 0.01 },
      { t: "tor", c: [0.28, 0.9, 0.18], R: 0.045, r: 0.014, rot: [90, 0, 0], col: "gold", k: 0.01 },
      { t: "ell", c: [0.28, 0.9, 0.18], r: [0.035, 0.035, 0.035], col: "orb", k: 0.01 },
      // drones
      { t: "ell", c: [0.46, 0.66, 0.1], r: [0.045, 0.035, 0.035], col: "drone", k: 0 },
      { t: "ell", c: [0.46, 0.7, 0.1], r: [0.04, 0.015, 0.04], col: "glow", paint: true },
      { t: "ell", c: [0.4, 0.3, -0.08], r: [0.045, 0.035, 0.035], col: "drone", k: 0 },
      { t: "ell", c: [0.4, 0.34, -0.08], r: [0.04, 0.015, 0.04], col: "glow", paint: true },
      ...line([[-0.04, 0.44, 0.13], [-0.16, 0.36, 0.14]], "glow", 0.012),
    ],
    eyes: [{ at: [0.22, 0.84, 0.05], r: 0.065, iris: "#ffe03a", mirror: true, angry: true }],
  },

  // Steel colossus: plumed helm with a glowing visor, a burning great-sword and a tower shield of firewall bricks.
  "titan-cortafuegos": {
    palette: { steel: "#4e5880", light: "#7c88b4", dark: "#363246", gold: "#e8b244", brick: "#c4442e", plume: "#d63a2e", fire: "#ff9a3a", hot: "#ffe27a", glow: PULSO },
    glow: ["glow", "fire", "hot"],
    shapes: [
      { t: "cap", a: [-0.02, 0.3, 0.12], b: [0.0, 0.07, 0.13], r: [0.1, 0.09], col: "dark", mirror: true, k: 0.04 },
      { t: "box", c: [0.04, 0.05, 0.13], s: [0.12, 0.05, 0.08], round: 0.03, col: "steel", mirror: true, k: 0.02 },
      { t: "ell", c: [0.0, 0.32, 0.13], r: [0.1, 0.07, 0.1], col: "steel", mirror: true, k: 0.03 },
      { t: "ell", c: [0, 0.58, 0], r: [0.22, 0.24, 0.22], col: "steel", k: 0.06 },
      { t: "tor", c: [0, 0.4, 0], R: 0.2, r: 0.035, col: "gold", k: 0.02 },
      { t: "ell", c: [0.16, 0.66, 0], r: [0.08, 0.08, 0.1], col: "light", paint: true },
      { t: "ell", c: [0.21, 0.62, 0], r: [0.035, 0.035, 0.035], col: "gold", k: 0.01 },
      { t: "ell", c: [0.0, 0.78, 0.24], r: [0.14, 0.11, 0.13], col: "light", mirror: true, k: 0.03 },
      // helm
      { t: "ell", c: [0.06, 0.88, 0], r: [0.135, 0.13, 0.13], col: "steel", k: 0.05 },
      { t: "box", c: [0.18, 0.88, 0], s: [0.02, 0.028, 0.09], round: 0.012, col: "dark", paint: true },
      ...chain([[0.1, 0.98, 0, 0.04], [0.0, 1.05, 0, 0.045], [-0.14, 1.04, 0, 0.035], [-0.24, 0.94, 0, 0.02]], "plume", 0.04),
      // sword arm (far side) with a burning blade
      { t: "cap", a: [0.0, 0.74, -0.26], b: [-0.04, 0.5, -0.3], r: [0.08, 0.07], col: "steel", k: 0.04 },
      { t: "ell", c: [-0.04, 0.46, -0.3], r: [0.07, 0.07, 0.07], col: "dark", k: 0.02 },
      { t: "box", c: [-0.04, 0.46, -0.3], s: [0.03, 0.03, 0.09], round: 0.01, col: "gold", k: 0 },
      { t: "cap", a: [-0.04, 0.48, -0.32], b: [-0.16, 1.2, -0.34], r: [0.05, 0.014], col: "light", k: 0 },
      { t: "cap", a: [-0.07, 0.62, -0.32], b: [-0.15, 1.14, -0.34], r: [0.06, 0.02], col: "fire", paint: true },
      // shield arm and tower shield
      { t: "cap", a: [0.02, 0.74, 0.28], b: [0.12, 0.46, 0.32], r: [0.08, 0.07], col: "steel", k: 0.04 },
      { t: "box", c: [0.3, 0.3, 0.32], s: [0.035, 0.25, 0.16], round: 0.03, rot: [0, -40, 0], col: "brick", k: 0.01 },
      { t: "box", c: [0.3, 0.3, 0.32], s: [0.045, 0.26, 0.17], round: 0.03, rot: [0, -40, 0], col: "gold", paint: true },
      { t: "box", c: [0.3, 0.3, 0.32], s: [0.06, 0.23, 0.145], round: 0.02, rot: [0, -40, 0], col: "brick", paint: true },
      ...[0.2, 0.3, 0.4, 0.5].map((y): Shape => ({ t: "box", c: [0.3, y - 0.04, 0.32], s: [0.06, 0.008, 0.15], round: 0.004, rot: [0, -40, 0], col: "glow", paint: true })),
      ...[[0.11, 0.0], [0.21, 0.05], [0.31, -0.05], [0.41, 0.05], [0.51, 0.0]].map(([y, o]): Shape => ({ t: "box", c: [0.3 + o * 0.77, y - 0.04, 0.32 + o * 0.64], s: [0.06, 0.06, 0.008], round: 0.004, rot: [0, -40, 0], col: "glow", paint: true })),
      ...[-0.1, 0, 0.1].map((o, i): Shape => ({ t: "cap", a: [0.3 + o * 0.77, 0.54, 0.32 + o * 0.64], b: [0.3 + o * 0.6, i === 1 ? 0.72 : 0.66, 0.32 + o * 0.5], r: [0.045, 0.01], col: "fire", k: 0.02 })),
      { t: "cap", a: [0.3, 0.56, 0.32], b: [0.3, 0.66, 0.32], r: [0.025, 0.008], col: "hot", k: 0 },
    ],
    eyes: [{ at: [0.14, 0.89, 0.04], r: 0.04, iris: "#ffc23a", mirror: true, angry: true }],
  },

  // Hooded lord of lag: a flowing teal cloak with a dark face, a loading halo, an hourglass and its delayed afterimage.
  "senor-del-lag": {
    palette: { cloak: "#3e7a74", light: "#6c9a90", lining: "#2a3042", face: "#1a1e2c", ghost: "#344a5a", gold: "#d8a454", sand: "#ff7ae0", glow: RUIDO },
    glow: ["glow", "sand"],
    shapes: [
      // afterimage
      { t: "cap", a: [-0.2, 0.7, -0.12], b: [-0.24, 0.12, -0.14], r: [0.12, 0.24], col: "ghost", k: 0.04 },
      { t: "ell", c: [-0.14, 0.78, -0.12], r: [0.13, 0.13, 0.13], col: "ghost", k: 0.06 },
      // cloak
      { t: "cap", a: [0.02, 0.66, 0], b: [0.0, 0.16, 0], r: [0.14, 0.28], col: "cloak", k: 0.08 },
      { t: "ell", c: [0.0, 0.1, 0], r: [0.3, 0.1, 0.3], col: "cloak", k: 0.08 },
      { t: "box", c: [0, -0.06, 0], s: [0.5, 0.06, 0.5], round: 0.01, col: "cloak", cut: true, k: 0.02 },
      { t: "ell", c: [0.2, 0.36, 0], r: [0.12, 0.3, 0.06], col: "lining", paint: true },
      ...line([[0.16, 0.14, 0.24], [0.04, 0.16, 0.29], [-0.08, 0.14, 0.29], [-0.2, 0.16, 0.24]], "glow", 0.014),
      // hood
      { t: "ell", c: [0.06, 0.82, 0], r: [0.16, 0.16, 0.15], col: "cloak", k: 0.07 },
      { t: "cap", a: [0.0, 0.94, 0], b: [-0.16, 1.02, 0], r: [0.08, 0.02], col: "cloak", k: 0.05 },
      { t: "ell", c: [0.18, 0.8, 0], r: [0.08, 0.1, 0.1], col: "face", paint: true },
      { t: "tor", c: [0.17, 0.8, 0], R: 0.105, r: 0.02, rot: [0, 0, 90], col: "light", k: 0.02 },
      // clock clasp
      { t: "tor", c: [0.17, 0.6, 0.06], R: 0.04, r: 0.012, rot: [0, 0, 80], col: "gold", k: 0.01 },
      // loading halo
      { t: "tor", c: [-0.02, 1.04, 0], R: 0.13, r: 0.018, rot: [0, 0, 12], col: "glow", k: 0 },
      { t: "box", c: [0.1, 1.04, 0.1], s: [0.06, 0.04, 0.06], round: 0.01, col: "face", cut: true, k: 0 },
      // arm and hourglass
      { t: "cap", a: [0.06, 0.62, 0.16], b: [0.24, 0.44, 0.24], r: [0.06, 0.05], col: "cloak", k: 0.04 },
      { t: "box", c: [0.3, 0.6, 0.24], s: [0.05, 0.012, 0.05], round: 0.006, col: "gold", k: 0 },
      { t: "box", c: [0.3, 0.32, 0.24], s: [0.05, 0.012, 0.05], round: 0.006, col: "gold", k: 0 },
      { t: "cap", a: [0.3, 0.59, 0.24], b: [0.3, 0.46, 0.24], r: [0.04, 0.01], col: "sand", k: 0.01 },
      { t: "cap", a: [0.3, 0.33, 0.24], b: [0.3, 0.46, 0.24], r: [0.04, 0.01], col: "sand", k: 0.01 },
      { t: "cap", a: [0.35, 0.6, 0.24], b: [0.35, 0.32, 0.24], r: [0.01, 0.01], col: "gold", k: 0 },
      { t: "cap", a: [0.25, 0.6, 0.24], b: [0.25, 0.32, 0.24], r: [0.01, 0.01], col: "gold", k: 0 },
    ],
    eyes: [{ at: [0.18, 0.82, 0.04], r: 0.05, iris: "#ff4ad8", mirror: true, angry: true }],
  },

  // Void giant: indigo bulk pocked with checkerboard holes where it doesn't exist, a glowing Ø core, a hand fraying into pixels.
  "coloso-nulo": {
    palette: { body: "#5a5290", light: "#7a72b0", dark: "#28243e", hole: "#eeeef6", hole2: "#9a98ae", glow: RUIDO },
    glow: ["glow"],
    shapes: [
      { t: "cap", a: [-0.02, 0.32, 0.13], b: [0.0, 0.08, 0.14], r: [0.12, 0.11], col: "dark", mirror: true, k: 0.05 },
      { t: "ell", c: [0.02, 0.06, 0.14], r: [0.13, 0.06, 0.12], col: "body", mirror: true, k: 0.03 },
      { t: "ell", c: [0, 0.58, 0], r: [0.27, 0.3, 0.26], col: "body", k: 0.08 },
      { t: "ell", c: [0.18, 0.86, 0], r: [0.12, 0.11, 0.12], col: "body", k: 0.07 },
      { t: "ell", c: [0.0, 0.76, 0.26], r: [0.14, 0.12, 0.12], col: "light", mirror: true, k: 0.06 },
      { t: "cap", a: [0.04, 0.7, 0.32], b: [0.16, 0.34, 0.38], r: [0.1, 0.085], col: "body", mirror: true, k: 0.05 },
      { t: "ell", c: [0.18, 0.26, -0.38], r: [0.11, 0.1, 0.1], col: "light", k: 0.04 },
      { t: "ell", c: [0.18, 0.28, 0.38], r: [0.08, 0.07, 0.08], col: "light", k: 0.04 },
      ...[[0.26, 0.16, 0.38], [0.18, 0.12, 0.44], [0.32, 0.24, 0.46], [0.36, 0.1, 0.36], [0.28, 0.04, 0.44]].map((c, i): Shape => ({ t: "box", c: c as V3, s: [0.025, 0.025, 0.025], round: 0.005, col: i % 2 ? "glow" : "light", k: 0 })),
      // Ø core
      { t: "tor", c: [0.25, 0.6, 0], R: 0.07, r: 0.018, rot: [0, 0, 90], col: "glow", paint: true },
      { t: "cap", a: [0.27, 0.52, -0.05], b: [0.27, 0.68, 0.05], r: [0.016, 0.016], col: "glow", paint: true },
      // null holes
      ...[[0.06, 0.66, 0.26], [-0.12, 0.44, 0.22], [0.12, 0.42, 0.42], [0.06, 0.82, 0.36], [0.0, 0.12, 0.26]].flatMap((c): Shape[] => [
        { t: "box", c: c as V3, s: [0.045, 0.045, 0.045], round: 0.004, col: "hole2", paint: true },
        { t: "box", c: [c[0] + 0.0225, c[1] + 0.0225, c[2]], s: [0.0225, 0.0225, 0.05], round: 0.002, col: "hole", paint: true },
        { t: "box", c: [c[0] - 0.0225, c[1] - 0.0225, c[2]], s: [0.0225, 0.0225, 0.05], round: 0.002, col: "hole", paint: true },
      ]),
      ...line([[-0.08, 0.86, 0.2], [0.0, 0.72, 0.24], [-0.04, 0.6, 0.26]], "glow", 0.012),
      ...line([[0.14, 0.52, 0.18], [0.2, 0.44, 0.14]], "glow", 0.012),
    ],
    eyes: [{ at: [0.24, 0.9, 0.05], r: 0.06, iris: "#ff4ad8", mirror: true, angry: true }],
  },

  // Six-winged white-and-gold angel with a halo, a verifying lance and a glowing check mark on its breastplate.
  "arcangel-checksum": {
    palette: { armour: "#e6ecfa", shade: "#aeb6d4", gold: "#f0be4a", wing: "#3e9ad0", wing2: "#76cae6", dark: "#2e406c", glow: SENAL },
    glow: ["glow"],
    shapes: [
      { t: "cap", a: [0.0, 0.42, 0], b: [0.0, 0.08, 0], r: [0.1, 0.17], col: "armour", k: 0.06 },
      { t: "cap", a: [0.02, 0.12, 0.08], b: [0.04, 0.02, 0.08], r: [0.05, 0.04], col: "shade", mirror: true, k: 0.03 },
      ...[0.0, 1.0, 2.0, 3.0].map((i): Shape => ({ t: "cap", a: [0.1, 0.38, 0.0], b: [Math.cos(0.3 + i * 0.42) * 0.16, 0.06, Math.sin(0.3 + i * 0.42) * 0.16], r: [0.012, 0.012], col: "glow", paint: true })),
      { t: "ell", c: [0.0, 0.58, 0], r: [0.13, 0.15, 0.13], col: "armour", k: 0.06 },
      { t: "tor", c: [0, 0.44, 0], R: 0.12, r: 0.03, col: "gold", k: 0.02 },
      ...line([[0.11, 0.6, -0.04], [0.13, 0.55, 0.0], [0.11, 0.66, 0.07]], "glow", 0.018),
      { t: "ell", c: [0.0, 0.7, 0.13], r: [0.07, 0.06, 0.06], col: "gold", mirror: true, k: 0.02 },
      // head, helm band, halo
      { t: "ell", c: [0.06, 0.84, 0], r: [0.11, 0.1, 0.1], col: "armour", k: 0.06 },
      { t: "ell", c: [0.04, 0.92, 0], r: [0.12, 0.025, 0.12], rot: [0, 0, -10], col: "gold", paint: true },
      { t: "tor", c: [0.0, 1.04, 0], R: 0.1, r: 0.018, rot: [0, 0, -14], col: "gold", k: 0 },
      // wings: three pairs fanning out behind
      { t: "ell", c: [-0.18, 0.86, 0.12], r: [0.26, 0.07, 0.025], rot: [-18, 0, -34], col: "wing", mirror: true, k: 0.04 },
      { t: "ell", c: [-0.22, 0.66, 0.14], r: [0.28, 0.07, 0.025], rot: [-18, 0, -6], col: "wing2", mirror: true, k: 0.04 },
      { t: "ell", c: [-0.18, 0.46, 0.12], r: [0.24, 0.06, 0.025], rot: [-18, 0, 22], col: "wing", mirror: true, k: 0.04 },
      // arm and lance
      { t: "cap", a: [0.02, 0.68, 0.15], b: [0.16, 0.54, 0.2], r: [0.05, 0.045], col: "armour", k: 0.04 },
      { t: "cap", a: [0.2, 0.02, 0.2], b: [0.2, 1.0, 0.2], r: [0.018, 0.018], col: "gold", k: 0 },
      { t: "cap", a: [0.2, 1.0, 0.2], b: [0.2, 1.12, 0.2], r: [0.035, 0.006], col: "glow", k: 0 },
      { t: "tor", c: [0.2, 0.98, 0.2], R: 0.03, r: 0.012, col: "gold", k: 0 },
    ],
    eyes: [{ at: [0.12, 0.85, 0.05], r: 0.06, iris: "#2ad8ff", mirror: true }],
  },
  // Green-skinned empress in a spiked violet gown, crowned by a giant pink capsid with one infecting eye.
  "emperatriz-virica": {
    palette: { gown: "#6a34a4", light: "#8a4ac2", skin: "#52b05c", capsid: "#e05a9a", spike: "#f282b8", dark: "#2a2046", glow: RUIDO },
    glow: ["glow"],
    shapes: [
      { t: "cap", a: [0.0, 0.58, 0], b: [0.0, 0.3, 0], r: [0.1, 0.22], col: "gown", k: 0.06 },
      { t: "ell", c: [0, 0.14, 0], r: [0.32, 0.16, 0.32], col: "gown", k: 0.1 },
      ...[0, 1, 2, 3, 4, 5, 6, 7].map((i): Shape => {
        const a = (i / 8) * Math.PI * 2 + 0.2;
        return { t: "cap", a: [Math.cos(a) * 0.24, 0.12, Math.sin(a) * 0.24], b: [Math.cos(a) * 0.4, 0.05, Math.sin(a) * 0.4], r: [0.05, 0.014], col: "gown", k: 0.04 };
      }),
      { t: "box", c: [0, -0.08, 0], s: [0.5, 0.08, 0.5], round: 0.01, col: "gown", cut: true, k: 0.02 },
      { t: "ell", c: [0.12, 0.36, 0], r: [0.1, 0.3, 0.08], col: "light", paint: true },
      ...[[0.2, 0.3, 0.12], [0.1, 0.18, 0.24], [-0.06, 0.26, 0.24], [0.06, 0.42, 0.15], [0.24, 0.14, 0.04]].map((c): Shape => ({ t: "ell", c: c as V3, r: [0.03, 0.03, 0.03], col: "glow", paint: true })),
      ...line([[0.17, 0.5, 0], [0.26, 0.1, 0]], "glow", 0.012),
      // bodice and collar
      { t: "ell", c: [0.02, 0.6, 0], r: [0.1, 0.1, 0.11], col: "gown", k: 0.05 },
      { t: "ell", c: [0.02, 0.68, 0.0], r: [0.08, 0.04, 0.16], col: "skin", k: 0.04 },
      // capsid head
      { t: "ell", c: [0.06, 0.86, 0], r: [0.16, 0.16, 0.16], col: "capsid", k: 0.04 },
      ...[[0, 1], [40, 1], [80, 1], [130, 1], [180, 0], [-40, 0], [100, 0]].flatMap(([deg, mir]): Shape[] => {
        const a = (deg * Math.PI) / 180;
        const dir: V3 = [Math.cos(a) * 0.7, Math.sin(a), 0];
        return [{ t: "cap", a: [0.06 + dir[0] * 0.12, 0.86 + dir[1] * 0.12, 0.08], b: [0.06 + dir[0] * 0.24, 0.86 + dir[1] * 0.24, 0.16], r: [0.04, 0.012], col: "spike", k: 0.02, mirror: !!mir || true }];
      }),
      { t: "ell", c: [0.18, 0.85, 0], r: [0.06, 0.1, 0.11], col: "skin", paint: true },
      // arms
      { t: "cap", a: [0.04, 0.64, 0.12], b: [0.14, 0.48, 0.2], r: [0.04, 0.035], col: "skin", mirror: true, k: 0.04 },
      { t: "cap", a: [0.14, 0.48, 0.2], b: [0.28, 0.54, 0.22], r: [0.035, 0.03], col: "skin", k: 0.03 },
      { t: "ell", c: [0.38, 0.6, 0.22], r: [0.05, 0.05, 0.05], col: "glow", k: 0 },
      { t: "ell", c: [0.28, 0.84, -0.2], r: [0.045, 0.045, 0.045], col: "glow", k: 0 },
    ],
    eyes: [{ at: [0.12, 0.86, 0], r: 0.1, iris: "#ff2a8a", angry: true, look: [0.85, 0.05, 0.55] }],
  },

  // Colossal ringed worm coiled around the globe of the Red, rearing its round, toothed maw.
  "gusano-mundial": {
    palette: { body: "#d8704e", light: "#ffa47e", band: "#6a4c9a", globe: "#1e3458", sea: "#2e4c7a", bone: "#f2e8ea", maw: "#3a1424", glow: RUIDO },
    glow: ["glow"],
    shapes: [
      { t: "ell", c: [-0.04, 0.52, 0], r: [0.32, 0.32, 0.32], col: "globe" },
      { t: "tor", c: [-0.04, 0.52, 0], R: 0.31, r: 0.014, col: "glow", paint: true },
      { t: "tor", c: [-0.04, 0.52, 0], R: 0.31, r: 0.014, rot: [0, 0, 90], col: "glow", paint: true },
      { t: "tor", c: [-0.04, 0.52, 0], R: 0.31, r: 0.014, rot: [0, 50, 90], col: "glow", paint: true },
      { t: "tor", c: [-0.04, 0.52, 0], R: 0.31, r: 0.014, rot: [0, -50, 90], col: "glow", paint: true },
      { t: "ell", c: [0.08, 0.62, 0.22], r: [0.08, 0.06, 0.06], col: "sea", paint: true },
      { t: "ell", c: [-0.16, 0.42, 0.24], r: [0.07, 0.08, 0.06], col: "sea", paint: true },
      { t: "tor", c: [-0.04, 0.52, 0], R: 0.41, r: 0.095, rot: [90, 0, 0], col: "body", k: 0.03 },
      ...[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((i): Shape => {
        const a = (i / 11) * Math.PI * 2 + 0.2;
        return { t: "ell", c: [-0.04 + Math.cos(a) * 0.41, 0.52 + Math.sin(a) * 0.41, 0], r: [0.13, 0.035, 0.13], rot: [0, 0, (a * 180) / Math.PI], col: "band", paint: true };
      }),
      // rearing neck and toothed maw
      ...chain([[0.34, 0.34, 0.02, 0.095], [0.48, 0.46, 0.08, 0.095], [0.54, 0.62, 0.1, 0.1]], "body", 0.05),
      { t: "ell", c: [0.58, 0.72, 0.1], r: [0.13, 0.13, 0.13], col: "body", k: 0.06 },
      { t: "ell", c: [0.5, 0.52, 0.14], r: [0.12, 0.035, 0.12], rot: [0, 0, 40], col: "band", paint: true },
      { t: "tor", c: [0.68, 0.72, 0.1], R: 0.075, r: 0.025, rot: [0, 0, 90], col: "bone", k: 0.02 },
      { t: "ell", c: [0.72, 0.72, 0.1], r: [0.06, 0.075, 0.075], col: "maw", cut: true, k: 0.01 },
      { t: "ell", c: [0.68, 0.72, 0.1], r: [0.06, 0.06, 0.06], col: "maw", paint: true },
      // tail trailing off the top
      ...chain([[-0.3, 0.84, 0, 0.08], [-0.5, 0.94, -0.02, 0.055], [-0.62, 0.86, -0.02, 0.03]], "body", 0.04),
      { t: "ell", c: [-0.46, 0.93, -0.02], r: [0.025, 0.08, 0.08], rot: [0, 0, 20], col: "band", paint: true },
    ],
    eyes: [{ at: [0.6, 0.8, 0.12], r: 0.05, iris: "#ffd23a", mirror: true, angry: true, look: [0.2, 0.3, 0.9] }],
  },

  // Ancient elk of bark and moss on root legs, antlers branching like a directory tree with glowing amber nodes.
  "guardian-raiz": {
    palette: { bark: "#8a5e40", light: "#b08660", moss: "#4e9a48", leaf: "#7cc85c", antler: "#e8dcc0", dark: "#3a3038", glow: PULSO },
    glow: ["glow"],
    shapes: [
      { t: "ell", c: [-0.06, 0.44, 0], r: [0.32, 0.15, 0.17], col: "bark" },
      { t: "ell", c: [-0.06, 0.56, 0], r: [0.32, 0.08, 0.19], col: "moss", k: 0.04 },
      ...[[-0.3, 0.12], [-0.14, 0.17], [0.06, 0.16], [0.18, 0.13]].map(([x, z]): Shape => ({ t: "cap", a: [x, 0.52, z], b: [x + 0.01, 0.4, z + 0.03], r: [0.035, 0.02], col: "moss", mirror: true, k: 0.03 })),
      { t: "cap", a: [0.16, 0.38, 0.1], b: [0.18, 0.06, 0.12], r: [0.06, 0.045], col: "bark", mirror: true, k: 0.04 },
      { t: "cap", a: [-0.26, 0.38, 0.1], b: [-0.28, 0.06, 0.12], r: [0.065, 0.045], col: "bark", mirror: true, k: 0.04 },
      { t: "cap", a: [0.18, 0.06, 0.12], b: [0.26, 0.02, 0.15], r: [0.04, 0.015], col: "light", mirror: true, k: 0.03 },
      { t: "cap", a: [-0.28, 0.06, 0.12], b: [-0.2, 0.02, 0.15], r: [0.04, 0.015], col: "light", mirror: true, k: 0.03 },
      ...line([[0.19, 0.3, 0.17], [0.18, 0.12, 0.17]], "glow", 0.012),
      ...line([[-0.23, 0.3, 0.17], [-0.26, 0.12, 0.17]], "glow", 0.012),
      // neck and head
      ...chain([[0.18, 0.5, 0, 0.1], [0.3, 0.66, 0, 0.075]], "bark", 0.06),
      { t: "ell", c: [0.36, 0.72, 0], r: [0.11, 0.09, 0.09], col: "bark", k: 0.06 },
      { t: "cap", a: [0.4, 0.7, 0], b: [0.52, 0.64, 0], r: [0.065, 0.045], col: "light", k: 0.05 },
      { t: "cap", a: [0.3, 0.76, 0.07], b: [0.24, 0.8, 0.16], r: [0.03, 0.012], col: "light", mirror: true, k: 0.02 },
      { t: "ell", c: [0.24, 0.56, 0.0], r: [0.08, 0.06, 0.1], col: "moss", k: 0.04 },
      // antlers: a root directory tree
      ...chain([[0.32, 0.8, 0.05, 0.026], [0.28, 0.94, 0.1, 0.022], [0.22, 1.08, 0.14, 0.018]], "antler", 0.02, true),
      { t: "cap", a: [0.28, 0.94, 0.1], b: [0.38, 1.04, 0.14], r: [0.018, 0.014], col: "antler", mirror: true, k: 0.01 },
      { t: "cap", a: [0.25, 1.01, 0.12], b: [0.14, 1.06, 0.16], r: [0.016, 0.012], col: "antler", mirror: true, k: 0.01 },
      ...[[0.22, 1.1, 0.14], [0.39, 1.05, 0.14], [0.13, 1.07, 0.16]].map((c): Shape => ({ t: "ell", c: c as V3, r: [0.028, 0.028, 0.028], col: "glow", mirror: true, k: 0.01 })),
      { t: "ell", c: [0.28, 0.95, 0.1], r: [0.04, 0.03, 0.04], col: "leaf", mirror: true, k: 0.01 },
      // tail
      { t: "cap", a: [-0.36, 0.48, 0], b: [-0.44, 0.4, 0], r: [0.05, 0.02], col: "moss", k: 0.04 },
    ],
    eyes: [{ at: [0.42, 0.76, 0.05], r: 0.05, iris: "#ffc23a", mirror: true }],
  },

  // Cobalt dragon bursting out of its broken memory frame: pale chest plates, magenta horns, wings ruled with glowing grids.
  "dragon-desbordamiento": {
    palette: { body: "#3a5cc4", light: "#6c98ee", chest: "#cdeefa", wing: "#1e2856", horn: "#c858c4", frame: SENAL, dark: "#121838", glow: SENAL },
    glow: ["glow", "frame"],
    shapes: [
      { t: "cap", a: [-0.02, 0.3, 0.12], b: [0.02, 0.06, 0.14], r: [0.1, 0.07], col: "body", mirror: true, k: 0.05 },
      { t: "ell", c: [0.07, 0.04, 0.14], r: [0.1, 0.04, 0.07], col: "light", mirror: true, k: 0.03 },
      { t: "ell", c: [0, 0.48, 0], r: [0.2, 0.26, 0.2], rot: [0, 0, -10], col: "body", k: 0.06 },
      { t: "ell", c: [0.1, 0.46, 0], r: [0.12, 0.22, 0.15], rot: [0, 0, -10], col: "chest", paint: true },
      ...[0.36, 0.5].map((y): Shape => ({ t: "ell", c: [0.12, y, 0], r: [0.12, 0.014, 0.14], col: "glow", paint: true })),
      ...chain([[0.06, 0.66, 0, 0.11], [0.14, 0.8, 0, 0.085]], "body", 0.06),
      { t: "ell", c: [0.2, 0.86, 0], r: [0.13, 0.1, 0.1], col: "body", k: 0.06 },
      { t: "cap", a: [0.26, 0.84, 0], b: [0.4, 0.8, 0], r: [0.075, 0.055], col: "body", k: 0.05 },
      { t: "ell", c: [0.32, 0.78, 0], r: [0.1, 0.025, 0.07], col: "chest", paint: true },
      { t: "cap", a: [0.14, 0.92, 0.06], b: [0.0, 1.04, 0.12], r: [0.035, 0.008], col: "horn", mirror: true, k: 0.02 },
      { t: "cap", a: [0.08, 0.84, 0.08], b: [-0.04, 0.88, 0.14], r: [0.03, 0.008], col: "horn", mirror: true, k: 0.02 },
      // arms
      { t: "cap", a: [0.1, 0.58, 0.14], b: [0.26, 0.48, 0.2], r: [0.05, 0.04], col: "body", mirror: true, k: 0.04 },
      { t: "cap", a: [0.26, 0.48, 0.2], b: [0.32, 0.42, 0.22], r: [0.03, 0.01], col: "light", mirror: true, k: 0.02 },
      // wings with grids
      { t: "ell", c: [-0.14, 0.88, 0.18], r: [0.1, 0.28, 0.03], rot: [-16, 0, 24], col: "wing", mirror: true, k: 0.04 },
      { t: "ell", c: [-0.28, 0.78, 0.18], r: [0.09, 0.24, 0.03], rot: [-16, 0, 56], col: "wing", mirror: true, k: 0.04 },
      { t: "cap", a: [-0.04, 0.64, 0.14], b: [-0.2, 1.08, 0.24], r: [0.03, 0.02], col: "body", mirror: true, k: 0.03 },
      ...line([[-0.1, 0.7, 0.22], [-0.22, 1.0, 0.24]], "glow", 0.013),
      ...line([[-0.12, 0.66, 0.21], [-0.44, 0.86, 0.23]], "glow", 0.013),
      ...line([[-0.14, 0.92, 0.24], [-0.36, 0.7, 0.21]], "glow", 0.013),
      // tail
      ...chain([[-0.14, 0.32, 0, 0.1], [-0.34, 0.16, 0.06, 0.07], [-0.5, 0.1, 0.12, 0.045], [-0.6, 0.18, 0.12, 0.02]], "body", 0.05),
      // broken memory frame behind
      { t: "box", c: [-0.18, 0.02, -0.18], s: [0.34, 0.018, 0.018], round: 0.008, col: "frame", k: 0 },
      { t: "box", c: [-0.5, 0.36, -0.18], s: [0.018, 0.34, 0.018], round: 0.008, col: "frame", k: 0 },
      { t: "box", c: [-0.36, 0.7, -0.18], s: [0.14, 0.018, 0.018], round: 0.008, col: "frame", k: 0 },
      { t: "box", c: [-0.5, 0.72, -0.18], s: [0.018, 0.05, 0.018], round: 0.008, col: "frame", k: 0 },
    ],
    eyes: [{ at: [0.28, 0.88, 0.05], r: 0.055, iris: "#ffea3a", mirror: true, angry: true }],
  },
};

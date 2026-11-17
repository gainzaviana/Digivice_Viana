import type { Sculpt, Shape, V3 } from "../sculpt";

// Forja: an ember that grows into a sun-forge dragon (warm amber glow, circuit veins, anvil plates).

const fire = {
  body: "#d43c32", belly: "#f7a03c", plate: "#ffc95a", horn: "#5e5a7c", iron: "#625e80", dark: "#3a2c48",
  wing: "#5a3e66", flame: "#ff8a2a", core: "#ffe27a", vein: "#ffd23a", cheek: "#ff9a7a",
};

// Baby and Stage 1 share a softer, brighter red.
const ember = { ...fire, body: "#e8503a" };

export const forja: Record<string, Sculpt> = {
  // Brote: a round ember baby, three-tongue flame crown, horn nubs, glowing circuit heart, flame-tipped tail.
  chispin: {
    palette: ember,
    glow: ["flame", "core", "vein"],
    shapes: [
      { t: "ell", c: [0, 0.4, 0], r: [0.35, 0.36, 0.34], col: "body" },
      { t: "ell", c: [0.2, 0.25, 0], r: [0.22, 0.17, 0.25], col: "belly", paint: true },
      { t: "box", c: [0.33, 0.24, 0], s: [0.06, 0.035, 0.035], round: 0.02, col: "vein", paint: true },
      { t: "cap", a: [0.31, 0.24, 0.07], b: [0.27, 0.24, 0.16], r: [0.014, 0.014], col: "vein", paint: true, mirror: true },
      // Feet with amber toes
      { t: "ell", c: [0.1, 0.06, 0.17], r: [0.12, 0.065, 0.1], col: "body", mirror: true, k: 0.06 },
      { t: "ell", c: [0.2, 0.03, 0.17], r: [0.04, 0.03, 0.08], col: "belly", paint: true, mirror: true },
      // Stubby arms
      { t: "ell", c: [0.1, 0.36, 0.33], r: [0.08, 0.1, 0.07], col: "body", mirror: true, k: 0.06, rot: [-20, 0, 0] },
      // Flame crown: three tongues
      { t: "cap", a: [-0.02, 0.66, 0], b: [-0.08, 1.02, 0], r: [0.16, 0.02], col: "flame", k: 0.1 },
      { t: "cap", a: [0.0, 0.66, 0.1], b: [-0.02, 0.9, 0.2], r: [0.1, 0.015], col: "flame", mirror: true, k: 0.06 },
      { t: "cap", a: [0.0, 0.72, 0.02], b: [-0.05, 0.92, 0.05], r: [0.08, 0.01], col: "core", paint: true },
      // Horn nubs on the sides of the head
      { t: "cap", a: [0.04, 0.64, 0.24], b: [-0.02, 0.8, 0.34], r: [0.055, 0.012], col: "horn", mirror: true, k: 0.02 },
      // Tail curling out with a little flame
      { t: "cap", a: [-0.28, 0.2, 0], b: [-0.46, 0.24, 0], r: [0.08, 0.05], col: "body", k: 0.06 },
      { t: "cap", a: [-0.46, 0.24, 0], b: [-0.52, 0.36, 0], r: [0.05, 0.04], col: "body", k: 0.03 },
      { t: "cap", a: [-0.52, 0.38, 0], b: [-0.55, 0.58, 0], r: [0.075, 0.012], col: "flame", k: 0.04 },
      { t: "ell", c: [-0.52, 0.42, 0.03], r: [0.035, 0.06, 0.05], col: "core", paint: true },
      // Circuit veins on the sides
      { t: "cap", a: [0.16, 0.42, 0.3], b: [0.12, 0.3, 0.32], r: [0.013, 0.013], col: "vein", paint: true, mirror: true },
      { t: "cap", a: [0.12, 0.3, 0.32], b: [0.2, 0.26, 0.3], r: [0.013, 0.013], col: "vein", paint: true, mirror: true },
      // Little open mouth and blush
      { t: "ell", c: [0.34, 0.37, 0], r: [0.05, 0.022, 0.05], col: "dark", paint: true },
      { t: "ell", c: [0.26, 0.42, 0.21], r: [0.05, 0.03, 0.05], col: "cheek", paint: true, mirror: true },
    ],
    eyes: [{ at: [0.24, 0.52, 0.13], r: 0.13, iris: "#ff8a1a", mirror: true }],
  },

  // Novato: an amber-red salamander on all fours, big head, flame gills, glowing circuit veins, burning tail.
  brasko: {
    palette: ember,
    glow: ["flame", "core", "vein"],
    shapes: [
      { t: "ell", c: [-0.04, 0.34, 0], r: [0.3, 0.19, 0.2], col: "body" },
      { t: "ell", c: [0.0, 0.2, 0], r: [0.3, 0.1, 0.22], col: "belly", paint: true },
      // Legs
      { t: "cap", a: [0.14, 0.3, 0.12], b: [0.2, 0.06, 0.15], r: [0.075, 0.068], col: "body", mirror: true, k: 0.05 },
      { t: "cap", a: [-0.2, 0.3, 0.12], b: [-0.22, 0.06, 0.15], r: [0.085, 0.072], col: "body", mirror: true, k: 0.05 },
      { t: "ell", c: [0.24, 0.04, 0.16], r: [0.09, 0.045, 0.075], col: "body", mirror: true, k: 0.03 },
      { t: "ell", c: [-0.18, 0.04, 0.16], r: [0.09, 0.045, 0.075], col: "body", mirror: true, k: 0.03 },
      // Big head with an amber jaw
      { t: "ell", c: [0.34, 0.62, 0], r: [0.25, 0.22, 0.22], col: "body", k: 0.1 },
      { t: "ell", c: [0.54, 0.56, 0], r: [0.15, 0.11, 0.15], col: "body", k: 0.07 },
      { t: "ell", c: [0.48, 0.49, 0], r: [0.22, 0.07, 0.18], col: "belly", paint: true },
      { t: "cap", a: [0.56, 0.52, 0.12], b: [0.69, 0.535, 0.05], r: [0.012, 0.012], col: "dark", paint: true },
      // Flame gills behind the head
      { t: "cap", a: [0.2, 0.74, 0.15], b: [0.06, 0.9, 0.26], r: [0.06, 0.012], col: "flame", mirror: true, k: 0.03 },
      { t: "cap", a: [0.18, 0.64, 0.19], b: [0.02, 0.68, 0.32], r: [0.055, 0.01], col: "flame", mirror: true, k: 0.03 },
      // Horns
      { t: "cap", a: [0.3, 0.8, 0.08], b: [0.22, 0.98, 0.1], r: [0.04, 0.008], col: "horn", mirror: true, k: 0.02 },
      // Flame spines on the back
      { t: "cap", a: [0.02, 0.5, 0], b: [-0.04, 0.64, 0], r: [0.05, 0.01], col: "flame", k: 0.03 },
      { t: "cap", a: [-0.14, 0.5, 0], b: [-0.22, 0.62, 0], r: [0.045, 0.01], col: "flame", k: 0.03 },
      // Tail curling up into a flame
      { t: "cap", a: [-0.28, 0.34, 0], b: [-0.48, 0.42, 0], r: [0.1, 0.07], col: "body", k: 0.06 },
      { t: "cap", a: [-0.48, 0.42, 0], b: [-0.52, 0.62, 0], r: [0.07, 0.05], col: "body", k: 0.04 },
      { t: "cap", a: [-0.52, 0.64, 0], b: [-0.5, 0.92, 0], r: [0.09, 0.015], col: "flame", k: 0.05 },
      { t: "ell", c: [-0.51, 0.7, 0.04], r: [0.05, 0.08, 0.06], col: "core", paint: true },
      // Glowing circuit veins along the flank and head
      { t: "cap", a: [-0.24, 0.38, 0.19], b: [0.1, 0.4, 0.19], r: [0.018, 0.018], col: "vein", paint: true, mirror: true },
      { t: "cap", a: [-0.06, 0.39, 0.2], b: [-0.02, 0.24, 0.2], r: [0.018, 0.018], col: "vein", paint: true, mirror: true },
      { t: "cap", a: [0.22, 0.6, 0.2], b: [0.3, 0.52, 0.2], r: [0.016, 0.016], col: "vein", paint: true, mirror: true },
    ],
    eyes: [{ at: [0.42, 0.68, 0.13], r: 0.11, iris: "#ff8a1a", mirror: true }],
  },

  // Avanzado: an upright forge dragon with anvil scale plates and a red-hot tempered tail.
  fraguadrako: {
    palette: fire,
    glow: ["flame", "core", "vein"],
    shapes: [
      { t: "ell", c: [-0.02, 0.4, 0], r: [0.22, 0.27, 0.2], col: "body", rot: [0, 0, -12] },
      { t: "ell", c: [0.12, 0.38, 0], r: [0.14, 0.24, 0.17], col: "belly", paint: true, rot: [0, 0, -12] },
      ...[0.3, 0.41, 0.52].map((y): Shape => ({ t: "ell", c: [0.12, y, 0], r: [0.16, 0.011, 0.13], col: "plate", paint: true, rot: [0, 0, -12] })),
      // Neck and head
      { t: "cap", a: [0.06, 0.58, 0], b: [0.2, 0.78, 0], r: [0.12, 0.1], col: "body", k: 0.08 },
      { t: "ell", c: [0.28, 0.84, 0], r: [0.15, 0.12, 0.13], col: "body", k: 0.08 },
      { t: "ell", c: [0.44, 0.8, 0], r: [0.13, 0.075, 0.095], col: "body", k: 0.06 },
      { t: "ell", c: [0.4, 0.74, 0], r: [0.16, 0.045, 0.11], col: "belly", paint: true },
      { t: "cap", a: [0.4, 0.765, 0.085], b: [0.56, 0.775, 0.04], r: [0.011, 0.011], col: "dark", paint: true, mirror: true },
      // Swept-back horns and cheek spikes
      { t: "cap", a: [0.24, 0.94, 0.07], b: [0.1, 1.04, 0.1], r: [0.045, 0.028], col: "horn", mirror: true, k: 0.02 },
      { t: "cap", a: [0.1, 1.04, 0.1], b: [-0.02, 1.05, 0.11], r: [0.028, 0.006], col: "horn", mirror: true, k: 0.01 },
      { t: "cap", a: [0.24, 0.78, 0.11], b: [0.12, 0.74, 0.16], r: [0.026, 0.006], col: "horn", k: 0.01 },
      // Arms with iron bracers
      { t: "cap", a: [0.1, 0.52, 0.15], b: [0.24, 0.42, 0.2], r: [0.065, 0.05], col: "body", mirror: true, k: 0.05 },
      { t: "cap", a: [0.24, 0.42, 0.2], b: [0.36, 0.44, 0.2], r: [0.058, 0.058], col: "iron", mirror: true, k: 0.01 },
      { t: "ell", c: [0.42, 0.44, 0.2], r: [0.06, 0.055, 0.06], col: "body", mirror: true, k: 0.02 },
      { t: "cap", a: [0.46, 0.42, 0.2], b: [0.52, 0.38, 0.2], r: [0.022, 0.006], col: "horn", k: 0.01 },
      // Legs
      { t: "ell", c: [-0.04, 0.2, 0.15], r: [0.14, 0.14, 0.09], col: "body", mirror: true, k: 0.06 },
      { t: "ell", c: [0.06, 0.045, 0.16], r: [0.13, 0.045, 0.08], col: "body", mirror: true, k: 0.04 },
      { t: "cap", a: [0.17, 0.04, 0.16], b: [0.23, 0.02, 0.16], r: [0.025, 0.008], col: "horn", k: 0.01 },
      // Anvil plates: thigh, shoulder, spine
      { t: "box", c: [-0.04, 0.24, 0.235], s: [0.075, 0.045, 0.03], round: 0.015, col: "iron", k: 0, rot: [0, 0, 12] },
      { t: "box", c: [0.04, 0.56, 0.19], s: [0.075, 0.04, 0.035], round: 0.015, col: "iron", k: 0, rot: [0, 0, -30] },
      ...([[-0.25, 0.58, 50], [-0.14, 0.72, 35], [-0.32, 0.42, 75]] as [number, number, number][]).map(([x, y, a]): Shape => ({ t: "box", c: [x, y, 0], s: [0.075, 0.032, 0.065], round: 0.018, col: "iron", k: 0, rot: [0, 0, a] })),
      // Tail curling up, iron sleeve, red-hot glowing tip
      { t: "cap", a: [-0.18, 0.22, 0], b: [-0.4, 0.1, 0], r: [0.11, 0.08], col: "body", k: 0.06 },
      { t: "cap", a: [-0.4, 0.1, 0], b: [-0.58, 0.2, 0], r: [0.08, 0.06], col: "body", k: 0.04 },
      { t: "cap", a: [-0.58, 0.2, 0], b: [-0.6, 0.38, 0], r: [0.065, 0.05], col: "iron", k: 0.01 },
      { t: "cap", a: [-0.59, 0.26, 0], b: [-0.6, 0.34, 0], r: [0.07, 0.07], col: "core", paint: true },
      { t: "cap", a: [-0.6, 0.4, 0], b: [-0.62, 0.62, 0], r: [0.075, 0.012], col: "flame", k: 0.04 },
      { t: "ell", c: [-0.6, 0.44, 0.03], r: [0.035, 0.06, 0.05], col: "core", paint: true },
      // Circuit veins
      { t: "cap", a: [-0.18, 0.46, 0.17], b: [-0.08, 0.36, 0.2], r: [0.016, 0.016], col: "vein", paint: true },
      { t: "cap", a: [-0.08, 0.36, 0.2], b: [-0.1, 0.24, 0.22], r: [0.016, 0.016], col: "vein", paint: true },
    ],
    eyes: [{ at: [0.36, 0.88, 0.08], r: 0.075, iris: "#ff8a1a", mirror: true, angry: true }],
  },

  // Élite: a heavy winged dragon with a riveted furnace in its chest that never goes out.
  calderon: greatDragon("caldera"),
  // Supremo: a sun dragon ringed by molten metal, a halo behind the head, a little sun in its chest.
  solforja: greatDragon("sol"),
  // Despertar: white-hot scales, flame-edged wings, two molten rings and a blazing white core.
  "solforja-nucleo-blanco": greatDragon("blanco"),
};

/** Heavy forge dragon body plan shared by Calderón (furnace), Solforja (sun core) and its awakened form. */
function greatDragon(kind: "caldera" | "sol" | "blanco"): Sculpt {
  const sun = kind !== "caldera", white = kind === "blanco";
  const palette = white
    ? { body: "#f29a6a", belly: "#ffe48a", plate: "#fff3c4", horn: "#a596cc", iron: "#d8d0ee", dark: "#8a1e34",
        wing: "#e8483a", flame: "#ff9a3a", core: "#ffffff", vein: "#fff6c8", ring: "#ffe9a0", cheek: "#ffb08a" }
    : { ...fire, wing: sun ? "#f29a36" : fire.wing, ring: "#ffc23a" };
  const shapes: Shape[] = [
    // Heavy body leaning forward
    { t: "ell", c: [-0.04, 0.38, 0], r: [0.28, 0.3, 0.25], col: "body", rot: [0, 0, -15] },
    { t: "ell", c: [0.14, 0.38, 0], r: [0.16, 0.27, 0.24], col: "belly", paint: true, rot: [0, 0, -15] },
    // Neck and head
    { t: "cap", a: [0.1, 0.56, 0], b: [0.24, 0.78, 0], r: [0.15, 0.11], col: "body", k: 0.08 },
    { t: "ell", c: [0.32, 0.84, 0], r: [0.16, 0.13, 0.14], col: "body", k: 0.08 },
    { t: "ell", c: [0.48, 0.8, 0], r: [0.14, 0.08, 0.1], col: "body", k: 0.06 },
    { t: "ell", c: [0.44, 0.735, 0], r: [0.17, 0.05, 0.12], col: "belly", paint: true },
    { t: "cap", a: [0.44, 0.765, 0.09], b: [0.61, 0.775, 0.045], r: [0.012, 0.012], col: "vein", paint: true, mirror: true },
    // Two great swept-back horns and cheek spikes
    { t: "cap", a: [0.28, 0.95, 0.07], b: [0.0, 1.08, 0.12], r: [0.058, 0.008], col: "horn", mirror: true, k: 0.02 },
    // Muscled arms, iron bracers
    { t: "cap", a: [0.14, 0.52, 0.16], b: [0.46, 0.41, 0.22], r: [0.08, 0.07], col: "body", mirror: true, k: 0.05 },
    { t: "cap", a: [0.32, 0.405, 0.22], b: [0.42, 0.41, 0.22], r: [0.075, 0.075], col: "iron", paint: true, mirror: true },
    // Thick legs, anvil plate on the near thigh
    { t: "ell", c: [-0.06, 0.18, 0.17], r: [0.17, 0.16, 0.1], col: "body", mirror: true, k: 0.06 },
    { t: "ell", c: [0.06, 0.045, 0.18], r: [0.15, 0.05, 0.09], col: "body", mirror: true, k: 0.04 },
    { t: "box", c: [-0.06, 0.22, 0.27], s: [0.085, 0.05, 0.03], round: 0.015, col: "iron", paint: true, rot: [0, 0, 12] },
    // Anvil plates down the spine
    ...([[-0.3, 0.6, 45], [-0.38, 0.42, 72]] as [number, number, number][]).map(([x, y, a]): Shape => ({ t: "box", c: [x, y, 0], s: [0.085, 0.035, 0.07], round: 0.02, col: "iron", k: 0, rot: [0, 0, a] })),
    // Tail on the ground, flame at the tip
    { t: "cap", a: [-0.22, 0.2, 0], b: [-0.46, 0.08, 0], r: [0.13, 0.09], col: "body", k: 0.06 },
    { t: "cap", a: [-0.46, 0.08, 0], b: [-0.64, 0.12, 0], r: [0.09, 0.055], col: "body", k: 0.04 },
    { t: "cap", a: [-0.66, 0.14, 0], b: [-0.7, white ? 0.44 : 0.38, 0], r: [0.085, 0.012], col: "flame", k: 0.04 },
    { t: "ell", c: [-0.67, 0.2, 0.03], r: [0.04, 0.07, 0.06], col: "core", paint: true },
    // Membrane wings raised behind the head: leading-edge arm, membrane, finger struts (painted)
    { t: "cap", a: [-0.06, 0.62, 0.16], b: [-0.14, 1.04, 0.24], r: [0.05, 0.03], col: "body", k: 0.04 },
    { t: "ell", c: [-0.38, 0.86, 0.24], r: [0.29, 0.19, 0.026], col: "wing", k: 0.02, rot: [0, 0, 28] },
    { t: "ell", c: [-0.34, 0.88, -0.24], r: [0.23, 0.15, 0.026], col: "wing", k: 0.02, rot: [0, 0, 28] },
    ...([[-0.5, 1.0], [-0.62, 0.84], [-0.52, 0.68]] as [number, number][]).map(([x, y]): Shape => {
      const cx = (x - 0.14) / 2, cy = (y + 1.04) / 2, len = Math.hypot(x + 0.14, y - 1.04) / 2;
      return { t: "ell", c: [cx, cy, 0.24], r: [len, 0.014, 0.06], col: "body", paint: true, rot: [0, 0, (Math.atan2(y - 1.04, x + 0.14) * 180) / Math.PI] };
    }),
    // Circuit veins on the flank
    { t: "cap", a: [-0.28, 0.48, 0.2], b: [-0.14, 0.38, 0.24], r: [0.017, 0.017], col: "vein", paint: true },
    { t: "cap", a: [-0.14, 0.38, 0.24], b: [-0.16, 0.24, 0.25], r: [0.017, 0.017], col: "vein", paint: true },
  ];

  const C: V3 = [0.25, 0.42, 0]; // chest centre
  if (!sun) {
    // The furnace: riveted iron door, glowing mouth behind a grate, flames licking out the top.
    shapes.push(
      { t: "ell", c: [C[0] - 0.02, C[1], 0], r: [0.07, 0.15, 0.15], col: "iron", k: 0.02 },
      { t: "ell", c: [C[0] + 0.03, C[1], 0], r: [0.04, 0.11, 0.11], col: "core", paint: true },
      ...[-0.05, 0, 0.05].map((z): Shape => ({ t: "cap", a: [C[0] + 0.05, C[1] - 0.09, z], b: [C[0] + 0.05, C[1] + 0.09, z], r: [0.012, 0.012], col: "dark", paint: true })),
      { t: "tor", c: [C[0] + 0.02, C[1], 0], R: 0.12, r: 0.022, col: "horn", k: 0.005, rot: [0, 0, 90] },
      { t: "cap", a: [C[0] - 0.02, C[1] + 0.12, 0.05], b: [C[0] - 0.04, C[1] + 0.26, 0.08], r: [0.045, 0.008], col: "flame", k: 0.03 },
    );
  } else {
    // The chest ember: a little sun with rays, in a platinum bezel.
    const n = white ? 6 : 4;
    for (let k = 0; k < n; k++) {
      const a = (k * 2 * Math.PI) / n + Math.PI / n, len = white ? 0.2 : 0.17;
      shapes.push({ t: "cap", a: [C[0] + 0.02, C[1], 0], b: [C[0] + 0.02, C[1] + Math.sin(a) * len, Math.cos(a) * len], r: [0.04, 0.008], col: "flame", paint: true });
    }
    shapes.push(
      { t: "ell", c: [C[0] + 0.02, C[1], 0], r: [0.06, 0.1, 0.1], col: "core", paint: true },
      { t: "tor", c: [C[0] + 0.03, C[1], 0], R: 0.105, r: 0.02, col: "iron", k: 0.005, rot: [0, 0, 90] },
      // Sun halo of molten metal behind the head
      { t: "tor", c: [0.26, 0.86, -0.14], R: 0.27, r: 0.024, col: "ring", k: 0, rot: [90, 0, 0] },
      // Molten ring around the body, with drips
      { t: "tor", c: [0.0, 0.3, 0], R: 0.44, r: 0.024, col: "ring", k: 0, rot: [0, 0, -6] },
    );
    const rays = 4;
    for (let k = 0; k < rays; k++) {
      const a = (k * 2 * Math.PI) / rays + 0.3, r0 = 0.3, r1 = white ? (k % 2 === 0 ? 0.46 : 0.4) : k % 2 === 0 ? 0.42 : 0.37;
      shapes.push({ t: "cap", a: [0.26 + Math.cos(a) * r0, 0.86 + Math.sin(a) * r0, -0.14], b: [0.26 + Math.cos(a) * r1, 0.86 + Math.sin(a) * r1, -0.14], r: [0.03, 0.006], col: "ring", k: 0.01 });
    }
    // Wing membranes edged in molten flame
    shapes.push({ t: "ell", c: [-0.66, 0.78, 0], r: [white ? 0.14 : 0.1, white ? 0.2 : 0.14, 0.3], col: "flame", paint: true, rot: [0, 0, 28] });
    if (white) {
      shapes.push(
        // A second, inner corona ring behind the head
        { t: "tor", c: [0.26, 0.86, -0.22], R: 0.2, r: 0.02, col: "core", k: 0, rot: [90, 0, 0] },
        { t: "ell", c: [0.3, 0.86, 0], r: [0.08, 0.05, 0.15], col: "plate", paint: true },
      );
    }
  }
  return {
    palette,
    glow: white ? ["flame", "core", "vein", "ring", "plate"] : sun ? ["flame", "core", "vein", "ring"] : ["flame", "core", "vein"],
    shapes,
    eyes: [{ at: [0.4, 0.88, 0.08], r: 0.075, iris: white ? "#ff5a00" : "#ff8a1a", mirror: true, angry: true }],
  };
}

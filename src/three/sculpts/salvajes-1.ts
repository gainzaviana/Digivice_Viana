import type { EyeSpec, Shape, Sculpt, V3 } from "../sculpt";

// Salvajes (1): twenty wild species. Glow by affinity: pulso amber, señal cyan, ruido magenta.
const PULSO = "#ffc04a";
const SENAL = "#5ef2ff";
const RUIDO = "#ff4fd8";

/** Turns a whole sculpt about the vertical axis (degrees; negative turns +x toward the camera). */
function turn(deg: number, s: Sculpt): Sculpt {
  const a = (deg * Math.PI) / 180, co = Math.cos(a), si = Math.sin(a);
  const R = (v: V3): V3 => [v[0] * co + v[2] * si, v[1], -v[0] * si + v[2] * co];
  const F = (v: V3): V3 => [v[0], v[1], -v[2]];
  const shapes: Shape[] = [];
  for (const sh of s.shapes) {
    const copies: Shape[] = [{ ...sh, mirror: false }];
    if (sh.mirror) {
      const m = { ...sh, mirror: false, rot: sh.rot ? ([-sh.rot[0], -sh.rot[1], sh.rot[2]] as V3) : undefined } as Shape;
      if (m.t === "cap") { m.a = F(m.a); m.b = F(m.b); } else m.c = F(m.c);
      copies.push(m);
    }
    for (const c of copies) {
      if (c.t === "cap") { c.a = R(c.a); c.b = R(c.b); } else { c.c = R(c.c); const r = c.rot ?? [0, 0, 0]; c.rot = [r[0], r[1] + deg, r[2]]; }
      shapes.push(c);
    }
  }
  const eyes: EyeSpec[] = [];
  for (const e of s.eyes) {
    const look = e.look ?? ([0.42, 0.08, 0.9] as V3);
    eyes.push({ ...e, mirror: false, at: R(e.at), look: R(look) });
    if (e.mirror) eyes.push({ ...e, mirror: false, at: R(F(e.at)), look: R(F(look)) });
  }
  return { ...s, shapes, eyes };
}

export const salvajes1: Record<string, Sculpt> = {
  // ───────────── Stage 1 ─────────────

  // Bitbicho: a lime beetle with a teal head and violet legs; its back crumbles into floating bits.
  bitbicho: {
    palette: { shell: "#78bf3e", spot: "#2c8a76", head: "#2c7a74", under: "#469a86", leg: "#45367a", dark: "#2e2850", glow: RUIDO },
    glow: ["glow"],
    shapes: [
      { t: "ell", c: [-0.06, 0.44, 0], r: [0.36, 0.27, 0.3], col: "shell" },
      { t: "ell", c: [0.0, 0.22, 0], r: [0.34, 0.1, 0.26], col: "under", k: 0.06 },
      { t: "ell", c: [0.3, 0.4, 0], r: [0.19, 0.19, 0.2], col: "head", k: 0.05 },
      { t: "cap", a: [0.3, 0.7, 0], b: [-0.38, 0.5, 0], r: [0.018, 0.018], col: "glow", paint: true },
      { t: "cap", a: [0.12, 0.62, 0.2], b: [-0.2, 0.52, 0.26], r: [0.016, 0.016], col: "glow", paint: true, mirror: true },
      { t: "ell", c: [-0.05, 0.62, 0.14], r: [0.05, 0.05, 0.05], col: "spot", paint: true, mirror: true },
      { t: "ell", c: [-0.22, 0.5, 0.24], r: [0.05, 0.05, 0.05], col: "spot", paint: true },
      { t: "ell", c: [0.08, 0.5, 0.26], r: [0.045, 0.045, 0.045], col: "spot", paint: true },
      // Legs (three pairs)
      { t: "cap", a: [0.12, 0.24, 0.2], b: [0.2, 0.02, 0.32], r: [0.04, 0.025], col: "leg", mirror: true, k: 0.03 },
      { t: "cap", a: [-0.04, 0.24, 0.22], b: [-0.02, 0.02, 0.36], r: [0.04, 0.025], col: "leg", mirror: true, k: 0.03 },
      { t: "cap", a: [-0.2, 0.24, 0.2], b: [-0.26, 0.02, 0.32], r: [0.04, 0.025], col: "leg", mirror: true, k: 0.03 },
      // Mandibles
      { t: "cap", a: [0.4, 0.3, 0.07], b: [0.5, 0.24, 0.02], r: [0.03, 0.012], col: "leg", mirror: true, k: 0.02 },
      // Antennae with glowing tips
      { t: "cap", a: [0.34, 0.52, 0.07], b: [0.42, 0.72, 0.12], r: [0.022, 0.018], col: "leg", mirror: true, k: 0.02 },
      { t: "cap", a: [0.42, 0.72, 0.12], b: [0.56, 0.82, 0.14], r: [0.018, 0.016], col: "leg", mirror: true, k: 0.01 },
      { t: "ell", c: [0.57, 0.83, 0.14], r: [0.035, 0.035, 0.035], col: "glow", mirror: true, k: 0 },
      // Loose bits drifting off the back
      { t: "box", c: [-0.44, 0.66, 0.04], s: [0.04, 0.04, 0.04], round: 0.01, col: "shell", k: 0, rot: [10, 20, 15] },
      { t: "box", c: [-0.36, 0.84, -0.06], s: [0.035, 0.035, 0.035], round: 0.01, col: "shell", k: 0, rot: [30, 10, 40] },
      { t: "box", c: [-0.52, 0.86, 0.08], s: [0.028, 0.028, 0.028], round: 0.008, col: "glow", k: 0, rot: [0, 30, 20] },
      { t: "box", c: [-0.2, 0.92, 0.1], s: [0.028, 0.028, 0.028], round: 0.008, col: "glow", k: 0, rot: [20, 0, 35] },
    ],
    eyes: [{ at: [0.34, 0.44, 0.08], r: 0.09, iris: "#ff4fd8", mirror: true, look: [0.7, 0.1, 0.7] }],
  },

  // Pixelito: a little cube of light with a pink top, stubby limbs and an antenna pixel.
  pixelito: turn(-28, {
    palette: { body: "#3cbfd2", top: "#ee7cb6", blush: "#ff9cc8", dark: "#2a588e", ant: "#f0c040", ink: "#1e3a6a", glow: SENAL },
    glow: ["glow"],
    shapes: [
      { t: "box", c: [0, 0.48, 0], s: [0.28, 0.28, 0.28], round: 0.08, col: "body" },
      { t: "box", c: [0, 0.74, 0], s: [0.3, 0.05, 0.3], round: 0.02, col: "top", paint: true },
      { t: "box", c: [0.06, 0.765, 0.12], s: [0.03, 0.02, 0.03], round: 0.005, col: "glow", paint: true },
      { t: "box", c: [-0.12, 0.765, -0.04], s: [0.03, 0.02, 0.03], round: 0.005, col: "glow", paint: true },
      { t: "box", c: [-0.06, 0.765, 0.16], s: [0.03, 0.02, 0.03], round: 0.005, col: "glow", paint: true },
      { t: "box", c: [0.14, 0.765, -0.1], s: [0.03, 0.02, 0.03], round: 0.005, col: "glow", paint: true },
      { t: "box", c: [0, 0.25, 0], s: [0.3, 0.012, 0.3], round: 0.005, col: "glow", paint: true },
      // Feet and arms
      { t: "ell", c: [0.04, 0.08, 0.14], r: [0.12, 0.08, 0.1], col: "dark", mirror: true, k: 0.05 },
      { t: "ell", c: [0.02, 0.44, 0.3], r: [0.07, 0.08, 0.06], col: "body", mirror: true, k: 0.05 },
      // Face on the front (+x)
      { t: "cap", a: [0.28, 0.34, 0.07], b: [0.28, 0.31, 0.02], r: [0.014, 0.014], col: "ink", paint: true, mirror: true },
      { t: "cap", a: [0.28, 0.31, 0.02], b: [0.28, 0.31, -0.02], r: [0.014, 0.014], col: "ink", paint: true },
      { t: "ell", c: [0.28, 0.38, 0.17], r: [0.04, 0.03, 0.04], col: "blush", paint: true, mirror: true },
      // Antenna with a little light cube
      { t: "cap", a: [-0.04, 0.74, -0.02], b: [0.02, 0.92, 0], r: [0.022, 0.018], col: "dark", k: 0.03 },
      { t: "box", c: [0.03, 0.97, 0], s: [0.055, 0.055, 0.055], round: 0.015, col: "ant", k: 0.01, rot: [0, 20, 0] },
      { t: "box", c: [0.07, 0.99, 0.04], s: [0.025, 0.025, 0.025], round: 0.005, col: "glow", paint: true },
    ],
    eyes: [{ at: [0.15, 0.5, 0.11], r: 0.095, iris: "#2a8cff", mirror: true, look: [0.9, 0.0, 0.25] }],
  }),

  // Caracolchon: a soft peach snail carrying a rolled-up striped mattress as its shell.
  caracolchon: {
    palette: { body: "#ea8c7c", shell: "#e8ecfa", stripe: "#3e5cb0", button: "#6a3a56", blush: "#ff9c9c", glow: PULSO },
    glow: ["glow"],
    shapes: [
      { t: "cap", a: [-0.4, 0.07, 0], b: [0.28, 0.1, 0], r: [0.06, 0.1], col: "body" },
      { t: "cap", a: [0.26, 0.1, 0], b: [0.36, 0.44, 0], r: [0.12, 0.11], col: "body", k: 0.08 },
      { t: "ell", c: [0.38, 0.5, 0], r: [0.13, 0.12, 0.12], col: "body", k: 0.08 },
      { t: "cap", a: [0.38, 0.58, 0.05], b: [0.44, 0.8, 0.08], r: [0.035, 0.028], col: "body", mirror: true, k: 0.04 },
      { t: "ell", c: [0.45, 0.84, 0.08], r: [0.075, 0.075, 0.07], col: "body", mirror: true, k: 0.03 },
      { t: "ell", c: [0.46, 0.46, 0.1], r: [0.03, 0.025, 0.03], col: "blush", paint: true, mirror: true },
      { t: "cap", a: [0.5, 0.45, 0.04], b: [0.5, 0.44, -0.04], r: [0.01, 0.01], col: "button", paint: true },
      // Mattress roll shell
      { t: "ell", c: [-0.08, 0.44, 0], r: [0.33, 0.33, 0.21], col: "shell", k: 0.05 },
      { t: "tor", c: [-0.08, 0.44, 0.13], R: 0.26, r: 0.04, col: "stripe", paint: true, rot: [90, 0, 0], mirror: true },
      { t: "tor", c: [-0.06, 0.45, 0.18], R: 0.17, r: 0.035, col: "stripe", paint: true, rot: [90, 0, 0], mirror: true },
      { t: "tor", c: [-0.04, 0.46, 0.2], R: 0.08, r: 0.032, col: "stripe", paint: true, rot: [90, 0, 0], mirror: true },
      { t: "tor", c: [-0.07, 0.445, 0.16], R: 0.215, r: 0.012, col: "glow", paint: true, rot: [90, 0, 0], mirror: true },
      { t: "ell", c: [-0.03, 0.465, 0.2], r: [0.035, 0.035, 0.04], col: "glow", paint: true, mirror: true },
      { t: "ell", c: [-0.26, 0.6, 0.15], r: [0.03, 0.03, 0.04], col: "button", paint: true, mirror: true },
      { t: "ell", c: [0.1, 0.3, 0.16], r: [0.03, 0.03, 0.04], col: "button", paint: true, mirror: true },
      { t: "ell", c: [-0.2, 0.2, 0.16], r: [0.03, 0.03, 0.04], col: "button", paint: true, mirror: true },
    ],
    eyes: [{ at: [0.45, 0.85, 0.08], r: 0.068, iris: "#3a5cd0", mirror: true, look: [0.8, 0.1, 0.5] }],
  },

  // Murciclic: a round indigo bat with rose wings, sharp ears and glowing click marks.
  murciclic: {
    palette: { body: "#4a4892", belly: "#e070a4", wing: "#b4487e", bone: "#302c56", fang: "#fff8ff", glow: RUIDO },
    glow: ["glow"],
    shapes: [
      { t: "ell", c: [0, 0.48, 0], r: [0.24, 0.27, 0.23], col: "body" },
      { t: "ell", c: [0.12, 0.38, 0], r: [0.14, 0.17, 0.17], col: "belly", paint: true },
      { t: "cap", a: [0.21, 0.36, 0.06], b: [0.21, 0.36, -0.06], r: [0.016, 0.016], col: "glow", paint: true },
      { t: "cap", a: [0.2, 0.3, 0.05], b: [0.2, 0.3, -0.05], r: [0.016, 0.016], col: "glow", paint: true },
      // Ears
      { t: "cap", a: [0.0, 0.66, 0.11], b: [-0.02, 0.98, 0.17], r: [0.08, 0.012], col: "body", mirror: true, k: 0.05 },
      // Wings: a bone arm and a rose membrane, swept back
      { t: "ell", c: [-0.16, 0.6, 0.34], r: [0.03, 0.22, 0.27], col: "wing", mirror: true, rot: [0, -45, 0], k: 0.04 },
      { t: "ell", c: [-0.2, 0.42, 0.4], r: [0.03, 0.1, 0.16], col: "wing", mirror: true, rot: [0, -45, 0], k: 0.03 },
      { t: "cap", a: [0.0, 0.6, 0.16], b: [-0.32, 0.86, 0.52], r: [0.04, 0.022], col: "bone", mirror: true, k: 0.04 },
      { t: "cap", a: [-0.08, 0.66, 0.26], b: [-0.3, 0.36, 0.5], r: [0.022, 0.016], col: "bone", mirror: true, k: 0.02 },
      // Feet and fangs
      { t: "cap", a: [0.04, 0.24, 0.08], b: [0.06, 0.03, 0.09], r: [0.045, 0.035], col: "bone", mirror: true, k: 0.04 },
      { t: "cap", a: [0.2, 0.44, 0.04], b: [0.24, 0.39, 0.035], r: [0.018, 0.006], col: "fang", mirror: true, k: 0.01 },
      // Click waves near an ear
      { t: "tor", c: [0.1, 1.0, 0.24], R: 0.06, r: 0.016, col: "glow", rot: [90, 0, -30], k: 0 },
      { t: "tor", c: [0.12, 1.04, 0.26], R: 0.1, r: 0.016, col: "glow", rot: [90, 0, -30], k: 0 },
    ],
    eyes: [{ at: [0.15, 0.56, 0.09], r: 0.09, iris: "#ff3ac8", mirror: true }],
  },

  // Ranadin: a crouched orange frog with a puffed throat sac and Morse dots and dashes on its back.
  ranadin: {
    palette: { body: "#e6742e", sac: "#f0d08c", spot: "#2e4488", foot: "#4466b2", ink: "#5a2c3a", glow: PULSO },
    glow: ["glow"],
    shapes: [
      { t: "ell", c: [-0.06, 0.3, 0], r: [0.34, 0.24, 0.26], col: "body", rot: [0, 0, 18] },
      { t: "ell", c: [0.22, 0.48, 0], r: [0.22, 0.16, 0.22], col: "body", k: 0.1 },
      { t: "ell", c: [0.2, 0.64, 0.12], r: [0.11, 0.11, 0.1], col: "body", mirror: true, k: 0.06 },
      { t: "ell", c: [0.36, 0.32, 0], r: [0.13, 0.12, 0.15], col: "sac", k: 0.05 },
      { t: "cap", a: [0.42, 0.46, 0.13], b: [0.44, 0.45, -0.13], r: [0.012, 0.012], col: "ink", paint: true },
      // Back legs
      { t: "ell", c: [-0.2, 0.2, 0.22], r: [0.2, 0.13, 0.1], col: "body", mirror: true, k: 0.06, rot: [0, 0, 20] },
      { t: "ell", c: [-0.06, 0.04, 0.26], r: [0.14, 0.04, 0.08], col: "foot", mirror: true, k: 0.03 },
      // Front legs
      { t: "cap", a: [0.24, 0.28, 0.16], b: [0.32, 0.04, 0.2], r: [0.05, 0.04], col: "body", mirror: true, k: 0.04 },
      { t: "ell", c: [0.36, 0.025, 0.21], r: [0.07, 0.025, 0.06], col: "foot", mirror: true, k: 0.02 },
      // Spots and Morse code along the back
      { t: "ell", c: [-0.1, 0.48, 0.14], r: [0.04, 0.04, 0.04], col: "spot", paint: true, mirror: true },
      { t: "ell", c: [-0.28, 0.36, 0.2], r: [0.04, 0.04, 0.04], col: "spot", paint: true },
      { t: "ell", c: [0.06, 0.52, 0.12], r: [0.03, 0.03, 0.08], col: "glow", paint: true },
      { t: "cap", a: [-0.02, 0.5, 0.14], b: [-0.12, 0.46, 0.16], r: [0.028, 0.028], col: "glow", paint: true },
      { t: "ell", c: [-0.2, 0.42, 0.18], r: [0.03, 0.03, 0.08], col: "glow", paint: true },
      { t: "cap", a: [-0.28, 0.36, 0.2], b: [-0.36, 0.3, 0.22], r: [0.028, 0.028], col: "glow", paint: true },
    ],
    eyes: [{ at: [0.22, 0.67, 0.12], r: 0.095, iris: "#30b86a", mirror: true, look: [0.6, 0.35, 0.7] }],
  },

  // Topocable: a mauve mole with huge pink digging claws, a cable collar and a plug for a tail.
  topocable: {
    palette: { body: "#ac7896", claw: "#e8789c", nose: "#ff8aa8", cable: "#e4ac2e", plug: "#3c2a42", belly: "#d6a4b2", glow: SENAL },
    glow: ["glow"],
    shapes: [
      { t: "ell", c: [-0.06, 0.38, 0], r: [0.36, 0.32, 0.28], col: "body" },
      { t: "ell", c: [0.1, 0.28, 0], r: [0.22, 0.2, 0.22], col: "belly", paint: true },
      { t: "cap", a: [0.22, 0.42, 0], b: [0.46, 0.34, 0], r: [0.15, 0.06], col: "body", k: 0.08 },
      { t: "ell", c: [0.5, 0.34, 0], r: [0.05, 0.045, 0.05], col: "nose", k: 0.02 },
      // Cable collar with a glowing strand
      { t: "tor", c: [0.2, 0.42, 0], R: 0.2, r: 0.03, col: "cable", rot: [0, 0, 70], k: 0.01 },
      { t: "tor", c: [0.2, 0.42, 0], R: 0.2, r: 0.032, col: "glow", rot: [0, 0, 70], paint: true, k: 0 },
      { t: "tor", c: [0.17, 0.43, 0], R: 0.21, r: 0.034, col: "cable", rot: [0, 0, 70], paint: true, k: 0 },
      // Digging paws
      { t: "ell", c: [0.3, 0.16, 0.2], r: [0.11, 0.1, 0.08], col: "claw", mirror: true, k: 0.05 },
      { t: "cap", a: [0.36, 0.14, 0.24], b: [0.5, 0.06, 0.28], r: [0.035, 0.012], col: "claw", mirror: true, k: 0.02 },
      { t: "cap", a: [0.36, 0.14, 0.17], b: [0.5, 0.05, 0.16], r: [0.035, 0.012], col: "claw", mirror: true, k: 0.02 },
      { t: "cap", a: [0.36, 0.2, 0.22], b: [0.52, 0.16, 0.24], r: [0.035, 0.012], col: "claw", mirror: true, k: 0.02 },
      // Feet
      { t: "ell", c: [-0.18, 0.05, 0.16], r: [0.1, 0.05, 0.07], col: "plug", mirror: true, k: 0.04 },
      // Plug tail
      { t: "cap", a: [-0.38, 0.3, 0], b: [-0.52, 0.42, 0], r: [0.04, 0.03], col: "cable", k: 0.04 },
      { t: "box", c: [-0.56, 0.5, 0], s: [0.05, 0.065, 0.06], round: 0.02, col: "plug", k: 0.01, rot: [0, 0, 20] },
      { t: "cap", a: [-0.6, 0.56, 0.03], b: [-0.64, 0.66, 0.03], r: [0.014, 0.014], col: "cable", mirror: true, k: 0 },
      { t: "box", c: [-0.56, 0.5, 0.05], s: [0.02, 0.02, 0.02], round: 0.005, col: "glow", paint: true },
    ],
    eyes: [{ at: [0.3, 0.5, 0.08], r: 0.06, iris: "#40c8ff", mirror: true, look: [0.7, 0.1, 0.7] }],
  },

  // Polillux: a lilac moth with screen-pixel eyespots, a fluffy collar and feathery antennae.
  polillux: {
    palette: { wing: "#b89ad6", edge: "#7c62a6", fluff: "#f0e2c2", stripe: "#3a2a4a", screen: "#2a8aaa", dark: "#5a4068", glow: SENAL },
    glow: ["glow"],
    shapes: [
      { t: "cap", a: [-0.02, 0.4, 0], b: [-0.08, 0.1, 0], r: [0.11, 0.05], col: "fluff" },
      { t: "box", c: [-0.04, 0.3, 0], s: [0.14, 0.022, 0.14], round: 0.01, col: "stripe", paint: true },
      { t: "box", c: [-0.06, 0.2, 0], s: [0.14, 0.02, 0.14], round: 0.01, col: "stripe", paint: true },
      { t: "ell", c: [0, 0.5, 0], r: [0.13, 0.13, 0.14], col: "fluff", k: 0.06 },
      { t: "ell", c: [0.05, 0.7, 0], r: [0.14, 0.13, 0.14], col: "fluff", k: 0.06 },
      // Feathery antennae
      { t: "cap", a: [0.06, 0.8, 0.05], b: [0.06, 1.04, 0.16], r: [0.025, 0.035], col: "dark", mirror: true, k: 0.03 },
      // Wings: upper and lower, angled back like a V
      { t: "ell", c: [-0.17, 0.68, 0.25], r: [0.03, 0.3, 0.3], col: "wing", mirror: true, rot: [0, -35, 10], k: 0.04 },
      { t: "ell", c: [-0.14, 0.3, 0.2], r: [0.03, 0.2, 0.22], col: "wing", mirror: true, rot: [0, -35, -10], k: 0.04 },
      { t: "ell", c: [-0.34, 0.88, 0.5], r: [0.14, 0.14, 0.14], col: "edge", paint: true, mirror: true },
      { t: "box", c: [-0.24, 0.74, 0.36], s: [0.065, 0.065, 0.065], round: 0.012, col: "screen", paint: true, mirror: true, rot: [0, -35, 0] },
      { t: "box", c: [-0.24, 0.74, 0.36], s: [0.03, 0.03, 0.03], round: 0.006, col: "glow", paint: true, mirror: true, rot: [0, -35, 0] },
      { t: "ell", c: [-0.22, 0.24, 0.32], r: [0.055, 0.055, 0.055], col: "screen", paint: true, mirror: true },
      { t: "cap", a: [-0.12, 0.5, 0.16], b: [-0.32, 0.56, 0.44], r: [0.014, 0.014], col: "glow", paint: true, mirror: true },
      // Little legs
      { t: "cap", a: [0.06, 0.42, 0.06], b: [0.12, 0.3, 0.1], r: [0.02, 0.015], col: "dark", mirror: true, k: 0.02 },
    ],
    eyes: [{ at: [0.1, 0.72, 0.07], r: 0.08, iris: "#2a6cff", mirror: true }],
  },

  // Cangrejal: a blue crab with one oversized orange claw holding a glowing data packet.
  cangrejal: {
    palette: { shell: "#3a70b2", belly: "#e8d4b0", claw: "#e8702e", leg: "#2c4e8a", stalk: "#423a60", packet: "#2a2440", glow: PULSO },
    glow: ["glow"],
    shapes: [
      { t: "ell", c: [0, 0.3, 0], r: [0.28, 0.16, 0.32], col: "shell" },
      { t: "ell", c: [0.1, 0.2, 0], r: [0.16, 0.06, 0.22], col: "belly", paint: true },
      { t: "cap", a: [0.12, 0.44, 0.12], b: [-0.08, 0.45, 0.2], r: [0.012, 0.012], col: "glow", paint: true, mirror: true },
      // Eye stalks
      { t: "cap", a: [0.14, 0.4, 0.08], b: [0.18, 0.6, 0.1], r: [0.03, 0.025], col: "stalk", mirror: true, k: 0.03 },
      { t: "ell", c: [0.19, 0.64, 0.1], r: [0.07, 0.065, 0.065], col: "shell", mirror: true, k: 0.02 },
      // Legs: three bent pairs
      ...[0.1, -0.04, -0.18].flatMap((x, i): Shape[] => [
        { t: "cap", a: [x, 0.3, 0.24], b: [x - 0.02 * i, 0.32, 0.4], r: [0.05, 0.045], col: "leg", mirror: true, k: 0.03 },
        { t: "cap", a: [x - 0.02 * i, 0.34, 0.4], b: [x - 0.04 * i + 0.02, 0.0, 0.44], r: [0.045, 0.02], col: "leg", mirror: true, k: 0.02 },
      ]),
      // Big claw (camera side) raised, holding the packet
      { t: "cap", a: [0.16, 0.32, 0.26], b: [0.42, 0.46, 0.36], r: [0.05, 0.045], col: "claw", k: 0.04 },
      { t: "ell", c: [0.44, 0.54, 0.38], r: [0.09, 0.1, 0.07], col: "claw", k: 0.04 },
      { t: "cap", a: [0.49, 0.6, 0.38], b: [0.54, 0.72, 0.38], r: [0.04, 0.014], col: "claw", k: 0.02 },
      { t: "cap", a: [0.38, 0.6, 0.38], b: [0.35, 0.7, 0.38], r: [0.036, 0.014], col: "claw", k: 0.02 },
      { t: "box", c: [0.44, 0.71, 0.38], s: [0.055, 0.055, 0.045], round: 0.015, col: "packet", k: 0 },
      { t: "box", c: [0.44, 0.71, 0.38], s: [0.065, 0.011, 0.055], round: 0.004, col: "glow", paint: true },
      { t: "box", c: [0.44, 0.71, 0.38], s: [0.011, 0.065, 0.055], round: 0.004, col: "glow", paint: true },
      // Small claw (far side)
      { t: "cap", a: [0.16, 0.3, -0.22], b: [0.3, 0.32, -0.3], r: [0.04, 0.035], col: "claw", k: 0.04 },
      { t: "ell", c: [0.36, 0.34, -0.31], r: [0.08, 0.06, 0.06], col: "claw", k: 0.03 },
    ],
    eyes: [{ at: [0.2, 0.65, 0.1], r: 0.065, iris: "#ff8a1a", mirror: true, look: [0.85, 0.1, 0.5] }],
  },

  // Hongolin: a teal toadstool sprout with glitching spots that drip corrupt code.
  hongolin: {
    palette: { cap: "#2c8a8c", spot: "#d6c6da", gill: "#5a347a", stem: "#e4daea", foot: "#40305a", mini: "#4cbca2", glow: RUIDO },
    glow: ["glow"],
    shapes: [
      { t: "ell", c: [0, 0.3, 0], r: [0.19, 0.24, 0.18], col: "stem" },
      { t: "ell", c: [0.04, 0.06, 0.09], r: [0.1, 0.06, 0.07], col: "foot", mirror: true, k: 0.04 },
      { t: "cap", a: [0.06, 0.34, 0.15], b: [0.14, 0.22, 0.26], r: [0.05, 0.04], col: "stem", mirror: true, k: 0.05 },
      { t: "ell", c: [-0.02, 0.68, 0], r: [0.42, 0.22, 0.4], col: "cap", k: 0.05 },
      { t: "ell", c: [-0.02, 0.5, 0], r: [0.42, 0.08, 0.4], col: "gill", paint: true },
      // Spots: soft pale ones and glitching pixel ones
      { t: "ell", c: [0.1, 0.86, 0.12], r: [0.08, 0.06, 0.08], col: "spot", paint: true },
      { t: "ell", c: [-0.2, 0.82, 0.2], r: [0.07, 0.06, 0.07], col: "spot", paint: true },
      { t: "ell", c: [0.28, 0.72, 0.24], r: [0.06, 0.06, 0.06], col: "spot", paint: true },
      { t: "ell", c: [-0.1, 0.82, -0.22], r: [0.07, 0.06, 0.07], col: "spot", paint: true },
      { t: "box", c: [0.0, 0.76, 0.32], s: [0.035, 0.035, 0.04], round: 0.005, col: "glow", paint: true },
      { t: "box", c: [0.3, 0.8, 0.0], s: [0.035, 0.035, 0.035], round: 0.005, col: "glow", paint: true },
      { t: "box", c: [-0.28, 0.76, 0.2], s: [0.03, 0.03, 0.04], round: 0.005, col: "glow", paint: true },
      // Code drips from the rim
      { t: "cap", a: [0.22, 0.54, 0.26], b: [0.23, 0.42, 0.27], r: [0.028, 0.016], col: "glow", k: 0.02 },
      { t: "cap", a: [0.34, 0.56, 0.06], b: [0.35, 0.46, 0.06], r: [0.024, 0.014], col: "glow", k: 0.02 },
      { t: "cap", a: [-0.14, 0.54, 0.32], b: [-0.14, 0.44, 0.33], r: [0.024, 0.014], col: "glow", k: 0.02 },
      // A tiny sprout friend
      { t: "cap", a: [0.12, 0.0, 0.38], b: [0.12, 0.1, 0.38], r: [0.03, 0.025], col: "stem", k: 0 },
      { t: "ell", c: [0.12, 0.12, 0.38], r: [0.06, 0.035, 0.06], col: "mini", k: 0.02 },
    ],
    eyes: [{ at: [0.12, 0.36, 0.075], r: 0.09, iris: "#ffd23a", mirror: true }],
  },

  // Pajarrafaga: a tiny yellow speed-bird with blue swept wings and a signal trail.
  pajarrafaga: {
    palette: { body: "#f2b42a", belly: "#ff9a4a", wing: "#2a5cc8", tip: "#1c2c60", beak: "#ee6a2a", glow: SENAL },
    glow: ["glow"],
    shapes: [
      { t: "ell", c: [0, 0.34, 0], r: [0.27, 0.23, 0.22], col: "body", rot: [0, 0, -10] },
      { t: "ell", c: [0.12, 0.24, 0], r: [0.17, 0.12, 0.18], col: "belly", paint: true },
      { t: "cap", a: [0.22, 0.38, 0], b: [0.4, 0.34, 0], r: [0.065, 0.01], col: "beak", k: 0.02 },
      { t: "cap", a: [0.04, 0.54, 0], b: [-0.08, 0.74, 0.0], r: [0.045, 0.012], col: "wing", k: 0.03 },
      { t: "cap", a: [0.04, 0.54, 0.04], b: [0.1, 0.72, 0.06], r: [0.04, 0.01], col: "wing", k: 0.03 },
      // Swept wings, tips raised
      { t: "ell", c: [-0.24, 0.5, 0.2], r: [0.32, 0.1, 0.035], col: "wing", mirror: true, rot: [15, 20, -22], k: 0.04 },
      { t: "ell", c: [-0.46, 0.6, 0.28], r: [0.12, 0.08, 0.06], col: "tip", mirror: true, paint: true },
      { t: "cap", a: [-0.08, 0.5, 0.22], b: [-0.44, 0.62, 0.3], r: [0.014, 0.014], col: "glow", mirror: true, paint: true },
      // Tail feathers
      { t: "cap", a: [-0.2, 0.34, 0], b: [-0.5, 0.42, 0.04], r: [0.06, 0.025], col: "wing", k: 0.04 },
      { t: "cap", a: [-0.2, 0.3, 0], b: [-0.48, 0.28, -0.04], r: [0.05, 0.02], col: "tip", k: 0.04 },
      // Tucked feet
      { t: "cap", a: [0.04, 0.14, 0.07], b: [0.02, 0.02, 0.08], r: [0.028, 0.02], col: "beak", mirror: true, k: 0.02 },
      { t: "ell", c: [0.07, 0.02, 0.08], r: [0.05, 0.02, 0.03], col: "beak", mirror: true, k: 0.02 },
      // Signal speed trail
      { t: "cap", a: [-0.4, 0.5, 0.12], b: [-0.74, 0.5, 0.12], r: [0.022, 0.008], col: "glow", k: 0 },
      { t: "cap", a: [-0.42, 0.36, 0.16], b: [-0.86, 0.36, 0.16], r: [0.022, 0.008], col: "glow", k: 0 },
      { t: "cap", a: [-0.36, 0.22, 0.12], b: [-0.68, 0.22, 0.12], r: [0.022, 0.008], col: "glow", k: 0 },
    ],
    eyes: [{ at: [0.16, 0.44, 0.09], r: 0.09, iris: "#1a6aff", mirror: true }],
  },

  // ───────────── Stage 2 ─────────────

  // Aranared: an indigo spider on long arched legs, a red glitch mark on its back and thread-web halo.
  aranared: {
    palette: { body: "#524ca0", leg: "#302c5c", mark: "#d02e50", fang: "#e8eef8", thread: "#c2cae2", glow: RUIDO },
    glow: ["glow"],
    shapes: [
      { t: "ell", c: [-0.16, 0.5, 0], r: [0.28, 0.26, 0.25], col: "body", rot: [0, 0, -15] },
      { t: "ell", c: [0.16, 0.38, 0], r: [0.2, 0.17, 0.19], col: "body", k: 0.08 },
      { t: "cap", a: [-0.02, 0.72, 0], b: [-0.3, 0.68, 0], r: [0.07, 0.02], col: "mark", paint: true },
      { t: "cap", a: [-0.3, 0.7, 0.03], b: [-0.42, 0.6, 0.03], r: [0.014, 0.014], col: "glow", paint: true },
      // Fangs
      { t: "cap", a: [0.3, 0.3, 0.05], b: [0.36, 0.2, 0.04], r: [0.03, 0.01], col: "fang", mirror: true, k: 0.02 },
      // Four pairs of arched legs
      ...[[0.2, 0.42], [0.08, 0.2], [-0.06, -0.04], [-0.18, -0.26]].flatMap(([x, xe]): Shape[] => [
        { t: "cap", a: [x * 0.6 + 0.04, 0.4, 0.14], b: [x, 0.6, 0.32], r: [0.045, 0.04], col: "leg", mirror: true, k: 0.02 },
        { t: "cap", a: [x, 0.6, 0.32], b: [xe * 0.85, 0.0, 0.42], r: [0.04, 0.016], col: "leg", mirror: true, k: 0.015 },
      ]),
      // A silver connection thread trailing from the spinnerets
      { t: "cap", a: [-0.42, 0.4, 0], b: [-0.56, 0.62, 0], r: [0.016, 0.016], col: "thread", k: 0.01 },
      { t: "ell", c: [-0.57, 0.64, 0], r: [0.035, 0.035, 0.035], col: "glow", k: 0 },
    ],
    eyes: [{ at: [0.24, 0.43, 0.07], r: 0.085, iris: "#ff3a5a", mirror: true, angry: true }],
  },

  // Gaviotaje: a scarred thief gull with black wingtips, perched on a stolen data packet.
  gaviotaje: {
    palette: { body: "#eef4fc", wing: "#8aa0c6", tip: "#2e3248", beak: "#f0c02a", packet: "#2e3248", scar: "#c06a7a", glow: SENAL },
    glow: ["glow"],
    shapes: [
      { t: "ell", c: [-0.02, 0.52, 0], r: [0.3, 0.19, 0.19], col: "body", rot: [0, 0, 12] },
      { t: "ell", c: [0.24, 0.74, 0], r: [0.15, 0.14, 0.14], col: "body", k: 0.08 },
      { t: "cap", a: [0.36, 0.72, 0], b: [0.54, 0.68, 0], r: [0.05, 0.022], col: "beak", k: 0.02 },
      { t: "cap", a: [0.54, 0.68, 0], b: [0.56, 0.62, 0], r: [0.022, 0.01], col: "beak", k: 0.01 },
      { t: "cap", a: [0.3, 0.86, 0.12], b: [0.34, 0.74, 0.14], r: [0.012, 0.012], col: "scar", paint: true },
      // Wings raised back
      { t: "ell", c: [-0.14, 0.7, 0.18], r: [0.32, 0.09, 0.04], col: "wing", mirror: true, rot: [10, 15, -30], k: 0.04 },
      { t: "ell", c: [-0.38, 0.86, 0.22], r: [0.12, 0.08, 0.07], col: "tip", mirror: true, paint: true },
      { t: "cap", a: [-0.04, 0.68, 0.22], b: [-0.3, 0.82, 0.26], r: [0.012, 0.012], col: "glow", mirror: true, paint: true },
      // Tail
      { t: "cap", a: [-0.24, 0.46, 0], b: [-0.46, 0.38, 0], r: [0.08, 0.03], col: "wing", k: 0.04 },
      { t: "ell", c: [-0.46, 0.38, 0], r: [0.05, 0.03, 0.05], col: "tip", paint: true },
      // Legs gripping the packet
      { t: "cap", a: [0.02, 0.36, 0.07], b: [0.04, 0.22, 0.08], r: [0.025, 0.02], col: "beak", mirror: true, k: 0.02 },
      { t: "ell", c: [0.08, 0.22, 0.08], r: [0.06, 0.02, 0.035], col: "beak", mirror: true, k: 0.01 },
      { t: "box", c: [0.02, 0.1, 0], s: [0.17, 0.1, 0.15], round: 0.025, col: "packet", k: 0 },
      { t: "box", c: [0.02, 0.1, 0], s: [0.18, 0.012, 0.16], round: 0.004, col: "glow", paint: true },
      { t: "box", c: [0.02, 0.1, 0], s: [0.012, 0.11, 0.16], round: 0.004, col: "glow", paint: true },
    ],
    eyes: [{ at: [0.3, 0.78, 0.07], r: 0.07, iris: "#ffb020", mirror: true, angry: true }],
  },

  // Sapotron: a huge violet toad with yellow warts, battery glands and an electrified tongue.
  sapotron: {
    palette: { body: "#4a44aa", belly: "#f0c03a", wart: "#ffe070", tongue: "#e04a80", dark: "#28245a", gland: "#f0c03a", glow: PULSO },
    glow: ["glow"],
    shapes: [
      { t: "ell", c: [-0.06, 0.36, 0], r: [0.4, 0.32, 0.32], col: "body" },
      { t: "ell", c: [0.2, 0.46, 0], r: [0.24, 0.2, 0.26], col: "body", k: 0.1 },
      { t: "ell", c: [0.2, 0.22, 0], r: [0.22, 0.18, 0.24], col: "belly", paint: true },
      { t: "ell", c: [0.18, 0.66, 0.13], r: [0.1, 0.1, 0.1], col: "body", mirror: true, k: 0.06 },
      { t: "cap", a: [0.42, 0.4, 0.17], b: [0.44, 0.38, -0.17], r: [0.014, 0.014], col: "dark", paint: true },
      // Battery glands
      { t: "box", c: [-0.08, 0.64, 0.17], s: [0.1, 0.045, 0.055], round: 0.025, col: "gland", mirror: true, k: 0.02, rot: [20, 0, -10] },
      { t: "box", c: [-0.02, 0.645, 0.18], s: [0.02, 0.04, 0.06], round: 0.01, col: "glow", mirror: true, paint: true, rot: [20, 0, -10] },
      // Warts
      { t: "ell", c: [-0.26, 0.56, 0.18], r: [0.035, 0.035, 0.035], col: "wart", paint: true, mirror: true },
      { t: "ell", c: [-0.36, 0.38, 0.26], r: [0.035, 0.035, 0.035], col: "wart", paint: true, mirror: true },
      { t: "ell", c: [-0.3, 0.64, 0.0], r: [0.035, 0.035, 0.035], col: "wart", paint: true },
      // Legs
      { t: "ell", c: [-0.24, 0.2, 0.26], r: [0.22, 0.14, 0.1], col: "body", mirror: true, k: 0.06, rot: [0, 0, 20] },
      { t: "ell", c: [-0.06, 0.04, 0.3], r: [0.15, 0.04, 0.09], col: "dark", mirror: true, k: 0.03 },
      { t: "cap", a: [0.26, 0.3, 0.2], b: [0.34, 0.04, 0.24], r: [0.06, 0.05], col: "body", mirror: true, k: 0.04 },
      { t: "ell", c: [0.38, 0.03, 0.25], r: [0.08, 0.03, 0.07], col: "dark", mirror: true, k: 0.02 },
      // Electrified tongue
      { t: "cap", a: [0.4, 0.36, 0.08], b: [0.56, 0.5, 0.2], r: [0.045, 0.04], col: "tongue", k: 0.03 },
      { t: "cap", a: [0.56, 0.5, 0.2], b: [0.58, 0.72, 0.24], r: [0.04, 0.035], col: "tongue", k: 0.02 },
      { t: "ell", c: [0.58, 0.76, 0.24], r: [0.06, 0.06, 0.06], col: "tongue", k: 0.02 },
      { t: "cap", a: [0.66, 0.84, 0.24], b: [0.72, 0.92, 0.26], r: [0.018, 0.014], col: "glow", k: 0 },
      { t: "cap", a: [0.72, 0.92, 0.26], b: [0.68, 1.0, 0.26], r: [0.016, 0.012], col: "glow", k: 0 },
    ],
    eyes: [{ at: [0.2, 0.68, 0.13], r: 0.085, iris: "#ffb020", mirror: true, angry: true, look: [0.6, 0.3, 0.75] }],
  },

  // Cactuson: a grumpy saguaro guard with a pink flower, cream spines and an amber circuit.
  cactuson: turn(-30, {
    palette: { body: "#3a9a52", rib: "#1c5236", flower: "#e0508a", heart: "#ffd84a", spine: "#fff4d2", mouth: "#123a2a", glow: PULSO },
    glow: ["glow"],
    shapes: [
      { t: "cap", a: [0, 0.12, 0], b: [0, 0.74, 0], r: [0.24, 0.22], col: "body" },
      ...[-50, -15, 20, 55].map((a): Shape => ({ t: "cap", a: [0.26 * Math.cos((a * Math.PI) / 180), 0.12, 0.26 * Math.sin((a * Math.PI) / 180)], b: [0.24 * Math.cos((a * Math.PI) / 180), 0.8, 0.24 * Math.sin((a * Math.PI) / 180)], r: [0.014, 0.014], col: "rib", paint: true, mirror: a !== 0 })).slice(0, 2),
      // Arms
      { t: "cap", a: [0, 0.42, 0.2], b: [-0.04, 0.42, 0.38], r: [0.09, 0.085], col: "body", mirror: true, k: 0.05 },
      { t: "cap", a: [-0.04, 0.42, 0.38], b: [-0.06, 0.68, 0.4], r: [0.085, 0.075], col: "body", mirror: true, k: 0.03 },
      // Feet
      { t: "ell", c: [0.06, 0.05, 0.12], r: [0.12, 0.06, 0.09], col: "body", mirror: true, k: 0.06 },
      // Spines
      { t: "cap", a: [0.2, 0.62, 0.14], b: [0.26, 0.66, 0.2], r: [0.016, 0.006], col: "spine", mirror: true, k: 0 },
      { t: "cap", a: [-0.04, 0.68, 0.46], b: [-0.04, 0.72, 0.52], r: [0.016, 0.006], col: "spine", mirror: true, k: 0 },
      { t: "cap", a: [0.06, 0.3, 0.22], b: [0.1, 0.3, 0.3], r: [0.016, 0.006], col: "spine", mirror: true, k: 0 },
      { t: "cap", a: [-0.16, 0.8, 0.1], b: [-0.2, 0.86, 0.14], r: [0.016, 0.006], col: "spine", mirror: true, k: 0 },
      // Flower crown
      ...[0, 72, 144, 216, 288].map((a): Shape => ({ t: "ell", c: [0.09 * Math.cos((a * Math.PI) / 180), 1.0, 0.09 * Math.sin((a * Math.PI) / 180)], r: [0.08, 0.045, 0.08], col: "flower", k: 0.02 })),
      { t: "ell", c: [0, 1.04, 0], r: [0.05, 0.035, 0.05], col: "heart", k: 0.01 },
      // Grumpy mouth and amber circuit
      { t: "cap", a: [0.235, 0.5, 0.06], b: [0.235, 0.52, -0.06], r: [0.016, 0.016], col: "mouth", paint: true },
      { t: "cap", a: [0.2, 0.36, 0.13], b: [0.18, 0.18, 0.15], r: [0.012, 0.012], col: "glow", paint: true },
      { t: "cap", a: [0.18, 0.18, 0.15], b: [0.08, 0.14, 0.22], r: [0.012, 0.012], col: "glow", paint: true },
      { t: "ell", c: [0.21, 0.37, 0.12], r: [0.025, 0.025, 0.03], col: "glow", paint: true },
    ],
    eyes: [{ at: [0.15, 0.64, 0.08], r: 0.1, iris: "#ff6a3a", mirror: true, angry: true, look: [0.9, 0.0, 0.4] }],
  }),

  // Golem-disco: a golem of stacked discs with spinning CD arms and a visor face.
  "golem-disco": turn(-20, {
    palette: { disc: "#96a6c6", band: "#9c7ed2", dark: "#30364e", cd: "#d0dcee", hub: "#48506e", glow: SENAL },
    glow: ["glow"],
    shapes: [
      ...[0.2, 0.34, 0.48, 0.62].map((y, i): Shape => ({ t: "ell", c: [0, y, 0], r: [0.26 - Math.abs(i - 1.5) * 0.02, 0.085, 0.26 - Math.abs(i - 1.5) * 0.02], col: i % 2 ? "band" : "disc", k: 0.03 })),
      ...[0.27, 0.41, 0.55].map((y): Shape => ({ t: "tor", c: [0, y, 0], R: 0.22, r: 0.032, col: "glow", paint: true })),
      // Head dome with a visor
      { t: "ell", c: [0, 0.8, 0], r: [0.19, 0.15, 0.19], col: "dark", k: 0.05 },
      { t: "ell", c: [0.08, 0.8, 0], r: [0.13, 0.06, 0.16], col: "hub", paint: true },
      { t: "cap", a: [0, 0.94, 0], b: [0, 1.02, 0], r: [0.02, 0.015], col: "dark", k: 0.02 },
      { t: "ell", c: [0, 1.03, 0], r: [0.03, 0.03, 0.03], col: "glow", k: 0 },
      // Legs
      { t: "ell", c: [0.02, 0.06, 0.13], r: [0.12, 0.07, 0.09], col: "dark", mirror: true, k: 0.04 },
      // CD arms
      { t: "cap", a: [0, 0.48, 0.22], b: [0, 0.48, 0.36], r: [0.05, 0.04], col: "dark", mirror: true, k: 0.03 },
      { t: "ell", c: [0, 0.48, 0.42], r: [0.2, 0.2, 0.035], col: "cd", mirror: true, k: 0.01 },
      { t: "tor", c: [0, 0.48, 0.42], R: 0.13, r: 0.03, col: "glow", mirror: true, paint: true, rot: [90, 0, 0] },
      { t: "ell", c: [0, 0.48, 0.42], r: [0.05, 0.05, 0.06], col: "hub", mirror: true, paint: true },
    ],
    eyes: [{ at: [0.1, 0.8, 0.07], r: 0.075, iris: "#2ad4ff", mirror: true, angry: true, look: [0.8, 0.05, 0.6] }],
  }),

  // Medusonica: a rose jellyfish with frilled violet arms and cyan tentacles, ringed by dizzy waves.
  medusonica: turn(-30, {
    palette: { bell: "#d866b8", rim: "#9a3a8c", spot: "#f8a0da", arm: "#8a60d2", tent: "#5ab0da", glow: SENAL },
    glow: ["glow"],
    shapes: [
      { t: "ell", c: [0, 0.74, 0], r: [0.32, 0.24, 0.32], col: "bell" },
      { t: "tor", c: [0, 0.56, 0], R: 0.27, r: 0.06, col: "rim", k: 0.04 },
      { t: "ell", c: [-0.08, 0.92, 0.12], r: [0.06, 0.04, 0.06], col: "spot", paint: true },
      { t: "ell", c: [-0.18, 0.8, 0.22], r: [0.05, 0.04, 0.05], col: "spot", paint: true },
      { t: "box", c: [0.0, 0.96, 0.0], s: [0.1, 0.025, 0.03], round: 0.01, col: "glow", paint: true },
      { t: "box", c: [-0.1, 0.88, -0.2], s: [0.04, 0.025, 0.08], round: 0.01, col: "glow", paint: true },
      // Frilled arms
      ...[0.1, -0.1].flatMap((z): Shape[] => [
        { t: "cap", a: [0.02, 0.54, z], b: [0.06, 0.36, z * 1.4], r: [0.075, 0.065], col: "arm", k: 0.04 },
        { t: "cap", a: [0.06, 0.36, z * 1.4], b: [-0.02, 0.2, z * 1.1], r: [0.065, 0.05], col: "arm", k: 0.03 },
        { t: "cap", a: [-0.02, 0.2, z * 1.1], b: [0.04, 0.06, z * 1.3], r: [0.04, 0.02], col: "arm", k: 0.03 },
      ]),
      // Tentacles
      ...[[0.22, 0.12], [-0.2, 0.16], [0.06, 0.26], [-0.04, -0.26]].flatMap(([x, z]): Shape[] => [
        { t: "cap", a: [x, 0.54, z], b: [x * 1.2 + 0.03, 0.28, z * 1.2], r: [0.025, 0.022], col: "tent", k: 0.02 },
        { t: "cap", a: [x * 1.2 + 0.03, 0.28, z * 1.2], b: [x * 1.1, 0.0, z * 1.15], r: [0.022, 0.012], col: "tent", k: 0.02 },
      ]),
      // Dizzy waves
      { t: "tor", c: [-0.02, 1.06, 0], R: 0.22, r: 0.016, col: "glow", rot: [12, 0, 10], k: 0 },
      { t: "tor", c: [-0.02, 1.1, 0], R: 0.3, r: 0.014, col: "glow", rot: [-10, 0, -8], k: 0 },
    ],
    eyes: [{ at: [0.2, 0.72, 0.1], r: 0.1, iris: "#2ad4ff", mirror: true, angry: true, look: [0.9, 0.05, 0.4] }],
  }),

  // Lobocifra: a snarling slate wolf with a violet mane and glowing cipher marks on its flank.
  lobocifra: {
    palette: { body: "#5e6a98", pale: "#c6c6de", mane: "#6c4aaa", dark: "#2c2c48", tooth: "#ffffff", glow: RUIDO },
    glow: ["glow"],
    shapes: [
      { t: "ell", c: [-0.06, 0.52, 0], r: [0.34, 0.16, 0.15], col: "body", rot: [0, 0, 6] },
      { t: "ell", c: [0.0, 0.44, 0], r: [0.26, 0.07, 0.12], col: "pale", paint: true },
      { t: "ell", c: [0.2, 0.64, 0], r: [0.19, 0.22, 0.19], col: "mane", k: 0.08 },
      { t: "ell", c: [-0.04, 0.68, 0], r: [0.22, 0.06, 0.1], col: "mane", k: 0.06 },
      { t: "ell", c: [0.36, 0.8, 0], r: [0.14, 0.12, 0.12], col: "body", k: 0.06 },
      { t: "cap", a: [0.42, 0.78, 0], b: [0.6, 0.72, 0], r: [0.075, 0.05], col: "body", k: 0.05 },
      { t: "ell", c: [0.52, 0.7, 0], r: [0.1, 0.035, 0.06], col: "pale", paint: true },
      { t: "ell", c: [0.62, 0.74, 0], r: [0.03, 0.025, 0.03], col: "dark", k: 0.01 },
      { t: "cap", a: [0.54, 0.7, 0.04], b: [0.55, 0.65, 0.04], r: [0.014, 0.004], col: "tooth", mirror: true, k: 0 },
      { t: "cap", a: [0.32, 0.88, 0.07], b: [0.28, 1.04, 0.1], r: [0.055, 0.01], col: "body", mirror: true, k: 0.03 },
      // Legs
      { t: "cap", a: [0.18, 0.44, 0.08], b: [0.22, 0.04, 0.09], r: [0.055, 0.04], col: "body", mirror: true, k: 0.04 },
      { t: "cap", a: [-0.28, 0.46, 0.08], b: [-0.3, 0.04, 0.09], r: [0.06, 0.04], col: "body", mirror: true, k: 0.04 },
      { t: "ell", c: [0.25, 0.03, 0.09], r: [0.06, 0.03, 0.045], col: "dark", mirror: true, k: 0.02 },
      { t: "ell", c: [-0.27, 0.03, 0.09], r: [0.06, 0.03, 0.045], col: "dark", mirror: true, k: 0.02 },
      // Tail
      { t: "cap", a: [-0.36, 0.56, 0], b: [-0.56, 0.7, 0], r: [0.07, 0.07], col: "body", k: 0.05 },
      { t: "cap", a: [-0.56, 0.7, 0], b: [-0.7, 0.66, 0], r: [0.07, 0.025], col: "dark", k: 0.03 },
      // Cipher marks
      { t: "cap", a: [-0.06, 0.6, 0.15], b: [-0.06, 0.46, 0.15], r: [0.014, 0.014], col: "glow", paint: true, mirror: true },
      { t: "cap", a: [-0.14, 0.6, 0.15], b: [-0.14, 0.5, 0.15], r: [0.014, 0.014], col: "glow", paint: true, mirror: true },
      { t: "cap", a: [-0.22, 0.58, 0.14], b: [-0.22, 0.48, 0.14], r: [0.014, 0.014], col: "glow", paint: true, mirror: true },
      { t: "cap", a: [-0.06, 0.53, 0.15], b: [-0.14, 0.55, 0.15], r: [0.012, 0.012], col: "glow", paint: true, mirror: true },
    ],
    eyes: [{ at: [0.42, 0.84, 0.06], r: 0.06, iris: "#ffd23a", mirror: true, angry: true, look: [0.7, 0.1, 0.7] }],
  },

  // Buhoraculo: a stern blue owl with a cream facial disc and a glowing foresight sigil.
  buhoraculo: {
    palette: { body: "#2c5e8a", face: "#e8dcb8", wing: "#1a3c5e", belly: "#fff6dc", chev: "#4c8ab4", beak: "#e8a02a", glow: SENAL },
    glow: ["glow"],
    shapes: [
      { t: "ell", c: [0, 0.42, 0], r: [0.3, 0.38, 0.3], col: "body" },
      { t: "ell", c: [0.04, 0.82, 0], r: [0.26, 0.2, 0.28], col: "body", k: 0.1 },
      { t: "ell", c: [0.22, 0.8, 0.1], r: [0.1, 0.13, 0.13], col: "face", paint: true, mirror: true },
      { t: "ell", c: [0.2, 0.36, 0], r: [0.16, 0.24, 0.2], col: "belly", paint: true },
      ...[[0.42, 0.06], [0.3, -0.07], [0.3, 0.08], [0.2, 0.0]].map(([y, z]): Shape => ({ t: "cap", a: [0.32, y + 0.02, z - 0.04], b: [0.32, y - 0.02, z + 0.04], r: [0.014, 0.014], col: "chev", paint: true })),
      // Wings folded at the sides
      { t: "ell", c: [-0.04, 0.42, 0.24], r: [0.22, 0.3, 0.08], col: "wing", mirror: true, k: 0.04, rot: [8, 0, 0] },
      { t: "cap", a: [0.0, 0.5, 0.31], b: [-0.1, 0.2, 0.3], r: [0.012, 0.012], col: "glow", paint: true, mirror: true },
      // Ear tufts
      { t: "cap", a: [0.06, 0.92, 0.16], b: [0.04, 1.08, 0.26], r: [0.06, 0.012], col: "body", mirror: true, k: 0.04 },
      // Beak and sigil
      { t: "cap", a: [0.28, 0.76, 0], b: [0.32, 0.66, 0], r: [0.04, 0.01], col: "beak", k: 0.02 },
      { t: "box", c: [0.24, 0.96, 0], s: [0.04, 0.04, 0.04], round: 0.008, col: "glow", paint: true, rot: [45, 0, 0] },
      // Feet on a glowing perch
      { t: "ell", c: [0.12, 0.05, 0.1], r: [0.07, 0.04, 0.06], col: "beak", mirror: true, k: 0.03 },
      { t: "cap", a: [0.12, 0.02, -0.34], b: [0.12, 0.02, 0.34], r: [0.025, 0.025], col: "glow", k: 0 },
    ],
    eyes: [{ at: [0.22, 0.82, 0.1], r: 0.095, iris: "#2ad4ff", mirror: true, angry: true }],
  },

  // Escorpiolag: a maroon scorpion with bone plates and a loading-spinner around its sting.
  escorpiolag: {
    palette: { body: "#82284e", plate: "#d8b888", claw: "#ba4a5e", sting: "#8a44c2", dark: "#401e38", glow: RUIDO },
    glow: ["glow"],
    shapes: [
      { t: "ell", c: [0, 0.24, 0], r: [0.32, 0.13, 0.18], col: "body" },
      { t: "ell", c: [0.28, 0.24, 0], r: [0.13, 0.11, 0.13], col: "body", k: 0.06 },
      ...[-0.16, 0.0, 0.14].map((x): Shape => ({ t: "box", c: [x, 0.35, 0], s: [0.06, 0.03, 0.12], round: 0.025, col: "plate", k: 0.01, rot: [0, 0, 0] })),
      // Legs
      ...[0.12, -0.02, -0.16].map((x): Shape => ({ t: "cap", a: [x, 0.2, 0.14], b: [x - 0.04, 0.0, 0.3], r: [0.03, 0.018], col: "dark", mirror: true, k: 0.02 })),
      // Pincers
      { t: "cap", a: [0.3, 0.22, 0.1], b: [0.46, 0.26, 0.2], r: [0.04, 0.035], col: "body", mirror: true, k: 0.03 },
      { t: "ell", c: [0.54, 0.3, 0.2], r: [0.1, 0.07, 0.06], col: "claw", mirror: true, k: 0.03 },
      { t: "cap", a: [0.6, 0.34, 0.2], b: [0.72, 0.36, 0.2], r: [0.03, 0.01], col: "plate", mirror: true, k: 0.01 },
      { t: "cap", a: [0.6, 0.26, 0.2], b: [0.7, 0.24, 0.2], r: [0.028, 0.01], col: "plate", mirror: true, k: 0.01 },
      // Segmented tail curling over
      { t: "ell", c: [-0.34, 0.32, 0], r: [0.09, 0.08, 0.08], col: "body", k: 0.04 },
      { t: "ell", c: [-0.44, 0.48, 0], r: [0.085, 0.085, 0.075], col: "body", k: 0.03 },
      { t: "ell", c: [-0.46, 0.66, 0], r: [0.08, 0.08, 0.07], col: "body", k: 0.03 },
      { t: "ell", c: [-0.38, 0.82, 0], r: [0.075, 0.075, 0.065], col: "body", k: 0.03 },
      { t: "ell", c: [-0.24, 0.9, 0], r: [0.07, 0.065, 0.06], col: "body", k: 0.03 },
      { t: "ell", c: [-0.1, 0.88, 0], r: [0.07, 0.06, 0.06], col: "sting", k: 0.03 },
      { t: "cap", a: [-0.04, 0.86, 0], b: [0.02, 0.76, 0], r: [0.04, 0.008], col: "sting", k: 0.02 },
      { t: "tor", c: [-0.08, 0.86, 0], R: 0.14, r: 0.016, col: "glow", rot: [90, 0, 0], k: 0 },
      { t: "box", c: [0.05, 0.98, 0], s: [0.025, 0.025, 0.025], round: 0.006, col: "glow", k: 0 },
    ],
    eyes: [{ at: [0.34, 0.28, 0.06], r: 0.06, iris: "#ffe03a", mirror: true, angry: true, look: [0.7, 0.2, 0.7] }],
  },

  // Ciervoltio: a chestnut deer with a spotted back and crackling blue antlers.
  ciervoltio: {
    palette: { body: "#ca6a3a", cream: "#ecd8b8", antler: "#8aa8e2", hoof: "#402c3a", spot: "#fff4e0", glow: PULSO },
    glow: ["glow"],
    shapes: [
      { t: "ell", c: [-0.06, 0.48, 0], r: [0.28, 0.14, 0.13], col: "body" },
      { t: "ell", c: [0.0, 0.4, 0], r: [0.22, 0.06, 0.11], col: "cream", paint: true },
      { t: "cap", a: [0.14, 0.52, 0], b: [0.24, 0.74, 0], r: [0.1, 0.07], col: "body", k: 0.06 },
      { t: "ell", c: [0.15, 0.56, 0], r: [0.08, 0.1, 0.11], col: "cream", paint: true },
      { t: "ell", c: [0.28, 0.8, 0], r: [0.12, 0.1, 0.1], col: "body", k: 0.06 },
      { t: "cap", a: [0.34, 0.78, 0], b: [0.46, 0.72, 0], r: [0.065, 0.04], col: "body", k: 0.04 },
      { t: "ell", c: [0.47, 0.72, 0], r: [0.025, 0.022, 0.025], col: "hoof", k: 0.01 },
      { t: "ell", c: [0.42, 0.7, 0], r: [0.06, 0.03, 0.05], col: "cream", paint: true },
      { t: "ell", c: [0.22, 0.86, 0.13], r: [0.04, 0.025, 0.08], col: "body", mirror: true, rot: [-30, 0, 0], k: 0.03 },
      // Spots
      ...[[0.0, 0.58], [-0.12, 0.6], [-0.22, 0.56], [-0.06, 0.52]].map(([x, y]): Shape => ({ t: "ell", c: [x, y, 0.11], r: [0.025, 0.025, 0.04], col: "spot", paint: true, mirror: true })),
      // Legs
      { t: "cap", a: [0.12, 0.42, 0.07], b: [0.14, 0.04, 0.07], r: [0.04, 0.025], col: "body", mirror: true, k: 0.04 },
      { t: "cap", a: [-0.24, 0.42, 0.07], b: [-0.26, 0.04, 0.07], r: [0.05, 0.025], col: "body", mirror: true, k: 0.04 },
      { t: "cap", a: [0.14, 0.06, 0.07], b: [0.15, 0.0, 0.07], r: [0.028, 0.028], col: "hoof", mirror: true, k: 0.01 },
      { t: "cap", a: [-0.26, 0.06, 0.07], b: [-0.26, 0.0, 0.07], r: [0.028, 0.028], col: "hoof", mirror: true, k: 0.01 },
      { t: "ell", c: [-0.34, 0.56, 0], r: [0.05, 0.06, 0.04], col: "cream", k: 0.03 },
      // Antlers with crackling tips
      { t: "cap", a: [0.26, 0.88, 0.06], b: [0.22, 1.04, 0.14], r: [0.025, 0.02], col: "antler", mirror: true, k: 0.02 },
      { t: "cap", a: [0.22, 1.04, 0.14], b: [0.14, 1.16, 0.2], r: [0.02, 0.014], col: "antler", mirror: true, k: 0.01 },
      { t: "cap", a: [0.23, 1.0, 0.13], b: [0.32, 1.1, 0.16], r: [0.016, 0.012], col: "antler", mirror: true, k: 0.01 },
      { t: "cap", a: [0.2, 1.08, 0.16], b: [0.2, 1.18, 0.24], r: [0.015, 0.01], col: "antler", mirror: true, k: 0.01 },
      { t: "ell", c: [0.32, 1.11, 0.16], r: [0.024, 0.024, 0.024], col: "glow", mirror: true, k: 0 },
      { t: "ell", c: [0.14, 1.17, 0.2], r: [0.024, 0.024, 0.024], col: "glow", mirror: true, k: 0 },
    ],
    eyes: [{ at: [0.32, 0.84, 0.06], r: 0.065, iris: "#ffb020", mirror: true, look: [0.7, 0.1, 0.7] }],
  },
};

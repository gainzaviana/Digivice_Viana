import { Material as M, type Point } from "../../../src/art/forge";
import { blob, horn, P, type Colours, type Design, type Ramp } from "../style";

// Salvajes II: the strong wild Ecos (élite) and the bosses (supremo) of the Red.
// Glow by affinity: Pulso = warm amber, Señal = cyan, Ruido = magenta.

type F = Parameters<Design["draw"]>[0];
/** A centre-line point with its half width. */
type V = [number, number, number];

const PULSO = "#ffc23a";
const SENAL = "#4ef0ff";
const RUIDO = "#ff4ad8";
const PX = 1 / 64;

// Shared ramps.
const BONE: Ramp = ["#7a6a7e", "#bcaab8", "#e6dade", "#fffaf6"];
const GOLD: Ramp = ["#9a5e1c", "#d89a2e", "#f6cc58", "#fff2b0"];

// MARK: Helpers

/** A smooth tapering limb/tail/neck through centre points [x, y, halfWidth], rounded at both ends. */
function tube(f: F, pts: V[], m: M, lift = 0) {
  const k = pts.length;
  const g = (i: number) => pts[Math.max(0, Math.min(k - 1, i))];
  const c: V[] = [];
  for (let i = 0; i < k - 1; i++) {
    const p0 = g(i - 1), p1 = g(i), p2 = g(i + 1), p3 = g(i + 2);
    for (let t = 0; t < 1; t += 0.25) {
      const t2 = t * t, t3 = t2 * t;
      c.push([0, 1, 2].map((j) => 0.5 * (2 * p1[j] + (-p0[j] + p2[j]) * t + (2 * p0[j] - 5 * p1[j] + 4 * p2[j] - p3[j]) * t2 + (-p0[j] + 3 * p1[j] - 3 * p2[j] + p3[j]) * t3)) as V);
    }
  }
  c.push(pts[k - 1]);
  const L: Point[] = [], R: Point[] = [];
  const dir = (i: number) => {
    const a = c[Math.max(0, i - 1)], b = c[Math.min(c.length - 1, i + 1)];
    const dx = b[0] - a[0], dy = b[1] - a[1], d = Math.hypot(dx, dy) || 1;
    return [dx / d, dy / d];
  };
  c.forEach((p, i) => {
    const [dx, dy] = dir(i), w = Math.max(0.002, p[2]);
    L.push([p[0] - dy * w, p[1] + dx * w]);
    R.push([p[0] + dy * w, p[1] - dx * w]);
  });
  const cap = (p: V, fx: number, fy: number, nx: number, ny: number): Point[] => {
    const out: Point[] = [];
    for (let s = 1; s < 6; s++) {
      const a = (s / 6) * Math.PI, w = Math.max(0.002, p[2]);
      out.push([p[0] + w * (Math.cos(a) * nx + Math.sin(a) * fx), p[1] + w * (Math.cos(a) * ny + Math.sin(a) * fy)]);
    }
    return out;
  };
  const [ex, ey] = dir(c.length - 1), [sx, sy] = dir(0);
  const end = cap(c[c.length - 1], ex, ey, -ey, ex);
  const start = cap(c[0], -sx, -sy, sy, -sx);
  f.poly([...L, ...end, ...R.reverse(), ...start], m, lift);
}

/** A spiky star: manes, crowns, virus capsids, bursts. */
function star(f: F, cx: number, cy: number, rOut: number, rIn: number, n: number, m: M, lift = 0, rot = 0, sy = 1) {
  const pts: Point[] = [];
  for (let i = 0; i < n * 2; i++) {
    const a = rot + (i / (n * 2)) * Math.PI * 2, r = i % 2 ? rIn : rOut;
    pts.push([cx + Math.cos(a) * r, cy + Math.sin(a) * r * sy]);
  }
  f.poly(pts, m, lift);
}

/** Loose glowing pixel fragments: [x, y, wPx, hPx]. */
function bits(f: F, list: number[][]) {
  for (const [x, y, w = 1, h = w] of list) f.rect(x, y, x + w * PX, y + h * PX, M.glow, 3);
}

/** A glowing circuit trace through several points, only over the given materials. */
function trace(f: F, pts: Point[], on: M[] = [M.main, M.second]) {
  for (let i = 0; i < pts.length - 1; i++) f.seamLine(pts[i], pts[i + 1], on);
}

/** A fan of pointed feathers from one root: [angleDeg, length, halfWidth]. */
function fan(f: F, ox: number, oy: number, feathers: number[][], m: M, lift = 0) {
  for (const [deg, len, w] of feathers) {
    const a = (deg * Math.PI) / 180, cx = Math.cos(a), sy = Math.sin(a);
    tube(f, [[ox, oy, w * 0.6], [ox + cx * len * 0.55, oy + sy * len * 0.55, w], [ox + cx * len, oy + sy * len, w * 0.25]], m, lift);
  }
}

/**
 * A feathered wing: feathers rooted along the arm from the shoulder to the wrist, each pointing
 * between angA (at the shoulder) and angB (at the wrist), lengths lenA → lenB. Later feathers lie on top.
 */
function wing(f: F, sh: Point, wr: Point, n: number, lenA: number, lenB: number, angA: number, angB: number, w: number, m: M, lift = 0) {
  for (let i = 0; i < n; i++) {
    const t = i / (n - 1), a = ((angA + (angB - angA) * t) * Math.PI) / 180, len = lenA + (lenB - lenA) * t;
    const x = sh[0] + (wr[0] - sh[0]) * t, y = sh[1] + (wr[1] - sh[1]) * t;
    tube(f, [[x, y, w * 0.7], [x + Math.cos(a) * len * 0.5, y + Math.sin(a) * len * 0.5, w], [x + Math.cos(a) * len, y + Math.sin(a) * len, w * 0.3]], m, lift);
  }
}

/** n points evenly spaced along a smooth path through [x, y, r] points (for segmented bodies). */
function along(pts: V[], n: number): V[] {
  const k = pts.length, g = (i: number) => pts[Math.max(0, Math.min(k - 1, i))];
  const c: V[] = [];
  for (let i = 0; i < k - 1; i++) {
    const p0 = g(i - 1), p1 = g(i), p2 = g(i + 1), p3 = g(i + 2);
    for (let t = 0; t < 1; t += 0.05) {
      const t2 = t * t, t3 = t2 * t;
      c.push([0, 1, 2].map((j) => 0.5 * (2 * p1[j] + (-p0[j] + p2[j]) * t + (2 * p0[j] - 5 * p1[j] + 4 * p2[j] - p3[j]) * t2 + (-p0[j] + 3 * p1[j] - 3 * p2[j] + p3[j]) * t3)) as V);
    }
  }
  c.push(pts[k - 1]);
  const d = [0];
  for (let i = 1; i < c.length; i++) d.push(d[i - 1] + Math.hypot(c[i][0] - c[i - 1][0], c[i][1] - c[i - 1][1]));
  const out: V[] = [];
  for (let j = 0, i = 0; j < n; j++) {
    const want = (d[d.length - 1] * j) / (n - 1);
    while (i < c.length - 1 && d[i] < want) i++;
    out.push(c[i]);
  }
  return out;
}

/** A checkerboard "transparency" patch (the void showing through), pixel-aligned, one part. */
function checker(f: F, x0: number, y0: number, wPx: number, hPx: number, lift = 0) {
  const ax = Math.round(x0 * 64) / 64, ay = Math.round(y0 * 64) / 64;
  f.rect(ax, ay, ax + wPx * PX, ay + hPx * PX, M.second, lift);
  for (let y = 0; y < hPx; y += 2) for (let x = 0; x < wPx; x += 2) {
    if ((x + y) % 4) continue;
    f.band(ay + y * PX, ay + (y + 2) * PX, M.second, M.accent, ax + x * PX, ax + (x + 2) * PX);
  }
}

/** Points on an arc (screen angles in degrees, y down). */
const arc = (cx: number, cy: number, r: number, a0: number, a1: number, n: number, w0: number, w1: number): V[] =>
  Array.from({ length: n + 1 }, (_, i) => {
    const t = i / n, a = ((a0 + (a1 - a0) * t) * Math.PI) / 180;
    return [cx + Math.cos(a) * r, cy + Math.sin(a) * r, w0 + (w1 - w0) * t] as V;
  });

// MARK: Palettes

const manticora: Colours = {
  main: ["#4e2452", "#86386e", "#bc5a8e", "#ee94b6"],
  second: ["#a2502a", "#e0883a", "#f8b85e", "#ffe2a0"],
  accent: BONE,
  dark: ["#26163a", "#43285e", "#65408a", "#8e66b2"],
  glow: RUIDO,
  iris: "#ffcc33",
};
const grifo: Colours = {
  main: ["#7a4a2a", "#b87c42", "#e0aa66", "#fbdc9e"],
  second: ["#7c84a8", "#c4cae4", "#eef0fa", "#ffffff"],
  accent: ["#9a3a1e", "#de6a2a", "#ffa448", "#ffdc94"],
  dark: ["#3a3456", "#58507e", "#7c76a6", "#a8a4cc"],
  glow: SENAL,
  iris: "#ff9a2a",
};
const minotauro: Colours = {
  main: ["#4a2626", "#7e4032", "#ae6448", "#dc9670"],
  second: ["#94846a", "#d2c29c", "#f0e4c2", "#fffbec"],
  accent: ["#5a3418", "#9c6a28", "#d4a23e", "#fadc7e"],
  dark: ["#241a26", "#3c2a34", "#5a424e", "#7c626c"],
  glow: PULSO,
  iris: "#ff5a2a",
};
const bucle: Colours = {
  main: ["#14444c", "#1d7468", "#36a884", "#86e2b0"],
  second: ["#7c8a4a", "#bcc472", "#e4eaa0", "#fafad2"],
  accent: ["#3e1c62", "#6c349c", "#a462cc", "#dca2f0"],
  dark: ["#14202e", "#203448", "#344e68", "#4e6c8a"],
  glow: RUIDO,
  iris: "#ffe03a",
};
const golem: Colours = {
  main: ["#383246", "#585068", "#827892", "#b2a8c0"],
  second: ["#b0381e", "#ec6a2a", "#ffa444", "#ffe294"],
  accent: ["#5c3a34", "#8c5a46", "#b88462", "#e0b08a"],
  dark: ["#201c2a", "#322c3e", "#4a4258", "#665c76"],
  glow: PULSO,
  iris: "#ffd23a",
};
const fenix: Colours = {
  main: ["#8a1c46", "#d23a56", "#ff7466", "#ffbc98"],
  second: ["#c07626", "#f6b43a", "#ffde6c", "#fff8c8"],
  accent: ["#2e5aa0", "#4c8ade", "#8cc6fa", "#e4f8ff"],
  dark: ["#4e1638", "#7a2448", "#a43a58", "#c8606e"],
  glow: PULSO,
  iris: "#ff6a1a",
};
const hidra: Colours = {
  main: ["#2a2a60", "#3c4a9c", "#6278d2", "#a4b8f8"],
  second: ["#8a7a52", "#c8b674", "#ecdc9c", "#fffad6"],
  accent: ["#6a1a5a", "#a8307c", "#e05ea8", "#ffa8d8"],
  dark: ["#18183a", "#262a54", "#3c4274", "#585e96"],
  glow: RUIDO,
  iris: "#ff3a7a",
};
const yeti: Colours = {
  main: ["#7484b4", "#b2c2e6", "#e2ecfa", "#ffffff"],
  second: ["#2a689a", "#3aa0d2", "#7ad8f2", "#d4fcff"],
  accent: ["#26305e", "#3a4886", "#5868ae", "#8494d6"],
  dark: ["#1c2448", "#2c3a66", "#46588a", "#6a7eae"],
  glow: SENAL,
  iris: "#3ae0ff",
};
const kraken: Colours = {
  main: ["#5a1c3c", "#983052", "#d0586a", "#ff9c9a"],
  second: ["#b07a7c", "#e8b2a4", "#ffd8ca", "#fff4ee"],
  accent: ["#18546a", "#268a9c", "#4ec2ca", "#a8f2f0"],
  dark: ["#32142e", "#4e1e40", "#702c54", "#94426c"],
  glow: SENAL,
  iris: "#ffd23a",
};
const tortuga: Colours = {
  main: ["#384a58", "#567088", "#84a0b4", "#c2dae4"],
  second: ["#6a3828", "#a85a34", "#d8884a", "#f8c482"],
  accent: ["#8a6a42", "#c8a062", "#ecd294", "#fff6d4"],
  dark: ["#22202e", "#383446", "#524c62", "#706a82"],
  glow: PULSO,
  iris: "#ffb43a",
};
const fantasma: Colours = {
  main: ["#5a5c9c", "#8a94d2", "#c0caf2", "#f2f6ff"],
  second: ["#9a9886", "#d2d0be", "#f0eee2", "#ffffff"],
  accent: ["#1a3a5a", "#2a5a80", "#4a88b0", "#82c2e2"],
  dark: ["#262a52", "#383e72", "#525a96", "#727cb8"],
  glow: SENAL,
  iris: "#4ef0ff",
};

const reina: Colours = {
  main: ["#4a1a4e", "#7c2a70", "#b24a94", "#e480c4"],
  second: ["#9a7a14", "#d8b824", "#f8e85a", "#fffcc0"],
  accent: ["#6e96b8", "#a8d2ec", "#dcf2ff", "#ffffff"],
  dark: ["#1e1430", "#33244a", "#4e3a6a", "#6e5a8c"],
  glow: RUIDO,
  iris: "#ffe03a",
};
const titan: Colours = {
  main: ["#3a3e5c", "#5c6488", "#8a94ba", "#c8d2ee"],
  second: ["#7a2622", "#b83e2e", "#e06844", "#ffa070"],
  accent: GOLD,
  dark: ["#22202e", "#363246", "#504a64", "#6e6884"],
  glow: PULSO,
  iris: "#ffc23a",
};
const lag: Colours = {
  main: ["#2e4a50", "#467070", "#6c9a90", "#a8d2c0"],
  second: ["#8a6436", "#c8964e", "#ecc47c", "#fff0c2"],
  accent: BONE,
  dark: ["#1a1e2c", "#2a3042", "#424a60", "#626c84"],
  glow: RUIDO,
  iris: "#ff4ad8",
};
const nulo: Colours = {
  main: ["#383258", "#565084", "#8078b6", "#bab0e8"],
  second: ["#a6a4b6", "#d2d0de", "#eeeef6", "#ffffff"],
  accent: ["#5a586c", "#7c7a90", "#9a98ae", "#b8b6ca"],
  dark: ["#16142a", "#24203e", "#36305a", "#4c4678"],
  glow: RUIDO,
  iris: "#ff4ad8",
};
const arcangel: Colours = {
  main: ["#8a90b0", "#c6cce4", "#eef2fc", "#ffffff"],
  second: ["#3c86a8", "#6abcd6", "#a8e6f2", "#e8fcff"],
  accent: GOLD,
  dark: ["#1e2a4c", "#2e406c", "#4a5e92", "#7088ba"],
  glow: SENAL,
  iris: "#2ad8ff",
};
const virica: Colours = {
  main: ["#1e4a3c", "#2e7a4e", "#52b05c", "#a8e886"],
  second: ["#3a1a5c", "#5e2a8c", "#8a4ac2", "#c28cf0"],
  accent: ["#8a2a5c", "#c84a8a", "#f282b8", "#ffcce6"],
  dark: ["#1a1430", "#2a2046", "#40346a", "#5c4e90"],
  glow: RUIDO,
  iris: "#ff2a8a",
};
const gusano: Colours = {
  main: ["#7a2e2a", "#b8523e", "#e48460", "#ffbe94"],
  second: ["#3a2a5a", "#5a428a", "#8466b6", "#b49ae0"],
  accent: BONE,
  dark: ["#14223c", "#1e3458", "#2e4c7a", "#486ca0"],
  glow: RUIDO,
  iris: "#ffd23a",
};
const raiz: Colours = {
  main: ["#4a3028", "#74503a", "#a07650", "#cca47a"],
  second: ["#2a5a34", "#3e8a44", "#6aba56", "#b4e48a"],
  accent: ["#8a7a62", "#c2b292", "#e8dcc0", "#fffaee"],
  dark: ["#26202a", "#3a3038", "#54464e", "#726268"],
  glow: PULSO,
  iris: "#ffc23a",
};
const desborde: Colours = {
  main: ["#1e2c78", "#2e4cb4", "#4c80e6", "#9cc8ff"],
  second: ["#6a9ab4", "#a4d8e8", "#daf6fc", "#ffffff"],
  accent: ["#6a1e74", "#a43ca6", "#da70d2", "#ffb6f2"],
  dark: ["#121838", "#1e2856", "#2e3e7c", "#4a5ea6"],
  glow: SENAL,
  iris: "#ffea3a",
};

export const salvajes2: Record<string, Design> = {
  // Manticora-spam: a lion-bat with a golden mane and a segmented scorpion tail spitting message bits.
  "manticora-spam": {
    colours: manticora,
    draw(f) {
      // Far wing and far legs
      f.poly([P(0.46, 0.44), P(0.38, 0.04), P(0.31, 0.16), P(0.22, 0.06), P(0.18, 0.22), P(0.07, 0.2), P(0.32, 0.5)], M.dark);
      blob(f, [P(0.3, 0.66), P(0.38, 0.66), P(0.38, 0.93), P(0.3, 0.93)], M.main);
      blob(f, [P(0.58, 0.64), P(0.66, 0.64), P(0.66, 0.93), P(0.58, 0.93)], M.main);
      // Body and belly
      blob(f, [P(0.17, 0.66), P(0.22, 0.5), P(0.44, 0.45), P(0.66, 0.43), P(0.77, 0.55), P(0.72, 0.75), P(0.5, 0.8), P(0.26, 0.8)], M.main);
      blob(f, [P(0.36, 0.78), P(0.42, 0.7), P(0.6, 0.68), P(0.68, 0.74), P(0.6, 0.8)], M.second, 1);
      trace(f, [P(0.24, 0.6), P(0.36, 0.6), P(0.4, 0.56), P(0.52, 0.56), P(0.55, 0.52)], [M.main]);
      // Near wing: membrane with bone fingers
      f.poly([P(0.5, 0.5), P(0.52, 0.02), P(0.44, 0.13), P(0.37, 0.03), P(0.31, 0.19), P(0.2, 0.12), P(0.23, 0.3), P(0.1, 0.31), P(0.4, 0.56)], M.dark, 1);
      f.line(P(0.49, 0.48), P(0.51, 0.04), M.accent, 1, 2);
      f.line(P(0.47, 0.48), P(0.37, 0.05), M.accent, 1, 2);
      f.line(P(0.45, 0.5), P(0.21, 0.14), M.accent, 1, 2);
      f.line(P(0.43, 0.52), P(0.12, 0.31), M.accent, 1, 2);
      // Scorpion tail arching over the back
      const seg: V[] = [[0.2, 0.62, 0.06], [0.11, 0.54, 0.055], [0.06, 0.43, 0.05], [0.06, 0.31, 0.047], [0.1, 0.2, 0.044], [0.17, 0.12, 0.04], [0.26, 0.08, 0.036]];
      seg.forEach(([x, y, r]) => f.ellipse(x, y, r, r * 0.92, M.main, 1));
      trace(f, seg.map(([x, y]) => P(x, y)), [M.main]);
      f.ellipse(0.33, 0.08, 0.045, 0.04, M.accent, 2);
      horn(f, P(0.35, 0.05), P(0.37, 0.11), P(0.46, 0.15), 0.03, M.accent, 3);
      bits(f, [[0.48, 0.07, 2], [0.52, 0.13, 2, 1], [0.56, 0.05, 1], [0.5, 0.19, 1], [0.58, 0.16, 2, 1]]);
      // Near legs with claws
      blob(f, [P(0.2, 0.62), P(0.36, 0.6), P(0.41, 0.78), P(0.39, 0.96), P(0.25, 0.96), P(0.26, 0.8)], M.main, 2);
      blob(f, [P(0.62, 0.62), P(0.73, 0.62), P(0.75, 0.96), P(0.61, 0.96)], M.main, 2);
      for (const x of [0.36, 0.4, 0.7, 0.74]) horn(f, P(x, 0.97), P(x + 0.025, 0.95), P(x + 0.06, 0.98), 0, M.accent, 3);
      // Mane, head, horns
      star(f, 0.77, 0.42, 0.2, 0.14, 12, M.second, 1, 0.2);
      horn(f, P(0.74, 0.29), P(0.79, 0.27), P(0.66, 0.12), -0.04, M.accent, 3);
      blob(f, [P(0.69, 0.36), P(0.75, 0.27), P(0.87, 0.26), P(0.95, 0.35), P(0.96, 0.46), P(0.87, 0.52), P(0.74, 0.5)], M.main, 2);
      f.ellipse(0.9, 0.45, 0.06, 0.045, M.main, 3);
      f.ellipse(0.955, 0.42, 0.018, 0.018, M.dark, 4);
      f.triangle(P(0.86, 0.49), P(0.9, 0.49), P(0.88, 0.55), M.accent, 4);
      trace(f, [P(0.74, 0.44), P(0.8, 0.44)], [M.main]);
      return [{ x: 0.84, y: 0.36, r: 0.05, angry: true }];
    },
  },

  // Grifo-bus: steel-blue lion body, white eagle head and a raised wing traced with data buses.
  "grifo-bus": {
    colours: grifo,
    draw(f) {
      // Far wing
      wing(f, P(0.52, 0.42), P(0.6, 0.1), 5, 0.14, 0.2, 200, 240, 0.035, M.dark);
      tube(f, [[0.52, 0.42, 0.035], [0.58, 0.24, 0.03], [0.6, 0.1, 0.025]], M.dark);
      // Lion tail with a feather tuft
      tube(f, [[0.22, 0.6, 0.025], [0.1, 0.62, 0.02], [0.05, 0.74, 0.018]], M.main);
      fan(f, 0.05, 0.74, [[70, 0.14, 0.03], [100, 0.13, 0.03], [130, 0.1, 0.025]], M.second, 1);
      // Far legs
      blob(f, [P(0.28, 0.66), P(0.36, 0.66), P(0.36, 0.93), P(0.28, 0.93)], M.main);
      tube(f, [[0.62, 0.62, 0.04], [0.6, 0.8, 0.03], [0.6, 0.93, 0.025]], M.accent);
      // Body
      blob(f, [P(0.16, 0.64), P(0.22, 0.5), P(0.44, 0.46), P(0.64, 0.44), P(0.74, 0.54), P(0.7, 0.74), P(0.48, 0.79), P(0.24, 0.78)], M.main);
      trace(f, [P(0.22, 0.62), P(0.34, 0.62), P(0.38, 0.66), P(0.56, 0.66)], [M.main]);
      bits(f, [[0.56, 0.655, 2]]);
      // Near wing: primaries, then coverts
      wing(f, P(0.46, 0.5), P(0.44, 0.1), 7, 0.22, 0.34, 165, 222, 0.04, M.second, 1);
      trace(f, [P(0.4, 0.42), P(0.22, 0.4)], [M.second]);
      trace(f, [P(0.42, 0.22), P(0.22, 0.08)], [M.second]);
      tube(f, [[0.48, 0.52, 0.06], [0.46, 0.32, 0.05], [0.44, 0.1, 0.03]], M.second, 2);
      wing(f, P(0.46, 0.48), P(0.45, 0.16), 4, 0.1, 0.12, 170, 200, 0.035, M.second, 3);
      trace(f, [P(0.47, 0.5), P(0.46, 0.3), P(0.44, 0.14)], [M.second]);
      bits(f, [[0.435, 0.12, 2]]);
      // Near legs: lion haunch and eagle talon leg
      blob(f, [P(0.18, 0.62), P(0.34, 0.6), P(0.39, 0.78), P(0.37, 0.96), P(0.23, 0.96), P(0.24, 0.8)], M.main, 2);
      for (const x of [0.33, 0.37]) horn(f, P(x, 0.97), P(x + 0.025, 0.95), P(x + 0.06, 0.98), 0, M.dark, 3);
      blob(f, [P(0.62, 0.56), P(0.72, 0.56), P(0.74, 0.72), P(0.66, 0.76)], M.second, 2);
      tube(f, [[0.68, 0.72, 0.03], [0.7, 0.86, 0.025], [0.7, 0.93, 0.025]], M.accent, 2);
      for (const [x, d] of [[0.7, 0.07], [0.66, -0.05]]) horn(f, P(x - 0.015, 0.94), P(x + 0.015, 0.94), P(x + d, 0.98), d * 0.2, M.dark, 3);
      // Neck ruff, head, beak
      star(f, 0.7, 0.4, 0.12, 0.08, 9, M.second, 2, 0.4);
      blob(f, [P(0.62, 0.32), P(0.66, 0.18), P(0.78, 0.12), P(0.88, 0.16), P(0.9, 0.28), P(0.82, 0.38), P(0.68, 0.4)], M.second, 3);
      horn(f, P(0.66, 0.2), P(0.7, 0.16), P(0.54, 0.1), -0.03, M.second, 3);
      horn(f, P(0.67, 0.25), P(0.7, 0.2), P(0.55, 0.2), -0.02, M.second, 3);
      f.poly([P(0.85, 0.2), P(0.95, 0.23), P(0.98, 0.3), P(0.94, 0.36), P(0.92, 0.31), P(0.85, 0.3)], M.accent, 4);
      trace(f, [P(0.7, 0.32), P(0.76, 0.32), P(0.79, 0.29)], [M.second]);
      // Speed streaks
      for (const [y, x0, x1] of [[0.36, 0.02, 0.1], [0.44, 0.04, 0.14], [0.86, 0.1, 0.18]]) f.line(P(x0, y), P(x1, y), M.glow, 1, 3);
      return [{ x: 0.8, y: 0.23, r: 0.048, angry: true }];
    },
  },

  // Minotauro-kernel: a bronze-armoured bull warrior with a glowing labyrinth on its breastplate.
  "minotauro-kernel": {
    colours: minotauro,
    draw(f) {
      // Far arm and far leg
      tube(f, [[0.34, 0.36, 0.07], [0.27, 0.52, 0.06], [0.26, 0.66, 0.055]], M.main);
      f.ellipse(0.26, 0.7, 0.065, 0.06, M.main);
      blob(f, [P(0.36, 0.64), P(0.48, 0.64), P(0.48, 0.92), P(0.36, 0.92)], M.dark);
      f.ellipse(0.42, 0.94, 0.07, 0.035, M.accent);
      // Torso with a hump behind the head
      blob(f, [P(0.28, 0.46), P(0.32, 0.28), P(0.5, 0.18), P(0.68, 0.22), P(0.76, 0.4), P(0.7, 0.62), P(0.46, 0.7), P(0.32, 0.62)], M.main);
      // Breastplate with the labyrinth
      blob(f, [P(0.42, 0.38), P(0.56, 0.3), P(0.7, 0.36), P(0.7, 0.54), P(0.58, 0.62), P(0.44, 0.56)], M.accent, 1);
      trace(f, [P(0.46, 0.38), P(0.66, 0.38), P(0.66, 0.56), P(0.49, 0.56), P(0.49, 0.42), P(0.62, 0.42), P(0.62, 0.52), P(0.54, 0.52), P(0.54, 0.47)], [M.accent]);
      f.ellipse(0.575, 0.47, 0.02, 0.02, M.glow, 2);
      // Belt and loincloth
      f.rect(0.34, 0.62, 0.7, 0.68, M.accent, 2);
      f.ellipse(0.52, 0.65, 0.035, 0.035, M.glow, 3);
      f.poly([P(0.44, 0.67), P(0.6, 0.67), P(0.58, 0.82), P(0.52, 0.86), P(0.46, 0.82)], M.dark, 2);
      // Near leg with a hoof
      blob(f, [P(0.5, 0.66), P(0.66, 0.66), P(0.68, 0.8), P(0.66, 0.93), P(0.54, 0.93), P(0.52, 0.8)], M.main, 3);
      blob(f, [P(0.53, 0.8), P(0.66, 0.8), P(0.66, 0.92), P(0.54, 0.92)], M.dark, 3);
      f.ellipse(0.61, 0.95, 0.075, 0.035, M.accent, 4);
      // Labrys resting on the ground
      f.line(P(0.83, 0.5), P(0.86, 0.95), M.dark, 2, 3);
      blob(f, [P(0.84, 0.8), P(0.76, 0.74), P(0.72, 0.84), P(0.76, 0.95), P(0.85, 0.88)], M.accent, 4);
      blob(f, [P(0.86, 0.8), P(0.94, 0.72), P(0.98, 0.83), P(0.95, 0.94), P(0.87, 0.88)], M.accent, 4);
      trace(f, [P(0.76, 0.77), P(0.74, 0.84), P(0.77, 0.92)], [M.accent]);
      trace(f, [P(0.94, 0.75), P(0.96, 0.83), P(0.94, 0.91)], [M.accent]);
      // Near arm: pauldron, forearm, bracer, fist
      tube(f, [[0.68, 0.34, 0.07], [0.76, 0.48, 0.06], [0.8, 0.6, 0.055]], M.main, 3);
      f.rect(0.74, 0.54, 0.87, 0.6, M.accent, 4);
      f.ellipse(0.81, 0.66, 0.065, 0.06, M.main, 4);
      f.ellipse(0.66, 0.3, 0.1, 0.075, M.accent, 4);
      trace(f, [P(0.58, 0.3), P(0.74, 0.3)], [M.accent]);
      // Head, snout, nose ring, horns
      blob(f, [P(0.58, 0.22), P(0.64, 0.1), P(0.78, 0.08), P(0.88, 0.16), P(0.94, 0.27), P(0.88, 0.34), P(0.74, 0.33), P(0.62, 0.3)], M.main, 5);
      f.ellipse(0.88, 0.28, 0.06, 0.05, M.second, 6);
      f.ellipse(0.92, 0.27, 0.012, 0.012, M.dark, 7);
      f.ring(0.9, 0.33, 0.028, M.accent, 1, 7);
      horn(f, P(0.6, 0.17), P(0.68, 0.09), P(0.36, 0.04), -0.1, M.second, 6);
      horn(f, P(0.72, 0.09), P(0.8, 0.11), P(0.94, 0.02), 0.06, M.second, 6);
      f.seamLine(P(0.5, 0.08), P(0.4, 0.05), [M.second]);
      f.seamLine(P(0.86, 0.05), P(0.9, 0.04), [M.second]);
      horn(f, P(0.6, 0.18), P(0.63, 0.22), P(0.54, 0.22), 0, M.main, 6);
      return [{ x: 0.76, y: 0.17, r: 0.045, angry: true }];
    },
  },

  // Serpiente-bucle: a banded serpent coiled into a perfect loop, biting its own tail around a glowing ↻.
  "serpiente-bucle": {
    colours: bucle,
    draw(f) {
      const cx = 0.48, cy = 0.56, R = 0.33;
      // Loop symbol inside
      tube(f, arc(cx, cy, 0.1, -20, 245, 14, 0.012, 0.012), M.glow, 1);
      f.triangle(P(cx - 0.045, cy - 0.15), P(cx - 0.045, cy - 0.04), P(cx + 0.03, cy - 0.095), M.glow, 1);
      // Open mouth (the tail tip slides into it)
      f.poly([P(0.42, 0.21), P(0.68, 0.15), P(0.7, 0.32), P(0.44, 0.27)], M.dark, 1);
      // Dorsal fins along the outside
      for (let a = -170; a >= -400; a -= 38) {
        const r = (a * Math.PI) / 180, c = Math.cos(r), s = Math.sin(r);
        const t = (a + 110) / -330, w = 0.075 - 0.05 * t;
        horn(f, P(cx + c * (R + w * 0.6) - s * 0.03, cy + s * (R + w * 0.6) + c * 0.03), P(cx + c * (R + w * 0.6) + s * 0.03, cy + s * (R + w * 0.6) - c * 0.03), P(cx + c * (R + w + 0.06), cy + s * (R + w + 0.06)), 0, M.accent);
      }
      // Body: from the neck all around to the tail tip in the mouth
      const body = arc(cx, cy, R, -112, -440, 22, 0.075, 0.018);
      tube(f, body, M.main, 1);
      tube(f, arc(cx, cy, R - 0.045, -118, -425, 20, 0.02, 0.008), M.second, 2);
      // Bands with glowing cores
      for (let a = -140; a >= -410; a -= 27) {
        const r = (a * Math.PI) / 180, c = Math.cos(r), s = Math.sin(r);
        const t = (a + 110) / -330, w = 0.075 - 0.057 * t;
        f.line(P(cx + c * (R - w + 0.01), cy + s * (R - w + 0.01)), P(cx + c * (R + w - 0.012), cy + s * (R + w - 0.012)), M.accent, 2, 3);
        f.seamLine(P(cx + c * (R - w * 0.3), cy + s * (R - w * 0.3)), P(cx + c * (R + w * 0.6), cy + s * (R + w * 0.6)), [M.accent]);
      }
      // Head with hood fins, open jaws clamped on the tail
      horn(f, P(0.3, 0.12), P(0.33, 0.22), P(0.12, 0.08), -0.03, M.accent, 3);
      horn(f, P(0.33, 0.08), P(0.38, 0.1), P(0.22, 0.0), -0.03, M.accent, 3);
      blob(f, [P(0.34, 0.26), P(0.46, 0.25), P(0.6, 0.28), P(0.7, 0.32), P(0.58, 0.36), P(0.4, 0.34)], M.main, 4);
      f.triangle(P(0.56, 0.29), P(0.6, 0.29), P(0.58, 0.24), M.second, 5);
      blob(f, [P(0.27, 0.19), P(0.31, 0.07), P(0.46, 0.02), P(0.62, 0.06), P(0.73, 0.13), P(0.71, 0.19), P(0.56, 0.2), P(0.4, 0.25)], M.main, 5);
      f.triangle(P(0.6, 0.18), P(0.64, 0.17), P(0.62, 0.24), M.second, 6);
      f.triangle(P(0.5, 0.2), P(0.54, 0.2), P(0.52, 0.25), M.second, 6);
      f.ellipse(0.7, 0.12, 0.012, 0.01, M.dark, 6);
      trace(f, [P(0.32, 0.16), P(0.4, 0.16), P(0.46, 0.12), P(0.52, 0.12)], [M.main]);
      return [{ x: 0.53, y: 0.1, r: 0.05, angry: true }];
    },
  },

  // Golemagma: a hulking basalt golem, molten core behind its stone plates and glowing cracks.
  golemagma: {
    colours: golem,
    draw(f) {
      // Embers rising
      bits(f, [[0.3, 0.06, 1], [0.4, 0.02, 1], [0.22, 0.12, 2, 1], [0.5, 0.05, 1]]);
      // Far arm with a huge fist
      tube(f, [[0.3, 0.32, 0.08], [0.22, 0.56, 0.065], [0.2, 0.76, 0.06]], M.main);
      f.ellipse(0.19, 0.84, 0.09, 0.085, M.main);
      // Legs
      blob(f, [P(0.32, 0.68), P(0.48, 0.68), P(0.48, 0.95), P(0.3, 0.95)], M.dark);
      blob(f, [P(0.5, 0.68), P(0.68, 0.68), P(0.7, 0.96), P(0.5, 0.96)], M.main, 1);
      trace(f, [P(0.56, 0.74), P(0.6, 0.82), P(0.57, 0.9)], [M.main]);
      // Torso and molten core
      blob(f, [P(0.22, 0.5), P(0.26, 0.26), P(0.46, 0.14), P(0.68, 0.18), P(0.78, 0.4), P(0.7, 0.66), P(0.42, 0.74), P(0.28, 0.66)], M.main);
      blob(f, [P(0.42, 0.42), P(0.52, 0.32), P(0.68, 0.36), P(0.7, 0.54), P(0.6, 0.66), P(0.46, 0.62)], M.second, 1);
      // Stone plates leaving lava gaps
      f.poly([P(0.42, 0.42), P(0.54, 0.34), P(0.58, 0.44), P(0.48, 0.5)], M.accent, 2);
      f.poly([P(0.6, 0.38), P(0.69, 0.42), P(0.68, 0.52), P(0.61, 0.48)], M.accent, 2);
      f.poly([P(0.47, 0.54), P(0.58, 0.52), P(0.6, 0.62), P(0.5, 0.64)], M.accent, 2);
      trace(f, [P(0.3, 0.3), P(0.34, 0.4), P(0.3, 0.5), P(0.36, 0.6)], [M.main]);
      trace(f, [P(0.44, 0.2), P(0.5, 0.26), P(0.58, 0.24)], [M.main]);
      // Magma vents on the back
      for (const [x, y, tx, ty] of [[0.32, 0.24, 0.24, 0.1], [0.42, 0.18, 0.38, 0.04], [0.26, 0.34, 0.12, 0.26]]) horn(f, P(x - 0.04, y + 0.02), P(x + 0.04, y), P(tx, ty), -0.02, M.accent, 1);
      for (const [x, y] of [[0.25, 0.12], [0.385, 0.06], [0.14, 0.27]]) f.ellipse(x, y, 0.018, 0.018, M.glow, 2);
      // Near arm: boulder shoulder, forearm, fist dripping lava
      tube(f, [[0.66, 0.32, 0.08], [0.76, 0.54, 0.07], [0.82, 0.72, 0.065]], M.main, 3);
      f.ellipse(0.83, 0.84, 0.11, 0.1, M.main, 4);
      trace(f, [P(0.76, 0.82), P(0.84, 0.8), P(0.9, 0.84)], [M.main]);
      trace(f, [P(0.74, 0.88), P(0.8, 0.9), P(0.86, 0.92)], [M.main]);
      f.ellipse(0.67, 0.27, 0.12, 0.1, M.accent, 4);
      trace(f, [P(0.6, 0.24), P(0.66, 0.28), P(0.74, 0.24)], [M.accent]);
      blob(f, [P(0.86, 0.92), P(0.9, 0.92), P(0.89, 0.97), P(0.87, 0.97)], M.second, 5);
      // Small head sunk between the shoulders
      blob(f, [P(0.68, 0.2), P(0.72, 0.1), P(0.84, 0.08), P(0.9, 0.16), P(0.88, 0.28), P(0.74, 0.3)], M.main, 5);
      f.poly([P(0.7, 0.13), P(0.88, 0.11), P(0.9, 0.16), P(0.72, 0.18)], M.accent, 6);
      f.line(P(0.8, 0.25), P(0.88, 0.24), M.glow, 1, 6);
      return [{ x: 0.82, y: 0.19, r: 0.04, angry: true }];
    },
  },

  // Fenix-reinicio: a crimson-gold phoenix with blue-white flame tips inside a glowing restart arrow.
  "fenix-reinicio": {
    colours: fenix,
    draw(f) {
      // Restart ring with its arrowhead
      f.ring(0.46, 0.46, 0.4, M.glow, 1);
      f.triangle(P(0.72, 0.12), P(0.84, 0.16), P(0.74, 0.24), M.glow);
      // Far wing
      wing(f, P(0.54, 0.4), P(0.66, 0.08), 5, 0.14, 0.22, 205, 250, 0.035, M.dark);
      tube(f, [[0.54, 0.4, 0.035], [0.62, 0.22, 0.03], [0.66, 0.08, 0.022]], M.dark);
      // Tail plumes sweeping down
      tube(f, [[0.4, 0.62, 0.05], [0.26, 0.74, 0.045], [0.12, 0.8, 0.03], [0.06, 0.72, 0.02]], M.second);
      tube(f, [[0.42, 0.64, 0.05], [0.32, 0.82, 0.04], [0.2, 0.93, 0.03], [0.1, 0.94, 0.018]], M.main, 1);
      tube(f, [[0.46, 0.66, 0.045], [0.42, 0.84, 0.035], [0.34, 0.95, 0.025], [0.26, 0.97, 0.015]], M.second, 2);
      for (const [x, y] of [[0.06, 0.71], [0.1, 0.94], [0.26, 0.965]]) f.ellipse(x, y, 0.025, 0.02, M.accent, 3);
      // Body and chest
      blob(f, [P(0.36, 0.56), P(0.42, 0.38), P(0.56, 0.32), P(0.66, 0.42), P(0.64, 0.6), P(0.5, 0.7), P(0.4, 0.68)], M.main, 1);
      blob(f, [P(0.5, 0.64), P(0.52, 0.46), P(0.62, 0.42), P(0.66, 0.54), P(0.6, 0.64)], M.second, 2);
      trace(f, [P(0.54, 0.5), P(0.62, 0.5)], [M.second]);
      trace(f, [P(0.54, 0.56), P(0.63, 0.56)], [M.second]);
      // Talons
      tube(f, [[0.54, 0.66, 0.02], [0.56, 0.76, 0.015]], M.second, 2);
      for (const d of [0.03, -0.02]) horn(f, P(0.545, 0.76), P(0.57, 0.76), P(0.56 + d, 0.8), d, M.dark, 3);
      // Near wing: long primaries in crimson, gold coverts, blue tips
      wing(f, P(0.48, 0.46), P(0.46, 0.08), 7, 0.24, 0.36, 160, 228, 0.04, M.main, 2);
      for (let i = 0; i < 7; i++) {
        const t = i / 6, a = ((160 + 68 * t) * Math.PI) / 180, l = 0.24 + 0.12 * t - 0.02;
        f.ellipse(0.48 - 0.02 * t + Math.cos(a) * l, 0.46 - 0.38 * t + Math.sin(a) * l, 0.018, 0.018, M.accent, 3);
      }
      wing(f, P(0.48, 0.46), P(0.46, 0.1), 6, 0.13, 0.18, 165, 215, 0.04, M.second, 3);
      tube(f, [[0.5, 0.5, 0.055], [0.48, 0.3, 0.045], [0.46, 0.08, 0.025]], M.main, 4);
      trace(f, [P(0.49, 0.44), P(0.48, 0.26), P(0.465, 0.12)], [M.main]);
      // Neck, head, crest and beak
      tube(f, [[0.58, 0.42, 0.05], [0.64, 0.32, 0.045], [0.7, 0.26, 0.05]], M.main, 3);
      horn(f, P(0.64, 0.2), P(0.68, 0.16), P(0.5, 0.06), -0.04, M.second, 4);
      horn(f, P(0.66, 0.18), P(0.72, 0.15), P(0.6, 0.02), -0.02, M.main, 4);
      f.ellipse(0.585, 0.065, 0.02, 0.02, M.accent, 5);
      blob(f, [P(0.64, 0.26), P(0.67, 0.17), P(0.76, 0.14), P(0.84, 0.19), P(0.84, 0.28), P(0.74, 0.32)], M.main, 5);
      f.poly([P(0.82, 0.2), P(0.94, 0.24), P(0.9, 0.3), P(0.82, 0.28)], M.second, 6);
      bits(f, [[0.9, 0.42, 1], [0.86, 0.5, 2, 1], [0.94, 0.56, 1], [0.12, 0.3, 1], [0.18, 0.2, 2, 1]]);
      return [{ x: 0.76, y: 0.21, r: 0.042 }];
    },
  },

  // Hidra-fork: a heavy hydra whose necks branch like a process tree, glowing nodes at every fork.
  "hidra-fork": {
    colours: hidra,
    draw(f) {
      const head = (x: number, y: number, s: number, lift: number) => {
        horn(f, P(x - 0.04 * s, y - 0.03 * s), P(x, y - 0.05 * s), P(x - 0.12 * s, y - 0.1 * s), -0.02, M.accent, lift);
        blob(f, [P(x - 0.07 * s, y + 0.02 * s), P(x - 0.05 * s, y - 0.05 * s), P(x + 0.04 * s, y - 0.06 * s), P(x + 0.13 * s, y - 0.01 * s), P(x + 0.14 * s, y + 0.04 * s), P(x + 0.02 * s, y + 0.07 * s)], M.main, lift);
        blob(f, [P(x + 0.02 * s, y + 0.04 * s), P(x + 0.13 * s, y + 0.02 * s), P(x + 0.14 * s, y + 0.05 * s), P(x + 0.04 * s, y + 0.07 * s)], M.second, lift + 1);
        return { x: x + 0.03 * s, y: y - 0.015 * s, r: 0.038 * s, angry: true };
      };
      // Tail
      tube(f, [[0.26, 0.76, 0.07], [0.12, 0.8, 0.05], [0.04, 0.72, 0.03], [0.06, 0.62, 0.015]], M.main);
      // Far legs
      blob(f, [P(0.24, 0.76), P(0.34, 0.76), P(0.34, 0.95), P(0.22, 0.95)], M.dark);
      blob(f, [P(0.54, 0.76), P(0.64, 0.76), P(0.64, 0.95), P(0.52, 0.95)], M.dark);
      // Necks: the trunk forks twice
      tube(f, [[0.5, 0.52, 0.045], [0.55, 0.38, 0.04], [0.6, 0.3, 0.035], [0.68, 0.22, 0.035]], M.main, 1);
      tube(f, [[0.5, 0.52, 0.045], [0.48, 0.38, 0.04], [0.42, 0.28, 0.035], [0.34, 0.2, 0.035]], M.main, 1);
      tube(f, [[0.42, 0.7, 0.07], [0.5, 0.56, 0.055], [0.62, 0.5, 0.045], [0.74, 0.5, 0.04]], M.main, 2);
      trace(f, [P(0.44, 0.66), P(0.5, 0.56), P(0.62, 0.5), P(0.74, 0.5)], [M.main]);
      trace(f, [P(0.5, 0.54), P(0.52, 0.42), P(0.6, 0.3), P(0.66, 0.24)], [M.main]);
      trace(f, [P(0.52, 0.42), P(0.46, 0.34), P(0.38, 0.24)], [M.main]);
      // Body and belly
      blob(f, [P(0.14, 0.78), P(0.2, 0.62), P(0.4, 0.56), P(0.58, 0.6), P(0.66, 0.74), P(0.58, 0.86), P(0.24, 0.88)], M.main, 1);
      blob(f, [P(0.3, 0.86), P(0.34, 0.76), P(0.52, 0.72), P(0.62, 0.78), P(0.54, 0.86)], M.second, 2);
      for (const x of [0.2, 0.28, 0.36]) horn(f, P(x - 0.03, 0.62), P(x + 0.03, 0.6), P(x - 0.03, 0.5), -0.02, M.accent, 2);
      // Near legs
      blob(f, [P(0.18, 0.74), P(0.32, 0.72), P(0.34, 0.96), P(0.18, 0.96)], M.main, 3);
      blob(f, [P(0.5, 0.74), P(0.64, 0.72), P(0.66, 0.96), P(0.5, 0.96)], M.main, 3);
      for (const x of [0.3, 0.34, 0.62, 0.66]) horn(f, P(x, 0.97), P(x + 0.025, 0.95), P(x + 0.055, 0.98), 0, M.accent, 4);
      // Fork nodes
      for (const [x, y] of [[0.5, 0.53], [0.52, 0.41]]) { f.ellipse(x, y, 0.025, 0.025, M.accent, 4); f.ellipse(x, y, 0.012, 0.012, M.glow, 5); }
      // Heads
      return [head(0.32, 0.16, 1, 4), head(0.7, 0.18, 1, 4), head(0.8, 0.47, 1.15, 5)];
    },
  },

  // Yeti-criptografico: a shaggy frost yeti with ice-crystal horns and a glowing padlock plate.
  "yeti-criptografico": {
    colours: yeti,
    draw(f) {
      bits(f, [[0.06, 0.1, 1], [0.12, 0.2, 2, 1], [0.92, 0.6, 1], [0.04, 0.4, 1], [0.9, 0.08, 2, 1]]);
      // Far arm reaching the ground
      tube(f, [[0.3, 0.34, 0.08], [0.2, 0.58, 0.07], [0.16, 0.8, 0.065]], M.main);
      f.ellipse(0.16, 0.88, 0.07, 0.07, M.accent);
      // Legs
      blob(f, [P(0.28, 0.72), P(0.44, 0.72), P(0.44, 0.94), P(0.28, 0.94)], M.main);
      f.ellipse(0.37, 0.95, 0.09, 0.03, M.accent);
      // Shaggy body
      star(f, 0.46, 0.5, 0.33, 0.28, 16, M.main, 0, 0.1, 1.05);
      // Ice plates and the padlock
      blob(f, [P(0.44, 0.44), P(0.56, 0.36), P(0.7, 0.42), P(0.7, 0.66), P(0.56, 0.74), P(0.44, 0.66)], M.second, 1);
      f.ring(0.57, 0.48, 0.05, M.dark, 2, 2);
      f.rect(0.49, 0.5, 0.66, 0.64, M.dark, 3);
      f.ellipse(0.575, 0.555, 0.018, 0.018, M.glow, 4);
      f.rect(0.565, 0.57, 0.585, 0.61, M.glow, 4);
      trace(f, [P(0.46, 0.68), P(0.52, 0.7), P(0.52, 0.74)], [M.second]);
      trace(f, [P(0.68, 0.42), P(0.68, 0.38)], [M.second]);
      // Near leg
      blob(f, [P(0.5, 0.72), P(0.66, 0.72), P(0.68, 0.94), P(0.5, 0.94)], M.main, 2);
      f.ellipse(0.6, 0.95, 0.1, 0.035, M.accent, 3);
      // Ice shards on the shoulders
      for (const [x, y, tx, ty] of [[0.3, 0.22, 0.2, 0.06], [0.38, 0.18, 0.36, 0.02], [0.24, 0.3, 0.08, 0.2]]) horn(f, P(x - 0.035, y + 0.02), P(x + 0.035, y), P(tx, ty), -0.01, M.second, 1);
      // Near arm
      tube(f, [[0.66, 0.34, 0.085], [0.76, 0.56, 0.075], [0.8, 0.76, 0.07]], M.main, 3);
      f.ellipse(0.82, 0.84, 0.08, 0.075, M.accent, 4);
      for (const x of [0.78, 0.84, 0.89]) f.ellipse(x, 0.91, 0.025, 0.025, M.accent, 5);
      trace(f, [P(0.34, 0.76), P(0.34, 0.84), P(0.38, 0.84)], [M.main]);
      // Head: fur hood, blue face, curled ice horns
      star(f, 0.72, 0.26, 0.15, 0.12, 12, M.main, 4, 0.3);
      blob(f, [P(0.7, 0.24), P(0.76, 0.18), P(0.88, 0.2), P(0.92, 0.28), P(0.88, 0.36), P(0.74, 0.36)], M.accent, 5);
      f.line(P(0.8, 0.33), P(0.9, 0.32), M.dark, 1, 6);
      f.triangle(P(0.84, 0.33), P(0.86, 0.33), P(0.85, 0.37), M.main, 7);
      horn(f, P(0.64, 0.16), P(0.7, 0.12), P(0.58, 0.02), -0.06, M.second, 6);
      horn(f, P(0.74, 0.12), P(0.79, 0.13), P(0.88, 0.03), 0.04, M.second, 6);
      f.seamLine(P(0.6, 0.06), P(0.64, 0.12), [M.second]);
      return [{ x: 0.82, y: 0.25, r: 0.045, angry: true }];
    },
  },

  // Kraken-paquete: a crimson kraken whose tentacles knot around glowing data packets.
  "kraken-paquete": {
    colours: kraken,
    draw(f) {
      const packet = (x: number, y: number, s: number, lift: number) => {
        f.rect(x - s, y - s, x + s, y + s, M.accent, lift);
        f.seamLine(P(x, y - s), P(x, y + s), [M.accent]);
        f.seamLine(P(x - s, y), P(x + s, y), [M.accent]);
      };
      // Far tentacles
      tube(f, [[0.36, 0.56, 0.05], [0.22, 0.62, 0.04], [0.1, 0.56, 0.03], [0.06, 0.44, 0.02], [0.12, 0.4, 0.012]], M.dark);
      tube(f, [[0.5, 0.6, 0.05], [0.66, 0.66, 0.04], [0.8, 0.62, 0.03], [0.9, 0.52, 0.02], [0.86, 0.46, 0.012]], M.dark);
      packet(0.14, 0.32, 0.05, 1);
      // Mantle
      blob(f, [P(0.22, 0.46), P(0.18, 0.28), P(0.26, 0.1), P(0.42, 0.04), P(0.58, 0.12), P(0.66, 0.32), P(0.62, 0.52), P(0.42, 0.6), P(0.28, 0.58)], M.main, 1);
      horn(f, P(0.26, 0.14), P(0.3, 0.2), P(0.12, 0.1), 0, M.main, 1);
      for (const [x, y, r] of [[0.32, 0.2, 0.025], [0.4, 0.14, 0.02], [0.28, 0.34, 0.02], [0.48, 0.24, 0.018]]) f.ellipse(x, y, r, r, M.second, 2);
      trace(f, [P(0.36, 0.44), P(0.44, 0.36), P(0.44, 0.26), P(0.52, 0.18)], [M.main]);
      trace(f, [P(0.26, 0.44), P(0.34, 0.5)], [M.main]);
      // Near tentacles with sucker undersides
      const arms: V[][] = [
        [[0.34, 0.56, 0.06], [0.24, 0.72, 0.05], [0.12, 0.8, 0.04], [0.06, 0.92, 0.03], [0.14, 0.96, 0.015]],
        [[0.44, 0.58, 0.06], [0.4, 0.76, 0.05], [0.32, 0.9, 0.035], [0.4, 0.96, 0.015]],
        [[0.52, 0.56, 0.06], [0.58, 0.74, 0.05], [0.64, 0.9, 0.04], [0.76, 0.95, 0.025], [0.82, 0.9, 0.012]],
        [[0.58, 0.5, 0.055], [0.74, 0.56, 0.045], [0.88, 0.7, 0.035], [0.94, 0.8, 0.025], [0.88, 0.84, 0.012]],
      ];
      arms.forEach((a, i) => {
        tube(f, a, M.main, 2 + i * 0.2);
        for (let j = 1; j < a.length - 1; j++) f.ellipse(a[j][0], a[j][1] + a[j][2] * 0.5, a[j][2] * 0.35, a[j][2] * 0.3, M.second, 3);
      });
      packet(0.82, 0.74, 0.05, 2);
      tube(f, [[0.76, 0.66, 0.02], [0.86, 0.7, 0.018], [0.88, 0.78, 0.015]], M.main, 4);
      // Eye ridge and beak hint
      blob(f, [P(0.54, 0.34), P(0.62, 0.3), P(0.7, 0.38), P(0.66, 0.46), P(0.56, 0.44)], M.main, 3);
      f.triangle(P(0.56, 0.52), P(0.62, 0.52), P(0.6, 0.58), M.dark, 4);
      bits(f, [[0.7, 0.18, 2], [0.76, 0.24, 1], [0.8, 0.12, 2, 1], [0.04, 0.6, 1]]);
      return [{ x: 0.62, y: 0.38, r: 0.055, angry: true }];
    },
  },

  // Tortuga-archivo: an ancient tortoise whose copper shell is a cabinet of glowing archive drawers.
  "tortuga-archivo": {
    colours: tortuga,
    draw(f) {
      // Far legs
      blob(f, [P(0.16, 0.7), P(0.28, 0.7), P(0.28, 0.93), P(0.14, 0.93)], M.dark);
      blob(f, [P(0.58, 0.7), P(0.7, 0.7), P(0.7, 0.93), P(0.56, 0.93)], M.dark);
      // Neck and head
      tube(f, [[0.7, 0.66, 0.08], [0.8, 0.6, 0.065], [0.86, 0.56, 0.06]], M.main);
      blob(f, [P(0.78, 0.56), P(0.82, 0.46), P(0.92, 0.44), P(0.98, 0.52), P(0.96, 0.6), P(0.86, 0.64)], M.main, 1);
      f.poly([P(0.86, 0.62), P(0.94, 0.6), P(0.9, 0.72), P(0.86, 0.68)], M.accent, 2);
      // Shell dome
      blob(f, [P(0.06, 0.74), P(0.1, 0.46), P(0.26, 0.24), P(0.48, 0.18), P(0.68, 0.26), P(0.8, 0.48), P(0.82, 0.72)], M.second, 1);
      // Drawer plates in rows
      const rows: [number, number, number, number][] = [[0.3, 0.38, 0.3, 0.64], [0.4, 0.5, 0.18, 0.76], [0.53, 0.64, 0.1, 0.8]];
      rows.forEach(([y0, y1, x0, x1], r) => {
        const n = r + 2, w = (x1 - x0) / n;
        for (let i = 0; i < n; i++) {
          const a = x0 + i * w + 0.01, b = x0 + (i + 1) * w - 0.01;
          f.rect(a, y0, b, y1, M.second, 2);
          f.rect((a + b) / 2 - 0.02, (y0 + y1) / 2 - 0.004, (a + b) / 2 + 0.02, (y0 + y1) / 2 + 0.012, M.accent, 3);
          f.seamLine(P(a + 0.012, y0 + 0.012), P(a + 0.04, y0 + 0.012), [M.second]);
        }
      });
      // Scroll stack on top
      f.rect(0.34, 0.12, 0.56, 0.2, M.accent, 2);
      f.rect(0.38, 0.06, 0.52, 0.12, M.accent, 3);
      f.ellipse(0.34, 0.16, 0.02, 0.04, M.accent, 4);
      f.ellipse(0.56, 0.16, 0.02, 0.04, M.accent, 4);
      trace(f, [P(0.37, 0.15), P(0.53, 0.15)], [M.accent]);
      trace(f, [P(0.4, 0.09), P(0.5, 0.09)], [M.accent]);
      // Shell rim
      f.poly([P(0.04, 0.72), P(0.84, 0.7), P(0.86, 0.76), P(0.06, 0.78)], M.accent, 3);
      // Near legs
      blob(f, [P(0.22, 0.72), P(0.38, 0.72), P(0.4, 0.96), P(0.2, 0.96)], M.main, 4);
      blob(f, [P(0.62, 0.72), P(0.78, 0.72), P(0.8, 0.96), P(0.6, 0.96)], M.main, 4);
      for (const x of [0.28, 0.34, 0.7, 0.76]) f.ellipse(x, 0.955, 0.02, 0.018, M.accent, 5);
      return [{ x: 0.9, y: 0.5, r: 0.04 }];
    },
  },

  // Fantasma-cache: a ghost of stacked forgotten pages with a browser-tab hood, shedding pixel fragments.
  "fantasma-cache": {
    colours: fantasma,
    draw(f) {
      // Wispy tail
      tube(f, [[0.4, 0.6, 0.12], [0.3, 0.76, 0.08], [0.16, 0.84, 0.05], [0.06, 0.8, 0.02]], M.main);
      tube(f, [[0.46, 0.66, 0.08], [0.42, 0.82, 0.05], [0.34, 0.92, 0.03], [0.26, 0.94, 0.012]], M.main, 1);
      // Far arm
      tube(f, [[0.5, 0.42, 0.04], [0.62, 0.5, 0.03], [0.7, 0.48, 0.02]], M.dark);
      // Body
      blob(f, [P(0.26, 0.5), P(0.3, 0.24), P(0.48, 0.12), P(0.66, 0.16), P(0.76, 0.34), P(0.72, 0.56), P(0.6, 0.7), P(0.4, 0.68)], M.main, 1);
      // Floating pages
      f.poly([P(0.1, 0.36), P(0.24, 0.32), P(0.28, 0.5), P(0.14, 0.54)], M.second, 2);
      for (let i = 0; i < 3; i++) f.line(P(0.14 + i * 0.005, 0.4 + i * 0.04), P(0.23 + i * 0.005, 0.38 + i * 0.04), M.accent, 1, 3);
      f.poly([P(0.36, 0.5), P(0.52, 0.48), P(0.54, 0.66), P(0.4, 0.7), P(0.38, 0.62)], M.second, 3);
      for (let i = 0; i < 3; i++) f.line(P(0.4, 0.54 + i * 0.04), P(0.5, 0.53 + i * 0.04), M.accent, 1, 4);
      f.poly([P(0.56, 0.6), P(0.68, 0.64), P(0.62, 0.78), P(0.5, 0.74)], M.second, 3);
      f.line(P(0.56, 0.66), P(0.64, 0.68), M.accent, 1, 4);
      f.line(P(0.55, 0.7), P(0.62, 0.72), M.accent, 1, 4);
      // Browser-tab hood
      f.poly([P(0.34, 0.2), P(0.44, 0.08), P(0.7, 0.08), P(0.8, 0.2), P(0.78, 0.26), P(0.36, 0.26)], M.accent, 2);
      for (const x of [0.42, 0.47, 0.52]) f.rect(x, 0.13, x + 2 * PX, 0.13 + 2 * PX, M.glow, 3);
      // Face page
      f.rect(0.58, 0.24, 0.8, 0.44, M.second, 3);
      f.poly([P(0.74, 0.44), P(0.8, 0.44), P(0.8, 0.4)], M.main, 4);
      // Near arm with long fingers
      tube(f, [[0.6, 0.46, 0.045], [0.74, 0.54, 0.035], [0.86, 0.5, 0.025]], M.main, 4);
      for (const a of [-30, 0, 30]) {
        const r = (a * Math.PI) / 180;
        tube(f, [[0.86, 0.5, 0.015], [0.86 + Math.cos(r) * 0.08, 0.5 + Math.sin(r) * 0.08, 0.008]], M.main, 5);
      }
      bits(f, [[0.92, 0.36, 2], [0.88, 0.62, 1], [0.08, 0.6, 2, 1], [0.14, 0.7, 1], [0.04, 0.5, 1], [0.94, 0.46, 1]]);
      f.glitchRows([0.36, 0.62, 0.63], 2);
      return [{ x: 0.7, y: 0.33, r: 0.055 }];
    },
  },

  // MARK: Supremo

  // Reina-colmena: a crowned plum-and-gold queen bee with four glassy wings, a sceptre and a swarm of virus drones.
  "reina-colmena": {
    colours: reina,
    draw(f) {
      const drone = (x: number, y: number) => {
        f.ellipse(x - 0.012, y - 0.022, 0.016, 0.01, M.accent, 1);
        f.ellipse(x, y, 0.022, 0.016, M.second, 2);
        f.rect(x - 0.004, y - 0.012, x - 0.004 + PX, y + 0.016, M.dark, 3);
        bits(f, [[x + 0.014, y - 0.006, 1]]);
      };
      drone(0.1, 0.16); drone(0.9, 0.7); drone(0.06, 0.48); drone(0.92, 0.9);
      // Far wings
      blob(f, [P(0.5, 0.36), P(0.4, 0.12), P(0.28, 0.02), P(0.2, 0.08), P(0.3, 0.26), P(0.44, 0.4)], M.accent);
      blob(f, [P(0.46, 0.42), P(0.26, 0.32), P(0.12, 0.32), P(0.14, 0.4), P(0.3, 0.46), P(0.44, 0.46)], M.accent);
      // Far legs
      tube(f, [[0.5, 0.52, 0.016], [0.42, 0.72, 0.013], [0.44, 0.95, 0.011]], M.dark);
      // Abdomen: banded segments down to the stinger
      horn(f, P(0.11, 0.9), P(0.15, 0.94), P(0.05, 0.98), 0, M.dark, 1);
      const segs: [number, number, number][] = [[0.15, 0.89, 0.055], [0.2, 0.83, 0.08], [0.26, 0.76, 0.1], [0.32, 0.68, 0.11], [0.38, 0.6, 0.1], [0.44, 0.53, 0.08]];
      segs.forEach(([x, y, r], i) => f.ellipse(x, y, r, r * 0.85, i % 2 ? M.second : M.main, 1 + i * 0.1));
      trace(f, [P(0.2, 0.86), P(0.24, 0.8), P(0.3, 0.76), P(0.34, 0.7), P(0.38, 0.64)], [M.second]);
      bits(f, [[0.25, 0.86, 1], [0.37, 0.72, 1]]);
      // Thorax and fur collar
      f.ellipse(0.53, 0.46, 0.1, 0.09, M.main, 2);
      // Near wings with veins
      blob(f, [P(0.56, 0.36), P(0.52, 0.14), P(0.44, 0.02), P(0.36, 0.04), P(0.4, 0.22), P(0.5, 0.38)], M.accent, 2);
      f.line(P(0.53, 0.34), P(0.43, 0.06), M.dark, 1, 3);
      f.line(P(0.5, 0.3), P(0.4, 0.2), M.dark, 1, 3);
      blob(f, [P(0.52, 0.42), P(0.36, 0.26), P(0.22, 0.22), P(0.2, 0.3), P(0.32, 0.4), P(0.48, 0.46)], M.accent, 2);
      f.line(P(0.5, 0.42), P(0.24, 0.26), M.dark, 1, 3);
      star(f, 0.58, 0.38, 0.09, 0.06, 10, M.second, 3, 0.3, 0.8);
      // Near legs and arms holding the sceptre
      tube(f, [[0.56, 0.52, 0.016], [0.6, 0.74, 0.013], [0.58, 0.95, 0.011]], M.dark, 3);
      tube(f, [[0.6, 0.5, 0.018], [0.68, 0.6, 0.015], [0.78, 0.6, 0.014]], M.dark, 3);
      f.line(P(0.8, 0.96), P(0.82, 0.3), M.second, 2, 4);
      horn(f, P(0.79, 0.3), P(0.81, 0.32), P(0.76, 0.22), -0.01, M.second, 4);
      horn(f, P(0.83, 0.32), P(0.85, 0.3), P(0.88, 0.22), 0.01, M.second, 4);
      f.ellipse(0.82, 0.25, 0.025, 0.025, M.glow, 5);
      tube(f, [[0.62, 0.44, 0.02], [0.72, 0.46, 0.016], [0.8, 0.42, 0.015]], M.dark, 5);
      // Head, mandibles, antennae and crown
      tube(f, [[0.72, 0.16, 0.008], [0.8, 0.06, 0.007], [0.9, 0.06, 0.006]], M.dark, 4);
      tube(f, [[0.68, 0.16, 0.008], [0.7, 0.06, 0.007], [0.78, 0.02, 0.006]], M.dark, 4);
      bits(f, [[0.9, 0.05, 2], [0.78, 0.015, 2]]);
      blob(f, [P(0.6, 0.3), P(0.6, 0.2), P(0.68, 0.15), P(0.78, 0.18), P(0.82, 0.28), P(0.74, 0.36), P(0.64, 0.36)], M.main, 4);
      horn(f, P(0.76, 0.32), P(0.8, 0.3), P(0.84, 0.4), 0.02, M.second, 5);
      f.poly([P(0.61, 0.2), P(0.6, 0.08), P(0.64, 0.14), P(0.67, 0.05), P(0.7, 0.13), P(0.74, 0.06), P(0.76, 0.18), P(0.68, 0.17)], M.second, 5);
      f.ellipse(0.67, 0.155, 0.012, 0.012, M.glow, 6);
      return [{ x: 0.72, y: 0.26, r: 0.055, angry: true }];
    },
  },

  // Titan-cortafuegos: a steel colossus with a burning great-sword and a tower shield of glowing firewall bricks.
  "titan-cortafuegos": {
    colours: titan,
    draw(f) {
      // Great-sword held behind
      f.poly([P(0.19, 0.42), P(0.25, 0.39), P(0.1, 0.06), P(0.05, 0.02), P(0.06, 0.08)], M.main);
      f.seamLine(P(0.215, 0.39), P(0.075, 0.07), [M.main]);
      bits(f, [[0.04, 0.12, 1], [0.12, 0.02, 1], [0.16, 0.1, 2, 1]]);
      f.line(P(0.14, 0.44), P(0.3, 0.36), M.accent, 2, 1);
      // Far arm and far leg
      tube(f, [[0.36, 0.28, 0.065], [0.28, 0.38, 0.055], [0.23, 0.42, 0.05]], M.main, 1);
      f.ellipse(0.22, 0.43, 0.05, 0.045, M.dark, 2);
      blob(f, [P(0.3, 0.62), P(0.46, 0.62), P(0.46, 0.93), P(0.28, 0.93)], M.dark);
      f.ellipse(0.37, 0.95, 0.09, 0.035, M.dark);
      // Plume flowing back
      tube(f, [[0.56, 0.06, 0.03], [0.42, 0.06, 0.035], [0.3, 0.14, 0.025], [0.26, 0.22, 0.012]], M.second);
      // Torso, chest trim and core
      blob(f, [P(0.24, 0.42), P(0.28, 0.22), P(0.48, 0.13), P(0.7, 0.18), P(0.76, 0.42), P(0.68, 0.64), P(0.4, 0.66), P(0.28, 0.58)], M.main, 1);
      blob(f, [P(0.4, 0.3), P(0.56, 0.26), P(0.66, 0.34), P(0.62, 0.5), P(0.48, 0.54), P(0.4, 0.44)], M.main, 2);
      trace(f, [P(0.42, 0.34), P(0.52, 0.3), P(0.62, 0.34)], [M.main]);
      f.ellipse(0.52, 0.42, 0.04, 0.04, M.accent, 3);
      f.ellipse(0.52, 0.42, 0.02, 0.02, M.glow, 4);
      // Waist and faulds
      f.rect(0.32, 0.58, 0.66, 0.63, M.accent, 2);
      f.poly([P(0.32, 0.62), P(0.66, 0.62), P(0.64, 0.76), P(0.34, 0.76)], M.main, 2);
      f.line(P(0.43, 0.63), P(0.43, 0.75), M.dark, 1, 3);
      f.line(P(0.54, 0.63), P(0.54, 0.75), M.dark, 1, 3);
      // Near leg
      blob(f, [P(0.48, 0.7), P(0.62, 0.7), P(0.64, 0.93), P(0.46, 0.93)], M.main, 3);
      f.ellipse(0.55, 0.78, 0.045, 0.035, M.accent, 4);
      f.ellipse(0.56, 0.95, 0.1, 0.035, M.dark, 4);
      // Helm with visor and gold horns
      blob(f, [P(0.5, 0.2), P(0.53, 0.07), P(0.64, 0.03), P(0.75, 0.07), P(0.79, 0.18), P(0.72, 0.27), P(0.56, 0.27)], M.main, 4);
      f.rect(0.6, 0.12, 0.79, 0.19, M.dark, 5);
      f.line(P(0.6, 0.12), P(0.79, 0.12), M.accent, 1, 6);
      horn(f, P(0.56, 0.1), P(0.6, 0.07), P(0.5, -0.02), -0.04, M.accent, 6);
      f.seamLine(P(0.62, 0.22), P(0.72, 0.22), [M.main]);
      // Pauldron
      f.ellipse(0.66, 0.3, 0.11, 0.07, M.main, 5);
      f.line(P(0.56, 0.28), P(0.76, 0.28), M.accent, 1, 6);
      // Tower shield: gold rim, firewall bricks, flames on top
      f.poly([P(0.6, 0.38), P(0.97, 0.35), P(0.97, 0.84), P(0.8, 0.98), P(0.62, 0.86)], M.accent, 6);
      f.poly([P(0.63, 0.41), P(0.94, 0.38), P(0.94, 0.82), P(0.8, 0.94), P(0.65, 0.84)], M.second, 7);
      [0.48, 0.58, 0.68, 0.78].forEach((y, r) => {
        trace(f, [P(0.62, y), P(0.96, y - 0.01)], [M.second]);
        for (let x = 0.68 + (r % 2) * 0.06; x < 0.94; x += 0.12) trace(f, [P(x, y - 0.1), P(x, y - 0.01)], [M.second]);
      });
      for (const x of [0.66, 0.74, 0.82, 0.9]) {
        blob(f, [P(x - 0.035, 0.4), P(x - 0.03, 0.32), P(x, 0.24), P(x + 0.02, 0.31), P(x + 0.035, 0.4)], M.second, 8);
        blob(f, [P(x - 0.015, 0.4), P(x - 0.01, 0.34), P(x + 0.005, 0.3), P(x + 0.017, 0.4)], M.glow, 9);
      }
      f.ellipse(0.64, 0.6, 0.04, 0.05, M.main, 9);
      return [{ x: 0.7, y: 0.155, r: 0.035, angry: true }];
    },
  },

  // Senor-del-lag: a hooded lord with an hourglass, trailed by its own delayed afterimage and a loading halo.
  "senor-del-lag": {
    colours: lag,
    draw(f) {
      // Lagging afterimage
      const robe = (dx: number, m: M, lift: number) => f.poly([P(0.4 + dx, 0.3), P(0.62 + dx, 0.28), P(0.74 + dx, 0.5), P(0.8 + dx, 0.88), P(0.72 + dx, 0.84), P(0.66 + dx, 0.93), P(0.58 + dx, 0.86), P(0.5 + dx, 0.95), P(0.42 + dx, 0.87), P(0.34 + dx, 0.93), P(0.3 + dx, 0.82), P(0.22 + dx, 0.88), P(0.28 + dx, 0.56)], m, lift);
      const hood = (dx: number, m: M, lift: number) => blob(f, [P(0.36 + dx, 0.12), P(0.5 + dx, 0.06), P(0.68 + dx, 0.08), P(0.78 + dx, 0.2), P(0.76 + dx, 0.36), P(0.62 + dx, 0.4), P(0.48 + dx, 0.34), P(0.44 + dx, 0.22)], m, lift);
      robe(-0.16, M.dark, 0); hood(-0.16, M.dark, 0);
      f.glitchRows([0.2, 0.21, 0.5, 0.74, 0.75], -2);
      // Loading halo
      for (let i = 0; i < 10; i++) {
        const a = ((-150 + i * 30) * Math.PI) / 180, r = 0.01 + i * 0.002;
        f.ellipse(0.6 + Math.cos(a) * 0.25, 0.26 + Math.sin(a) * 0.22, r, r, M.glow);
      }
      // Far sleeve
      tube(f, [[0.44, 0.36, 0.05], [0.36, 0.5, 0.05], [0.32, 0.6, 0.055]], M.main);
      f.ellipse(0.31, 0.64, 0.03, 0.03, M.accent, 1);
      // Robe with folds and clock runes
      robe(0, M.main, 1);
      for (const [x0, x1] of [[0.42, 0.4], [0.52, 0.5], [0.62, 0.66]]) f.line(P(x0, 0.5), P(x1, 0.86), M.dark, 1, 2);
      trace(f, [P(0.36, 0.7), P(0.46, 0.66), P(0.56, 0.68), P(0.7, 0.64)], [M.main]);
      f.ring(0.5, 0.56, 0.05, M.second, 1, 2);
      f.line(P(0.5, 0.56), P(0.5, 0.52), M.glow, 1, 3);
      f.line(P(0.5, 0.56), P(0.53, 0.56), M.glow, 1, 3);
      // High collar
      star(f, 0.58, 0.36, 0.13, 0.09, 7, M.second, 2, -0.2, 0.6);
      // Hood, void face and cracked mask
      hood(0, M.main, 3);
      horn(f, P(0.38, 0.12), P(0.44, 0.18), P(0.26, 0.2), -0.02, M.main, 3);
      blob(f, [P(0.6, 0.18), P(0.7, 0.14), P(0.77, 0.22), P(0.75, 0.34), P(0.64, 0.34)], M.dark, 4);
      blob(f, [P(0.66, 0.22), P(0.74, 0.18), P(0.78, 0.24), P(0.77, 0.32), P(0.7, 0.33)], M.accent, 5);
      f.seamLine(P(0.72, 0.19), P(0.7, 0.33), [M.accent]);
      // Near sleeve and the hourglass
      tube(f, [[0.6, 0.4, 0.05], [0.7, 0.52, 0.045], [0.78, 0.56, 0.045]], M.main, 5);
      f.ellipse(0.8, 0.56, 0.03, 0.03, M.accent, 6);
      f.rect(0.78, 0.42, 0.93, 0.45, M.second, 6);
      f.rect(0.78, 0.68, 0.93, 0.71, M.second, 6);
      f.line(P(0.79, 0.45), P(0.79, 0.68), M.second, 1, 6);
      f.line(P(0.92, 0.45), P(0.92, 0.68), M.second, 1, 6);
      f.triangle(P(0.81, 0.45), P(0.9, 0.45), P(0.855, 0.56), M.accent, 7);
      f.triangle(P(0.855, 0.56), P(0.81, 0.68), P(0.9, 0.68), M.accent, 7);
      f.triangle(P(0.835, 0.47), P(0.875, 0.47), P(0.855, 0.52), M.glow, 8);
      f.triangle(P(0.855, 0.6), P(0.82, 0.68), P(0.89, 0.68), M.glow, 8);
      f.glitchRows([0.86, 0.87, 0.91], 2);
      return [{ x: 0.73, y: 0.26, r: 0.04, angry: true }];
    },
  },

  // Coloso-nulo: a void giant with checkerboard holes where it doesn't exist, a Ø core and a hand dissolving into pixels.
  "coloso-nulo": {
    colours: nulo,
    draw(f) {
      // Hollow halo
      f.ring(0.72, 0.16, 0.16, M.dark, 3);
      // Far arm, legs
      tube(f, [[0.3, 0.3, 0.08], [0.2, 0.54, 0.07], [0.16, 0.76, 0.065]], M.main);
      f.ellipse(0.15, 0.84, 0.08, 0.08, M.main);
      checker(f, 0.12, 0.8, 4, 4, 1);
      blob(f, [P(0.32, 0.68), P(0.48, 0.68), P(0.48, 0.95), P(0.3, 0.95)], M.dark);
      // Torso
      blob(f, [P(0.2, 0.46), P(0.26, 0.2), P(0.48, 0.1), P(0.7, 0.16), P(0.78, 0.38), P(0.7, 0.66), P(0.42, 0.74), P(0.26, 0.62)], M.main, 1);
      checker(f, 0.3, 0.26, 6, 6, 2);
      checker(f, 0.34, 0.5, 4, 8, 2);
      trace(f, [P(0.28, 0.4), P(0.34, 0.46), P(0.3, 0.56)], [M.main]);
      trace(f, [P(0.46, 0.14), P(0.5, 0.22), P(0.46, 0.3)], [M.main]);
      // Null core
      f.ellipse(0.58, 0.44, 0.075, 0.075, M.dark, 2);
      f.ring(0.58, 0.44, 0.055, M.glow, 1, 3);
      f.line(P(0.54, 0.5), P(0.63, 0.38), M.glow, 1, 3);
      // Near leg
      blob(f, [P(0.5, 0.68), P(0.68, 0.68), P(0.7, 0.96), P(0.5, 0.96)], M.main, 2);
      checker(f, 0.56, 0.84, 4, 4, 3);
      // Near arm dissolving into pixels
      f.ellipse(0.68, 0.28, 0.12, 0.1, M.main, 3);
      tube(f, [[0.7, 0.34, 0.075], [0.78, 0.54, 0.065], [0.82, 0.68, 0.06]], M.main, 3);
      for (const [x, y, w] of [[0.8, 0.72, 4], [0.86, 0.7, 3], [0.78, 0.8, 3], [0.88, 0.78, 2], [0.93, 0.72, 2], [0.84, 0.86, 2], [0.94, 0.82, 1], [0.9, 0.9, 1]]) f.rect(x, y, x + w * PX, y + w * PX, M.main, 4);
      bits(f, [[0.96, 0.66, 1], [0.91, 0.62, 1], [0.97, 0.9, 1]]);
      trace(f, [P(0.62, 0.22), P(0.7, 0.26), P(0.74, 0.22)], [M.main]);
      // Head with void horns
      horn(f, P(0.64, 0.1), P(0.68, 0.08), P(0.56, 0.0), -0.04, M.accent, 4);
      horn(f, P(0.74, 0.08), P(0.78, 0.1), P(0.88, 0.0), 0.04, M.accent, 4);
      blob(f, [P(0.62, 0.18), P(0.66, 0.08), P(0.78, 0.06), P(0.86, 0.14), P(0.84, 0.24), P(0.68, 0.26)], M.main, 5);
      checker(f, 0.64, 0.1, 2, 4, 6);
      return [{ x: 0.77, y: 0.15, r: 0.05, angry: true }];
    },
  },

  // Arcangel-checksum: a six-winged white-and-gold angel with a halo, a verifying lance and a glowing ✓.
  "arcangel-checksum": {
    colours: arcangel,
    draw(f) {
      // Halo
      f.ring(0.66, 0.18, 0.14, M.accent, 2);
      // Far wings
      wing(f, P(0.52, 0.34), P(0.6, 0.04), 5, 0.12, 0.16, 210, 250, 0.03, M.dark);
      wing(f, P(0.5, 0.42), P(0.3, 0.3), 4, 0.12, 0.14, 175, 205, 0.03, M.dark);
      // Near wings: lower, middle, upper
      wing(f, P(0.46, 0.5), P(0.24, 0.7), 5, 0.12, 0.18, 110, 150, 0.032, M.second, 1);
      wing(f, P(0.46, 0.44), P(0.16, 0.38), 6, 0.14, 0.2, 145, 190, 0.035, M.second, 2);
      wing(f, P(0.48, 0.38), P(0.38, 0.06), 6, 0.16, 0.26, 180, 232, 0.035, M.second, 3);
      tube(f, [[0.48, 0.38, 0.03], [0.42, 0.2, 0.025], [0.38, 0.06, 0.018]], M.second, 4);
      tube(f, [[0.46, 0.44, 0.03], [0.3, 0.4, 0.025], [0.16, 0.38, 0.018]], M.second, 4);
      tube(f, [[0.46, 0.5, 0.03], [0.34, 0.6, 0.025], [0.24, 0.7, 0.018]], M.second, 4);
      trace(f, [P(0.42, 0.2), P(0.38, 0.06)], [M.second]);
      trace(f, [P(0.3, 0.4), P(0.16, 0.38)], [M.second]);
      // Robe flowing to a point
      f.poly([P(0.46, 0.5), P(0.66, 0.5), P(0.7, 0.72), P(0.64, 0.9), P(0.56, 0.97), P(0.54, 0.86), P(0.46, 0.92), P(0.44, 0.7)], M.main, 4);
      f.poly([P(0.5, 0.56), P(0.62, 0.56), P(0.6, 0.86), P(0.56, 0.94), P(0.54, 0.84)], M.dark, 5);
      trace(f, [P(0.57, 0.6), P(0.57, 0.88)], [M.dark]);
      f.line(P(0.46, 0.52), P(0.66, 0.52), M.accent, 2, 6);
      // Breastplate with the check mark
      blob(f, [P(0.48, 0.34), P(0.56, 0.28), P(0.68, 0.32), P(0.68, 0.5), P(0.56, 0.54), P(0.48, 0.48)], M.main, 6);
      f.line(P(0.53, 0.41), P(0.57, 0.46), M.glow, 2, 7);
      f.line(P(0.57, 0.46), P(0.64, 0.35), M.glow, 2, 7);
      // Lance
      f.line(P(0.82, 0.97), P(0.86, 0.1), M.accent, 2, 7);
      f.poly([P(0.86, 0.02), P(0.9, 0.1), P(0.86, 0.16), P(0.82, 0.1)], M.main, 8);
      f.seamLine(P(0.86, 0.04), P(0.86, 0.14), [M.main]);
      bits(f, [[0.94, 0.06, 1], [0.78, 0.04, 1], [0.94, 0.2, 1]]);
      // Near arm gripping the lance
      tube(f, [[0.64, 0.36, 0.035], [0.72, 0.46, 0.03], [0.82, 0.48, 0.028]], M.main, 8);
      f.ellipse(0.84, 0.48, 0.03, 0.03, M.main, 9);
      f.ellipse(0.66, 0.34, 0.05, 0.04, M.accent, 9);
      // Head: flowing hair, gold circlet
      tube(f, [[0.64, 0.16, 0.05], [0.54, 0.22, 0.04], [0.48, 0.3, 0.02]], M.second, 7);
      blob(f, [P(0.6, 0.18), P(0.64, 0.1), P(0.74, 0.08), P(0.8, 0.16), P(0.8, 0.26), P(0.72, 0.3), P(0.64, 0.28)], M.main, 8);
      f.line(P(0.62, 0.12), P(0.78, 0.11), M.accent, 1, 9);
      f.rect(0.7, 0.1, 0.72, 0.13, M.glow, 10);
      return [{ x: 0.73, y: 0.19, r: 0.042 }];
    },
  },

  // Emperatriz-virica: a green-skinned empress in a spiked violet gown, crowned by a giant capsid; one infecting eye.
  "emperatriz-virica": {
    colours: virica,
    draw(f) {
      const virion = (x: number, y: number, r: number, lift = 1) => {
        star(f, x, y, r * 1.5, r * 0.9, 8, M.accent, lift);
        f.ellipse(x, y, r * 0.9, r * 0.9, M.accent, lift + 1);
        f.ellipse(x, y, r * 0.35, r * 0.35, M.glow, lift + 2);
      };
      virion(0.12, 0.18, 0.04); virion(0.92, 0.76, 0.035); virion(0.1, 0.5, 0.03);
      // Capsid crown-halo
      star(f, 0.66, 0.22, 0.22, 0.15, 12, M.accent, 0, 0.1);
      for (let i = 0; i < 12; i++) {
        const a = 0.1 + (i / 12) * Math.PI * 2;
        f.ellipse(0.66 + Math.cos(a) * 0.21, 0.22 + Math.sin(a) * 0.21, 0.016, 0.016, M.glow, 1);
      }
      // Far arm
      tube(f, [[0.48, 0.4, 0.035], [0.4, 0.54, 0.03], [0.36, 0.64, 0.025]], M.main, 1);
      // Gown with a spiked hem and trailing train
      f.poly([P(0.5, 0.44), P(0.64, 0.44), P(0.72, 0.62), P(0.86, 0.94), P(0.8, 0.9), P(0.74, 0.97), P(0.66, 0.9), P(0.58, 0.97), P(0.5, 0.9), P(0.42, 0.97), P(0.34, 0.9), P(0.24, 0.96), P(0.14, 0.9), P(0.04, 0.94), P(0.12, 0.8), P(0.32, 0.72), P(0.44, 0.6)], M.second, 2);
      trace(f, [P(0.56, 0.5), P(0.5, 0.66), P(0.4, 0.8), P(0.3, 0.86)], [M.second]);
      trace(f, [P(0.62, 0.5), P(0.66, 0.68), P(0.72, 0.86)], [M.second]);
      for (const [x, y] of [[0.58, 0.74], [0.42, 0.86], [0.7, 0.82], [0.22, 0.86]]) f.ellipse(x, y, 0.018, 0.018, M.accent, 3);
      // Bodice and spiked collar
      blob(f, [P(0.5, 0.48), P(0.5, 0.36), P(0.58, 0.3), P(0.66, 0.34), P(0.66, 0.48), P(0.58, 0.52)], M.second, 3);
      f.line(P(0.58, 0.34), P(0.58, 0.5), M.accent, 1, 4);
      star(f, 0.6, 0.31, 0.1, 0.06, 8, M.accent, 4, 0.2, 0.7);
      // Near arm reaching out with claws
      tube(f, [[0.62, 0.38, 0.035], [0.74, 0.46, 0.03], [0.84, 0.46, 0.026]], M.main, 5);
      for (const d of [-0.03, 0, 0.03]) horn(f, P(0.85, 0.45 + d * 0.5), P(0.86, 0.47 + d * 0.5), P(0.96, 0.44 + d * 1.6), 0.01, M.accent, 6);
      bits(f, [[0.95, 0.36, 1], [0.9, 0.32, 2, 1], [0.97, 0.54, 1]]);
      // Head with a spiked crown
      blob(f, [P(0.58, 0.24), P(0.6, 0.14), P(0.7, 0.1), P(0.8, 0.14), P(0.82, 0.24), P(0.74, 0.31), P(0.62, 0.3)], M.main, 5);
      f.poly([P(0.6, 0.15), P(0.6, 0.04), P(0.65, 0.1), P(0.7, 0.01), P(0.74, 0.09), P(0.79, 0.03), P(0.8, 0.14), P(0.7, 0.12)], M.accent, 6);
      for (const x of [0.6, 0.7, 0.79]) f.rect(x - PX / 2, x === 0.7 ? 0.02 : 0.05, x + PX / 2, (x === 0.7 ? 0.02 : 0.05) + PX, M.glow, 7);
      trace(f, [P(0.62, 0.26), P(0.66, 0.28)], [M.main]);
      return [{ x: 0.72, y: 0.2, r: 0.07, angry: true }];
    },
  },

  // Gusano-mundial: a colossal ringed worm coiled around the globe of the Red, its round maw full of teeth.
  "gusano-mundial": {
    colours: gusano,
    draw(f) {
      const body = (pts: V[], n: number, lift: number) =>
        along(pts, n).forEach(([x, y, r], i) => {
          f.ellipse(x, y, r, r, i % 2 ? M.second : M.main, lift);
          if (i % 2) f.ellipse(x, y - r * 0.4, 0.008, 0.008, M.glow, lift + 1);
        });
      // Back loop, behind the globe
      body([[0.94, 0.12, 0.02], [0.78, 0.16, 0.04], [0.52, 0.16, 0.05], [0.26, 0.24, 0.055], [0.1, 0.42, 0.06]], 16, 0);
      // The globe of the Red
      f.ellipse(0.46, 0.56, 0.3, 0.3, M.dark, 1);
      trace(f, [P(0.18, 0.5), P(0.3, 0.46), P(0.46, 0.45), P(0.62, 0.46), P(0.74, 0.5)], [M.dark]);
      trace(f, [P(0.2, 0.68), P(0.34, 0.7), P(0.5, 0.7), P(0.7, 0.66)], [M.dark]);
      trace(f, [P(0.46, 0.27), P(0.38, 0.4), P(0.36, 0.56), P(0.4, 0.74), P(0.46, 0.85)], [M.dark]);
      trace(f, [P(0.46, 0.27), P(0.56, 0.4), P(0.6, 0.56), P(0.56, 0.74), P(0.46, 0.85)], [M.dark]);
      for (const [x, y] of [[0.3, 0.46], [0.46, 0.45], [0.62, 0.46], [0.36, 0.56], [0.6, 0.56], [0.34, 0.7], [0.56, 0.72]]) f.ellipse(x, y, 0.014, 0.014, M.glow, 2);
      // Front coil, across the globe to the head
      body([[0.1, 0.42, 0.06], [0.08, 0.62, 0.065], [0.18, 0.84, 0.07], [0.42, 0.9, 0.075], [0.62, 0.82, 0.08], [0.72, 0.66, 0.085]], 16, 2);
      // Head with its round maw
      f.ellipse(0.78, 0.54, 0.13, 0.15, M.main, 3);
      star(f, 0.87, 0.54, 0.13, 0.095, 9, M.second, 4, 0.2, 1.15);
      f.ellipse(0.87, 0.54, 0.095, 0.11, M.main, 5);
      f.ellipse(0.885, 0.54, 0.07, 0.085, M.dark, 6);
      for (let i = 0; i < 10; i++) {
        const a = (i / 10) * Math.PI * 2, c = Math.cos(a), s = Math.sin(a);
        f.triangle(P(0.88 + c * 0.075, 0.54 + s * 0.09 - 0.01), P(0.88 + c * 0.075, 0.54 + s * 0.09 + 0.01), P(0.88 + c * 0.035, 0.54 + s * 0.045), M.accent, 7);
      }
      f.ellipse(0.88, 0.54, 0.018, 0.024, M.glow, 7);
      trace(f, [P(0.68, 0.46), P(0.74, 0.44)], [M.main]);
      return [{ x: 0.72, y: 0.43, r: 0.04, angry: true }];
    },
  },

  // Guardian-raiz: an ancient bark-and-moss elk on root legs, antlers branching like the root directory with amber nodes.
  "guardian-raiz": {
    colours: raiz,
    draw(f) {
      // Far antler sweeping back over the body
      tube(f, [[0.76, 0.3, 0.02], [0.66, 0.22, 0.016], [0.54, 0.16, 0.012], [0.46, 0.06, 0.008]], M.dark);
      tube(f, [[0.6, 0.19, 0.01], [0.56, 0.08, 0.007]], M.dark);
      // Far legs
      tube(f, [[0.3, 0.64, 0.05], [0.28, 0.82, 0.035], [0.27, 0.94, 0.035]], M.dark);
      tube(f, [[0.62, 0.64, 0.05], [0.65, 0.82, 0.035], [0.64, 0.94, 0.035]], M.dark);
      // Body with bark grain and root traces
      blob(f, [P(0.1, 0.56), P(0.16, 0.44), P(0.38, 0.4), P(0.6, 0.4), P(0.74, 0.48), P(0.72, 0.64), P(0.58, 0.72), P(0.22, 0.72)], M.main);
      for (const y of [0.56, 0.64]) f.line(P(0.2, y), P(0.48, y + 0.02), M.dark, 1, 1);
      trace(f, [P(0.14, 0.56), P(0.28, 0.54), P(0.34, 0.48), P(0.5, 0.48)], [M.main]);
      // Moss mantle with hanging strands
      blob(f, [P(0.12, 0.48), P(0.2, 0.38), P(0.4, 0.36), P(0.6, 0.36), P(0.72, 0.42), P(0.66, 0.48), P(0.5, 0.46), P(0.3, 0.48)], M.second, 1);
      for (const [x, l] of [[0.18, 0.12], [0.3, 0.08], [0.44, 0.1], [0.58, 0.07]]) tube(f, [[x, 0.46, 0.02], [x - 0.01, 0.46 + l, 0.012]], M.second, 1);
      for (const [x, y] of [[0.22, 0.38], [0.36, 0.36], [0.5, 0.35], [0.63, 0.37]]) f.ellipse(x, y, 0.035, 0.025, M.second, 2);
      // Amber heart
      f.ellipse(0.68, 0.58, 0.045, 0.045, M.accent, 2);
      f.ellipse(0.68, 0.58, 0.025, 0.025, M.glow, 3);
      // Near legs: trunks with knees, flaring into roots
      tube(f, [[0.22, 0.62, 0.065], [0.26, 0.78, 0.045], [0.24, 0.9, 0.045]], M.main, 2);
      tube(f, [[0.54, 0.62, 0.065], [0.58, 0.78, 0.045], [0.56, 0.9, 0.045]], M.main, 2);
      for (const x of [0.24, 0.56]) {
        horn(f, P(x - 0.05, 0.89), P(x, 0.89), P(x - 0.11, 0.97), -0.01, M.main, 3);
        horn(f, P(x - 0.025, 0.89), P(x + 0.025, 0.89), P(x, 0.98), 0, M.main, 3);
        horn(f, P(x, 0.89), P(x + 0.05, 0.89), P(x + 0.11, 0.97), 0.01, M.main, 3);
      }
      trace(f, [P(0.56, 0.68), P(0.58, 0.8), P(0.56, 0.94)], [M.main]);
      // Neck and head with a moss beard
      tube(f, [[0.64, 0.52, 0.085], [0.72, 0.42, 0.065], [0.76, 0.36, 0.055]], M.main, 3);
      star(f, 0.68, 0.44, 0.1, 0.07, 7, M.second, 4, 0.5, 1.1);
      blob(f, [P(0.7, 0.38), P(0.73, 0.3), P(0.84, 0.28), P(0.96, 0.37), P(0.96, 0.45), P(0.84, 0.46)], M.main, 5);
      f.ellipse(0.955, 0.39, 0.012, 0.012, M.dark, 6);
      blob(f, [P(0.78, 0.44), P(0.88, 0.45), P(0.84, 0.58), P(0.8, 0.54)], M.second, 6);
      horn(f, P(0.74, 0.32), P(0.77, 0.3), P(0.68, 0.27), 0, M.main, 6);
      // Near antler: root-tree branches with glowing nodes and leaves
      tube(f, [[0.8, 0.3, 0.024], [0.78, 0.2, 0.02], [0.84, 0.1, 0.014], [0.9, 0.02, 0.009]], M.accent, 7);
      tube(f, [[0.785, 0.22, 0.016], [0.68, 0.16, 0.012], [0.58, 0.06, 0.008]], M.accent, 7);
      tube(f, [[0.68, 0.16, 0.01], [0.68, 0.06, 0.007]], M.accent, 7);
      tube(f, [[0.82, 0.14, 0.012], [0.92, 0.12, 0.009], [0.97, 0.06, 0.007]], M.accent, 7);
      tube(f, [[0.84, 0.1, 0.009], [0.78, 0.03, 0.006]], M.accent, 7);
      for (const [x, y] of [[0.785, 0.22], [0.68, 0.16], [0.82, 0.14], [0.84, 0.1]]) f.ellipse(x, y, 0.013, 0.013, M.glow, 8);
      for (const [x, y] of [[0.9, 0.02], [0.58, 0.05], [0.97, 0.06], [0.68, 0.05], [0.78, 0.03], [0.46, 0.05]]) f.ellipse(x, y, 0.02, 0.014, M.second, 8);
      bits(f, [[0.08, 0.3, 1], [0.04, 0.42, 1], [0.32, 0.2, 2, 1], [0.2, 0.26, 1], [0.92, 0.58, 1]]);
      return [{ x: 0.84, y: 0.35, r: 0.042 }];
    },
  },

  // Dragon-desbordamiento: a cobalt dragon bursting out of its broken memory frame, wings ruled with glowing grids.
  "dragon-desbordamiento": {
    colours: desborde,
    draw(f) {
      // Broken memory frame
      f.line(P(0.03, 0.36), P(0.03, 0.96), M.glow, 1);
      f.line(P(0.03, 0.96), P(0.3, 0.96), M.glow, 1);
      f.line(P(0.03, 0.36), P(0.12, 0.36), M.glow, 1);
      for (const [x, y] of [[0.16, 0.34], [0.2, 0.31], [0.36, 0.97], [0.42, 0.95]]) f.triangle(P(x, y), P(x + 0.03, y + 0.01), P(x + 0.01, y + 0.03), M.glow);
      // Far wing
      f.poly([P(0.42, 0.36), P(0.3, 0.0), P(0.24, 0.12), P(0.12, 0.04), P(0.12, 0.2), P(0.02, 0.22), P(0.28, 0.44)], M.dark);
      // Tail overflowing the frame
      tube(f, [[0.3, 0.74, 0.06], [0.16, 0.82, 0.045], [0.08, 0.74, 0.03], [0.1, 0.6, 0.018]], M.main);
      horn(f, P(0.08, 0.62), P(0.12, 0.6), P(0.1, 0.48), 0, M.accent, 1);
      f.glitchRows([0.78, 0.79, 0.84], -3);
      // Far legs
      f.ellipse(0.34, 0.88, 0.09, 0.08, M.main);
      // Body, belly with segment lines, back spines
      blob(f, [P(0.2, 0.76), P(0.22, 0.48), P(0.42, 0.36), P(0.64, 0.4), P(0.72, 0.6), P(0.64, 0.84), P(0.36, 0.88)], M.main, 1);
      blob(f, [P(0.46, 0.84), P(0.46, 0.54), P(0.58, 0.44), P(0.7, 0.54), P(0.68, 0.76), P(0.58, 0.86)], M.second, 2);
      for (const y of [0.56, 0.64, 0.72, 0.8]) f.seamLine(P(0.48, y), P(0.7, y), [M.second]);
      for (const [x, y] of [[0.24, 0.5], [0.3, 0.43], [0.37, 0.38]]) horn(f, P(x - 0.03, y + 0.02), P(x + 0.03, y), P(x - 0.06, y - 0.08), -0.02, M.accent, 1);
      // Near wing: membrane with bones and a glowing grid
      f.poly([P(0.44, 0.42), P(0.46, 0.0), P(0.38, 0.1), P(0.3, 0.02), P(0.24, 0.18), P(0.12, 0.12), P(0.16, 0.3), P(0.02, 0.32), P(0.34, 0.5)], M.dark, 2);
      trace(f, [P(0.38, 0.12), P(0.28, 0.24), P(0.16, 0.3)], [M.dark]);
      trace(f, [P(0.42, 0.24), P(0.3, 0.32), P(0.22, 0.38)], [M.dark]);
      f.line(P(0.44, 0.4), P(0.46, 0.02), M.main, 1, 3);
      f.line(P(0.42, 0.42), P(0.3, 0.04), M.main, 1, 3);
      f.line(P(0.4, 0.44), P(0.13, 0.14), M.main, 1, 3);
      f.line(P(0.38, 0.46), P(0.04, 0.32), M.main, 1, 3);
      // Near legs and arm
      blob(f, [P(0.48, 0.74), P(0.64, 0.74), P(0.68, 0.9), P(0.7, 0.96), P(0.48, 0.96), P(0.46, 0.86)], M.main, 3);
      for (const x of [0.62, 0.68]) horn(f, P(x, 0.96), P(x + 0.03, 0.94), P(x + 0.08, 0.98), 0, M.accent, 4);
      blob(f, [P(0.66, 0.5), P(0.8, 0.56), P(0.86, 0.64), P(0.78, 0.68), P(0.66, 0.6)], M.main, 4);
      horn(f, P(0.84, 0.62), P(0.86, 0.66), P(0.93, 0.68), 0.01, M.accent, 5);
      // Neck and head with open jaws
      tube(f, [[0.58, 0.46, 0.08], [0.62, 0.32, 0.065], [0.68, 0.24, 0.06]], M.main, 3);
      f.poly([P(0.7, 0.28), P(0.96, 0.32), P(0.92, 0.38), P(0.74, 0.36)], M.main, 4);
      f.poly([P(0.74, 0.24), P(0.96, 0.24), P(0.96, 0.3), P(0.74, 0.32)], M.dark, 4);
      blob(f, [P(0.62, 0.24), P(0.66, 0.12), P(0.78, 0.08), P(0.92, 0.14), P(0.98, 0.22), P(0.86, 0.26), P(0.7, 0.3)], M.main, 5);
      for (const x of [0.8, 0.88]) f.triangle(P(x, 0.25), P(x + 0.02, 0.25), P(x + 0.01, 0.29), M.second, 6);
      horn(f, P(0.64, 0.14), P(0.7, 0.1), P(0.5, 0.02), -0.06, M.accent, 6);
      horn(f, P(0.72, 0.1), P(0.77, 0.09), P(0.72, -0.02), -0.01, M.accent, 6);
      horn(f, P(0.66, 0.22), P(0.68, 0.18), P(0.56, 0.18), 0, M.accent, 6);
      trace(f, [P(0.72, 0.2), P(0.82, 0.2), P(0.9, 0.16)], [M.main]);
      bits(f, [[0.97, 0.26, 1], [0.94, 0.28, 2, 1], [0.92, 0.42, 1], [0.97, 0.46, 1]]);
      return [{ x: 0.8, y: 0.15, r: 0.045, angry: true }];
    },
  },
};

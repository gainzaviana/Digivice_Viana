import { Material as M, SpriteForge, type Point } from "../../src/art/forge";

/**
 * The creature art style: 64×64 pixel art in the spirit of open monster-collecting games
 * (chunky dark outlines tinted by the colour they touch, three-tone cel shading lit from the
 * top-left, a few highlight pixels, big expressive eyes). Every creature is its own hand-placed
 * design built from shapes; this file only paints them.
 */
export const SIZE = 64;

/** shadow, base, light, highlight */
export type Ramp = [string, string, string, string];
export interface Colours { main: Ramp; second: Ramp; accent: Ramp; dark: Ramp; glow: string; iris: string }

export interface Eye { x: number; y: number; r: number; angry?: boolean }

/** A design: draws on the forge and lists its eyes (painted on top). */
export interface Design { colours: Colours; draw(f: SpriteForge): Eye[] }

const hex = (h: string) => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
const mix = (a: string, b: string, t: number) => {
  const x = hex(a), y = hex(b);
  return "#" + x.map((v, i) => Math.round(v + (y[i] - v) * t).toString(16).padStart(2, "0")).join("");
};
const INK = "#18142a";

/** Paints a design into RGBA (SIZE×SIZE). */
export function paint(d: Design): Uint8ClampedArray {
  const n = SIZE;
  const f = new SpriteForge(n);
  const eyes = d.draw(f);
  const c = d.colours;
  const ramp = (m: number): Ramp | undefined => (m === M.main ? c.main : m === M.second ? c.second : m === M.accent ? c.accent : m === M.dark ? c.dark : undefined);
  const nrm = f.normals();
  const L = [-0.5, -0.7, 0.5];
  const ll = Math.hypot(...L);
  const out: (string | null)[] = new Array(n * n).fill(null);
  const mat = f.material, part = f.part;
  for (let i = 0; i < n * n; i++) {
    const m = mat[i];
    if (m === M.none) continue;
    if (m === M.seam || m === M.glow) { out[i] = c.glow; continue; }
    const r = ramp(m);
    if (!r) continue;
    const lit = Math.max(0, (nrm[i * 3] * L[0] + nrm[i * 3 + 1] * L[1] + nrm[i * 3 + 2] * L[2]) / ll);
    out[i] = r[lit < 0.5 ? 0 : lit < 0.8 ? 1 : lit < 0.95 ? 2 : 3];
  }
  // Inner lines: where a later part sits on an earlier one, the earlier one gets a dark edge.
  const at = (x: number, y: number) => (x < 0 || y < 0 || x >= n || y >= n ? -1 : y * n + x);
  const inner = out.slice();
  for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) {
    const i = y * n + x, m = mat[i];
    if (m === M.none || m === M.seam || m === M.glow) continue;
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const j = at(x + dx, y + dy);
      if (j < 0 || mat[j] === M.none || mat[j] === M.seam || mat[j] === M.glow) continue;
      if (part[j] > part[i] && part[j] !== part[i]) { inner[i] = mix(ramp(m)![0], INK, 0.55); break; }
    }
  }
  // Outline: 1px around the silhouette, tinted by what it touches, darker at the bottom-right.
  const final = inner.slice();
  for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) {
    const i = y * n + x;
    if (mat[i] !== M.none) continue;
    let touch = -1, low = false;
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const j = at(x + dx, y + dy);
      if (j >= 0 && mat[j] !== M.none) { touch = j; if (dx < 0 || dy < 0) low = true; }
    }
    if (touch < 0) continue;
    const r = ramp(mat[touch]);
    final[i] = r ? mix(r[0], INK, low ? 0.8 : 0.6) : INK;
  }
  // Eyes on top.
  for (const e of eyes) drawEye(final, e, c.iris);
  const rgba = new Uint8ClampedArray(n * n * 4);
  final.forEach((col, i) => {
    if (!col) return;
    const [r, g, b] = hex(col);
    rgba.set([r, g, b, 255], i * 4);
  });
  return rgba;
}

function drawEye(px: (string | null)[], e: Eye, iris: string) {
  const n = SIZE, cx = e.x * n, cy = e.y * n, r = Math.max(1.6, e.r * n);
  const set = (x: number, y: number, col: string) => { if (x >= 0 && y >= 0 && x < n && y < n) px[y * n + x] = col; };
  for (let y = Math.floor(cy - r - 1); y <= cy + r + 1; y++) for (let x = Math.floor(cx - r - 1); x <= cx + r + 1; x++) {
    const d = Math.hypot(x + 0.5 - cx, (y + 0.5 - cy) * 0.9);
    if (d > r + 0.6) continue;
    if (d > r - 0.4) { set(x, y, INK); continue; }
    // Iris toward the front (right), pupil inside it.
    const di = Math.hypot(x + 0.5 - (cx + r * 0.25), y + 0.5 - cy);
    set(x, y, di < r * 0.38 ? INK : di < r * 0.72 ? iris : "#fbf8ff");
  }
  // Catchlight and, when angry, a heavy brow.
  set(Math.round(cx + r * 0.05), Math.round(cy - r * 0.35), "#ffffff");
  if (e.angry) for (let x = Math.floor(cx - r); x <= cx + r; x++) {
    const y = Math.round(cy - r - 0.2 + (x - (cx - r)) * 0.35);
    set(x, y, INK); set(x, y - 1, INK);
  }
}

// Shared helpers for designs.
export const P = (x: number, y: number): Point => [x, y];
/** A curved horn/claw/spike as a polygon: from base (two points) bending to a tip. */
export function horn(f: SpriteForge, a: Point, b: Point, tip: Point, bend: number, m: M, lift = 0) {
  const mid: Point = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
  const ctrl: Point = [(mid[0] + tip[0]) / 2 + bend, (mid[1] + tip[1]) / 2 - Math.abs(bend) * 0.3];
  const q = (p0: Point, t: number): Point => [
    (1 - t) ** 2 * p0[0] + 2 * (1 - t) * t * ctrl[0] + t * t * tip[0],
    (1 - t) ** 2 * p0[1] + 2 * (1 - t) * t * ctrl[1] + t * t * tip[1],
  ];
  const side1 = [0, 0.25, 0.5, 0.75, 1].map((t) => q(a, t));
  const side2 = [1, 0.75, 0.5, 0.25, 0].map((t) => q(b, t));
  f.poly([...side1, ...side2.slice(1)], m, lift);
}
/** A smooth closed blob through control points (Catmull-Rom). */
export function blob(f: SpriteForge, pts: Point[], m: M, lift = 0) {
  const out: Point[] = [];
  const k = pts.length;
  for (let i = 0; i < k; i++) {
    const p0 = pts[(i - 1 + k) % k], p1 = pts[i], p2 = pts[(i + 1) % k], p3 = pts[(i + 2) % k];
    for (let t = 0; t < 1; t += 0.2) {
      const t2 = t * t, t3 = t2 * t;
      out.push([0, 1].map((c) => 0.5 * (2 * p1[c] + (-p0[c] + p2[c]) * t + (2 * p0[c] - 5 * p1[c] + 4 * p2[c] - p3[c]) * t2 + (-p0[c] + 3 * p1[c] - 3 * p2[c] + p3[c]) * t3)) as unknown as Point);
    }
  }
  f.poly(out, m, lift);
}

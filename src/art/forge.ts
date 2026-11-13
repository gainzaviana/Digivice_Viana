import { PALETTE } from "./palette";

/**
 * Procedural pixel sprites for the Ecos: original designs built from body plans (one per
 * partner line, plus creature types for wild Ecos) that grow with each stage. Every part gets a
 * height field, so shading is volumetric (light from the top-left, four tones per material) and a
 * normal map can light the sprite in battle. Palette colours only; 1px #1B1830 outline.
 * A faithful port of the native SpriteForge (Float maths emulated with Math.fround).
 */
export enum Material { none = 0, main, second, accent, dark, seam, eyeWhite, eyeDark, glow }

/** Four tones (shadow, base, light, highlight) per shaded material. */
export interface Look { main: string[]; second: string[]; accent: string[]; dark: string[]; seam: string }

export type Point = readonly [number, number];

const f32 = Math.fround;
/** Swift's `.rounded()`: half away from zero. */
export const roundHalfAway = (v: number) => (v < 0 ? -Math.round(-v) : Math.round(v));
/** Swift's integer division (truncates toward zero). */
export const idiv = (a: number, b: number) => Math.trunc(a / b);

export class SpriteForge {
  readonly n: number;
  readonly material: Uint8Array;
  readonly part: Int32Array;
  readonly emissive: Uint8Array;
  private bump: Float32Array;
  private partCount = 0;

  constructor(size: number) {
    this.n = size;
    this.material = new Uint8Array(size * size);
    this.part = new Int32Array(size * size).fill(-1);
    this.bump = new Float32Array(size * size);
    this.emissive = new Uint8Array(size * size);
  }

  // MARK: Drawing primitives (normalized 0…1 coordinates, y down)

  private px(v: number) { return roundHalfAway(v * this.n); }

  /** Each call is one part: its own rounded volume; `lift` raises it above earlier parts. */
  ellipse(cx: number, cy: number, rx: number, ry: number, m: Material, lift = 0) {
    const id = this.nextPart(), n = this.n;
    const x0 = cx * n, y0 = cy * n, ax = Math.max(0.6, rx * n), ay = Math.max(0.6, ry * n);
    for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) {
      const dx = (x + 0.5 - x0) / ax, dy = (y + 0.5 - y0) / ay;
      if (dx * dx + dy * dy <= 1) this.set(x, y, m, id, lift);
    }
  }

  triangle(a: Point, b: Point, c: Point, m: Material, lift = 0) {
    const id = this.nextPart(), n = this.n;
    const pts = [a, b, c].map((p) => [p[0] * n, p[1] * n] as const);
    const edge = (p: readonly [number, number], q: readonly [number, number], r: readonly [number, number]) => (q[0] - p[0]) * (r[1] - p[1]) - (q[1] - p[1]) * (r[0] - p[0]);
    for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) {
      const p = [x + 0.5, y + 0.5] as const;
      const e1 = edge(pts[0], pts[1], p), e2 = edge(pts[1], pts[2], p), e3 = edge(pts[2], pts[0], p);
      if ((e1 >= 0 && e2 >= 0 && e3 >= 0) || (e1 <= 0 && e2 <= 0 && e3 <= 0)) this.set(x, y, m, id, lift);
    }
  }

  rect(x0: number, y0: number, x1: number, y1: number, m: Material, lift = 0) {
    const id = this.nextPart();
    const ya = this.px(y0), yb = Math.max(ya + 1, this.px(y1)), xa = this.px(x0), xb = Math.max(xa + 1, this.px(x1));
    for (let y = ya; y < yb; y++) for (let x = xa; x < xb; x++) this.set(x, y, m, id, lift);
  }

  /** A line `width` pixels thick (at least 1). */
  line(a: Point, b: Point, m: Material, width = 1, lift = 0) {
    const id = this.nextPart(), n = this.n;
    const ax = a[0] * n, ay = a[1] * n, bx = b[0] * n, by = b[1] * n;
    const steps = Math.ceil(Math.max(Math.abs(bx - ax), Math.abs(by - ay))) + 1;
    const w = Math.max(1, roundHalfAway(width));
    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      const x = Math.trunc(ax + (bx - ax) * t), y = Math.trunc(ay + (by - ay) * t);
      for (let dy = 0; dy < w; dy++) for (let dx = 0; dx < w; dx++) this.set(x + dx - idiv(w, 2), y + dy - idiv(w, 2), m, id, lift);
    }
  }

  /** A ring (outline of a circle), `thickness` in pixels. */
  ring(cx: number, cy: number, r: number, m: Material, thickness = 1, lift = 0) {
    const id = this.nextPart(), n = this.n;
    const x0 = cx * n, y0 = cy * n, rr = r * n;
    for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) {
      const d = Math.hypot(x + 0.5 - x0, y + 0.5 - y0);
      if (d <= rr && d >= rr - Math.max(1, thickness)) this.set(x, y, m, id, lift);
    }
  }

  /** Recolours already-drawn pixels inside a band, e.g. armour plates or stripes. */
  band(y0: number, y1: number, over: Material, to: Material, x0 = 0, x1 = 1) {
    const n = this.n, ya = this.px(y0), yb = Math.max(ya + 1, this.px(y1)), xa = this.px(x0), xb = this.px(x1);
    for (let y = ya; y < yb; y++) for (let x = xa; x < xb; x++) {
      if (!this.inside(x, y) || this.material[y * n + x] !== over) continue;
      this.material[y * n + x] = to;
    }
  }

  /** The game's single eye style: dark pupil, white catchlight at the top-left; bigger on bigger sprites. */
  eye(cx: number, cy: number) {
    const size = this.n >= 64 ? 3 : 2;
    const x0 = this.px(cx) - idiv(size, 2), y0 = this.px(cy) - idiv(size, 2);
    for (let dy = 0; dy < size; dy++) for (let dx = 0; dx < size; dx++) {
      this.setRaw(x0 + dx, y0 + dy, dx === 0 && dy === 0 ? Material.eyeWhite : Material.eyeDark);
    }
  }

  /** Marks drawn pixels in a band as glowing data seam. */
  seamLine(a: Point, b: Point, allowed: Material[] = [Material.main, Material.second]) {
    const n = this.n;
    const ax = a[0] * n, ay = a[1] * n, bx = b[0] * n, by = b[1] * n;
    const steps = Math.ceil(Math.max(Math.abs(bx - ax), Math.abs(by - ay))) + 1;
    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      const x = Math.trunc(ax + (bx - ax) * t), y = Math.trunc(ay + (by - ay) * t);
      if (!this.inside(x, y) || !allowed.includes(this.material[y * n + x])) continue;
      this.material[y * n + x] = Material.seam;
      this.emissive[y * n + x] = 1;
    }
  }

  /** Shifts a few rows sideways: corrupted-data look (glitch line, infected variants). */
  glitchRows(rows: number[], offset: number) {
    const n = this.n;
    for (const r of rows) {
      const y = this.px(r);
      if (y < 0 || y >= n) continue;
      const rowM = this.material.slice(y * n, y * n + n), rowP = this.part.slice(y * n, y * n + n);
      for (let x = 0; x < n; x++) {
        const src = x - offset;
        const ok = src >= 0 && src < n;
        this.material[y * n + x] = ok ? rowM[src] : Material.none;
        this.part[y * n + x] = ok ? rowP[src] : -1;
      }
    }
  }

  private nextPart() { return ++this.partCount; }
  private inside(x: number, y: number) { return x >= 1 && y >= 1 && x < this.n - 1 && y < this.n - 1; }

  private set(x: number, y: number, m: Material, id: number, lift: number) {
    if (!this.inside(x, y)) return;
    const i = y * this.n + x;
    this.material[i] = m;
    this.part[i] = id;
    this.bump[i] = lift;
    this.emissive[i] = m === Material.seam || m === Material.glow ? 1 : 0;
  }

  private setRaw(x: number, y: number, m: Material) {
    if (!this.inside(x, y) || this.material[y * this.n + x] === Material.none) return;
    this.material[y * this.n + x] = m;
    this.emissive[y * this.n + x] = 0;
  }

  // MARK: Shading

  /** Height per pixel: each part is a rounded dome (distance to its own edge), plus its lift. */
  heights(): Float32Array {
    const n = this.n, mat = this.material, part = this.part;
    const dist = new Float32Array(n * n);
    for (let i = 0; i < n * n; i++) if (mat[i] !== Material.none) dist[i] = 1000;
    // Two-pass chamfer distance to the nearest pixel of a different part.
    const same = (a: number, b: number) => mat[b] !== Material.none && part[a] === part[b];
    for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) {
      const i = y * n + x;
      if (!(dist[i] > 0)) continue;
      let d = dist[i];
      d = x > 0 ? Math.min(d, same(i, i - 1) ? dist[i - 1] + 1 : 1) : 1;
      d = y > 0 ? Math.min(d, same(i, i - n) ? dist[i - n] + 1 : 1) : 1;
      dist[i] = d;
    }
    for (let y = n - 1; y >= 0; y--) for (let x = n - 1; x >= 0; x--) {
      const i = y * n + x;
      if (!(dist[i] > 0)) continue;
      let d = dist[i];
      d = x < n - 1 ? Math.min(d, same(i, i + 1) ? dist[i + 1] + 1 : 1) : 1;
      d = y < n - 1 ? Math.min(d, same(i, i + n) ? dist[i + n] + 1 : 1) : 1;
      dist[i] = d;
    }
    const scale = f32(Math.max(2, idiv(n, 10)));
    const h = new Float32Array(n * n);
    for (let i = 0; i < n * n; i++) {
      h[i] = mat[i] === Material.none ? 0 : f32(f32(f32(Math.sqrt(f32(dist[i] / scale))) * 2) + f32(this.bump[i] * 3));
    }
    return h;
  }

  /** Surface normals (x right, y down, z towards the viewer) from the heights, 3 floats per pixel. */
  normals(): Float32Array {
    const n = this.n, h = this.heights(), mat = this.material;
    const out = new Float32Array(n * n * 3);
    const at = (xx: number, yy: number) => (xx < 0 || yy < 0 || xx >= n || yy >= n || mat[yy * n + xx] === Material.none ? 0 : h[yy * n + xx]);
    for (let i = 0; i < n * n; i++) {
      const x = i % n, y = idiv(i, n);
      const dx = f32(at(x + 1, y) - at(x - 1, y)), dy = f32(at(x, y + 1) - at(x, y - 1));
      const vx = -dx, vy = -dy, vz = 2;
      const len = f32(Math.sqrt(f32(f32(f32(vx * vx) + f32(vy * vy)) + vz * vz)));
      out[i * 3] = vx / len; out[i * 3 + 1] = vy / len; out[i * 3 + 2] = vz / len;
    }
    return out;
  }

  /** Final colours (row-major, null = transparent): lit tones per material, then the 1px outline. */
  colours(look: Look, normals = this.normals()): (string | null)[] {
    const n = this.n, mat = this.material, part = this.part;
    // Light from the top-left, slightly in front.
    const lv = [-0.55, -0.65, 0.55].map(f32);
    const ll = f32(Math.sqrt(f32(f32(f32(lv[0] * lv[0]) + f32(lv[1] * lv[1])) + f32(lv[2] * lv[2]))));
    const light = lv.map((v) => f32(v / ll));
    const out: (string | null)[] = new Array(n * n).fill(null);
    for (let i = 0; i < n * n; i++) {
      const m = mat[i];
      if (m === Material.none) continue;
      const lit = Math.max(0, f32(f32(f32(normals[i * 3] * light[0]) + f32(normals[i * 3 + 1] * light[1])) + f32(normals[i * 3 + 2] * light[2])));
      const tone = lit < f32(0.45) ? 0 : lit < f32(0.72) ? 1 : lit < f32(0.9) ? 2 : 3;
      let ramp: string[];
      switch (m) {
        case Material.main: ramp = look.main; break;
        case Material.second: ramp = look.second; break;
        case Material.accent: ramp = look.accent; break;
        case Material.dark: ramp = look.dark; break;
        case Material.seam: case Material.glow: out[i] = look.seam; continue;
        case Material.eyeWhite: out[i] = PALETTE.white; continue;
        case Material.eyeDark: out[i] = PALETTE.outline; continue;
        default: continue;
      }
      out[i] = ramp[Math.min(tone, ramp.length - 1)];
    }
    // Interior edges between parts: one darker step, so overlapping parts read clearly.
    const flat = [Material.eyeWhite, Material.eyeDark, Material.seam, Material.glow];
    for (let y = 1; y < n - 1; y++) for (let x = 1; x < n - 1; x++) {
      const i = y * n + x;
      if (mat[i] === Material.none || flat.includes(mat[i])) continue;
      const below = i + n, right = i + 1;
      if ((mat[below] !== Material.none && part[below] !== part[i] && part[below] > part[i])
        || (mat[right] !== Material.none && part[right] !== part[i] && part[right] > part[i])) {
        const ramp = mat[i] === Material.main ? look.main : mat[i] === Material.second ? look.second : look.accent;
        out[i] = ramp[0];
      }
    }
    // 1px outline in #1B1830.
    for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) {
      if (mat[y * n + x] !== Material.none) continue;
      const touches = ([[x - 1, y], [x + 1, y], [x, y - 1], [x, y + 1]] as const).some(([nx, ny]) => nx >= 0 && ny >= 0 && nx < n && ny < n && mat[ny * n + nx] !== Material.none);
      if (touches) out[y * n + x] = PALETTE.outline;
    }
    return out;
  }
}

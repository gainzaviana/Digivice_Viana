import * as THREE from "three";
import { hueRotatePixels } from "../art/custom";

/**
 * Pixel-art creatures as 3D voxel figures. Every opaque pixel becomes a column of cubes,
 * thick in the middle of the body and thin at the edges (the depth follows the distance to the
 * sprite's outline), so a 64×64 sprite turns into a chunky, lit, shadow-casting figure that keeps
 * every pixel of its design. Front and back show the sprite; the sides are slightly darker.
 */

export interface SpritePixels { n: number; rgba: Uint8ClampedArray }

/** The sprite is drawn at 64×64; bigger files (×8) are sampled back to their pixel grid. */
const GRID = 64;
const cache = new Map<string, SpritePixels>();
const loading = new Map<string, Promise<SpritePixels>>();
const keyOf = (url: string, recolour: boolean) => `${url}|${recolour ? 1 : 0}`;

/** Already-decoded pixels, if this sprite has been loaded. */
export const cachedSpritePixels = (url: string, recolour: boolean) => cache.get(keyOf(url, recolour));

/** Decodes a sprite PNG into its pixel grid (optionally recoloured for Brillante). Cached. */
export function loadSpritePixels(url: string, recolour: boolean): Promise<SpritePixels> {
  const key = keyOf(url, recolour);
  const hit = cache.get(key);
  if (hit) return Promise.resolve(hit);
  const waiting = loading.get(key);
  if (waiting) return waiting;
  const p = new Promise<SpritePixels>((done, fail) => {
    const img = new Image();
    img.onload = () => {
      const w = img.naturalWidth, h = img.naturalHeight;
      const c = document.createElement("canvas");
      c.width = w; c.height = h;
      const g = c.getContext("2d")!;
      g.drawImage(img, 0, 0);
      const src = g.getImageData(0, 0, w, h).data;
      const n = Math.min(GRID, w);
      const rgba = new Uint8ClampedArray(n * n * 4);
      // Sample the centre of each big pixel.
      for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) {
        const sx = Math.min(w - 1, Math.floor(((x + 0.5) * w) / n)), sy = Math.min(h - 1, Math.floor(((y + 0.5) * h) / n));
        rgba.set(src.subarray((sy * w + sx) * 4, (sy * w + sx) * 4 + 4), (y * n + x) * 4);
      }
      if (recolour) hueRotatePixels(rgba);
      const out = { n, rgba };
      cache.set(key, out);
      loading.delete(key);
      done(out);
    };
    img.onerror = () => { loading.delete(key); fail(new Error(`no se pudo cargar ${url}`)); };
    img.src = url;
  });
  loading.set(key, p);
  return p;
}

/** Half-thickness (in voxels) of each pixel's column: 0 where transparent. */
export function columnDepths(px: SpritePixels): Uint8Array {
  const { n, rgba } = px;
  const solid = (i: number) => rgba[i * 4 + 3] >= 128;
  const dist = new Float32Array(n * n);
  for (let i = 0; i < n * n; i++) dist[i] = solid(i) ? 1e9 : 0;
  // Two-pass chamfer distance to the nearest transparent pixel (edges of the canvas count as empty).
  for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) {
    const i = y * n + x;
    if (!dist[i]) continue;
    const l = x > 0 ? dist[i - 1] : 0, u = y > 0 ? dist[i - n] : 0;
    dist[i] = Math.min(dist[i], l + 1, u + 1);
  }
  for (let y = n - 1; y >= 0; y--) for (let x = n - 1; x >= 0; x--) {
    const i = y * n + x;
    if (!dist[i]) continue;
    const r = x < n - 1 ? dist[i + 1] : 0, d = y < n - 1 ? dist[i + n] : 0;
    dist[i] = Math.min(dist[i], r + 1, d + 1);
  }
  let max = 0;
  for (let i = 0; i < n * n; i++) max = Math.max(max, dist[i]);
  const scale = Math.max(4, max * 0.85);
  const out = new Uint8Array(n * n);
  for (let i = 0; i < n * n; i++) {
    if (!dist[i]) continue;
    out[i] = Math.max(1, Math.round(0.8 + 7.2 * Math.sqrt(Math.min(dist[i], scale) / scale)));
  }
  return out;
}

const SIDE_SHADE = 0.82;

/**
 * The voxel mesh of a sprite, in voxel units: x right, y up, z toward the camera, centred on x/z
 * with its lowest pixel on y = 0. Returns the geometry and its height/width in voxels.
 */
export function voxelGeometry(px: SpritePixels): { geo: THREE.BufferGeometry; height: number; width: number } {
  const { n, rgba } = px;
  const h = columnDepths(px);
  let minX = n, maxX = -1, minY = n, maxY = -1;
  for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) if (h[y * n + x]) { minX = Math.min(minX, x); maxX = Math.max(maxX, x); minY = Math.min(minY, y); maxY = Math.max(maxY, y); }
  if (maxX < 0) return { geo: new THREE.BufferGeometry(), height: 1, width: 1 };
  const cx = (minX + maxX + 1) / 2;
  const pos: number[] = [], nrm: number[] = [], col: number[] = [], idx: number[] = [];
  const c = new THREE.Color();
  const quad = (a: number[], b: number[], cc: number[], d: number[], normal: number[], k: number) => {
    const base = pos.length / 3;
    for (const v of [a, b, cc, d]) { pos.push(v[0], v[1], v[2]); nrm.push(normal[0], normal[1], normal[2]); col.push(c.r * k, c.g * k, c.b * k); }
    idx.push(base, base + 1, base + 2, base, base + 2, base + 3);
  };
  for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) {
    const i = y * n + x, d = h[i];
    if (!d) continue;
    c.setRGB(rgba[i * 4] / 255, rgba[i * 4 + 1] / 255, rgba[i * 4 + 2] / 255, THREE.SRGBColorSpace);
    const X0 = x - cx, X1 = X0 + 1, Y1 = maxY + 1 - y, Y0 = Y1 - 1;
    // Front and back.
    quad([X0, Y0, d], [X1, Y0, d], [X1, Y1, d], [X0, Y1, d], [0, 0, 1], 1);
    quad([X1, Y0, -d], [X0, Y0, -d], [X0, Y1, -d], [X1, Y1, -d], [0, 0, -1], 1);
    // Sides: wherever the neighbour column is thinner, on both the front and back halves.
    const nb = (dx: number, dy: number) => { const xx = x + dx, yy = y + dy; return xx < 0 || yy < 0 || xx >= n || yy >= n ? 0 : h[yy * n + xx]; };
    const sides: [number, number, number[], (z0: number, z1: number) => number[][]][] = [
      [1, 0, [1, 0, 0], (z0, z1) => [[X1, Y0, z1], [X1, Y0, z0], [X1, Y1, z0], [X1, Y1, z1]]],
      [-1, 0, [-1, 0, 0], (z0, z1) => [[X0, Y0, z0], [X0, Y0, z1], [X0, Y1, z1], [X0, Y1, z0]]],
      [0, -1, [0, 1, 0], (z0, z1) => [[X0, Y1, z1], [X1, Y1, z1], [X1, Y1, z0], [X0, Y1, z0]]],
      [0, 1, [0, -1, 0], (z0, z1) => [[X0, Y0, z0], [X1, Y0, z0], [X1, Y0, z1], [X0, Y0, z1]]],
    ];
    for (const [dx, dy, normal, face] of sides) {
      const o = nb(dx, dy);
      if (o >= d) continue;
      const k = dy === -1 ? 1 : SIDE_SHADE;
      if (o === 0) { const [a, b, cc, e] = face(-d, d); quad(a, b, cc, e, normal, k); continue; }
      { const [a, b, cc, e] = face(o, d); quad(a, b, cc, e, normal, k); }
      { const [a, b, cc, e] = face(-d, -o); quad(a, b, cc, e, normal, k); }
    }
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  geo.setAttribute("normal", new THREE.Float32BufferAttribute(nrm, 3));
  geo.setAttribute("color", new THREE.Float32BufferAttribute(col, 3));
  geo.setIndex(idx);
  return { geo, height: maxY - minY + 1, width: maxX - minX + 1 };
}

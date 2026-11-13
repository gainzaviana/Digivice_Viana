import type { GameData, Stage } from "../data/models";
import type { Variant } from "../core/save";
import { PALETTE, rgb } from "./palette";
import { Material } from "./forge";
import { buildSprite } from "./bodies";

/** Canvas size of each stage, in sprite pixels. */
export const SPRITE_CANVAS: Record<Stage, number> = { brote: 24, novato: 32, avanzado: 48, elite: 64, supremo: 80, despertar: 80, fusion: 128 };

export interface EcoPixels {
  n: number;
  /** Row-major "#RRGGBB" palette colours, null = transparent. */
  colors: (string | null)[];
  /** Surface normals (x right, y down, z out), 3 floats per pixel. */
  normals: Float32Array;
  /** 1 where the pixel glows (data seams, cores). */
  emissive: Uint8Array;
}

export interface EcoArt extends EcoPixels {
  /** n×n, one canvas pixel per sprite pixel (draw with imageSmoothingEnabled = false). */
  canvas: HTMLCanvasElement;
}

/** The pixels of an Eco's sprite (no DOM needed). Unknown species give an empty 32×32 sprite. */
export function ecoPixels(speciesID: string, variant: Variant, data: GameData, silhouette = false): EcoPixels {
  const species = data.eco.get(speciesID);
  if (!species) return { n: 32, colors: new Array(32 * 32).fill(null), normals: new Float32Array(32 * 32 * 3), emissive: new Uint8Array(32 * 32) };
  const n = SPRITE_CANVAS[species.stage];
  const { forge, look } = buildSprite(species, n);
  if (variant === "brillante") {
    // Brillante: a golden body, same shape.
    look.main = [PALETTE.amber1, PALETTE.amber2, PALETTE.amber3, PALETTE.cream];
    look.second = [PALETTE.skin, PALETTE.cream, PALETTE.white, PALETTE.white];
  }
  if (variant === "infectado") forge.glitchRows([0.45, 0.62, 0.78], 1);
  const normals = forge.normals();
  const colors = forge.colours(look, normals);
  if (variant === "infectado") {
    // Corrupted pixels in the Ruido colour.
    for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) {
      if (forge.material[y * n + x] !== Material.none && (x * 7 + y * 13) % 11 === 0) colors[y * n + x] = PALETTE.purple2;
    }
  }
  if (silhouette) {
    for (let i = 0; i < n * n; i++) if (forge.material[i] !== Material.none) colors[i] = PALETTE.slate;
  }
  return { n, colors, normals, emissive: silhouette ? new Uint8Array(n * n) : forge.emissive.slice() };
}

const pixelCache = new Map<string, EcoPixels>();
const artCache = new Map<string, EcoArt>();
const urlCache = new Map<string, string>();

function cachedPixels(speciesID: string, variant: Variant, data: GameData, silhouette: boolean): EcoPixels {
  const key = `${speciesID}|${variant}|${silhouette ? 1 : 0}`;
  let p = pixelCache.get(key);
  if (!p) { p = ecoPixels(speciesID, variant, data, silhouette); pixelCache.set(key, p); }
  return p;
}

/** RGBA bytes of a sprite (optionally only its glowing pixels), mirrored when facing left. */
export function spriteRGBA(p: EcoPixels, opts: { emissiveOnly?: boolean; facingLeft?: boolean } = {}): Uint8ClampedArray {
  const { n } = p;
  const out = new Uint8ClampedArray(n * n * 4);
  for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) {
    const c = p.colors[y * n + x];
    if (!c || (opts.emissiveOnly && !p.emissive[y * n + x])) continue;
    const [r, g, b] = rgb(c);
    const i = (y * n + (opts.facingLeft ? n - 1 - x : x)) * 4;
    out[i] = r; out[i + 1] = g; out[i + 2] = b; out[i + 3] = 255;
  }
  return out;
}

function toCanvas(n: number, bytes: Uint8ClampedArray): HTMLCanvasElement {
  const canvas = document.createElement("canvas");
  canvas.width = n; canvas.height = n;
  const ctx = canvas.getContext("2d");
  if (ctx) ctx.putImageData(new ImageData(new Uint8ClampedArray(bytes), n, n), 0, 0);
  return canvas;
}

/** An Eco's sprite with a ready canvas (memoized by species and variant). Browser only. */
export function ecoArt(speciesID: string, variant: Variant, data: GameData, silhouette = false): EcoArt {
  const key = `${speciesID}|${variant}|${silhouette ? 1 : 0}`;
  const cached = artCache.get(key);
  if (cached) return cached;
  const p = cachedPixels(speciesID, variant, data, silhouette);
  if (typeof document === "undefined") throw new Error("ecoArt needs a DOM; use ecoPixels instead.");
  const art: EcoArt = { ...p, canvas: toCanvas(p.n, spriteRGBA(p)) };
  artCache.set(key, art);
  return art;
}

/** A canvas of only the glowing pixels, for an additive glow layer (undefined if none glow). */
export function ecoGlowCanvas(art: EcoArt, facingLeft = false): HTMLCanvasElement | undefined {
  if (!art.emissive.some((v) => v)) return undefined;
  return toCanvas(art.n, spriteRGBA(art, { emissiveOnly: true, facingLeft }));
}

/** A PNG data URL of the sprite at a whole-number scale, for <img> in the interface (memoized). */
export function ecoDataURL(speciesID: string, variant: Variant, data: GameData, scale = 1, silhouette = false): string {
  const key = `${speciesID}|${variant}|${scale}|${silhouette ? 1 : 0}`;
  const cached = urlCache.get(key);
  if (cached) return cached;
  if (typeof document === "undefined") return "";
  const art = ecoArt(speciesID, variant, data, silhouette);
  const s = Math.max(1, Math.floor(scale));
  const canvas = document.createElement("canvas");
  canvas.width = art.n * s; canvas.height = art.n * s;
  const ctx = canvas.getContext("2d");
  if (ctx) { ctx.imageSmoothingEnabled = false; ctx.drawImage(art.canvas, 0, 0, art.n * s, art.n * s); }
  const url = canvas.toDataURL("image/png");
  urlCache.set(key, url);
  return url;
}

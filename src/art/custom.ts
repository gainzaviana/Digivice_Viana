import type { Variant } from "../core/save";

/**
 * Your own creature art. PNG/WebP files in src/assets/creatures/ named after a species are bundled when the game is built
 * and used instead of the procedural figure:
 *   <speciesID>.png             the normal look (also <speciesID>_idle.png)
 *   <speciesID>_brillante.png   its Brillante (shiny) look (also <speciesID>_shiny.png)
 *   <speciesID>_infectado.png   optional infected look
 * Without a Brillante file, the normal one is recoloured. Without any file, the 3D figure is used.
 * Species ids are the `id`s in src/data/json/ecos.json (the list is in README.md).
 */
import files from "virtual:creature-art";

const byName = new Map<string, string>();
for (const [file, url] of Object.entries(files)) {
  const name = file.replace(/\.(png|webp)$/i, "").toLowerCase();
  byName.set(name, url);
}

const ALIASES: Record<Variant, string[]> = { normal: ["", "_idle", "_normal"], brillante: ["_brillante", "_shiny"], infectado: ["_infectado"] };

export interface CustomArt {
  url: string;
  /** No file for this variant: the normal art, recoloured. */
  recolour: boolean;
}

/** The art you supplied for this species and variant, if any. */
export function customArt(speciesID: string, variant: Variant, table: Map<string, string> = byName): CustomArt | undefined {
  const id = speciesID.toLowerCase();
  for (const suffix of ALIASES[variant]) {
    const url = table.get(id + suffix);
    if (url) return { url, recolour: false };
  }
  if (variant === "normal") return undefined;
  for (const suffix of ALIASES.normal) {
    const url = table.get(id + suffix);
    if (url) return { url, recolour: variant === "brillante" };
  }
  return undefined;
}


/** The Brillante recolour of art that has no shiny file: a hue turn and a little more saturation. */
export const SHINY_HUE_DEGREES = 150;
export const SHINY_CSS_FILTER = `hue-rotate(${SHINY_HUE_DEGREES}deg) saturate(1.25) brightness(1.05)`;

/** The same recolour per pixel (for WebGL textures, where CSS filters don't apply). */
export function hueRotatePixels(px: Uint8ClampedArray, degrees = SHINY_HUE_DEGREES, saturate = 1.25) {
  const a = (degrees * Math.PI) / 180, c = Math.cos(a), s = Math.sin(a);
  // The standard hue-rotate matrix (as in CSS filters).
  const m = [
    0.213 + c * 0.787 - s * 0.213, 0.715 - c * 0.715 - s * 0.715, 0.072 - c * 0.072 + s * 0.928,
    0.213 - c * 0.213 + s * 0.143, 0.715 + c * 0.285 + s * 0.14, 0.072 - c * 0.072 - s * 0.283,
    0.213 - c * 0.213 - s * 0.787, 0.715 - c * 0.715 + s * 0.715, 0.072 + c * 0.928 + s * 0.072,
  ];
  for (let i = 0; i < px.length; i += 4) {
    const r = px[i], g = px[i + 1], b = px[i + 2];
    let nr = m[0] * r + m[1] * g + m[2] * b, ng = m[3] * r + m[4] * g + m[5] * b, nb = m[6] * r + m[7] * g + m[8] * b;
    const l = 0.2126 * nr + 0.7152 * ng + 0.0722 * nb;
    nr = l + (nr - l) * saturate; ng = l + (ng - l) * saturate; nb = l + (nb - l) * saturate;
    px[i] = nr; px[i + 1] = ng; px[i + 2] = nb;
  }
}

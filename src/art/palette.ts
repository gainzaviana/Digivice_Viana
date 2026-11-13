import type { Affinity } from "../data/models";

/**
 * The game's single 32-colour palette. Every sprite, background and piece of interface
 * uses only these colours. Ramps are hue-shifted: shadows lean blue/purple, highlights yellow.
 */
export const PALETTE = {
  // Neutrals
  outline: "#1B1830",
  ink: "#3A3557",
  slate: "#6B6690",
  mist: "#A9A6C8",
  white: "#F4F1FF",
  // Reds
  red0: "#5A1A2E",
  red1: "#A82B3C",
  red2: "#E04A3F",
  red3: "#FF8A5C",
  // Ambers
  amber0: "#8A4B12",
  amber1: "#E08A1E",
  amber2: "#FFB13B",
  amber3: "#FFE27A",
  // Greens
  green0: "#1E4D3A",
  green1: "#3C8C4E",
  green2: "#7FCB5A",
  green3: "#CDEB8B",
  // Teals
  teal0: "#134B5A",
  teal1: "#1F8A8E",
  teal2: "#4FE3E0",
  // Blues
  blue0: "#1D2B6B",
  blue1: "#2F56B8",
  blue2: "#5A9BFF",
  blue3: "#B4DCFF",
  // Purples
  purple0: "#3D1E5E",
  purple1: "#7A3BA8",
  purple2: "#E04FD0",
  // Warm
  brown0: "#4A2E26",
  brown1: "#8C5A3C",
  skin: "#D49A6A",
  pink: "#FF9BC0",
  cream: "#FFF6D6",
  // Affinity seam colours: the glowing 1px "data seams" every Eco carries.
  pulso: "#FFB13B",
  senal: "#4FE3E0",
  ruido: "#E04FD0",
} as const;

export type PaletteName = keyof typeof PALETTE;

export const AFFINITY_COLOR: Record<Affinity, string> = { pulso: PALETTE.pulso, senal: PALETTE.senal, ruido: PALETTE.ruido };

/** The 32 distinct colours. */
export const PALETTE_COLORS: ReadonlySet<string> = new Set(Object.values(PALETTE));

/** [r, g, b] of a "#RRGGBB" colour. */
export function rgb(hex: string): [number, number, number] {
  const v = parseInt(hex.slice(1), 16);
  return [(v >> 16) & 255, (v >> 8) & 255, v & 255];
}

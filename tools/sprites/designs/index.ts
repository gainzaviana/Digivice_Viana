import type { Design } from "../style";
import { forja } from "./forja";

/**
 * Every creature's design, by species id. Each group file is self-contained; add new groups here.
 * Groups are loaded lazily so a missing file never breaks the others.
 */
export const GROUPS = ["forja", "eco-pliegue", "glitch-quitina", "telurica-engranaje", "abisal-variantes", "salvajes-1", "salvajes-2"] as const;

export async function loadDesigns(groups: readonly string[] = GROUPS): Promise<Record<string, Design>> {
  const all: Record<string, Design> = { ...forja };
  for (const g of groups) {
    if (g === "forja") continue;
    try {
      const mod = await import(`./${g}.ts`);
      for (const v of Object.values(mod)) Object.assign(all, v as Record<string, Design>);
    } catch (e) {
      if ((e as { code?: string }).code !== "ERR_MODULE_NOT_FOUND") throw e;
    }
  }
  return all;
}

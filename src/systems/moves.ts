import type { EcoSpecies } from "../data/models";

/**
 * Each species' Physical Strike: its dash style (from what it is: horns charge, claws swipe,
 * round bodies spin, light ones pounce, the rest tackle) and a name. Pure data, used by the battle
 * screen and the 3D effects.
 */
export type DashStyle = "tackle" | "claw" | "spin" | "horn" | "pounce";

function hash(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
  return h >>> 0;
}

export function dashStyle(species: EcoSpecies | undefined, id = species?.id ?? ""): DashStyle {
  const text = `${species?.name ?? ""} ${species?.description ?? ""} ${species?.basic.name ?? ""}`;
  if (/cuerno|asta|rodacorno|minotauro|carnero|cabeza/i.test(text)) return "horn";
  if (/garra|zarpa|uña|escorpi|cangrej|pinza|león|leon|lobo|zorro|dragón|dragon/i.test(text)) return "claw";
  if (/rueda|giro|engran|tuerc|bola|rodar|armadillo|caracol/i.test(text)) return "spin";
  if (/salt|rana|conejo|liebre|gato|pájar|pajar|búho|buho|ala/i.test(text)) return "pounce";
  return (["tackle", "claw", "spin", "horn", "pounce"] as DashStyle[])[hash(`${id}|physical`) % 5];
}

const BASE: Record<DashStyle, string> = { tackle: "Placaje", claw: "Zarpazo", spin: "Giro embestida", horn: "Cornada", pounce: "Salto aplastante" };
const FLAVOUR: Record<string, string> = { pulso: "ardiente", senal: "eléctrico", ruido: "glitch" };

export function physicalName(species: EcoSpecies): string {
  const style = dashStyle(species);
  const flavour = FLAVOUR[species.affinity] ?? "";
  return style === "spin" || style === "pounce" ? `${BASE[style]} ${flavour === "eléctrico" ? "eléctrica" : flavour === "ardiente" ? "ardiente" : flavour}` : `${BASE[style]} ${flavour}`;
}

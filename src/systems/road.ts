import type { CardRarity, GameData } from "../data/models";
import type { Rng } from "../core/random";
import { addLog, partnerOf, type GameSave } from "../core/save";
import { gainXP, maxStats } from "./progression";
import { addEgg } from "./walk";
import { done, refused, type ActionResult } from "./result";

/** Road events that aren't battles: data caches and data hazards. */

const take = (save: GameSave, id: string, kind: string) => {
  const i = save.pending.findIndex((e) => e.id === id && e.kind === kind);
  return i >= 0 ? save.pending.splice(i, 1)[0] : undefined;
};

/** The egg type a reward gives in an Area (common early, rarer later). */
export function eggForArea(area: number): string {
  return area <= 2 ? "huevo-comun" : area <= 4 ? "huevo-raro" : "huevo-ancestral";
}

/** Opens a data cache: DP, a healing item, a Parche or (rarely) an egg. */
export function openCache(save: GameSave, id: string, data: GameData, rng: Rng): ActionResult {
  const e = take(save, id, "cache");
  const partner = partnerOf(save);
  if (!e || !partner) return refused("Ese cofre ya no está.");
  const c = data.rules.cache;
  const area = data.region.get(e.regionID)?.area ?? 1;
  const kind = rng.weighted([["dp", c.weights.dp], ["item", c.weights.item], ["card", c.weights.card], ["egg", c.weights.egg]] as [string, number][], (x) => x[1])?.[0];
  let text: string;
  if (kind === "egg" && addEgg(save, eggForArea(area), data)) {
    text = `¡Dentro del cofre había un ${data.egg.get(eggForArea(area))?.name}! Ya está en la incubadora.`;
  } else if (kind === "card") {
    const weights: Record<CardRarity, number> = { comun: 70, rara: 25 + area * 2, epica: area >= 4 ? 5 : 0 };
    const card = rng.weighted(data.parches, (p) => weights[p.rarity]);
    if (!card) return refused("El cofre estaba vacío.");
    save.parches[card.id] = (save.parches[card.id] ?? 0) + 1;
    if (!save.guide.discoveredParches.includes(card.id)) save.guide.discoveredParches.push(card.id);
    text = `El cofre contenía un Parche: ${card.name}.`;
  } else if (kind === "item") {
    const pool = area <= 2 ? ["disco-vida-s", "disco-energia"] : area <= 4 ? ["disco-vida-m", "disco-energia", "fruta-dulce"] : ["disco-vida-l", "disco-energia", "fruta-vida"];
    const item = data.item.get(rng.pick(pool)!);
    if (!item) return refused("El cofre estaba vacío.");
    save.inventory[item.id] = (save.inventory[item.id] ?? 0) + 1;
    text = `El cofre contenía: ${item.name}.`;
  } else {
    const dp = rng.int(c.dpMin, c.dpMax);
    const before = partner.dp;
    partner.dp = Math.min(data.rules.maxDP, partner.dp + dp);
    text = `¡Energía pura! DP +${partner.dp - before}.`;
  }
  addLog(save, "item", text);
  return done(text);
}

/**
 * Resolves a data hazard after its quick challenge. Success: bonus XP for the partner. Failure:
 * it loses some HP or DP (never below 1 HP).
 */
export function resolveHazard(save: GameSave, id: string, success: boolean, data: GameData): ActionResult {
  const e = take(save, id, "hazard");
  const partner = partnerOf(save);
  if (!e || !partner) return refused("La tormenta ya pasó.");
  const h = data.rules.hazard;
  const name = partner.nickname ?? data.eco.get(partner.speciesID)?.name ?? "Tu Eco";
  let text: string;
  if (success) {
    const xp = Math.round(data.rules.xp.perWin * h.xpWins);
    const levels = gainXP(xp, partner, data);
    text = `¡${name} atraviesa la tormenta de datos! +${xp} XP.${levels ? ` ¡Sube al nivel ${partner.level}!` : ""}`;
  } else if (partner.dp >= h.dpLoss && partner.hp <= maxStats(partner, data).hp * 0.3) {
    partner.dp -= h.dpLoss;
    text = `La tormenta descarga a ${name}: DP −${h.dpLoss}.`;
  } else {
    const loss = Math.max(1, Math.round((maxStats(partner, data).hp * h.hpLossPercent) / 100));
    partner.hp = Math.max(1, partner.hp - loss);
    text = `La tormenta golpea a ${name}: vida −${loss}.`;
  }
  addLog(save, "info", text);
  return done(text);
}

import { addStats, type EcoSpecies, type Fusion, type GameData } from "../data/models";
import { addLog, partnerOf, type EcoInstance, type GameSave } from "../core/save";
import { maxStats } from "./progression";
import { record } from "./challenges";
import { done, refused, type ActionResult } from "./result";

/** Fusion: the partner (a Supremo) merges with another Supremo of the squad. Permanent. */
export interface FusionOption {
  fusion: Fusion;
  result: EcoSpecies;
  otherSpecies: EcoSpecies;
  /** The squad member that would merge; undefined if there's none yet. */
  other?: EcoInstance;
  missing: string[];
  ready: boolean;
}

export function fusionOptions(save: GameSave, data: GameData): FusionOption[] {
  const partner = partnerOf(save);
  if (!partner) return [];
  return data.fusions.flatMap((fusion): FusionOption[] => {
    const result = data.eco.get(fusion.result);
    const otherID = fusion.parts.find((p) => p !== partner.speciesID) ?? fusion.parts[0];
    const otherSpecies = data.eco.get(otherID);
    if (!fusion.parts.includes(partner.speciesID) || !result || !otherSpecies) return [];
    const candidates = save.squad.filter((e) => e.id !== partner.id && e.speciesID === otherID);
    if (!candidates.length) {
      return [{ fusion, result, otherSpecies, missing: [`Tener a ${otherSpecies.name} en el equipo`], ready: false }];
    }
    return candidates.map((other) => {
      const missing: string[] = [];
      if (partner.bond < fusion.minBond) missing.push(`Vínculo ${fusion.minBond} con tu compañero`);
      if (other.bond < fusion.minBond) missing.push(`Vínculo ${fusion.minBond} con ${otherSpecies.name}`);
      if (fusion.item && !(save.inventory[fusion.item] > 0)) missing.push(`Usar ${data.item.get(fusion.item)?.name ?? fusion.item}`);
      return { fusion, result, otherSpecies, other, missing, ready: missing.length === 0 };
    });
  });
}

export function fuse(save: GameSave, fusionID: string, otherID: string, data: GameData): ActionResult {
  const option = fusionOptions(save, data).find((o) => o.fusion.id === fusionID && o.other?.id === otherID);
  const partner = partnerOf(save);
  if (!option?.other || !partner) return refused("Esa fusión no es posible.");
  if (!option.ready) return refused(`Falta: ${option.missing.join(", ")}.`);
  const other = option.other;
  if (option.fusion.item) { save.inventory[option.fusion.item] -= 1; if (save.inventory[option.fusion.item] <= 0) delete save.inventory[option.fusion.item]; }
  const before = data.eco.get(partner.speciesID)?.name ?? partner.speciesID;
  partner.speciesID = option.result.id;
  partner.history.push(option.result.id);
  partner.level = Math.max(partner.level, other.level);
  partner.xp = 0;
  partner.bonus = addStats(partner.bonus, other.bonus);
  partner.bond = Math.max(partner.bond, other.bond);
  partner.wins += other.wins;
  partner.trainingSessions += other.trainingSessions;
  if (other.variant === "brillante") partner.variant = "brillante";
  const max = maxStats(partner, data);
  partner.hp = max.hp;
  partner.dp = max.dp;
  save.squad = save.squad.filter((e) => e.id !== other.id);
  for (const list of [save.guide.seen, save.guide.owned]) if (!list.includes(option.result.id)) list.push(option.result.id);
  record(save, "fusions");
  record(save, "evolutions");
  const text = `¡${before} y ${option.otherSpecies.name} se fusionan en ${option.result.name}!`;
  addLog(save, "evolution", text);
  return done(text);
}

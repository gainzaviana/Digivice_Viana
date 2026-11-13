import { STAGE_TIER, type GameData } from "../data/models";
import { SAVE_VERSION, type GameSave } from "../core/save";
import { baseFormOf, maxStats } from "./progression";

/**
 * Converts a save from an older version of the rules. Version 1 → 2 (D-Ark rules):
 * - an Eco that had evolved permanently goes back to its Stage 1 form, and the forms it had
 *   reached become unlocked evolutions it can still use in battle;
 * - old bonuses (ATK/DEF/SPD) become AP/SP/HP on the new scale; DP is capped at 50; XP restarts
 *   within its level (the level is kept).
 */
export function upgradeSave(save: GameSave, data: GameData): boolean {
  if (save.version >= SAVE_VERSION) return false;
  if (save.version < 2) upgradeTo2(save, data);
  // 2 → 3: the map became 18 cities in 6 Areas with longer roads. The current city is kept, with
  // the same steps left (roads only got longer, so nothing walked is lost).
  const region = save.map.regionID ? data.region.get(save.map.regionID) : undefined;
  if (region && !save.map.bossReady) save.map.stepsLeft = Math.min(region.steps, Math.max(1, save.map.stepsLeft));
  save.map.stepsToNextEvent = Math.min(save.map.stepsToNextEvent, data.rules.encounterEveryMaxSteps);
  save.version = SAVE_VERSION;
  return true;
}

function upgradeTo2(save: GameSave, data: GameData) {
  for (const eco of save.squad) {
    const old = eco.bonus as unknown as Record<string, number | undefined>;
    const reached = [...new Set([...(eco.history ?? []), eco.speciesID])].filter((id) => data.eco.has(id));
    const base = baseFormOf(reached[0] ?? eco.speciesID, data);
    const baseTier = STAGE_TIER[data.eco.get(base)?.stage ?? "novato"];
    eco.speciesID = base;
    eco.unlocked = reached.filter((id) => id !== base && STAGE_TIER[data.eco.get(id)!.stage] > baseTier);
    eco.bonus = {
      hp: Math.round((old.hp ?? 0) + (old.def ?? 0)),
      ap: Math.round((old.atk ?? old.ap ?? 0) * 5) / 10,
      sp: Math.round((old.spd ?? old.sp ?? 0) * 5) / 10,
    };
    eco.xp = 0;
    eco.lossStreak ??= 0;
    eco.dp = Math.max(0, Math.min(data.rules.maxDP, eco.dp));
    const max = maxStats(eco, data);
    eco.hp = eco.hp <= 0 ? 0 : max.hp;
  }
}

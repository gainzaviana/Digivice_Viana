import { addStats, stageOrder, ZERO_STATS, type EcoSpecies, type Evolution, type GameData, type GameRules, type Stats, type TimeOfDay } from "../data/models";
import { newID, type EcoInstance, type GameSave, type Variant } from "../core/save";

/** Maximum stats of an Eco at its level, bonuses included. DP doesn't grow with level. */
export function maxStats(eco: Pick<EcoInstance, "speciesID" | "level" | "bonus">, data: GameData): Stats {
  const species = data.eco.get(eco.speciesID);
  if (!species) return eco.bonus;
  const f = 1 + data.rules.statGrowthPerLevel * (eco.level - 1);
  const b = species.stats;
  const scale = (v: number) => Math.round(v * f);
  return addStats({ hp: scale(b.hp), atk: scale(b.atk), def: scale(b.def), spd: scale(b.spd), dp: b.dp }, eco.bonus);
}

export const xpToNext = (level: number, rules: GameRules) => Math.round(rules.xpBase * Math.pow(level, rules.xpExponent));

export function newEco(species: string, level: number, data: GameData, variant: Variant = "normal"): EcoInstance {
  const eco: EcoInstance = {
    id: newID(), speciesID: species, variant, level, xp: 0, hp: 1, dp: 0, bond: 0, bonus: { ...ZERO_STATS },
    wins: 0, losses: 0, trainingSessions: 0, stepsWalked: 0, history: [species],
  };
  const s = maxStats(eco, data);
  eco.hp = s.hp;
  eco.dp = s.dp;
  return eco;
}

/** Adds XP, levelling up as often as it allows. Returns the levels gained. */
export function gainXP(amount: number, eco: EcoInstance, data: GameData): number {
  let gained = 0;
  eco.xp += amount;
  while (eco.level < data.rules.levelCap) {
    const needed = xpToNext(eco.level, data.rules);
    if (eco.xp < needed) break;
    eco.xp -= needed;
    const before = maxStats(eco, data).hp;
    eco.level += 1;
    gained += 1;
    // Levelling up heals by the HP gained, so it never feels like a loss.
    eco.hp += maxStats(eco, data).hp - before;
  }
  if (eco.level >= data.rules.levelCap) eco.xp = 0;
  return gained;
}

export function timeOfDay(date = new Date()): TimeOfDay {
  const h = date.getHours();
  return h >= 7 && h < 20 ? "dia" : "noche";
}

export interface EvolutionStatus {
  evolution: Evolution;
  target: EcoSpecies;
  /** Requirements still missing, in Spanish. Empty means it can evolve now. */
  missing: string[];
  requirements: string[];
  ready: boolean;
}

export function evolutionStatus(eco: EcoInstance, save: GameSave, data: GameData, now = new Date()): EvolutionStatus[] {
  const species = data.eco.get(eco.speciesID);
  if (!species) return [];
  return species.evolutions.flatMap((evolution) => {
    const target = data.eco.get(evolution.to);
    if (!target) return [];
    const c = evolution.conditions;
    const requirements: string[] = [];
    const missing: string[] = [];
    const need = (text: string, met: boolean) => { requirements.push(text); if (!met) missing.push(text); };
    if (c.minLevel !== undefined) need(`Nivel ${c.minLevel}`, eco.level >= c.minLevel);
    if (c.minBond !== undefined) need(`Vínculo ${c.minBond}`, eco.bond >= c.minBond);
    if (c.maxBond !== undefined) need(`Vínculo ${c.maxBond} o menos`, eco.bond <= c.maxBond);
    if (c.minSteps !== undefined) need(`${c.minSteps.toLocaleString("es")} pasos juntos`, eco.stepsWalked >= c.minSteps);
    if (c.minWins !== undefined) need(`${c.minWins} victorias`, eco.wins >= c.minWins);
    if (c.minLosses !== undefined) need(`${c.minLosses} derrotas`, eco.losses >= c.minLosses);
    if (c.minTraining !== undefined) need(`${c.minTraining} entrenamientos`, eco.trainingSessions >= c.minTraining);
    if (c.timeOfDay) need(c.timeOfDay === "noche" ? "De noche (20:00–7:00)" : "De día (7:00–20:00)", timeOfDay(now) === c.timeOfDay);
    if (c.defeatedBoss) need(`Vencer al jefe de ${data.region.get(c.defeatedBoss)?.name ?? c.defeatedBoss}`, save.map.clearedRegions.includes(c.defeatedBoss));
    if (c.item) need(`Usar ${data.item.get(c.item)?.name ?? c.item}`, (save.inventory[c.item] ?? 0) > 0);
    if (c.card) need(`${data.parche.get(c.card)?.name ?? c.card} en combate`, (save.parches[c.card] ?? 0) > 0);
    return [{ evolution, target, missing, requirements, ready: missing.length === 0 }];
  });
}

/** The next-stage form an Eco can take for one battle (its main evolution), if any. */
export function battleEvolution(speciesID: string, data: GameData): EcoSpecies | undefined {
  const species = data.eco.get(speciesID);
  if (!species) return undefined;
  return species.evolutions
    .filter((e) => !e.conditions.inBattleOnly)
    .map((e) => data.eco.get(e.to))
    .find((t): t is EcoSpecies => !!t && stageOrder(t.stage) === stageOrder(species.stage) + 1);
}

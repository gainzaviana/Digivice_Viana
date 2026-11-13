import { addStats, round1, STAGE_TIER, ZERO_STATS, type Archetype, type EcoSpecies, type GameData, type Stats, type TimeOfDay } from "../data/models";
import { newID, type EcoInstance, type Variant } from "../core/save";

/**
 * D-Ark progression. Every Eco has its own level, XP and stats; battle stats come from its
 * archetype (each line has one: balanced, glass cannon, tank, fast, mystic) and grow every level.
 */

/** HP/AP/SP of an archetype at a level, before bonuses. */
export function archetypeStats(archetype: Archetype, level: number, data: GameData): Stats {
  const p = data.rules.archetypes[archetype] ?? data.rules.archetypes.equilibrado;
  const l = Math.max(0, level - 1);
  return { hp: Math.round(p.base.hp + p.growth.hp * l), ap: round1(p.base.ap + p.growth.ap * l), sp: round1(p.base.sp + p.growth.sp * l) };
}

/** Max HP/AP/SP of an Eco in its base form: level and permanent bonuses. */
export function maxStats(eco: Pick<EcoInstance, "speciesID" | "level" | "bonus">, data: GameData): Stats {
  const species = data.eco.get(eco.speciesID);
  const s = archetypeStats(species?.archetype ?? "equilibrado", eco.level, data);
  const b = { ...ZERO_STATS, ...eco.bonus };
  const total = addStats(s, { hp: b.hp, ap: b.ap, sp: b.sp });
  return { hp: Math.round(total.hp), ap: round1(total.ap), sp: round1(total.sp) };
}

/** A species' D-Ark tier (1–4, Despertar 5). */
export const tierOf = (species: EcoSpecies | undefined) => (species ? STAGE_TIER[species.stage] : 1);

/** Stat multiplier of a wild Eco or boss for its stage (a Stage 2 wild Eco is 1.6× a Stage 1 of its level, …). */
export function stageMultiplier(species: EcoSpecies | undefined, data: GameData): number {
  const t = tierOf(species);
  const e = data.rules.evolution;
  return t >= 5 ? e.awakenMultiplier : e.multiplier[Math.min(e.multiplier.length - 1, t - 1)];
}

/** A wild Eco's or boss's stats: its archetype at its level, times its stage multiplier. */
export function wildStats(speciesID: string, level: number, data: GameData): Stats {
  const species = data.eco.get(speciesID);
  const k = stageMultiplier(species, data);
  const s = archetypeStats(species?.archetype ?? "equilibrado", level, data);
  return { hp: Math.round(s.hp * k), ap: round1(s.ap * k), sp: round1(s.sp * k) };
}

/** Wins (against even opponents) needed for the next level: 3 early, up to 15 late. */
export function winsPerLevel(level: number, data: GameData): number {
  const x = data.rules.xp;
  return Math.min(x.winsPerLevelMax, x.winsPerLevelStart + Math.floor((level - 1) / x.winsPerLevelEvery));
}

export const xpToNext = (level: number, data: GameData) => data.rules.xp.perWin * winsPerLevel(level, data);

/** XP for beating an enemy: more for stronger ones (higher level or stage), bosses and Brillantes. */
export function xpForWin(myLevel: number, enemyLevel: number, enemySpecies: EcoSpecies | undefined, boss: boolean, brillante: boolean, data: GameData): number {
  const x = data.rules.xp;
  const effective = enemyLevel * (1 + x.tierBonus * (tierOf(enemySpecies) - 1));
  let xp = x.perWin * Math.min(x.ratioMax, Math.max(x.ratioMin, effective / Math.max(1, myLevel)));
  if (boss) xp *= x.bossMultiplier;
  if (brillante) xp *= x.brillanteMultiplier;
  return Math.max(1, Math.round(xp));
}

/** The Stage 1 form a species starts as (a Brote from an egg grows into its line's Stage 1). */
export function baseFormOf(speciesID: string, data: GameData): string {
  const s = data.eco.get(speciesID);
  if (s?.stage === "brote") return s.evolutions[0]?.to ?? speciesID;
  return speciesID;
}

/** A new Eco in its base form, at full HP. */
export function newEco(species: string, level: number, data: GameData, variant: Variant = "normal"): EcoInstance {
  const eco: EcoInstance = {
    id: newID(), speciesID: baseFormOf(species, data), variant, level: Math.max(1, level), xp: 0, hp: 1, dp: data.rules.startingDP,
    bond: 0, bonus: { ...ZERO_STATS }, wins: 0, losses: 0, lossStreak: 0, trainingSessions: 0, stepsWalked: 0, history: [species], unlocked: [],
  };
  eco.hp = maxStats(eco, data).hp;
  return eco;
}

/** Adds XP to this Eco only, levelling up as often as it allows. Returns the levels gained. */
export function gainXP(amount: number, eco: EcoInstance, data: GameData): number {
  let gained = 0;
  eco.xp += amount;
  while (eco.level < data.rules.levelCap) {
    const needed = xpToNext(eco.level, data);
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

/** Shows a stat with at most one decimal, Spanish style. */
export const statText = (v: number) => (Number.isInteger(v) ? String(v) : v.toLocaleString("es", { maximumFractionDigits: 1 }));

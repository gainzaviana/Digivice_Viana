// The game's content, as loaded from src/data/json. Same shapes as the JSON files.

export type Affinity = "pulso" | "senal" | "ruido";
export const AFFINITY_NAME: Record<Affinity, string> = { pulso: "Pulso", senal: "Señal", ruido: "Ruido" };
/** The affinity each one deals extra damage to: Pulso → Ruido → Señal → Pulso. */
export const BEATS: Record<Affinity, Affinity> = { pulso: "ruido", ruido: "senal", senal: "pulso" };

export const STAGES = ["brote", "novato", "avanzado", "elite", "supremo", "despertar", "fusion"] as const;
export type Stage = (typeof STAGES)[number];
export const STAGE_NAME: Record<Stage, string> = {
  brote: "Brote", novato: "Novato", avanzado: "Avanzado", elite: "Élite", supremo: "Supremo", despertar: "Despertar", fusion: "Fusión",
};
export const stageOrder = (s: Stage) => STAGES.indexOf(s);

export type Archetype = "equilibrado" | "atacante" | "tanque" | "veloz" | "mistico";
export const ARCHETYPE_NAME: Record<Archetype, string> = {
  equilibrado: "Equilibrado", atacante: "Atacante", tanque: "Defensor", veloz: "Veloz", mistico: "Místico",
};

export type TimeOfDay = "dia" | "noche";

export interface Stats { hp: number; atk: number; def: number; spd: number; dp: number }
export const ZERO_STATS: Stats = { hp: 0, atk: 0, def: 0, spd: 0, dp: 0 };
export const addStats = (a: Stats, b: Stats): Stats => ({ hp: a.hp + b.hp, atk: a.atk + b.atk, def: a.def + b.def, spd: a.spd + b.spd, dp: a.dp + b.dp });

export interface Attack { name: string; power: number; dpCost: number; accuracy: number }

export interface EvolutionCondition {
  minLevel?: number; minBond?: number; maxBond?: number; minSteps?: number; item?: string; defeatedBoss?: string;
  timeOfDay?: TimeOfDay; minWins?: number; minLosses?: number; minTraining?: number; card?: string; inBattleOnly?: boolean;
}
export interface Evolution { to: string; conditions: EvolutionCondition }

export interface EcoSpecies {
  id: string; name: string; stage: Stage; affinity: Affinity; archetype: Archetype;
  line?: string; starter?: boolean; recruitable: boolean;
  stats: Stats; basic: Attack; signature: Attack; description: string; evolutions: Evolution[];
}

export interface Fusion { id: string; parts: string[]; result: string; item?: string; minBond: number }
export interface Encounter { species: string; weight: number; minLevel: number; maxLevel: number }
export interface Region {
  id: string; name: string; order: number; steps: number; description: string; encounters: Encounter[];
  boss: { species: string; level: number }; requiresItem?: string; postGame?: boolean;
  bossReward?: string; bossCard?: string; bossGivesPartnerCrystal?: boolean;
}

export type ItemKind = "recuperacion" | "fruta" | "cristal" | "fusion" | "entrenamiento" | "amuleto" | "radar" | "antivirus" | "sobre" | "clave";
export interface ItemEffect { healPercent?: number; dp?: number; atk?: number; def?: number; spd?: number; hp?: number; bond?: number; steps?: number }
export interface Item { id: string; name: string; kind: ItemKind; description: string; effect?: ItemEffect; price?: number }

export interface EggType { id: string; name: string; steps: number; description: string; pool: { species: string; weight: number }[]; brillanteChance: number }

export type CardRarity = "comun" | "rara" | "epica";
export type CardEffectType = "buff" | "heal" | "dp" | "shield" | "sureHit" | "obey" | "doubleStrike" | "crit" | "convert" | "evolve" | "revive" | "awaken" | "drain" | "stun";
export type StatKind = "atk" | "def" | "spd";
export interface CardEffect { type: CardEffectType; stat?: StatKind; value?: number; turns?: number; affinity?: Affinity }
export interface Parche { id: string; name: string; rarity: CardRarity; description: string; effect: CardEffect; price?: number }

export type ChallengeMetric =
  | "steps" | "wins" | "bossWins" | "infectedWins" | "cardsUsed" | "recruits" | "training" | "hatches" | "evolutions" | "fusions" | "merchantBuys" | "shrineVisits"
  | "zonesCleared" | "guideSeen" | "guideOwned" | "brillanteOwned";
/** Metrics read from the save rather than counted as they happen. */
export const DERIVED_METRICS: ChallengeMetric[] = ["zonesCleared", "guideSeen", "guideOwned", "brillanteOwned"];
export interface Challenge {
  id: string; name: string; description: string; metric: ChallengeMetric; target: number; daily: boolean;
  reward: { bits: number; item?: string; parche?: string };
}

export interface BattleTuning {
  damageScale: number; basicReferencePower: number; statRatioExponent: number; affinityAdvantage: number; affinityDisadvantage: number;
  critChance: number; critMultiplier: number; randomSpread: number;
  clashExponent: number; clashTieMargin: number; strongClashWinnerDamage: number; basicClashWinnerDamage: number; basicClashTieDamage: number;
  dodgeBase: number; dodgeSpeedFactor: number; strongDodgeBonus: number; dodgeMin: number; dodgeMax: number;
  disobeyAtZeroBond: number; disobeyAtMaxBond: number; infectedDisobeyBonus: number; disobeyLoafShare: number;
  fleeBase: number; fleeSpeedFactor: number; fleeMin: number; fleeMax: number;
  doubleStrikeSecondHit: number; wildTurnLimit: number;
  bossHP: number; bossAtk: number; bossDef: number; bossSpd: number; bossDP: number; enrageThreshold: number; enrageAtk: number;
  bossWeakenPerDefeat: number; bossWeakenMax: number; infectedEnemyAtk: number;
  xpPerLevel: number; xpLevelExponent: number; xpStageMultiplier: Record<string, number>; xpBossMultiplier: number; xpBrillanteMultiplier: number;
  bitsPerLevel: number; winsPerBond: number; bossWinBond: number; lossBond: number;
  evolutionCost: Record<string, number>; evolutionUnlockBoss: Record<string, string>; evolutionFailAtZeroBond: number; evolutionFailFreeBond: number; evolutionFailCostShare: number;
  aiTierZones: number[]; aiRandomness: number[]; aiTemperature: number[];
}

export interface GameRules {
  levelCap: number; xpBase: number; xpExponent: number; statGrowthPerLevel: number; maxBond: number; stepsPerBond: number;
  encounterEveryMinSteps: number; encounterEveryMaxSteps: number;
  events: { battle: number; recruit: number; item: number; egg: number; merchant: number; shrine: number; nothing: number };
  brillanteChance: number; infectadoChance: number;
  defeatPenaltyFraction: number; bossDefeatPenaltyFraction: number; defeatPenaltyMin: number;
  deckSize: number; startingLevel: number; startingBits: number; startingItems: Record<string, number>; startingCards: string[];
  stepsPerDP: number; stepsPerHealPercent: number; maxPendingEvents: number; maxEggs: number; squadCap: number;
  bossBitsPerOrder: number; foundBitsMin: number; foundBitsMax: number; merchantOffers: number;
  shrineBaseCost: number; shrineCostPerOrder: number; shrineEpicChance: number;
  itemDrops: { item: string; weight: number; minRegion: number }[];
  eggDrops: { egg: string; weight: number; minRegion: number }[];
  battle: BattleTuning;
  training: { sessionsPerDay: number; statGainByTier: number[]; tierScores: number[]; bondGain: number; xpByTier: number[] };
  dailyChallenges: number;
}

export interface RawData {
  ecos: EcoSpecies[]; fusions: Fusion[]; regions: Region[]; items: Item[]; eggs: EggType[]; parches: Parche[]; challenges: Challenge[]; rules: GameRules;
}

/** Everything together, with lookups by id. Regions sorted along the route. */
export class GameData {
  readonly ecos: EcoSpecies[];
  readonly fusions: Fusion[];
  readonly regions: Region[];
  readonly items: Item[];
  readonly eggs: EggType[];
  readonly parches: Parche[];
  readonly challenges: Challenge[];
  readonly rules: GameRules;
  readonly eco = new Map<string, EcoSpecies>();
  readonly item = new Map<string, Item>();
  readonly parche = new Map<string, Parche>();
  readonly region = new Map<string, Region>();
  readonly egg = new Map<string, EggType>();

  constructor(raw: RawData) {
    this.ecos = raw.ecos;
    this.fusions = raw.fusions;
    this.regions = [...raw.regions].sort((a, b) => a.order - b.order);
    this.items = raw.items;
    this.eggs = raw.eggs;
    this.parches = raw.parches;
    this.challenges = raw.challenges;
    this.rules = raw.rules;
    for (const e of raw.ecos) if (!this.eco.has(e.id)) this.eco.set(e.id, e);
    for (const i of raw.items) if (!this.item.has(i.id)) this.item.set(i.id, i);
    for (const p of raw.parches) if (!this.parche.has(p.id)) this.parche.set(p.id, p);
    for (const r of raw.regions) if (!this.region.has(r.id)) this.region.set(r.id, r);
    for (const g of raw.eggs) if (!this.egg.has(g.id)) this.egg.set(g.id, g);
  }

  get starters() { return this.ecos.filter((e) => e.starter); }

  /** The forms of a partner line, earliest stage first. */
  formsOfLine(line: string) {
    return this.ecos.filter((e) => e.line === line).sort((a, b) => stageOrder(a.stage) - stageOrder(b.stage) || a.name.localeCompare(b.name));
  }

  /** The evolution crystal a partner line needs for its Supremo. */
  crystalForLine(line: string): Item | undefined {
    for (const e of this.ecos.filter((x) => x.line === line)) {
      for (const ev of e.evolutions) {
        const it = ev.conditions.item ? this.item.get(ev.conditions.item) : undefined;
        if (it?.kind === "cristal") return it;
      }
    }
    return undefined;
  }

  /** Every species reachable through evolutions, including the starting one. */
  reachableForms(id: string): Set<string> {
    const seen = new Set([id]);
    const frontier = [id];
    while (frontier.length) {
      const current = frontier.pop()!;
      for (const ev of this.eco.get(current)?.evolutions ?? []) if (!seen.has(ev.to)) { seen.add(ev.to); frontier.push(ev.to); }
    }
    return seen;
  }
}

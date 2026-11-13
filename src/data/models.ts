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

/** The three battle stats: HP (health), AP (attack power), SP (speed: priority and dodging). DP is a separate 0–50 pool. */
export interface Stats { hp: number; ap: number; sp: number }
export const ZERO_STATS: Stats = { hp: 0, ap: 0, sp: 0 };
export const addStats = (a: Stats, b: Stats): Stats => ({ hp: a.hp + b.hp, ap: a.ap + b.ap, sp: a.sp + b.sp });
export const scaleStats = (a: Stats, k: number): Stats => ({ hp: Math.round(a.hp * k), ap: round1(a.ap * k), sp: round1(a.sp * k) });
export const round1 = (v: number) => Math.round(v * 10) / 10;

/** D-Ark tiers: Stage 1 (base) … Stage 4 (Supremo / Fusión). Despertar sits above Stage 4. */
export const STAGE_TIER: Record<Stage, number> = { brote: 1, novato: 1, avanzado: 2, elite: 3, supremo: 4, despertar: 5, fusion: 4 };
export const TIER_NAME = ["", "Fase 1", "Fase 2", "Fase 3", "Fase 4", "Despertar"];

export interface Attack { name: string; power: number; dpCost: number; accuracy: number }

export interface EvolutionCondition {
  minLevel?: number; minBond?: number; maxBond?: number; minSteps?: number; item?: string; defeatedBoss?: string;
  timeOfDay?: TimeOfDay; minWins?: number; minLosses?: number; minTraining?: number; card?: string; inBattleOnly?: boolean;
}
export interface Evolution { to: string; conditions: EvolutionCondition }

export interface EcoSpecies {
  id: string; name: string; stage: Stage; affinity: Affinity; archetype: Archetype;
  line?: string; starter?: boolean; recruitable: boolean;
  /** Legacy per-species numbers, kept in the JSON for reference; battle stats come from the archetype. */
  stats?: unknown;
  basic: Attack; signature: Attack; description: string; evolutions: Evolution[];
}

export interface Fusion { id: string; parts: string[]; result: string; item?: string; minBond: number }
export interface Encounter { species: string; weight: number; minLevel: number; maxLevel: number }
export interface Region {
  id: string; name: string; order: number; steps: number; description: string; encounters: Encounter[];
  boss: { species: string; level: number }; requiresItem?: string; postGame?: boolean;
  bossReward?: string; bossCard?: string; bossGivesPartnerCrystal?: boolean;
}

export type ItemKind = "recuperacion" | "fruta" | "cristal" | "fusion" | "entrenamiento" | "amuleto" | "radar" | "antivirus" | "sobre" | "clave";
export interface ItemEffect { healPercent?: number; dp?: number; ap?: number; sp?: number; hp?: number; bond?: number; steps?: number }
export interface Item { id: string; name: string; kind: ItemKind; description: string; effect?: ItemEffect; price?: number }

export interface EggType { id: string; name: string; steps: number; description: string; pool: { species: string; weight: number }[]; brillanteChance: number }

export type CardRarity = "comun" | "rara" | "epica";
export type CardEffectType = "buff" | "heal" | "charge" | "shield" | "sureHit" | "obey" | "doubleStrike" | "crit" | "convert" | "evolve" | "revive" | "awaken" | "drain" | "stun";
/** Parche buffs: AP, SP, or "guard" (less damage taken). */
export type StatKind = "ap" | "sp" | "guard";
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

export interface ArchetypeProfile { base: Stats; growth: Stats }

export interface BattleTuning {
  /** Basic: AP × basicAP − defender AP × defenderAP (min basicMin). Strong: AP × strongAP − … (min strongMin). */
  basicAP: number; strongAP: number; defenderAP: number; basicMin: number; strongMin: number;
  /** Dodge % = (defender SP − attacker SP) × dodgePerSP, clamped to dodgeMin…dodgeMax. */
  dodgePerSP: number; dodgeMin: number; dodgeMax: number;
  affinityAdvantage: number; affinityDisadvantage: number; critMultiplier: number;
  /** Strong attacks cost 1 Carga; each side starts with chargeStart and gains chargePerTurn up to chargeMax. */
  chargeStart: number; chargeMax: number; chargePerTurn: number;
  /** Below disobeyBelowBond, disobedience goes from disobeyAtZeroBond % down to disobeyAtLimit %. */
  disobeyBelowBond: number; disobeyAtZeroBond: number; disobeyAtLimit: number; infectedDisobeyBonus: number; disobeyLoafShare: number;
  fleeBase: number; fleePerSP: number; fleeMin: number; fleeMax: number;
  doubleStrikeSecondHit: number; wildTurnLimit: number;
  bossHP: number; bossAP: number; bossSP: number; enrageThreshold: number; enrageAP: number; infectedEnemyAP: number;
  bossWeakenPerDefeat: number; bossWeakenMax: number;
  cardCost: Record<CardRarity, number>;
  bitsPerLevel: number; winBond: number; bossWinBond: number; lossStreakBond: number;
  aiTierZones: number[]; aiRandomness: number[]; aiTemperature: number[];
}

export interface XPRules {
  perWin: number; winsPerLevelStart: number; winsPerLevelEvery: number; winsPerLevelMax: number;
  ratioMin: number; ratioMax: number; tierBonus: number; bossMultiplier: number; brillanteMultiplier: number;
}

export interface EvolutionRules {
  /** By steps above the base form: 0 = base. */
  multiplier: number[]; cost: number[];
  awakenMultiplier: number; awakenCost: number;
  /** Lowest zone whose boss unlocks each tier (keys "2", "3", "4"), fusions and Despertar. */
  unlockZone: Record<string, number>; fusionZone: number; awakenZone: number;
}

export interface GameRules {
  levelCap: number; maxBond: number; stepsPerBond: number;
  maxDP: number; stepsPerDP: number; restHoursPerDP: number;
  archetypes: Record<Archetype, ArchetypeProfile>;
  xp: XPRules;
  evolution: EvolutionRules;
  encounterEveryMinSteps: number; encounterEveryMaxSteps: number;
  events: { battle: number; recruit: number; item: number; egg: number; merchant: number; shrine: number; nothing: number };
  brillanteChance: number; infectadoChance: number;
  defeatPenaltyFraction: number; bossDefeatPenaltyFraction: number; defeatPenaltyMin: number;
  deckSize: number; startingLevel: number; startingDP: number; startingBits: number; startingItems: Record<string, number>; startingCards: string[];
  stepsPerHealPercent: number; maxPendingEvents: number; maxEggs: number; squadCap: number;
  bossBitsPerOrder: number; foundBitsMin: number; foundBitsMax: number; merchantOffers: number;
  shrineBaseCost: number; shrineCostPerOrder: number; shrineEpicChance: number;
  itemDrops: { item: string; weight: number; minRegion: number }[];
  eggDrops: { egg: string; weight: number; minRegion: number }[];
  battle: BattleTuning;
  training: { sessionsPerDay: number; tierScores: number[]; gainByTier: Stats[]; bondGain: number };
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

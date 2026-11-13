import type { ChallengeMetric, Stats } from "../data/models";
import { ZERO_STATS } from "../data/models";

export type Variant = "normal" | "brillante" | "infectado";
export const VARIANT_NAME: Record<Variant, string> = { normal: "", brillante: "Brillante", infectado: "Infectado" };

/**
 * One creature. Everything here is its own: XP, level, stats, DP, bond and unlocked evolutions
 * never pass to another Eco.
 */
export interface EcoInstance {
  id: string;
  /** Its Stage 1 (base) form. It stays in this form outside battle. */
  speciesID: string;
  nickname?: string;
  variant: Variant;
  level: number;
  xp: number;
  /** Current health (max comes from its level and bonuses). */
  hp: number;
  /** Energy for pre-battle evolution and Parches, 0 … rules.maxDP. */
  dp: number;
  bond: number;
  /** Permanent extra HP/AP/SP from training and fruits. */
  bonus: Stats;
  wins: number;
  losses: number;
  /** Losses in a row (bond drops from the second one). */
  lossStreak: number;
  /** Evolutions this Eco has unlocked by beating bosses (species ids), usable before a battle for DP. */
  unlocked: string[];
  trainingSessions: number;
  stepsWalked: number;
  history: string[];
}

export interface EggInstance { id: string; typeID: string; stepsLeft: number }

export interface MapProgress {
  regionID?: string;
  stepsLeft: number;
  clearedRegions: string[];
  stepsToNextEvent: number;
  luckySteps: number;
  radarActive: boolean;
  bossReady: boolean;
  bossDefeats: number;
}

export interface MerchantOffer { id: string; kind: "item" | "parche"; contentID: string; price: number; sold: boolean }

export interface PendingEvent {
  id: string;
  kind: "battle" | "recruit" | "merchant" | "shrine";
  regionID: string;
  date: number;
  species?: string;
  level?: number;
  variant?: Variant;
  offers?: MerchantOffer[];
  parche?: string;
  cost?: number;
}

export type LogKind = "battle" | "recruit" | "item" | "egg" | "hatch" | "merchant" | "shrine" | "bits" | "boss" | "region" | "evolution" | "info";
export interface LogEntry { id: string; date: number; kind: LogKind; text: string }

export interface FieldGuide { seen: string[]; defeated: string[]; owned: string[]; discoveredParches: string[] }

/** Steps counted per day, so Health imports and the motion sensor never double count. */
export interface StepDay {
  /** Health steps already accounted for this day (credited, or skipped while the counter was off). */
  healthCounted: number;
  /** Steps the motion sensor credited this day that Health hasn't caught up with yet. */
  liveUnmatched: number;
  /** Steps credited to the game this day. */
  credited: number;
}

export interface StepState {
  /** The counter's switch: only steps while it's on count. */
  tracking: boolean;
  days: Record<string, StepDay>;
  /** When the last Health import arrived. */
  lastImport?: number;
  /** Turned on without a Health reading: that day's next import only sets the starting point. */
  baselineDay?: string;
}

export interface Settings {
  sound: boolean;
  graphicsEffects: boolean;
  motionSensor: boolean;
  /** The iPhone Shortcut that reads Health and reopens the game. */
  shortcutName: string;
  /** When the player last saved a backup copy. */
  lastBackup?: number;
}

export const DEFAULT_SHORTCUT = "Enlace pasos";

export interface GameSave {
  version: number;
  totalSteps: number;
  steps: StepState;
  partnerID?: string;
  squad: EcoInstance[];
  bits: number;
  inventory: Record<string, number>;
  parches: Record<string, number>;
  deck: string[];
  eggs: EggInstance[];
  map: MapProgress;
  guide: FieldGuide;
  pending: PendingEvent[];
  log: LogEntry[];
  boostedTraining: number;
  stats: Partial<Record<ChallengeMetric, number>>;
  daily: { day: string; chosen: string[]; counters: Partial<Record<ChallengeMetric, number>>; claimed: string[] };
  claimedAchievements: string[];
  trainingDay: { day: string; count: number };
  settings: Settings;
  createdAt: number;
  /** When resting DP was last added (time-based DP recovery). */
  lastRest?: number;
}

/** 2: D-Ark stats (HP/AP/SP + DP pool), temporary evolutions unlocked by bosses. */
export const SAVE_VERSION = 2;

export function newSave(): GameSave {
  return {
    version: SAVE_VERSION,
    totalSteps: 0,
    steps: { tracking: false, days: {} },
    squad: [],
    bits: 0,
    inventory: {},
    parches: {},
    deck: [],
    eggs: [],
    map: { stepsLeft: 0, clearedRegions: [], stepsToNextEvent: 150, luckySteps: 0, radarActive: false, bossReady: false, bossDefeats: 0 },
    guide: { seen: [], defeated: [], owned: [], discoveredParches: [] },
    pending: [],
    log: [],
    boostedTraining: 0,
    stats: {},
    daily: { day: "", chosen: [], counters: {}, claimed: [] },
    claimedAchievements: [],
    trainingDay: { day: "", count: 0 },
    settings: { sound: true, graphicsEffects: true, motionSensor: true, shortcutName: DEFAULT_SHORTCUT },
    createdAt: Date.now(),
  };
}

/** Any older or partial save, completed with defaults so it always loads. */
export function migrate(raw: unknown): GameSave {
  const fresh = newSave();
  if (!raw || typeof raw !== "object") return fresh;
  const s = raw as Partial<GameSave>;
  return {
    ...fresh,
    ...s,
    steps: { ...fresh.steps, ...s.steps, days: { ...s.steps?.days } },
    map: { ...fresh.map, ...s.map },
    guide: { ...fresh.guide, ...s.guide },
    daily: { ...fresh.daily, ...s.daily },
    trainingDay: { ...fresh.trainingDay, ...s.trainingDay },
    settings: { ...fresh.settings, ...s.settings },
    squad: (s.squad ?? []).map((e) => ({ ...e, lossStreak: e.lossStreak ?? 0, unlocked: e.unlocked ?? [], bonus: { ...ZERO_STATS, ...e.bonus } })),
    // Older saves keep their number so the game can convert them (systems/upgrade.ts).
    version: typeof s.version === "number" ? s.version : SAVE_VERSION,
  };
}

export const partnerOf = (save: GameSave) => save.squad.find((e) => e.id === save.partnerID);

/** A unique id that also works without a secure context (plain http on the home network). */
export function newID(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return Array.from({ length: 4 }, () => Math.floor(Math.random() * 2 ** 32).toString(16).padStart(8, "0")).join("-");
}

/** A day in the player's calendar, "yyyy-MM-dd". */
export function dayKey(date = new Date()): string {
  const p = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${p(date.getMonth() + 1)}-${p(date.getDate())}`;
}

export function addLog(save: GameSave, kind: LogKind, text: string, date = Date.now()) {
  save.log.unshift({ id: newID(), date, kind, text });
  if (save.log.length > 80) save.log.length = 80;
}

// MARK: - Storage

const KEY = "enlace.partida";
const BACKUP = "enlace.partida.copia";

/** Loads the save from this browser (the backup copy if the main one can't be read). */
export function loadSave(storage: Storage = localStorage): GameSave {
  for (const key of [KEY, BACKUP]) {
    try {
      const text = storage.getItem(key);
      if (text) return migrate(JSON.parse(text));
    } catch {
      // Unreadable: try the backup.
    }
  }
  return newSave();
}

/** Saves, keeping the previous version as a backup. */
export function storeSave(save: GameSave, storage: Storage = localStorage) {
  try {
    const previous = storage.getItem(KEY);
    if (previous) storage.setItem(BACKUP, previous);
    storage.setItem(KEY, JSON.stringify(save));
  } catch {
    // Storage full or blocked (private browsing): the game keeps running in memory.
  }
}

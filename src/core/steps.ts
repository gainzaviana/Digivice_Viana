import { dayKey, type GameSave, type StepDay } from "./save";

/**
 * Steps reach the game two ways, and never count twice:
 * - Health imports: an iPhone Shortcut reads today's step total from Health and opens the game at
 *   `#importar?pasos=N&fecha=yyyy-MM-dd[&accion=activar|desactivar]`. Only the growth since the
 *   last import of that day counts, and only while the counter is on.
 * - The motion sensor, while the game is open: credited at once, then subtracted from the next
 *   Health growth of the same day (Health counts those steps too).
 */

export const MAX_DAILY_STEPS = 200_000;
/** Imports older than this many days are ignored (the shortcut sends today's total). */
export const MAX_IMPORT_AGE_DAYS = 7;

export interface HealthImport { steps: number; day: string; action?: "activar" | "desactivar" }

const DAY = /^\d{4}-\d{2}-\d{2}$/;

/** Reads an import link's hash. Undefined if it isn't one or its values aren't valid. */
export function parseImport(hash: string, now = new Date()): HealthImport | undefined {
  const match = /^#importar\?(.*)$/.exec(hash);
  if (!match) return undefined;
  const params = new URLSearchParams(match[1]);
  const raw = (params.get("pasos") ?? "").replace(/[.\s,]/g, "");
  if (!/^\d{1,7}$/.test(raw)) return undefined;
  const steps = Number(raw);
  const day = params.get("fecha") ?? dayKey(now);
  if (steps > MAX_DAILY_STEPS || !DAY.test(day)) return undefined;
  const age = daysBetween(day, dayKey(now));
  if (Number.isNaN(age) || age < 0 || age > MAX_IMPORT_AGE_DAYS) return undefined;
  const a = params.get("accion");
  return { steps, day, action: a === "activar" || a === "desactivar" ? a : undefined };
}

function daysBetween(from: string, to: string): number {
  const ms = Date.parse(`${to}T12:00:00Z`) - Date.parse(`${from}T12:00:00Z`);
  return Math.round(ms / 86_400_000);
}

function stepDay(save: GameSave, day: string): StepDay {
  const d = (save.steps.days[day] ??= { healthCounted: 0, liveUnmatched: 0, credited: 0 });
  return d;
}

/** Forgets days older than a month. */
function prune(save: GameSave, now: Date) {
  for (const day of Object.keys(save.steps.days)) if (daysBetween(day, dayKey(now)) > 31) delete save.steps.days[day];
}

export interface ImportOutcome {
  /** Steps credited to the game now. */
  credited: number;
  /** Health growth seen while the counter was off (recorded, not credited). */
  skipped: number;
  /** Growth already credited by the motion sensor. */
  matched: number;
}

/** Applies a Health total for a day. The toggle action, if any, happens after it. */
export function applyHealthImport(save: GameSave, imp: HealthImport, now = new Date()): ImportOutcome {
  const d = stepDay(save, imp.day);
  const growth = Math.max(0, imp.steps - d.healthCounted);
  d.healthCounted = Math.max(d.healthCounted, imp.steps);
  save.steps.lastImport = now.getTime();
  let outcome: ImportOutcome = { credited: 0, skipped: 0, matched: 0 };
  if (save.steps.baselineDay === imp.day && save.steps.tracking) {
    // First reading after switching on without one: it only marks where counting starts.
    save.steps.baselineDay = undefined;
    d.liveUnmatched = Math.max(0, d.liveUnmatched - growth);
    outcome = { credited: 0, skipped: growth, matched: 0 };
  } else if (growth > 0) {
    if (save.steps.tracking) {
      const matched = Math.min(growth, d.liveUnmatched);
      d.liveUnmatched -= matched;
      d.credited += growth - matched;
      outcome = { credited: growth - matched, skipped: 0, matched };
    } else {
      d.liveUnmatched = 0;
      outcome = { credited: 0, skipped: growth, matched: 0 };
    }
  }
  if (imp.action) {
    save.steps.tracking = imp.action === "activar";
    save.steps.baselineDay = undefined;
  }
  prune(save, now);
  return outcome;
}

/** Steps from the motion sensor while the game is open. Returns the steps credited. */
export function creditLiveSteps(save: GameSave, steps: number, now = new Date()): number {
  if (!save.steps.tracking || steps <= 0) return 0;
  const d = stepDay(save, dayKey(now));
  d.liveUnmatched += steps;
  d.credited += steps;
  return steps;
}

/** Switches the counter without a Health reading (when the Shortcut isn't available). */
export function setTrackingWithoutImport(save: GameSave, on: boolean, now = new Date()) {
  save.steps.tracking = on;
  save.steps.baselineDay = on ? dayKey(now) : undefined;
}

export const stepsToday = (save: GameSave, now = new Date()) => save.steps.days[dayKey(now)]?.credited ?? 0;

/** Most steps the activity simulator adds at once. */
export const MAX_SIMULATED = 5_000;

/**
 * Reads today's Health total from pasted text: what the Shortcut copies ("enlace pasos=8421
 * fecha=2026-11-13", or a Health sample as text such as "6.240 pasos" / "6240 count"), an
 * import link, or just a number ("8.421").
 */
export function parseHealthText(text: string, now = new Date()): HealthImport | undefined {
  const t = text.trim();
  const link = t.indexOf("#importar?");
  if (link >= 0) return parseImport(t.slice(link), now);
  const tagged = /pasos\s*[=:]\s*([\d.,\s]+)/i.exec(t)?.[1];
  const day = /fecha\s*[=:]\s*(\d{4}-\d{2}-\d{2})/i.exec(t)?.[1];
  const steps = tagged !== undefined ? toInteger(tagged) : loneNumber(t);
  if (steps === undefined) return undefined;
  return parseImport(`#importar?pasos=${steps}${day ? `&fecha=${day}` : ""}`, now);
}

/** "6.240" / "6,240" (thousands) → 6240; "6240,6" / "6240.6" (decimals) → 6241. */
function toInteger(raw: string): number | undefined {
  const v = raw.replace(/\s/g, "");
  if (/^\d{1,3}([.,]\d{3})+$/.test(v)) return Number(v.replace(/[.,]/g, ""));
  if (/^\d+([.,]\d{1,2})?$/.test(v)) return Math.round(Number(v.replace(",", ".")));
  if (/^\d{1,3}([.,]\d{3})+[.,]\d{1,2}$/.test(v)) return Math.round(Number(v.slice(0, -3).replace(/[.,]/g, "") + "." + v.slice(-2).replace(/\D/g, "")));
  return undefined;
}

/** The only number in a text, ignoring dates and times (a Health sample copied as text). */
function loneNumber(text: string): number | undefined {
  const cleaned = text
    .replace(/\d{4}-\d{2}-\d{2}(T[\d:.+-Z]+)?/g, " ")
    .replace(/\d{1,2}[/.-]\d{1,2}[/.-]\d{2,4}/g, " ")
    .replace(/\d{1,2}:\d{2}(:\d{2})?/g, " ");
  const numbers = cleaned.match(/\d[\d.,\s]*\d|\d/g)?.map((n) => n.trim()) ?? [];
  if (numbers.length !== 1) return undefined;
  return toInteger(numbers[0]);
}

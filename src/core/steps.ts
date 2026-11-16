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

/**
 * A step count however Shortcuts or a locale wrote it: "6240", "6.240" / "6,240" / "6 240"
 * (thousands) → 6240; "6240.0" / "6240,6" / "6.240,5" / "6,240.0" (decimals) → 6240 / 6241 / 6241 / 6240.
 * A single separator followed by exactly 3 digits after 1–3 digits is read as thousands (steps are
 * whole numbers, so "3.250" is never three and a quarter).
 */
export function toInteger(raw: string): number | undefined {
  const v = raw.replace(/[\s'’]/g, "");
  if (/^\d+$/.test(v)) return Number(v);
  if (/^\d{1,3}([.,]\d{3})+$/.test(v)) return Number(v.replace(/[.,]/g, ""));
  const m = /^(\d+|\d{1,3}(?:[.,]\d{3})+)[.,](\d+)$/.exec(v);
  if (m) return Math.round(Number(`${m[1].replace(/[.,]/g, "")}.${m[2]}`));
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

/**
 * The link that runs the player's Health Shortcut and comes back to the game with the result.
 * iOS's x-callback opens `x-success` with `&result=<the shortcut's output>` appended, in Safari.
 */
export function shortcutSyncURL(shortcutName: string, gameURL: string, action?: "activar" | "desactivar"): string {
  const back = (state: string) => `${gameURL}${gameURL.includes("?") ? "&" : "?"}${action ? `accion=${action}&` : ""}sync=${state}`;
  return `shortcuts://x-callback-url/run-shortcut?name=${encodeURIComponent(shortcutName)}`
    + `&x-success=${encodeURIComponent(back("ok"))}&x-cancel=${encodeURIComponent(back("cancel"))}&x-error=${encodeURIComponent(back("error"))}`;
}

/** Runs the Shortcut with no return (kept for reference; the game uses shortcutSyncURL). */
export function shortcutRunURL(shortcutName: string): string {
  return `shortcuts://run-shortcut?name=${encodeURIComponent(shortcutName)}`;
}

export type SyncReturn = { ok: true; imp: HealthImport } | { ok: false; reason: "cancel" | "error" | "empty" };

/** Reads the Shortcut's return (`?sync=ok&result=…`). Undefined if the page wasn't opened by it. */
export function parseSyncReturn(search: string, now = new Date(), hash = ""): SyncReturn | undefined {
  const params = new URLSearchParams(search);
  // The same parameters may come after "#" (`#syncSteps=3250`): add them.
  if (/^#(syncSteps|sync)=/.test(hash)) for (const [k, v] of new URLSearchParams(hash.slice(1))) if (!params.has(k)) params.set(k, v);
  const state = params.get("sync");
  // A direct link: `?syncSteps=8421` (optionally `&date=2026-11-16`), today's total in Health.
  const direct = params.get("syncSteps");
  if (!state && direct !== null) {
    const date = params.get("date");
    const value = /\d[\d.,\s'’]*/.exec(direct)?.[0].trim();
    const imp = value === undefined ? undefined : parseImport(`#importar?pasos=${toInteger(value) ?? "x"}${date ? `&fecha=${date}` : ""}`, now);
    return imp ? { ok: true, imp } : { ok: false, reason: "empty" };
  }
  // A bare `?result=` (x-success without our `sync=ok` marker) is a return too.
  if (!state && params.has("result")) {
    const imp = parseHealthText(params.get("result") ?? "", now);
    return imp ? { ok: true, imp } : { ok: false, reason: "empty" };
  }
  if (!state) return undefined;
  if (state === "cancel") return { ok: false, reason: "cancel" };
  if (state !== "ok") return { ok: false, reason: "error" };
  const imp = parseHealthText(params.get("result") ?? "", now);
  const a = params.get("accion");
  if (imp && (a === "activar" || a === "desactivar")) imp.action = a;
  return imp ? { ok: true, imp } : { ok: false, reason: "empty" };
}

/** The page address without the sync parameters (to tidy the address bar after reading them). */
export function withoutSyncParams(href: string): string {
  const url = new URL(href);
  for (const k of ["sync", "result", "errorMessage", "accion", "syncSteps", "date"]) url.searchParams.delete(k);
  url.hash = "";
  return url.pathname + (url.search ? url.search : "");
}

/** True when the game runs as a separate home-screen web app (not inside Safari). */
export function isStandaloneApp(): boolean {
  if (typeof window === "undefined") return false;
  return (navigator as Navigator & { standalone?: boolean }).standalone === true || matchMedia("(display-mode: standalone)").matches;
}

/**
 * A counter switch waiting for the Shortcut's reading («Leer Salud y cambiar»). Kept in
 * localStorage for 15 minutes, because iOS may open the Shortcut's link in another Safari tab.
 */
const PENDING_KEY = "enlace.pendingAction";
const PENDING_MS = 15 * 60_000;
export function setPendingAction(action?: "activar" | "desactivar", storage: Storage = localStorage, now = Date.now()) {
  try {
    if (action) storage.setItem(PENDING_KEY, JSON.stringify({ action, at: now }));
    else storage.removeItem(PENDING_KEY);
  } catch { /* storage blocked */ }
}
export function takePendingAction(storage: Storage = localStorage, now = Date.now()): "activar" | "desactivar" | undefined {
  try {
    const p = JSON.parse(storage.getItem(PENDING_KEY) ?? "null") as { action: "activar" | "desactivar"; at: number } | null;
    storage.removeItem(PENDING_KEY);
    return p && now - p.at < PENDING_MS ? p.action : undefined;
  } catch { return undefined; }
}

/**
 * What this window last heard from the Shortcut, for the sync status line. Kept in localStorage
 * (per window type: Safari and a full-screen web app each have their own).
 */
export interface SyncLog {
  /** When «Cargar pasos de Salud» last opened the Shortcut from here. */
  launched?: number;
  /** The last address with sync parameters that reached this window, and what came of it. */
  signal?: { at: number; raw: string; outcome: string };
}
const LOG_KEY = "enlace.syncLog";
export function readSyncLog(storage: Storage = localStorage): SyncLog {
  try { return JSON.parse(storage.getItem(LOG_KEY) ?? "{}") as SyncLog; } catch { return {}; }
}
export function writeSyncLog(change: Partial<SyncLog>, storage: Storage = localStorage) {
  try { storage.setItem(LOG_KEY, JSON.stringify({ ...readSyncLog(storage), ...change })); } catch { /* storage blocked */ }
}

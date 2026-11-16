import { useEffect, useState } from "preact/hooks";
import type { GameData } from "./data/models";
import { loadGameData } from "./data/load";
import { validate } from "./data/validate";
import { Rng } from "./core/random";
import { dayKey, loadSave, newSave, storeSave, type GameSave, type PendingEvent } from "./core/save";
import { applyHealthImport, creditLiveSteps, MAX_SIMULATED, parseImport, parseSyncReturn, setTrackingWithoutImport, withoutSyncParams, type HealthImport } from "./core/steps";
import { rest, walk } from "./systems/walk";
import { upgradeSave } from "./systems/upgrade";
import { refreshDaily } from "./systems/challenges";
import { newGame } from "./systems/actions";
import type { ActionResult } from "./systems/result";
import { Battle } from "./systems/battle/battle";
import { finishBattle } from "./systems/battle/results";
import { sound } from "./audio/sound";

/**
 * The running game: owns the content and the save, applies every credited step, runs the
 * player's actions and tells the interface when anything changed.
 */
export class Game {
  readonly data: GameData;
  save: GameSave;
  battle?: Battle;
  message?: string;
  private rng = new Rng();
  private listeners = new Set<() => void>();
  /** Told about every batch of credited steps (the home scene speeds up its walk). */
  readonly stepListeners = new Set<(steps: number) => void>();
  private messageTimer?: ReturnType<typeof setTimeout>;

  constructor() {
    this.data = loadGameData();
    if (import.meta.env.DEV) {
      const issues = validate(this.data);
      if (issues.length) console.error(`Datos del juego con ${issues.length} problema(s):\n${issues.join("\n")}`);
    }
    this.save = loadSave();
    if (upgradeSave(this.save, this.data)) storeSave(this.save);
    sound.enabled = this.save.settings.sound;
    refreshDaily(this.save, this.data);
    this.rest();
  }

  get started() { return !!this.save.partnerID; }

  subscribe(fn: () => void) { this.listeners.add(fn); return () => { this.listeners.delete(fn); }; }
  changed() { for (const fn of this.listeners) fn(); }

  persist() { storeSave(this.save); this.changed(); }

  show(text: string) {
    this.message = text;
    clearTimeout(this.messageTimer);
    this.messageTimer = setTimeout(() => { this.message = undefined; this.changed(); }, 3800);
    this.changed();
  }

  /** Reads something that may need the game's random source (e.g. today's shrine offering). */
  peek<T>(read: (save: GameSave, data: GameData, rng: Rng) => T): T {
    return read(this.save, this.data, this.rng);
  }

  /** Runs an action on the save, saves it and shows its message. */
  perform(action: (save: GameSave, data: GameData, rng: Rng) => ActionResult): ActionResult {
    const result = action(this.save, this.data, this.rng);
    if (result.ok) storeSave(this.save);
    if (result.message) this.show(result.message);
    else this.changed();
    return result;
  }

  /** Resting DP (every time the game opens or comes back to the screen). */
  rest() {
    if (rest(this.save, this.data) > 0) storeSave(this.save);
  }

  // MARK: Steps

  /** Reads `#importar?…` from the address (the Shortcut's link), applies it and clears it. */
  handleLocation(): void {
    // The Health Shortcut's return (?sync=ok&result=…), or an older #importar link.
    const back = parseSyncReturn(location.search);
    const imp = back?.ok ? back.imp : parseImport(location.hash);
    if (back || location.hash) history.replaceState(null, "", withoutSyncParams(location.href));
    if (back && !back.ok) {
      this.show(back.reason === "cancel" ? "Sincronización cancelada."
        : back.reason === "empty" ? "El atajo no devolvió pasos. Revisa que su último bloque sea «Detener y generar salida» con las muestras de salud."
        : "El atajo falló. Comprueba que se llama igual que en Ajustes y que tiene permiso para leer los pasos.");
      return;
    }
    if (imp) this.importHealth(imp);
  }

  importHealth(imp: HealthImport) {
    const out = applyHealthImport(this.save, imp);
    const parts: string[] = [];
    if (out.credited > 0) parts.push(`+${out.credited.toLocaleString("es")} pasos desde Salud.`);
    else if (out.skipped > 0) parts.push(`Salud: ${out.skipped.toLocaleString("es")} pasos con el contador apagado (no cuentan).`);
    else if (out.matched === 0) parts.push("Salud: sin pasos nuevos.");
    if (imp.action) parts.push(imp.action === "activar" ? "Contador activado." : "Contador desactivado.");
    storeSave(this.save);
    if (out.credited > 0) this.applySteps(out.credited, parts.join(" "));
    else this.show(parts.join(" ") || "Pasos sincronizados.");
  }

  liveSteps(n: number, note?: string) {
    const credited = creditLiveSteps(this.save, n);
    if (credited > 0) this.applySteps(credited, note);
  }

  /**
   * The counter's switch. With today's Health total, that reading marks exactly where counting
   * starts or stops; without it, the next reading of the day does.
   */
  switchCounter(on: boolean, healthToday?: number) {
    if (healthToday !== undefined) this.importHealth({ steps: healthToday, day: dayKey(), action: on ? "activar" : "desactivar" });
    else { this.setTracking(on); this.show(on ? "Contador activado." : "Contador desactivado."); }
  }

  /**
   * Activity simulator: steps credited now, like the motion sensor's. A later Health reading of the
   * same day subtracts them, so walking that is also in Health never counts twice.
   */
  simulate(n: number) {
    const steps = Math.max(0, Math.min(MAX_SIMULATED, Math.floor(n)));
    if (!this.save.steps.tracking) { this.show("Activa el contador para que cuenten los pasos."); return; }
    this.liveSteps(steps, `+${steps.toLocaleString("es")} pasos de actividad.`);
  }

  setTracking(on: boolean) {
    setTrackingWithoutImport(this.save, on);
    this.persist();
  }

  private applySteps(n: number, note?: string) {
    this.save.totalSteps += n;
    for (const fn of this.stepListeners) fn(n);
    refreshDaily(this.save, this.data);
    const events = walk(n, this.save, this.data, this.rng);
    storeSave(this.save);
    const latest = events[events.length - 1];
    if (events.some((e) => e.kind === "hatch")) sound.play("hatch");
    else if (events.some((e) => ["battle", "recruit", "boss", "merchant", "shrine", "egg", "item"].includes(e.kind))) sound.play("event");
    if (latest || note) this.show([note, latest?.text].filter(Boolean).join(" "));
    else this.changed();
  }

  // MARK: Game lifecycle

  startNewGame(starterID: string) {
    const fresh = newGame(starterID, this.save, this.data);
    if (!fresh) return;
    fresh.settings = this.save.settings;
    fresh.steps = this.save.steps;
    fresh.totalSteps = this.save.totalSteps;
    refreshDaily(fresh, this.data);
    this.save = fresh;
    this.persist();
  }

  /** Erases the adventure; keeps the step history (so nothing counts twice) and the settings. */
  resetGame() {
    const fresh = newSave();
    fresh.steps = this.save.steps;
    fresh.settings = this.save.settings;
    this.save = fresh;
    this.persist();
  }

  // MARK: Battles

  startBattle(event?: PendingEvent) {
    const b = Battle.start(event, this.save, this.data, this.rng.next());
    if (!b) {
      const injured = this.save.squad.find((e) => e.id === this.save.partnerID)?.injured;
      this.show(injured
        ? "Tu compañero está herido: cúralo en Cuidados (Pulso de datos), con un objeto de vida, en la ciudad o caminando un poco."
        : event ? "Tu compañero necesita recuperarse: camina un poco o usa un Disco Vida." : "Tu compañero necesita recuperarse antes de enfrentarse al jefe.");
      return;
    }
    this.battle = b;
    this.changed();
  }

  endBattle() {
    if (!this.battle) return;
    const b = this.battle;
    this.battle = undefined;
    this.perform((save, data) => finishBattle(save, b, data));
  }

  // MARK: Backup

  exportSave(): string { return JSON.stringify(this.save); }
}

export const game = new Game();

/** Re-renders the component whenever the game changes. */
export function useGame(): Game {
  const [, tick] = useState(0);
  useEffect(() => game.subscribe(() => tick((n) => n + 1)), []);
  return game;
}

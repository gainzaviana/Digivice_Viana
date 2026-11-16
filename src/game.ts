import { useEffect, useState } from "preact/hooks";
import type { GameData } from "./data/models";
import { loadGameData } from "./data/load";
import { validate } from "./data/validate";
import { Rng } from "./core/random";
import { loadSave, newSave, storeSave, type GameSave, type PendingEvent } from "./core/save";
import { applyHealthImport, creditLiveSteps, parseImport, parseSyncReturn, takePendingAction, writeSyncLog, setTrackingWithoutImport, withoutSyncParams, type HealthImport } from "./core/steps";
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
const safeDecode = (t: string) => { try { return decodeURIComponent(t); } catch { return t; } };

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

  /** Reads the Shortcut's return, a `?syncSteps=` link or an old `#importar?…` link, applies it and clears it. */
  handleLocation(): void {
    // The x-callback return (?sync=ok&result=… or a bare ?result=…), `?syncSteps=` /
    // `#syncSteps=` from the Shortcut's «Abrir URLs», or an older #importar link.
    const raw = location.search + location.hash;
    const back = parseSyncReturn(location.search, new Date(), location.hash);
    const imp = back?.ok ? back.imp : parseImport(location.hash);
    if (!back && !imp) return;
    history.replaceState(null, "", withoutSyncParams(location.href));
    if (back && !back.ok) {
      const text = back.reason === "cancel" ? "Sincronización cancelada."
        : back.reason === "empty" ? `Llegó «${safeDecode(raw)}» pero sin un número de pasos. El atajo debe terminar en «Detener y generar salida» con Estadísticas (o, en «Abrir URLs», la variable Estadísticas detrás de ?syncSteps=).`
        : "El atajo falló. Comprueba que se llama igual que en Ajustes y que tiene permiso para leer los pasos.";
      writeSyncLog({ signal: { at: Date.now(), raw, outcome: text } });
      this.show(text);
      return;
    }
    if (imp) {
      if (!imp.action) imp.action = takePendingAction();
      const text = this.importHealth(imp);
      writeSyncLog({ signal: { at: Date.now(), raw, outcome: `${imp.steps.toLocaleString("es")} pasos en Salud · ${text}` } });
      this.changed();
    }
  }

  /**
   * Another tab of the game (iOS may open the Shortcut's link in a new Safari tab) saved newer
   * progress: take it, so this tab never writes its older copy over it.
   */
  reloadFromStorage() {
    if (this.battle) { this.reloadAfterBattle = true; return; }
    const fresh = loadSave();
    if (JSON.stringify(fresh) === JSON.stringify(this.save)) return;
    upgradeSave(fresh, this.data);
    this.save = fresh;
    sound.enabled = fresh.settings.sound;
    this.changed();
  }
  private reloadAfterBattle = false;

  importHealth(imp: HealthImport) {
    const out = applyHealthImport(this.save, imp);
    const parts: string[] = [];
    if (out.credited > 0) parts.push(`+${out.credited.toLocaleString("es")} pasos desde Salud.`);
    else if (out.skipped > 0) parts.push(`Salud: ${out.skipped.toLocaleString("es")} pasos con el contador apagado (no cuentan).`);
    else if (out.matched === 0) parts.push("Salud: sin pasos nuevos.");
    if (imp.action) parts.push(imp.action === "activar" ? "Contador activado." : "Contador desactivado.");
    storeSave(this.save);
    const text = parts.join(" ") || "Pasos sincronizados.";
    if (out.credited > 0) this.applySteps(out.credited, text);
    else this.show(text);
    return text;
  }

  liveSteps(n: number, note?: string) {
    const credited = creditLiveSteps(this.save, n);
    if (credited > 0) this.applySteps(credited, note);
  }

  /**
   * The counter's switch without a Health reading (the next reading of the day marks where
   * counting started or stopped). With Health, the Shortcut's return carries the action.
   */
  switchCounter(on: boolean) {
    this.setTracking(on);
    this.show(on ? "Contador activado." : "Contador desactivado.");
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
    if (this.reloadAfterBattle) { this.reloadAfterBattle = false; this.reloadFromStorage(); }
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

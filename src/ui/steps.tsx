import { useEffect, useState } from "preact/hooks";
import { createPortal } from "preact/compat";
import { game, useGame } from "../game";
import { isStandaloneApp, setPendingAction, shortcutRunURL, stepsToday } from "../core/steps";
import { sound } from "../audio/sound";
import { requestMotionPermission, startMotion, type MotionPermission } from "../core/motion";
import { P } from "./theme";
import { Panel, PixelButton, fmt } from "./common";

let motionPermission: MotionPermission = "unknown";
/** Steps the sensor counted since the game opened. */
let sensorSession = 0;
const permissionListeners = new Set<() => void>();
const notify = () => { for (const fn of permissionListeners) fn(); };
/** Must run inside a click/touchend handler, or iOS won't show its prompt. */
function askMotion() {
  if (motionPermission === "granted" || motionPermission === "unsupported") return;
  void requestMotionPermission().then((p) => { motionPermission = p; notify(); });
}

/**
 * Runs the motion sensor while the counter is on, the sensor is enabled and the page is visible.
 * iOS needs a tap before it allows the sensor, so the first tap anywhere asks (silently if
 * the player already allowed it).
 */
export function useMotionSensor() {
  const g = useGame();
  const [, tick] = useState(0);
  const wanted = g.save.steps.tracking && g.save.settings.motionSensor;
  useEffect(() => {
    const fn = () => tick((n) => n + 1);
    permissionListeners.add(fn);
    return () => { permissionListeners.delete(fn); };
  }, []);
  useEffect(() => {
    if (!wanted || motionPermission !== "unknown") return;
    // "click" and "touchend" count as a tap for iOS; "pointerdown" doesn't.
    const once = () => askMotion();
    window.addEventListener("click", once, true);
    window.addEventListener("touchend", once, true);
    return () => { window.removeEventListener("click", once, true); window.removeEventListener("touchend", once, true); };
  }, [wanted]);
  useEffect(() => {
    if (!wanted || motionPermission !== "granted") return;
    let stop: (() => void) | undefined;
    const update = () => {
      if (document.visibilityState === "visible") stop ??= startMotion((n) => { sensorSession += n; game.liveSteps(n); notify(); });
      else { stop?.(); stop = undefined; }
    };
    update();
    document.addEventListener("visibilitychange", update);
    return () => { document.removeEventListener("visibilitychange", update); stop?.(); };
  }, [wanted, motionPermission]);
}

type Dialog = { kind: "switch"; on: boolean } | { kind: "walk" };

/**
 * The counter's switch, today's steps and the two real sources of steps: Apple Health (through
 * the Shortcut) and the motion sensor while the game is open. There's no way to type steps.
 */
export function StepsPanel() {
  const g = useGame();
  const s = g.save;
  const tracking = s.steps.tracking;
  const [dialog, setDialog] = useState<Dialog>();
  const [, tick] = useState(0);
  useEffect(() => {
    const fn = () => tick((n) => n + 1);
    permissionListeners.add(fn);
    return () => { permissionListeners.delete(fn); };
  }, []);
  const last = s.steps.lastImport ? new Date(s.steps.lastImport) : undefined;
  return (
    <Panel>
      <div class="row">
        <div class="grow">
          <div class="title">Contador de pasos</div>
          <div class="muted small">{tracking ? "Activado: tus pasos cuentan." : "Desactivado: tus pasos no cuentan."}</div>
        </div>
        <button class={`switch${tracking ? " on" : ""}`} role="switch" aria-checked={tracking} aria-label="Contador de pasos"
          onClick={() => setDialog({ kind: "switch", on: !tracking })} />
      </div>
      <div class="small teal">Hoy: {fmt(stepsToday(s))} pasos · total: {fmt(s.totalSteps)}</div>
      <div class="muted small">
        {last ? `Última lectura de Salud: ${last.toLocaleString("es", { dateStyle: "short", timeStyle: "short" })}` : "Aún no has sincronizado con Salud."}
      </div>
      <SensorStatus tracking={tracking} enabled={s.settings.motionSensor} />
      {isStandaloneApp() && <StandaloneNote />}
      <PixelButton title="Cargar pasos de Salud" colour={P.teal2} onClick={() => loadFromHealth(s.settings.shortcutName)} />
      {s.settings.motionSensor && <PixelButton small title="Modo paseo" colour={P.green2} disabled={!tracking} onClick={() => { askMotion(); setDialog({ kind: "walk" }); }} />}
      {dialog?.kind === "switch" && (
        <SwitchDialog on={dialog.on} onClose={() => setDialog(undefined)}
          onHealth={() => loadFromHealth(s.settings.shortcutName, dialog.on ? "activar" : "desactivar")}
          onSkip={() => { g.switchCounter(dialog.on); if (dialog.on) askMotion(); }} />
      )}
      {dialog?.kind === "walk" && <WalkMode onClose={() => setDialog(undefined)} />}
    </Panel>
  );
}

/**
 * iOS opens the Shortcut's link in Safari, never in a home-screen web app, and each keeps its own
 * save. So automatic sync needs the game in Safari (an icon with «Abrir como app web» off).
 */
function StandaloneNote() {
  return (
    <div class="small red">
      Estás en la app a pantalla completa: iOS abrirá Safari al volver del atajo y los pasos irían a la partida de Safari, no a esta.
      Para que se carguen solos, juega desde Safari (Terminal › Ajustes › «Jugar desde Safari» te dice cómo).
    </div>
  );
}

function SwitchDialog({ on, onHealth, onSkip, onClose }: { on: boolean; onHealth: () => void; onSkip: () => void; onClose: () => void }) {
  return (
    <div class="modal-backdrop" onClick={onClose}>
      <div class="modal panel" role="dialog" aria-label={on ? "Activar el contador" : "Desactivar el contador"} onClick={(e) => e.stopPropagation()}>
        <h3 class="modal-title">{on ? "Activar el contador" : "Desactivar el contador"}</h3>
        <p class="muted small">
          {on ? "Leyendo Salud ahora, solo contarán los pasos que des a partir de este momento."
            : "Leyendo Salud ahora, se cuentan los pasos que diste hasta este momento."}
        </p>
        <PixelButton title="Leer Salud y cambiar" colour={P.teal2} onClick={() => { onClose(); onHealth(); }} />
        <div class="buttons">
          <PixelButton small title="Cambiar sin Salud" colour={P.mist} onClick={() => { onClose(); onSkip(); }} />
          <PixelButton small title="Cancelar" colour={P.mist} onClick={onClose} />
        </div>
      </div>
    </div>
  );
}

/**
 * Runs the Health Shortcut. Its last action opens the game's address with `?syncSteps=<today's
 * total>`, which Game.handleLocation reads by itself (in Safari: iOS opens links there). `action`
 * also switches the counter at that reading.
 */
export function loadFromHealth(shortcutName: string, action?: "activar" | "desactivar") {
  sound.play("tap");
  setPendingAction(action);
  location.href = shortcutRunURL(shortcutName);
}

function SensorStatus({ tracking, enabled }: { tracking: boolean; enabled: boolean }) {
  if (!tracking) return null;
  if (!enabled) return <div class="muted small">Sensor de movimiento desactivado en Ajustes.</div>;
  switch (motionPermission) {
    case "granted":
      return <div class="small green">Sensor activo mientras el juego está abierto · {fmt(sensorSession)} pasos ahora.</div>;
    case "denied":
      return <div class="small red">iOS no permite el sensor. Actívalo en Ajustes › Apps › Safari › Avanzado › Movimiento y orientación, cierra el juego del todo y vuelve a abrirlo.</div>;
    case "unsupported":
      return <div class="muted small">Este navegador no tiene sensor de movimiento.</div>;
    default:
      return <button class="link-button small" onClick={askMotion}>Activar el sensor de movimiento (toca aquí)</button>;
  }
}

type WakeLockSentinelLike = { release: () => Promise<void> };
type WakeLockNavigator = Navigator & { wakeLock?: { request: (type: "screen") => Promise<WakeLockSentinelLike> } };

/**
 * Walk mode: a dark, almost black screen with a big step counter that keeps the screen on (Wake
 * Lock), so the sensor keeps counting while you walk with the game open. Double tap to leave,
 * so a touch in the pocket doesn't close it.
 */
function WalkMode({ onClose }: { onClose: () => void }) {
  const g = useGame();
  const [, tick] = useState(0);
  const [lock, setLock] = useState<"on" | "off" | "unsupported">("off");
  const start = useState(sensorSession)[0];
  useEffect(() => {
    const fn = () => tick((n) => n + 1);
    permissionListeners.add(fn);
    let sentinel: WakeLockSentinelLike | undefined;
    let alive = true;
    const acquire = async () => {
      const wl = (navigator as WakeLockNavigator).wakeLock;
      if (!wl) { setLock("unsupported"); return; }
      try {
        sentinel = await wl.request("screen");
        if (!alive) { void sentinel.release(); return; }
        setLock("on");
      } catch { setLock("off"); }
    };
    // iOS releases the lock when the app goes to the background: take it again on return.
    const onVisible = () => { if (document.visibilityState === "visible") void acquire(); };
    void acquire();
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      alive = false;
      permissionListeners.delete(fn);
      document.removeEventListener("visibilitychange", onVisible);
      void sentinel?.release().catch(() => undefined);
    };
  }, []);
  // On <body>: the panels' blur and transforms would otherwise trap a fixed overlay inside them.
  return createPortal(
    <div class="walk-mode" role="dialog" aria-label="Modo paseo" onDblClick={onClose}>
      <div class="walk-count">{fmt(sensorSession - start)}</div>
      <div class="walk-label">pasos en este paseo</div>
      <div class="walk-sub">Hoy: {fmt(stepsToday(g.save))} · {motionPermission === "granted" ? "sensor activo" : motionPermission === "denied" ? "sensor bloqueado en Ajustes" : "toca una vez para activar el sensor"}</div>
      <div class="walk-sub">
        {lock === "on" ? "La pantalla se queda encendida." : lock === "unsupported" ? "Pon Ajustes › Pantalla › Bloqueo automático en «Nunca» mientras caminas." : "No se pudo mantener la pantalla encendida."}
      </div>
      <div class="walk-hint">Toca dos veces para salir</div>
    </div>,
    document.body,
  );
}

/** Hours without a Health reading before the game reminds you to sync. */
const REMIND_AFTER_HOURS = 3;

/**
 * A banner at the top while the counter is on and Health hasn't been read for a while: one tap
 * pastes what the Shortcut copied.
 */
export function SyncBanner() {
  const g = useGame();
  const [hidden, setHidden] = useState(false);
  const s = g.save.steps;
  const due = s.tracking && (!s.lastImport || Date.now() - s.lastImport > REMIND_AFTER_HOURS * 3_600_000);
  const [, tick] = useState(0);
  useEffect(() => {
    const fn = () => tick((n) => n + 1);
    permissionListeners.add(fn);
    return () => { permissionListeners.delete(fn); };
  }, []);
  useEffect(() => {
    // Show again each time the game comes back to the screen.
    const onVisible = () => { if (document.visibilityState === "visible") setHidden(false); };
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, []);
  if (!due || hidden) return null;
  return (
    <div class="sync-banner" role="region" aria-label="Sincronizar con Salud">
      <div class="grow small">
        <div class="strong">¿Pasos nuevos en Salud?</div>
        <div class="tiny">Un toque y se cargan solos.</div>
      </div>
      <PixelButton small title="Cargar" colour={P.teal2} onClick={() => { setHidden(true); loadFromHealth(g.save.settings.shortcutName); }} />
      <button class="link-button tiny" aria-label="Ocultar" onClick={() => setHidden(true)}>✕</button>
    </div>
  );
}

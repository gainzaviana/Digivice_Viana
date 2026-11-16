import { useEffect, useState } from "preact/hooks";
import { createPortal } from "preact/compat";
import { game, useGame } from "../game";
import { isStandaloneApp, parseHealthText, shortcutRunURL, shortcutSyncURL, stepsToday } from "../core/steps";
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
  const wait = awaiting();
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
      {wait ? <PasteSteps action={wait.action} /> : <PixelButton title="Cargar pasos de Salud" colour={P.teal2} onClick={() => loadFromHealth(s.settings.shortcutName)} />}
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
 * After the Shortcut copied today's steps: «Pegar pasos» reads the clipboard (iOS shows its own
 * «Pegar» bubble the first time; tap it). If iOS refuses, a paste-only box appears: hold on it
 * and choose «Pegar». It accepts pasting only, never typing.
 */
function PasteSteps({ action }: { action?: "activar" | "desactivar" }) {
  const [box, setBox] = useState(false);
  const [error, setError] = useState<string>();
  const tryRead = async () => {
    const r = await pasteHealth(action);
    if (r === "denied") { setBox(true); setError("iOS no dejó leer el portapapeles. Mantén el dedo en el recuadro y elige «Pegar»."); }
    else if (r === "empty") setError("El portapapeles no tiene pasos. Ejecuta el atajo otra vez (debe terminar en «Copiar al portapapeles»).");
  };
  const onPaste = (e: ClipboardEvent) => {
    e.preventDefault();
    const text = e.clipboardData?.getData("text/plain") || e.clipboardData?.getData("text") || "";
    if (applyPasted(text, action) === "empty") setError("Lo pegado no son pasos de Salud. Ejecuta el atajo otra vez.");
  };
  return (
    <div class="stack">
      <div class="strong small">El atajo ha copiado tus pasos de Salud:</div>
      <PixelButton title="Pegar pasos" colour={P.teal2} onClick={() => void tryRead()} />
      {box && (
        <div class="input paste-box" contentEditable role="textbox" aria-label="Pega aquí los pasos de Salud" inputMode="none"
          onPaste={onPaste} onBeforeInput={(e) => { if ((e as InputEvent).inputType !== "insertFromPaste") e.preventDefault(); }}
          onKeyDown={(e) => { if (!(e.metaKey || e.ctrlKey)) e.preventDefault(); }}>
          Mantén pulsado aquí › Pegar
        </div>
      )}
      {error && <div class="small red">{error}</div>}
      <div class="buttons">
        <PixelButton small title="Volver a ejecutar el atajo" colour={P.mist} onClick={() => loadFromHealth(game.save.settings.shortcutName, action)} />
        <PixelButton small title="Cancelar" colour={P.mist} onClick={() => setAwaiting(undefined)} />
      </div>
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

/** When the home-screen app ran the Shortcut and waits for its copied steps (ms timestamp). */
const AWAIT_KEY = "enlace.awaitingShortcut";
const AWAIT_MINUTES = 15;
type Awaiting = { at: number; action?: "activar" | "desactivar" };
function awaiting(): Awaiting | undefined {
  try {
    const a = JSON.parse(localStorage.getItem(AWAIT_KEY) ?? "null") as Awaiting | null;
    return a && Date.now() - a.at < AWAIT_MINUTES * 60_000 ? a : undefined;
  } catch { return undefined; }
}
function setAwaiting(a?: Awaiting) {
  try { if (a) localStorage.setItem(AWAIT_KEY, JSON.stringify(a)); else localStorage.removeItem(AWAIT_KEY); } catch { /* storage blocked */ }
  notify();
}

/**
 * Runs the Health Shortcut. In Safari, iOS reopens the game with today's steps, which load by
 * themselves (see Game.handleLocation). In the home-screen app, iOS can't return to it, so the
 * Shortcut copies the steps and a «Pegar pasos» button waits here. `action` also switches the
 * counter at that reading.
 */
export function loadFromHealth(shortcutName: string, action?: "activar" | "desactivar") {
  sound.play("tap");
  if (isStandaloneApp()) {
    setAwaiting({ at: Date.now(), action });
    location.href = shortcutRunURL(shortcutName);
    return;
  }
  location.href = shortcutSyncURL(shortcutName, location.origin + location.pathname, action);
}

/** Applies pasted text if it holds a Health step total. */
function applyPasted(text: string, action?: "activar" | "desactivar"): "ok" | "empty" {
  const imp = parseHealthText(text);
  if (!imp) return "empty";
  setAwaiting(undefined);
  if (action) imp.action = action;
  game.importHealth(imp);
  return "ok";
}

/**
 * Must run from a tap. Reads plain text, or failing that any text-like item the Shortcut copied
 * (a Health sample can arrive as rich text). "denied": iOS refused (bubble dismissed or blocked).
 */
export async function pasteHealth(action?: "activar" | "desactivar"): Promise<"ok" | "empty" | "denied"> {
  const clip = navigator.clipboard;
  if (!clip) return "denied";
  let texts: string[] = [];
  try {
    if (clip.read) {
      for (const item of await clip.read()) {
        for (const type of item.types.filter((t) => t.startsWith("text/"))) {
          const raw = await (await item.getType(type)).text();
          texts.push(type === "text/html" ? new DOMParser().parseFromString(raw, "text/html").body.textContent ?? "" : raw);
        }
      }
    } else texts = [await clip.readText()];
  } catch {
    try { texts = [await clip.readText()]; } catch { return "denied"; }
  }
  for (const t of texts) if (applyPasted(t, action) === "ok") return "ok";
  return "empty";
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
  const wait = awaiting();
  if (wait) {
    return (
      <div class="sync-banner" role="region" aria-label="Pegar pasos de Salud">
        <div class="grow small">
          <div class="strong">¿Ya terminó el atajo?</div>
          <div class="tiny">Toca «Pegar» y luego la burbuja «Pegar» de iOS.</div>
        </div>
        <PixelButton small title="Pegar" colour={P.teal2} onClick={() => void pasteHealth(wait.action).then((r) => {
          if (r === "denied") game.show("iOS no dejó leer el portapapeles: toca «Pegar» en la burbuja que aparece, o usa el recuadro de Contador de pasos.");
          else if (r === "empty") game.show("El portapapeles no tiene pasos. Ejecuta el atajo otra vez (debe terminar en «Copiar al portapapeles»).");
        })} />
        <button class="link-button tiny" aria-label="Ocultar" onClick={() => setAwaiting(undefined)}>✕</button>
      </div>
    );
  }
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

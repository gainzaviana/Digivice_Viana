import { useEffect, useState } from "preact/hooks";
import { createPortal } from "preact/compat";
import { game, useGame } from "../game";
import { isStandaloneApp, MAX_SIMULATED, parseHealthText, shortcutRunURL, shortcutSyncURL, stepsToday } from "../core/steps";
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

type Dialog = { kind: "sync" } | { kind: "switch"; on: boolean } | { kind: "simulate" } | { kind: "walk" };

/** The counter's switch, today's steps, Health sync and the activity simulator. */
export function StepsPanel() {
  const g = useGame();
  const s = g.save;
  const tracking = s.steps.tracking;
  const [dialog, setDialog] = useState<Dialog>();
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
      <PixelButton title="Cargar pasos de Salud" colour={P.teal2} onClick={() => loadFromHealth(s.settings.shortcutName)} />
      <div class="buttons">
        <PixelButton small title="+500" colour={P.amber2} disabled={!tracking} onClick={() => g.simulate(500)} />
        <PixelButton small title="+1.000" colour={P.amber2} disabled={!tracking} onClick={() => g.simulate(1000)} />
        <PixelButton small title="Otra cantidad" colour={P.mist} disabled={!tracking} onClick={() => setDialog({ kind: "simulate" })} />
      </div>
      <div class="buttons">
        <PixelButton small title="Escribir total de Salud" colour={P.mist} onClick={() => setDialog({ kind: "sync" })} />
        {s.settings.motionSensor && <PixelButton small title="Modo paseo" colour={P.green2} disabled={!tracking} onClick={() => { askMotion(); setDialog({ kind: "walk" }); }} />}
      </div>
      {dialog?.kind === "sync" && <HealthDialog title="Sincronizar con Salud" ok="Sincronizar" onClose={() => setDialog(undefined)}
        onSteps={(n, day) => g.importHealth({ steps: n, day })} />}
      {dialog?.kind === "switch" && (
        <HealthDialog
          title={dialog.on ? "Activar el contador" : "Desactivar el contador"}
          ok={dialog.on ? "Activar" : "Desactivar"}
          optional
          note={dialog.on ? "Con los pasos que marca Salud ahora, solo contarán los que des a partir de este momento." : "Con los pasos que marca Salud ahora, se cuentan los que diste hasta este momento."}
          onClose={() => setDialog(undefined)}
          onShortcut={() => loadFromHealth(s.settings.shortcutName, dialog.on ? "activar" : "desactivar")}
          onSteps={(n) => { g.switchCounter(dialog.on, n); if (dialog.on) askMotion(); }}
          onSkip={() => { g.switchCounter(dialog.on); if (dialog.on) askMotion(); }}
        />
      )}
      {dialog?.kind === "simulate" && <SimulateDialog onClose={() => setDialog(undefined)} />}
      {dialog?.kind === "walk" && <WalkMode onClose={() => setDialog(undefined)} />}
    </Panel>
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

/** Must run from a tap: iOS then shows its «Pegar» bubble (or pastes silently if allowed). */
export async function pasteHealth(action?: "activar" | "desactivar") {
  try {
    const imp = parseHealthText(await navigator.clipboard.readText());
    if (!imp) { game.show("No hay pasos copiados. Revisa que el atajo tenga «Copiar al portapapeles» (o usa «Escribir total de Salud»)."); return; }
    setAwaiting(undefined);
    if (action) imp.action = action;
    game.importHealth(imp);
  } catch {
    game.show("No se pudo leer el portapapeles. Usa «Escribir total de Salud».");
  }
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

/** Asks for today's step total in Health: typed, or pasted from what the Shortcut copied. */
function HealthDialog({ title, ok, note, optional, onSteps, onSkip, onClose, onShortcut }: {
  title: string; ok: string; note?: string; optional?: boolean;
  onSteps: (steps: number, day: string) => void; onSkip?: () => void; onClose: () => void; onShortcut?: () => void;
}) {
  const [text, setText] = useState("");
  const [error, setError] = useState<string>();
  const submit = (value: string) => {
    const imp = parseHealthText(value);
    if (!imp) { setError("Escribe los pasos de hoy tal como los marca Salud (por ejemplo 8421)."); return; }
    onClose();
    onSteps(imp.steps, imp.day);
  };
  const paste = async () => {
    try {
      const clip = await navigator.clipboard.readText();
      setText(clip);
      submit(clip);
    } catch {
      setError("No se pudo leer el portapapeles. Escribe el número a mano.");
    }
  };
  return (
    <div class="modal-backdrop" onClick={onClose}>
      <form class="modal panel" role="dialog" aria-label={title} onClick={(e) => e.stopPropagation()} onSubmit={(e) => { e.preventDefault(); submit(text); }}>
        <h3 class="modal-title">{title}</h3>
        {note && <p class="muted small">{note}</p>}
        <label class="small">
          Pasos de hoy en Salud ({new Date().toLocaleDateString("es")})
          <input class="input" inputMode="numeric" autoComplete="off" placeholder="8421" value={text}
            onInput={(e) => { setText((e.target as HTMLInputElement).value); setError(undefined); }} />
        </label>
        {error && <div class="small red">{error}</div>}
        {onShortcut
          ? <PixelButton small title="Leerlos de Salud (automático)" colour={P.teal2} onClick={onShortcut} />
          : <PixelButton small title="Pegar del atajo" colour={P.teal2} onClick={() => void paste()} />}
        <div class="buttons">
          {optional && onSkip
            ? <PixelButton title="Sin Salud" colour={P.mist} onClick={() => { onClose(); onSkip(); }} />
            : <PixelButton title="Cancelar" colour={P.mist} onClick={onClose} />}
          <PixelButton title={ok} onClick={() => submit(text)} />
        </div>
        <p class="muted tiny">Solo cuenta lo que haya crecido desde la última lectura de hoy, y nunca dos veces lo ya contado.</p>
      </form>
    </div>
  );
}

function SimulateDialog({ onClose }: { onClose: () => void }) {
  const g = useGame();
  const [text, setText] = useState("");
  const amount = Math.min(MAX_SIMULATED, Number(text.replace(/[.\s,]/g, "")) || 0);
  const add = (n: number) => { onClose(); g.simulate(n); };
  return (
    <div class="modal-backdrop" onClick={onClose}>
      <div class="modal panel" role="dialog" aria-label="Añadir pasos" onClick={(e) => e.stopPropagation()}>
        <h3 class="modal-title">Añadir pasos</h3>
        <p class="muted small">
          Añade pasos ahora, por ejemplo de un paseo con el móvil en la mochila. Si luego sincronizas con Salud el mismo día,
          se descuentan de su total para no contarlos dos veces.
        </p>
        <div class="buttons">
          {[100, 500, 1000, 2500].map((n) => <PixelButton key={n} small title={`+${fmt(n)}`} colour={P.amber2} onClick={() => add(n)} />)}
        </div>
        <form class="buttons" onSubmit={(e) => { e.preventDefault(); if (amount > 0) add(amount); }}>
          <input class="input" inputMode="numeric" autoComplete="off" placeholder={`hasta ${fmt(MAX_SIMULATED)}`} aria-label="Pasos"
            value={text} onInput={(e) => setText((e.target as HTMLInputElement).value)} />
          <PixelButton small title="Añadir" disabled={amount <= 0} onClick={() => add(amount)} />
        </form>
        <PixelButton title="Cancelar" colour={P.mist} onClick={onClose} />
      </div>
    </div>
  );
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
          <div class="tiny">Toca «Pegar» (y «Pegar» otra vez si iOS lo pregunta).</div>
        </div>
        <PixelButton small title="Pegar" colour={P.teal2} onClick={() => void pasteHealth(wait.action)} />
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

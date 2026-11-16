import { useEffect, useState } from "preact/hooks";
import { game, useGame } from "../game";
import { isStandaloneApp, parseHealthText, shortcutSyncURL, stepsToday } from "../core/steps";
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

type Dialog = { kind: "sync" } | { kind: "switch"; on: boolean } | { kind: "simulate" };

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
      {isStandaloneApp() && (
        <div class="small red">
          Estás usando Enlace como app aparte: el atajo no puede volver aquí. Ábrelo en Safari para cargar los pasos solo
          (Terminal › Ajustes › Copia de seguridad te explica cómo pasar la partida).
        </div>
      )}
      <PixelButton title="Cargar pasos de Salud" colour={P.teal2} onClick={() => loadFromHealth(s.settings.shortcutName)} />
      <div class="buttons">
        <PixelButton small title="Escribir pasos" colour={P.mist} onClick={() => setDialog({ kind: "sync" })} />
        <PixelButton small title="Simular actividad" colour={P.mist} disabled={!tracking} onClick={() => setDialog({ kind: "simulate" })} />
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
    </Panel>
  );
}

/** One tap: reads what the Health Shortcut copied and syncs it. */
/**
 * Runs the Health Shortcut; iOS then reopens the game in Safari with today's steps, which load
 * by themselves (see Game.handleLocation). `action` also switches the counter at that reading.
 */
export function loadFromHealth(shortcutName: string, action?: "activar" | "desactivar") {
  sound.play("tap");
  location.href = shortcutSyncURL(shortcutName, location.origin + location.pathname, action);
}

export async function pasteHealth() {
  try {
    const imp = parseHealthText(await navigator.clipboard.readText());
    if (imp) game.importHealth(imp);
    else game.show("No hay pasos copiados. Ejecuta antes tu atajo de Salud (o usa «Escribir pasos»).");
  } catch {
    game.show("No se pudo leer el portapapeles. Usa «Escribir pasos».");
  }
}

function SensorStatus({ tracking, enabled }: { tracking: boolean; enabled: boolean }) {
  if (!tracking) return null;
  if (!enabled) return <div class="muted small">Sensor de movimiento desactivado en Ajustes.</div>;
  switch (motionPermission) {
    case "granted":
      return <div class="small green">Sensor activo mientras el juego está abierto · {fmt(sensorSession)} pasos ahora.</div>;
    case "denied":
      return <div class="small red">iOS no permite el sensor. Actívalo en Ajustes › Apps › Safari › Movimiento y orientación, y vuelve a abrir el juego.</div>;
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
  const add = (n: number) => { onClose(); g.simulate(n); };
  return (
    <div class="modal-backdrop" onClick={onClose}>
      <div class="modal panel" role="dialog" aria-label="Simular actividad" onClick={(e) => e.stopPropagation()}>
        <h3 class="modal-title">Simular actividad</h3>
        <p class="muted small">
          Añade pasos ahora, por ejemplo de un paseo con el móvil en la mochila. Si luego sincronizas con Salud el mismo día,
          se descuentan de su total para no contarlos dos veces.
        </p>
        <div class="buttons">
          {[100, 500, 1000, 2500].map((n) => <PixelButton key={n} small title={`+${fmt(n)}`} colour={P.amber2} onClick={() => add(n)} />)}
        </div>
        <PixelButton title="Cancelar" colour={P.mist} onClick={onClose} />
      </div>
    </div>
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

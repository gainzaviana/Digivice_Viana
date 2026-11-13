import { useEffect, useState } from "preact/hooks";
import { game, useGame } from "../game";
import { parseHealthText, stepsToday } from "../core/steps";
import { requestMotionPermission, startMotion, type MotionPermission } from "../core/motion";
import { PALETTE as P } from "../art/palette";
import { Panel, PixelButton, fmt } from "./common";

let motionPermission: MotionPermission | "unknown" = "unknown";
const permissionListeners = new Set<() => void>();
async function askMotion() {
  motionPermission = await requestMotionPermission();
  for (const fn of permissionListeners) fn();
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
    const once = () => { void askMotion(); };
    window.addEventListener("pointerdown", once, { once: true });
    return () => window.removeEventListener("pointerdown", once);
  }, [wanted]);
  useEffect(() => {
    if (!wanted || motionPermission !== "granted") return;
    let stop: (() => void) | undefined;
    const update = () => {
      if (document.visibilityState === "visible") stop ??= startMotion((n) => game.liveSteps(n));
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
      <div class="buttons">
        <PixelButton small title="Sincronizar pasos" colour={P.teal2} onClick={() => setDialog({ kind: "sync" })} />
        <PixelButton small title="Simular actividad" colour={P.mist} disabled={!tracking} onClick={() => setDialog({ kind: "simulate" })} />
      </div>
      {tracking && s.settings.motionSensor && motionPermission === "denied" && (
        <div class="small red">Sin permiso de movimiento: el sensor no contará. Usa «Sincronizar pasos».</div>
      )}
      {tracking && s.settings.motionSensor && motionPermission === "unknown" && (
        <button class="link-button small" onClick={() => void askMotion()}>Contar también con el sensor mientras juegas</button>
      )}
      {dialog?.kind === "sync" && <HealthDialog title="Sincronizar con Salud" ok="Sincronizar" onClose={() => setDialog(undefined)}
        onSteps={(n, day) => g.importHealth({ steps: n, day })} />}
      {dialog?.kind === "switch" && (
        <HealthDialog
          title={dialog.on ? "Activar el contador" : "Desactivar el contador"}
          ok={dialog.on ? "Activar" : "Desactivar"}
          optional
          note={dialog.on ? "Con los pasos que marca Salud ahora, solo contarán los que des a partir de este momento." : "Con los pasos que marca Salud ahora, se cuentan los que diste hasta este momento."}
          onClose={() => setDialog(undefined)}
          onSteps={(n) => g.switchCounter(dialog.on, n)}
          onSkip={() => g.switchCounter(dialog.on)}
        />
      )}
      {dialog?.kind === "simulate" && <SimulateDialog onClose={() => setDialog(undefined)} />}
    </Panel>
  );
}

/** Asks for today's step total in Health: typed, or pasted from what the Shortcut copied. */
function HealthDialog({ title, ok, note, optional, onSteps, onSkip, onClose }: {
  title: string; ok: string; note?: string; optional?: boolean;
  onSteps: (steps: number, day: string) => void; onSkip?: () => void; onClose: () => void;
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
        <PixelButton small title="Pegar del atajo" colour={P.teal2} onClick={() => void paste()} />
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

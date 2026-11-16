import { isStandaloneApp } from "../core/steps";
import { useState } from "preact/hooks";
import { migrate } from "../core/save";
import { storeSave } from "../core/save";
import { useGame } from "../game";
import { sound } from "../audio/sound";
import { P } from "./theme";
import { Confirm, Panel, PixelButton, SectionTitle, Sheet, fmt } from "./common";

function Toggle({ label, detail, on, onChange }: { label: string; detail: string; on: boolean; onChange: (v: boolean) => void }) {
  return (
    <div class="row">
      <div class="grow">
        <div class="strong">{label}</div>
        <div class="muted small">{detail}</div>
      </div>
      <button class={`switch${on ? " on" : ""}`} role="switch" aria-checked={on} aria-label={label} onClick={() => onChange(!on)} />
    </div>
  );
}

/** Sound, steps, the backup copy, the game's totals, and starting over. */
export function SettingsScreen({ onClose }: { onClose: () => void }) {
  const g = useGame();
  const { save } = g;
  const s = save.settings;
  const [confirmingReset, setConfirmingReset] = useState(false);
  const [restoring, setRestoring] = useState<string>();
  const set = (patch: Partial<typeof s>) => { Object.assign(s, patch); g.persist(); };
  const stats: [string, number][] = [
    ["Pasos con el contador activado", save.totalSteps],
    ["Combates ganados", save.stats.wins ?? 0],
    ["Jefes vencidos", save.stats.bossWins ?? 0],
    ["Zonas superadas", save.map.clearedRegions.length],
    ["Ecos vistos", save.guide.seen.length],
    ["Logros", save.claimedAchievements.length],
  ];

  const download = () => {
    const blob = new Blob([g.exportSave()], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `enlace-partida-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
    set({ lastBackup: Date.now() });
  };

  const pick = (e: Event) => {
    const file = (e.target as HTMLInputElement).files?.[0];
    if (!file) return;
    void file.text().then((text) => setRestoring(text));
  };

  const restore = () => {
    try {
      const parsed = migrate(JSON.parse(restoring ?? ""));
      if (!parsed.partnerID && parsed.squad.length === 0) throw new Error("vacía");
      g.save = parsed;
      storeSave(parsed);
      g.show("Copia restaurada.");
    } catch {
      g.show("Ese archivo no es una copia de Enlace válida.");
    }
    setRestoring(undefined);
  };

  return (
    <Sheet title="Ajustes" onClose={onClose}>
      <Panel>
        <SectionTitle text="Preferencias" />
        <Toggle label="Sonido" detail="Efectos de combate y avisos." on={s.sound} onChange={(v) => { set({ sound: v }); sound.enabled = v; if (v) sound.play("tap"); }} />
        <Toggle label="Efectos gráficos" detail="Luces, brillo y partículas en combate. Desactívalos para ahorrar batería." on={s.graphicsEffects} onChange={(v) => set({ graphicsEffects: v })} />
        <Toggle label="Sensor de movimiento" detail="Cuenta pasos mientras el juego está abierto, además de Salud. Nunca se cuentan dos veces." on={s.motionSensor} onChange={(v) => set({ motionSensor: v })} />
      </Panel>

      <Panel>
        <SectionTitle text="Atajo de Salud" />
        <div class="muted small">
          Ninguna web puede leer Salud por sí misma. «Cargar pasos de Salud» ejecuta este atajo, que lee el total de hoy y vuelve
          a abrir el juego con él (<code>?syncSteps=</code>). Se suma solo lo nuevo, sin copiar ni pegar nada.
        </div>
        <label class="small">
          Nombre del atajo
          <input class="input" value={s.shortcutName} onChange={(e) => set({ shortcutName: (e.target as HTMLInputElement).value.trim() || s.shortcutName })} />
        </label>
        <details class="small">
          <summary class="strong">Cómo crear (o cambiar) el atajo · una vez</summary>
          <ol class="recipe">
            <li>App <b>Atajos</b> › abre <b>{s.shortcutName}</b> (o créalo con «+» con ese nombre exacto) y borra lo que tenga.</li>
            <li><b>Buscar muestras de salud</b>: Tipo <i>Pasos</i> · filtro Fecha de inicio <i>es hoy</i> · Agrupar por <i>Día</i>.</li>
            <li><b>Calcular estadísticas</b>: <i>Suma</i> de <i>Muestras de salud</i>.</li>
            <li><b>Abrir URLs</b>: escribe <code>{location.origin + location.pathname}?syncSteps=</code> y justo detrás inserta la variable <i>Estadísticas</i>.</li>
            <li>Pruébalo con ▶ y permite el acceso a Salud (solo Pasos). Debe abrirse el juego y decir «+N pasos desde Salud».</li>
          </ol>
          <p>Uso: <b>Cargar pasos de Salud</b> (o ejecuta el atajo desde un widget o una automatización). Se suma solo lo que haya crecido el total de hoy desde la última lectura: sincronizar varias veces nunca duplica.</p>

        </details>
      </Panel>

      <Panel>
        <SectionTitle text="Jugar desde Safari" />
        <div class="muted small">
          iOS abre los enlaces de Atajos en Safari, nunca en una app a pantalla completa, y cada una guarda su propia partida.
          {isStandaloneApp() ? " Ahora estás en la app a pantalla completa: los pasos del atajo no llegarán aquí." : " Estás en Safari: los pasos llegan solos."}
        </div>
        <ol class="recipe small">
          <li>Aquí: «Descargar copia» (abajo).</li>
          <li>En Safari abre <code>{location.origin + location.pathname}</code> › Compartir › <b>Añadir a pantalla de inicio</b> con <b>«Abrir como app web» desactivado</b>. Borra el icono antiguo.</li>
          <li>Abre el icono nuevo (se abre en Safari) › Terminal › Ajustes › «Restaurar copia».</li>
        </ol>
      </Panel>

      <Panel>
        <SectionTitle text="Copia de seguridad" />
        <div class="muted small">
          La partida se guarda en este dispositivo al momento, con cada paso. iOS guarda aparte la de Safari y la de la app de la
          pantalla de inicio. Para pasarla de una a otra: aquí «Descargar copia» (a Archivos › En mi iPhone) y en la otra «Restaurar copia».
          Descarga una copia de vez en cuando.
          {s.lastBackup ? ` Última copia: ${new Date(s.lastBackup).toLocaleDateString("es")}.` : " Aún no has hecho ninguna."}
        </div>
        <div class="buttons">
          <PixelButton small title="Descargar copia" colour={P.teal2} onClick={download} />
          <label class="pixel-button small quiet file-button">
            Restaurar copia
            <input type="file" accept="application/json,.json" onChange={pick} hidden />
          </label>
        </div>
      </Panel>

      <Panel>
        <SectionTitle text="Tu aventura" />
        {stats.map(([l, v]) => <div class="row" key={l}><span class="grow small">{l}</span><span class="strong">{fmt(v)}</span></div>)}
      </Panel>

      <Panel>
        <SectionTitle text="Partida" />
        <div class="muted small">Empezar de nuevo borra a tu compañero, tu equipo y todo tu progreso. Los pasos ya contados no se vuelven a contar.</div>
        <PixelButton title="Empezar de nuevo" colour={P.red3} onClick={() => setConfirmingReset(true)} />
      </Panel>
      <p class="center muted tiny">Enlace · todos los Ecos, zonas y arte son originales de este juego.<br />Sin cuentas ni servidores: tu partida se guarda solo en este dispositivo.</p>

      {confirmingReset && (
        <Confirm title="¿Empezar de nuevo?" text="Perderás a tu compañero y todo tu progreso. No se puede deshacer." ok="Borrar y empezar" danger
          onCancel={() => setConfirmingReset(false)} onOk={() => { setConfirmingReset(false); g.resetGame(); onClose(); }} />
      )}
      {restoring !== undefined && (
        <Confirm title="¿Restaurar esta copia?" text="Sustituirá la partida actual por la del archivo." ok="Restaurar" danger
          onCancel={() => setRestoring(undefined)} onOk={restore} />
      )}
    </Sheet>
  );
}

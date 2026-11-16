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
          Safari no puede leer Salud por sí mismo. Con este atajo, el botón «Cargar pasos de Salud» lo ejecuta y el juego
          vuelve a abrirse con tus pasos de hoy ya cargados. Nada que copiar ni escribir.
        </div>
        <label class="small">
          Nombre del atajo
          <input class="input" value={s.shortcutName} onChange={(e) => set({ shortcutName: (e.target as HTMLInputElement).value.trim() || s.shortcutName })} />
        </label>
        <details class="small">
          <summary class="strong">Cómo crear (o cambiar) el atajo · una vez</summary>
          <ol class="recipe">
            <li>Abre la app <b>Atajos</b> (si no la tienes, es gratis en el App Store). Crea uno con «+» o abre el que ya tenías, y llámalo exactamente <b>{s.shortcutName}</b>.</li>
            <li>Primer bloque: <b>Buscar muestras de salud</b> · Tipo <i>Pasos</i> · filtro Fecha de inicio <i>es hoy</i> · Agrupar por <i>Día</i>.</li>
            <li>Si tenías <b>Copiar al portapapeles</b>, bórralo.</li>
            <li>Justo debajo, añade <b>Detener y generar salida</b> (búscalo como «salida»). Se conecta solo con las muestras de salud de arriba.</li>
            <li>Pruébalo con ▶ y permite el acceso a Salud (solo Pasos).</li>
          </ol>
          <p>Uso: pulsa <b>Cargar pasos de Salud</b> en Inicio o Mapa. Se abre Atajos un instante y vuelves a Enlace con los pasos sumados.</p>
        </details>
      </Panel>

      <Panel>
        <SectionTitle text="Copia de seguridad" />
        <div class="muted small">
          La partida se guarda solo en este navegador. Descarga una copia de vez en cuando (por ejemplo a Archivos › En mi iPhone).
          Para pasar la partida de la app aparte a Safari: aquí «Descargar copia», luego abre el juego en Safari y «Restaurar copia».
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

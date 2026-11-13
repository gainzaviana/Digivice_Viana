import { useEffect, useRef, useState } from "preact/hooks";
import { partnerOf } from "../core/save";
import { maxStats } from "../systems/progression";
import { CARE, careTier, playCare, type CareGame } from "../systems/care";
import { useGame } from "../game";
import { sound } from "../audio/sound";
import { P } from "./theme";
import { EcoImg, Panel, PixelButton, SectionTitle, StatBar, fmt } from "./common";

/**
 * Cuidados: two quick D-Ark-style mini-games to recover actively. Each play spends a charge;
 * charges come back every 500 steps or 2 hours (max 3).
 */
export function CareScreen() {
  const g = useGame();
  const { save, data } = g;
  const [playing, setPlaying] = useState<CareGame>();
  const partner = partnerOf(save);
  const c = data.rules.care;
  if (!partner) return null;
  const max = maxStats(partner, data);
  const nextBySteps = c.stepsPerCharge - save.care.steps;
  const finish = (game: CareGame, score: number) => {
    setPlaying(undefined);
    sound.play(score >= 70 ? "levelUp" : "reward");
    g.perform((s, d) => playCare(s, game, score, d));
  };
  if (playing) {
    return (
      <div class="screen">
        <div class="center"><EcoImg id={partner.speciesID} variant={partner.variant} size={110} /></div>
        {playing === "energia" ? <EnergyGame onFinish={(s) => finish("energia", s)} /> : <PulseGame onFinish={(s) => finish("pulso", s)} />}
        <PixelButton small title="Dejarlo" colour={P.mist} onClick={() => setPlaying(undefined)} />
      </div>
    );
  }
  return (
    <div class="screen">
      <h1 class="screen-title">Cuidados</h1>
      <Panel>
        <div class="row">
          <EcoImg id={partner.speciesID} variant={partner.variant} size={72} />
          <div class="grow">
            <div class="title">{partner.nickname ?? data.eco.get(partner.speciesID)?.name}</div>
            {partner.injured
              ? <div class="small red">Herido: no puede luchar. El Pulso de datos lo cura (o caminar {fmt(Math.max(0, partner.injured.stepsLeft))} pasos).</div>
              : <div class="small muted">En forma para luchar.</div>}
          </div>
        </div>
        <StatBar label="Vida" value={partner.hp} max={max.hp} colour={P.green2} text={`${partner.hp}/${max.hp}`} />
        <StatBar label="DP" value={partner.dp} max={data.rules.maxDP} colour={P.amber2} text={`${partner.dp}/${data.rules.maxDP}`} />
        <StatBar label="Vínculo" value={partner.bond} max={data.rules.maxBond} colour={P.pink} />
      </Panel>
      <Panel>
        <SectionTitle text="Cargas de cuidados" />
        <div class="charges" aria-label={`${save.care.charges} de ${c.maxCharges} cargas`}>
          {Array.from({ length: c.maxCharges }, (_, i) => <span key={i} class={i < save.care.charges ? "charge on" : "charge"} />)}
        </div>
        <div class="muted small">
          {save.care.charges >= c.maxCharges ? "Cargas completas." : `Próxima carga en ${fmt(nextBySteps)} pasos o en unas ${c.hoursPerCharge} horas.`}
        </div>
      </Panel>
      {(Object.keys(CARE) as CareGame[]).map((k) => (
        <button class="panel nav-row" key={k} disabled={save.care.charges <= 0} onClick={() => setPlaying(k)}>
          <div class="grow">
            <div class="title">{CARE[k].name}</div>
            <div class="muted small">{CARE[k].summary}</div>
            <div class="tiny amber">
              {k === "energia" ? `DP +${c.energyDP[0]}…+${c.energyDP[3]} · vínculo` : `Vida ${c.pulseHeal[0]}…${c.pulseHeal[3]} % · cura heridas (si aciertas)`}
            </div>
          </div>
          <span class="muted">›</span>
        </button>
      ))}
      <p class="muted tiny center">Puntuación: {c.tierScores.map((s, i) => `${s}+ nivel ${i + 1}`).join(" · ")}. {careTierHelp(g.data)}</p>
    </div>
  );
}

const careTierHelp = (_: unknown) => "Cuanto mejor lo hagas, más recupera.";

/** Energy Charge: tap (or shake) as fast as possible for 5 seconds to fill the core. 30 taps = 100. */
function EnergyGame({ onFinish }: { onFinish: (score: number) => void }) {
  const duration = 5, goal = 30;
  const [taps, setTaps] = useState(0);
  const [started, setStarted] = useState<number>();
  const [now, setNow] = useState(performance.now());
  const done = useRef(false);
  const count = useRef(0);
  const tap = () => {
    if (done.current) return;
    if (started === undefined) setStarted(performance.now());
    count.current += 1;
    setTaps(count.current);
    sound.play("tap");
  };
  useEffect(() => {
    let id = 0;
    const loop = () => { setNow(performance.now()); id = requestAnimationFrame(loop); };
    id = requestAnimationFrame(loop);
    let last = 0;
    const onMotion = (e: DeviceMotionEvent) => {
      const a = e.acceleration;
      if (!a || a.x == null || a.y == null || a.z == null) return;
      if (Math.hypot(a.x, a.y, a.z) > 14 && performance.now() - last > 110) { last = performance.now(); tap(); }
    };
    window.addEventListener("devicemotion", onMotion);
    return () => { cancelAnimationFrame(id); window.removeEventListener("devicemotion", onMotion); };
  }, []);
  const left = started === undefined ? duration : Math.max(0, duration - (now - started) / 1000);
  useEffect(() => {
    if (left === 0 && !done.current) { done.current = true; onFinish(Math.round(Math.min(100, (count.current / goal) * 100))); }
  }, [left]);
  const fill = Math.min(1, taps / goal);
  return (
    <div class="stack center">
      <div class="title">{left.toFixed(1)} s</div>
      <button class="energy-core" style={{ ["--fill" as string]: fill }} onPointerDown={tap} aria-label="Cargar energía">
        <span>{started === undefined ? "¡Toca!" : `${Math.round(fill * 100)} %`}</span>
      </button>
      <div class="muted small">Toca el núcleo (o agita el móvil) lo más rápido que puedas.</div>
    </div>
  );
}

/** Timing Pulse: a pulse sweeps a bar; tap when it crosses the bright zone. 3 rounds. */
function PulseGame({ onFinish }: { onFinish: (score: number) => void }) {
  const rounds = 3;
  const [round, setRound] = useState(0);
  const [total, setTotal] = useState(0);
  const [start, setStart] = useState(performance.now() / 1000);
  const [now, setNow] = useState(performance.now() / 1000);
  const [last, setLast] = useState<string>();
  useEffect(() => {
    let id = 0;
    const loop = () => { setNow(performance.now() / 1000); id = requestAnimationFrame(loop); };
    id = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(id);
  }, []);
  const marker = (at: number) => {
    const phase = ((at - start) * (0.8 + round * 0.25)) % 2;
    return phase < 1 ? phase : 2 - phase;
  };
  const hit = () => {
    if (round >= rounds) return;
    const d = Math.abs(marker(performance.now() / 1000) - 0.5);
    const [points, text] = d <= 0.04 ? [34, "¡Perfecto!"] : d <= 0.09 ? [24, "¡Bien!"] : d <= 0.16 ? [10, "Casi…"] : [0, "¡Fallo!"];
    sound.play(points >= 24 ? "hit" : "tap");
    setLast(text);
    const next = round + 1;
    setTotal(total + points);
    setRound(next);
    setStart(performance.now() / 1000);
    if (next === rounds) setTimeout(() => onFinish(Math.min(100, total + points)), 300);
  };
  const position = marker(now);
  return (
    <div class="stack">
      <div class="center muted small">Ronda {Math.min(round + 1, rounds)} de {rounds}</div>
      <div class="pulse-bar">
        <span class="pulse-zone wide" />
        <span class="pulse-zone" />
        <span class="pulse-dot" style={{ left: `calc(${position * 100}% - 9px)` }} />
      </div>
      <div class="center small">{last ?? "Toca cuando el pulso cruce la zona brillante."}</div>
      <PixelButton title="¡Ahora!" colour={P.green2} onClick={hit} />
    </div>
  );
}

export { careTier };

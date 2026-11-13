import { useEffect, useRef, useState } from "preact/hooks";
import { partnerOf } from "../core/save";
import { TRAINING, train, trainingSessionsLeft, type TrainingKind } from "../systems/training";
import { useGame } from "../game";
import { sound } from "../audio/sound";
import { P } from "./theme";
import { EcoImg, Panel, PixelButton, Sheet } from "./common";

const KINDS = Object.keys(TRAINING) as TrainingKind[];

/** Pick a mini-game. Each one trains a stat; sessions per day are limited. */
export function TrainingMenu({ onClose }: { onClose: () => void }) {
  const g = useGame();
  const [playing, setPlaying] = useState<TrainingKind>();
  const left = trainingSessionsLeft(g.save, g.data);
  if (playing) return <TrainingGame kind={playing} onClose={() => setPlaying(undefined)} />;
  return (
    <Sheet title="Entrenamiento" onClose={onClose}>
      <Panel>
        <div class="small">Te quedan {left} de {g.data.rules.training.sessionsPerDay} sesiones hoy.</div>
        {g.save.boostedTraining > 0 && <div class="small amber">Pesas activas: las próximas {g.save.boostedTraining} sesiones dan el doble.</div>}
      </Panel>
      {KINDS.map((k) => (
        <button class="panel nav-row" key={k} disabled={left === 0} onClick={() => setPlaying(k)}>
          <div class="grow">
            <div class="title">{TRAINING[k].name}</div>
            <div class="muted small">{TRAINING[k].summary}</div>
          </div>
          <span class="muted">›</span>
        </button>
      ))}
    </Sheet>
  );
}

function TrainingGame({ kind, onClose }: { kind: TrainingKind; onClose: () => void }) {
  const g = useGame();
  const [score, setScore] = useState<number>();
  const [result, setResult] = useState<string>();
  const partner = partnerOf(g.save);
  const finish = (value: number) => {
    const clamped = Math.min(100, Math.max(0, Math.round(value)));
    setScore(clamped);
    sound.play(clamped >= 70 ? "levelUp" : "tap");
    setResult(g.perform((s, d) => train(s, kind, clamped, d)).message);
  };
  return (
    <Sheet title={TRAINING[kind].name} onClose={onClose}>
      {partner && <div class="center"><EcoImg id={partner.speciesID} variant={partner.variant} size={96} /></div>}
      {score !== undefined ? (
        <Panel>
          <div class="center title">Puntuación: {score}</div>
          <p class="center small">{result}</p>
        </Panel>
      ) : kind === "golpe" ? <TimingGame onFinish={finish} /> : kind === "reflejos" ? <ReflexGame onFinish={finish} /> : <TapGame onFinish={finish} />}
    </Sheet>
  );
}

/** Animation-frame clock in seconds while mounted. */
function useClock(): number {
  const [now, setNow] = useState(() => performance.now() / 1000);
  useEffect(() => {
    let id = 0;
    const loop = () => { setNow(performance.now() / 1000); id = requestAnimationFrame(loop); };
    id = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(id);
  }, []);
  return now;
}

/** Golpe preciso: a marker sweeps a bar; stop it inside the zone. 5 rounds, faster each time. */
function TimingGame({ onFinish }: { onFinish: (n: number) => void }) {
  const rounds = 5;
  const [round, setRound] = useState(0);
  const [total, setTotal] = useState(0);
  const [start, setStart] = useState(() => performance.now() / 1000);
  const [lastHit, setLastHit] = useState<string>();
  const now = useClock();
  const marker = (at: number) => {
    const phase = ((at - start) * (0.7 + round * 0.18)) % 2;
    return phase < 1 ? phase : 2 - phase;
  };
  const position = marker(now);
  const hit = () => {
    if (round >= rounds) return;
    const d = Math.abs(marker(performance.now() / 1000) - 0.5);
    const [points, text] = d <= 0.03 ? [20, "¡Perfecto!"] : d <= 0.08 ? [13, "¡Bien!"] : d <= 0.15 ? [5, "Casi…"] : [0, "¡Fallo!"];
    sound.play(points >= 13 ? "hit" : "tap");
    setLastHit(text);
    const next = round + 1;
    setTotal(total + points);
    setRound(next);
    setStart(performance.now() / 1000);
    if (next === rounds) onFinish(total + points);
  };
  return (
    <div class="stack">
      <div class="center muted small">Ronda {Math.min(round + 1, rounds)} de {rounds}</div>
      <div class="timing-bar">
        <span style={{ left: "42%", width: "16%", background: P.green1 }} />
        <span style={{ left: "47%", width: "6%", background: P.green2 }} />
        <span class="marker" style={{ left: `calc(${position * 100}% - 2px)` }} />
      </div>
      <div class="center small">{lastHit ?? "Pulsa cuando el indicador esté en la zona verde."}</div>
      <PixelButton title="¡Golpe!" colour={P.red3} onClick={hit} />
    </div>
  );
}

/** Reflejos: a side lights up after a random wait; tap that side. Faster is better. */
function ReflexGame({ onFinish }: { onFinish: (n: number) => void }) {
  const rounds = 8;
  const [round, setRound] = useState(0);
  const [lit, setLit] = useState<"left" | "right">();
  const [message, setMessage] = useState("Espera a que se ilumine un lado…");
  const total = useRef(0);
  const litAt = useRef(0);
  useEffect(() => {
    if (round >= rounds) return;
    setLit(undefined);
    const id = setTimeout(() => {
      setLit(Math.random() < 0.5 ? "left" : "right");
      litAt.current = performance.now();
      sound.play("tap");
    }, 600 + Math.random() * 1200);
    return () => clearTimeout(id);
  }, [round]);
  const tap = (lane: "left" | "right") => {
    if (round >= rounds) return;
    if (!lit) { setMessage("¡Demasiado pronto!"); return; }
    const reaction = (performance.now() - litAt.current) / 1000;
    if (lane === lit) {
      total.current += Math.max(0, Math.min(12.5, (12.5 * (0.9 - reaction)) / 0.6));
      setMessage(`${Math.round(reaction * 1000)} ms`);
      sound.play("hit");
    } else {
      setMessage("¡Lado equivocado!");
      sound.play("miss");
    }
    const next = round + 1;
    setRound(next);
    if (next === rounds) onFinish(total.current);
  };
  return (
    <div class="stack">
      <div class="center muted small">Ronda {Math.min(round + 1, rounds)} de {rounds}</div>
      <div class="reflex">
        {(["left", "right"] as const).map((lane) => (
          <button key={lane} aria-label={lane === "left" ? "Izquierda" : "Derecha"} style={{ background: lit === lane ? P.teal2 : P.ink }} onPointerDown={() => tap(lane)} />
        ))}
      </div>
      <div class="center small">{message}</div>
    </div>
  );
}

/** Ráfaga: tap as fast as possible for 5 seconds; 40 taps is a perfect score. */
function TapGame({ onFinish }: { onFinish: (n: number) => void }) {
  const duration = 5;
  const [taps, setTaps] = useState(0);
  const [started, setStarted] = useState<number>();
  const done = useRef(false);
  const now = useClock();
  const left = started === undefined ? duration : Math.max(0, duration - (now - started));
  useEffect(() => {
    if (left === 0 && !done.current) { done.current = true; onFinish(taps * 2.5); }
  }, [left]);
  return (
    <div class="stack">
      <div class="center title">{left.toFixed(1)} s</div>
      <div class="center">{taps} golpes</div>
      <button
        class="tap-pad"
        onPointerDown={() => {
          if (done.current) return;
          if (started === undefined) setStarted(performance.now() / 1000);
          setTaps((t) => t + 1);
          sound.play("tap");
        }}
      >
        {started === undefined ? "¡Empieza a pulsar!" : "¡Más rápido!"}
      </button>
    </div>
  );
}

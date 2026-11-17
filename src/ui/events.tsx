import type { MerchantOffer, PendingEvent } from "../core/save";
import { partnerOf } from "../core/save";
import { acceptRecruit, buy, declineRecruit, flee, leave, makeOffering, receiveBlessing } from "../systems/actions";
import { openCache, resolveHazard } from "../systems/road";
import { useEffect, useRef, useState } from "preact/hooks";
import { sound } from "../audio/sound";
import { useGame } from "../game";
import { P, T } from "./theme";
import { EcoImg, Panel, PixelButton, SectionTitle, SpeciesTags, fmt } from "./common";

export function EventsScreen() {
  const g = useGame();
  const { save, data } = g;
  return (
    <div class="screen">
      <SectionTitle text={`Pendientes (${save.pending.length}/${data.rules.maxPendingEvents})`} />
      {save.pending.length === 0 && <Panel><div class="muted">Nada pendiente. Activa el contador de pasos y sal a caminar.</div></Panel>}
      {save.pending.length >= data.rules.maxPendingEvents && (
        <div class="small red">Tienes el máximo de sucesos pendientes: los nuevos pasarán de largo hasta que resuelvas alguno.</div>
      )}
      {save.pending.map((e) => {
        switch (e.kind) {
          case "battle": return <BattleCard key={e.id} event={e} />;
          case "sos": return <SosCard key={e.id} event={e} />;
          case "cache": return <CacheCard key={e.id} event={e} />;
          case "hazard": return <HazardCard key={e.id} event={e} />;
          case "recruit": return <RecruitCard key={e.id} event={e} />;
          case "merchant": return <MerchantCard key={e.id} event={e} />;
          case "shrine": return <ShrineCard key={e.id} event={e} />;
        }
      })}
      <SectionTitle text="Registro" />
      <Panel>
        {save.log.length === 0 && <div class="muted small">Aún no ha pasado nada.</div>}
        {save.log.slice(0, 40).map((l) => (
          <div class="log-row" key={l.id}>
            <span class="muted small">{new Date(l.date).toLocaleTimeString("es", { hour: "2-digit", minute: "2-digit" })}</span>
            <span class="small">{l.text}</span>
          </div>
        ))}
      </Panel>
    </div>
  );
}

function WildEco({ event, title }: { event: PendingEvent; title: string }) {
  const data = useGame().data;
  const species = event.species ? data.eco.get(event.species) : undefined;
  if (!species) return null;
  return (
    <div class="row">
      <EcoImg id={species.id} variant={event.variant} size={80} flip />
      <div class="grow">
        <div class="muted small">{title}</div>
        <div class="title">{species.name}</div>
        <SpeciesTags species={species} level={event.level ?? 1} variant={event.variant} />
        {event.variant === "brillante" && event.kind === "battle" && <div class="small amber">✨ Si lo vences, se une a tu equipo (o despierta al tuyo de su especie).</div>}
      </div>
    </div>
  );
}

/** Why the partner can't fight now, if it can't. */
export function cantFight(g: ReturnType<typeof useGame>): string | undefined {
  const p = partnerOf(g.save);
  if (!p) return "No tienes compañero.";
  if (p.injured) return `Tu compañero está herido. Cúralo en Cuidados (Pulso de datos), con un objeto de vida, en la ciudad, descansando o caminando ${Math.max(0, p.injured.stepsLeft)} pasos más.`;
  if (p.hp <= 0) return "Tu compañero está agotado. Camina para que se recupere o usa un Disco Vida.";
  return undefined;
}

function BattleCard({ event }: { event: PendingEvent }) {
  const g = useGame();
  const blocked = cantFight(g);
  const exhausted = !!blocked;
  return (
    <Panel>
      <WildEco event={event} title="¡Un Eco salvaje te corta el paso!" />
      {blocked && <div class="small red">{blocked}</div>}
      <div class="buttons">
        <PixelButton title="Huir" colour={P.mist} onClick={() => g.perform((s, d) => flee(s, event.id, d))} />
        <PixelButton title="¡Luchar!" colour={P.red3} disabled={exhausted} onClick={() => g.startBattle(event)} />
      </div>
    </Panel>
  );
}

function RecruitCard({ event }: { event: PendingEvent }) {
  const g = useGame();
  const full = g.save.squad.length >= g.data.rules.squadCap;
  return (
    <Panel>
      <WildEco event={event} title="Quiere unirse a tu equipo" />
      {full && <div class="small red">Tu equipo está lleno ({g.data.rules.squadCap} Ecos). Libera sitio antes de aceptar.</div>}
      <div class="buttons">
        <PixelButton title="Rechazar" colour={P.mist} onClick={() => g.perform((s, d) => declineRecruit(s, event.id, d))} />
        {!full && <PixelButton title="Aceptar" colour={P.green2} onClick={() => g.perform((s, d) => acceptRecruit(s, event.id, d))} />}
      </div>
    </Panel>
  );
}

function MerchantCard({ event }: { event: PendingEvent }) {
  const g = useGame();
  const { data } = g;
  const name = (o: MerchantOffer) => (o.kind === "item" ? data.item.get(o.contentID)?.name : data.parche.get(o.contentID)?.name) ?? o.contentID;
  const detail = (o: MerchantOffer) => (o.kind === "item" ? data.item.get(o.contentID)?.description ?? "" : `Parche · ${data.parche.get(o.contentID)?.description ?? ""}`);
  return (
    <Panel>
      <div class="title amber">Mercader ambulante</div>
      <div class="muted small">Tienes {fmt(g.save.bits)} bits.</div>
      {(event.offers ?? []).map((o) => (
        <div class="row" key={o.id}>
          <div class="grow">
            <div class="strong">{name(o)}</div>
            <div class="muted small">{detail(o)}</div>
          </div>
          {o.sold ? <span class="muted small">Vendido</span> : (
            <PixelButton small title={`${o.price} bits`} colour={g.save.bits >= o.price ? P.amber2 : P.slate} onClick={() => g.perform((s, d) => buy(s, o.id, event.id, d))} />
          )}
        </div>
      ))}
      <PixelButton title="Marcharse" colour={P.mist} onClick={() => g.perform((s) => leave(s, event.id))} />
    </Panel>
  );
}

function ShrineCard({ event }: { event: PendingEvent }) {
  const g = useGame();
  const parche = event.parche ? g.data.parche.get(event.parche) : undefined;
  const cost = event.cost ?? 0;
  return (
    <Panel>
      <div class="title teal">Santuario misterioso</div>
      <p class="muted small">Una voz te ofrece dos caminos: una bendición gratuita, o un Parche a cambio de una ofrenda.</p>
      {parche && (
        <div>
          <div class="strong" style={{ color: parche.rarity === "epica" ? T.purple : T.blue }}>{parche.name}{parche.rarity === "epica" ? " · épica" : " · rara"}</div>
          <div class="muted small">{parche.description}</div>
        </div>
      )}
      <div class="buttons">
        <PixelButton title="Bendición" colour={P.teal2} onClick={() => g.perform((s, d) => receiveBlessing(s, event.id, d))} />
        <PixelButton title={`Ofrenda: ${cost}`} colour={g.save.bits >= cost ? P.amber2 : P.slate} onClick={() => g.perform((s, d) => makeOffering(s, event.id, d))} />
      </div>
    </Panel>
  );
}

/** SOS: a captor holds a little Eco. Winning frees it: big bond boost and often rare data. */
function SosCard({ event }: { event: PendingEvent }) {
  const g = useGame();
  const blocked = cantFight(g);
  return (
    <Panel>
      <WildEco event={event} title="¡Señal de socorro! Tiene atrapado a un Eco" />
      <div class="muted small">Si lo vences, el Eco rescatado te dará las gracias: vínculo +{g.data.rules.sos.bond} y, a menudo, datos raros.</div>
      {blocked && <div class="small red">{blocked}</div>}
      <PixelButton title="¡Al rescate!" colour={P.red3} disabled={!!blocked} onClick={() => g.startBattle(event)} />
    </Panel>
  );
}

function CacheCard({ event }: { event: PendingEvent }) {
  const g = useGame();
  return (
    <Panel class="glow-card">
      <div class="row">
        <div class="cache-icon" aria-hidden="true">✦</div>
        <div class="grow">
          <div class="title amber">Cofre de datos</div>
          <div class="muted small">Brilla en el camino. Puede tener DP, objetos, Parches o incluso un Digi-huevo.</div>
        </div>
      </div>
      <PixelButton title="Abrir" colour={P.amber2} onClick={() => { sound.play("reward"); g.perform((s, d, rng) => openCache(s, event.id, d, rng)); }} />
    </Panel>
  );
}

function HazardCard({ event }: { event: PendingEvent }) {
  const g = useGame();
  const [playing, setPlaying] = useState(false);
  const h = g.data.rules.hazard;
  return (
    <Panel>
      <div class="title teal">Tormenta de datos</div>
      <div class="muted small">
        Tienes {h.seconds} segundos para romperla: toca el núcleo tantas veces como puedas (o agita el móvil).
        Si lo consigues, experiencia extra; si no, perderás algo de vida o DP.
      </div>
      <PixelButton title="¡Afrontarla!" colour={P.teal2} onClick={() => setPlaying(true)} />
      {playing && <HazardGame seconds={h.seconds} onEnd={(ok) => { setPlaying(false); sound.play(ok ? "levelUp" : "miss"); g.perform((s, d) => resolveHazard(s, event.id, ok, d)); }} />}
    </Panel>
  );
}

/** Tap (or shake) the storm core enough times before the time runs out. */
function HazardGame({ seconds, onEnd }: { seconds: number; onEnd: (ok: boolean) => void }) {
  const goal = seconds * 4;
  const [taps, setTaps] = useState(0);
  const [left, setLeft] = useState(seconds);
  const finished = useRef(false);
  const count = useRef(0);
  const hit = () => { if (finished.current) return; count.current += 1; setTaps(count.current); sound.play("tap"); if (count.current >= goal) end(true); };
  const end = (ok: boolean) => { if (finished.current) return; finished.current = true; setTimeout(() => onEnd(ok), 250); };
  useEffect(() => {
    const t0 = performance.now();
    const id = setInterval(() => {
      const l = Math.max(0, seconds - (performance.now() - t0) / 1000);
      setLeft(l);
      if (l <= 0) { clearInterval(id); end(count.current >= goal); }
    }, 100);
    // Shaking counts as taps too (where the motion sensor is allowed).
    let last = 0;
    const onMotion = (e: DeviceMotionEvent) => {
      const a = e.acceleration;
      if (!a || a.x == null || a.y == null || a.z == null) return;
      if (Math.hypot(a.x, a.y, a.z) > 14 && performance.now() - last > 120) { last = performance.now(); hit(); }
    };
    window.addEventListener("devicemotion", onMotion);
    return () => { clearInterval(id); window.removeEventListener("devicemotion", onMotion); };
  }, []);
  const share = Math.min(1, taps / goal);
  return (
    <div class="modal-backdrop">
      <div class="modal panel center" role="dialog" aria-label="Tormenta de datos">
        <div class="title">{left.toFixed(1)} s</div>
        <button class="storm-core" style={{ ["--fill" as string]: share }} onPointerDown={hit} aria-label="Romper la tormenta">
          <span>{Math.max(0, goal - taps)}</span>
        </button>
        <div class="muted small">¡Toca el núcleo!</div>
      </div>
    </div>
  );
}

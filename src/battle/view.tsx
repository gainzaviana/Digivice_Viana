import { useEffect, useRef, useState } from "preact/hooks";
import type { Battle, Beat, Combatant, Outcome, Side } from "../systems/battle/battle";
import type { Attack, Parche } from "../data/models";
import { useGame } from "../game";
import { sound } from "../audio/sound";
import { P } from "../ui/theme";
import { AffinityTag, PixelButton, StatBar, Tag, VariantTag } from "../ui/common";
import { statText } from "../systems/progression";
import { RARITY_COLOUR } from "../ui/squad";
import type { BattleStage } from "./stage3d";

const summary = (o: Outcome, b: Battle) => {
  const enemy = b.species("enemy").name;
  return o === "victory" ? `¡${enemy} ha caído!` : o === "defeat" ? "Tu compañero no puede seguir…" : o === "fled" ? "Has escapado." : `${enemy} se ha marchado.`;
};

/** One battle on screen: runs the engine, then plays its beats in the scene; input waits meanwhile. */
export function BattleView({ battle }: { battle: Battle }) {
  const g = useGame();
  const canvas = useRef<HTMLCanvasElement>(null);
  const box = useRef<HTMLDivElement>(null);
  const scene = useRef<BattleStage>();
  const ready = useRef<Promise<BattleStage>>();
  const [, rerender] = useState(0);
  const [busy, setBusy] = useState(false);
  const enemyName = battle.species("enemy").name;
  const [caption, setCaption] = useState(
    battle.isBoss
      ? `¡${enemyName}, el jefe de la zona, te cierra el paso!${battle.bossDefeats > 0 ? " Aún arrastra las heridas de vuestro último combate." : ""}`
      : `¡Un ${enemyName} salvaje te ataca!`,
  );

  useEffect(() => {
    // Three.js and the 3D stage load only when a battle opens.
    let ro: ResizeObserver | undefined;
    let stage: BattleStage | undefined;
    let cancelled = false;
    ready.current = import("./stage3d").then(({ BattleStage }) => {
      const s = new BattleStage(canvas.current!, box.current!, battle, g.save.settings.graphicsEffects);
      if (cancelled) { s.destroy(); return s; }
      stage = s;
      s.onCaption = setCaption;
      scene.current = s;
      const fit = () => { const r = box.current!.getBoundingClientRect(); s.resize(r.width, r.height); };
      fit();
      ro = new ResizeObserver(fit);
      ro.observe(box.current!);
      return s;
    });
    return () => { cancelled = true; ro?.disconnect(); stage?.destroy(); };
  }, []);

  const perform = (action: () => Beat[]) => {
    if (busy) return;
    const beats = action();
    rerender((n) => n + 1);
    if (!beats.length) return;
    setBusy(true);
    void ready.current!.then((s) => s.play(beats)).then(() => {
      setBusy(false);
      if (battle.outcome) {
        setCaption(summary(battle.outcome, battle));
        if (battle.outcome === "victory") sound.play("victory");
        if (battle.outcome === "defeat") sound.play("defeat");
      }
      rerender((n) => n + 1);
    });
  };
  const begin = () => { battle.begin(); setCaption("¿Básico o especial? El básico atraviesa al especial; dos especiales chocan y gana el de más AP."); rerender((n) => n + 1); };
  const forms = battle.formOptions();
  const partnerSpecies = battle.species("partner");
  const t = battle.tuning;

  return (
    <div class="battle">
      <FighterBar battle={battle} side="enemy" />
      <div class="battle-stage" ref={box} style={{ position: "relative" }}><canvas ref={canvas} aria-label="Combate" /></div>
      <FighterBar battle={battle} side="partner" />
      <div class="caption" aria-live="polite">{caption}</div>
      {battle.phase === "intro" && (
        <div class="stack">
          {forms.length > 0 && (
            <div class="stack tight">
              <div class="muted tiny">Evolucionar para este combate (vuelve a su forma base al terminar). Tienes {battle.dp} DP.</div>
              <div class="form-grid">
                {forms.map((f) => (
                  <button key={f.target.id} class="form-option" disabled={!!f.blocked || busy} onClick={() => perform(() => battle.evolveTo(f.target.id))}>
                    <span class="strong small">{f.target.name}</span>
                    <span class="tiny">×{f.multiplier} · {f.cost} DP</span>
                    {f.blocked && <span class="tiny red">{f.blocked}</span>}
                  </button>
                ))}
              </div>
            </div>
          )}
          {forms.length === 0 && !battle.formID && (
            <div class="muted tiny">Sin evoluciones desbloqueadas: vence a un jefe con este Eco para desbloquear su siguiente fase.</div>
          )}
          <PixelButton title={battle.formID ? "¡A luchar!" : forms.length ? "Luchar sin evolucionar" : "¡A luchar!"} disabled={busy} onClick={begin} />
        </div>
      )}
      {battle.phase === "choosing" && (
        <div class="stack">
          <div class="buttons">
            <AttackButton title="Básico" attack={partnerSpecies.basic} note={`AP ×${t.basicAP} · libre`} colour={P.amber2} disabled={busy} onClick={() => perform(() => battle.playTurn("basic"))} />
            <AttackButton title="Especial" attack={partnerSpecies.signature} note={`AP ×${t.strongAP} · 1 Carga`} colour={P.red3} disabled={busy || !battle.canUseStrong()} onClick={() => perform(() => battle.playTurn("strong"))} />
          </div>
          {!battle.isBoss && <button class="link-button center" disabled={busy} onClick={() => perform(() => battle.flee())}>Huir</button>}
          <CardHand battle={battle} busy={busy} onUse={(id) => perform(() => battle.playTurn({ card: id }))} />
        </div>
      )}
      {battle.phase === "over" && <PixelButton title="Continuar" disabled={busy} onClick={() => g.endBattle()} />}
    </div>
  );
}

function hpColour(c: Combatant) {
  const share = c.hp / Math.max(1, c.stats.hp);
  return share > 0.5 ? P.green2 : share > 0.2 ? P.amber2 : P.red2;
}

function FighterBar({ battle, side }: { battle: Battle; side: Side }) {
  const c = battle.combatant(side);
  const species = battle.species(side);
  return (
    <div class="fighter">
      <div class="tags">
        <span class="strong">{species.name}</span>
        <Tag text={`Nv. ${c.level}`} colour={P.slate} ink={P.white} />
        <AffinityTag affinity={battle.affinity(side)} />
        {c.enraged && <Tag text="Enfurecido" colour={P.red3} />}
        <VariantTag variant={c.variant} />
      </div>
      <StatBar label="Vida" value={c.hp} max={c.stats.hp} colour={hpColour(c)} text={`${c.hp}/${c.stats.hp}`} />
      <div class="row tiny">
        <span class="muted">AP {statText(battle.effective("ap", side))} · SP {statText(battle.effective("sp", side))}</span>
        <span class="grow" />
        <span class="muted">Carga</span>
        <span class="pips" aria-label={`Carga ${c.charge} de ${battle.tuning.chargeMax}`}>
          {Array.from({ length: battle.tuning.chargeMax }, (_, i) => <span key={i} class={i < c.charge ? "pip on" : "pip"} />)}
        </span>
        {side === "partner" && <span class="amber">· DP {battle.dp}</span>}
      </div>
    </div>
  );
}

function AttackButton({ title, attack, note, colour, disabled, onClick }: { title: string; attack: Attack; note: string; colour: string; disabled: boolean; onClick: () => void }) {
  return (
    <button class="attack-button" style={{ background: disabled ? P.slate : colour }} disabled={disabled} onClick={onClick}>
      <span class="strong">{title.toUpperCase()}</span>
      <span class="small ellipsis">{attack.name}</span>
      <span class="tiny">{note}</span>
    </button>
  );
}

/** The deck's Parches: slash one (drag it sideways, or tap and press Enter) to use it as this turn's action. */
function CardHand({ battle, busy, onUse }: { battle: Battle; busy: boolean; onUse: (id: string) => void }) {
  const data = useGame().data;
  const locked = busy || !!battle.outcome;
  return (
    <div class="hand">
      <div class="muted tiny">Parches: desliza uno hacia un lado para usarlo en lugar de atacar este turno. Cuestan DP (tienes {battle.dp}).</div>
      {battle.hand.length === 0 && <div class="muted tiny">No te quedan Parches en este combate.</div>}
      <div class="cards">
        {battle.hand.map((id, i) => {
          const p = data.parche.get(id);
          const cost = battle.cardCost(id);
          return p ? <SlashCard key={`${id}-${i}`} parche={p} cost={cost} locked={locked || battle.dp < cost} onSlash={() => onUse(id)} /> : null;
        })}
      </div>
    </div>
  );
}

function SlashCard({ parche, cost, locked, onSlash }: { parche: Parche; cost: number; locked: boolean; onSlash: () => void }) {
  const [offset, setOffset] = useState(0);
  const start = useRef<{ x: number; y: number; t: number; horizontal?: boolean }>();
  const threshold = 70;
  return (
    <div
      class="slash-card"
      role="button"
      tabIndex={0}
      aria-label={`Activar ${parche.name}`}
      aria-disabled={locked}
      style={{ transform: `translateX(${offset}px)`, opacity: locked ? 0.45 : 1, borderColor: Math.abs(offset) > threshold ? P.amber3 : P.slate, transition: start.current ? "none" : "transform 0.18s" }}
      onPointerDown={(e) => { if (!locked) { start.current = { x: e.clientX, y: e.clientY, t: performance.now() }; (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId); } }}
      onPointerMove={(e) => {
        const s = start.current;
        if (!s) return;
        const dx = e.clientX - s.x, dy = e.clientY - s.y;
        s.horizontal ??= Math.abs(dx) > 8 ? Math.abs(dx) > Math.abs(dy) : undefined;
        if (s.horizontal) setOffset(dx);
      }}
      onPointerUp={(e) => {
        const s = start.current;
        start.current = undefined;
        if (!s) return;
        const dx = e.clientX - s.x;
        const speed = Math.abs(dx) / Math.max(1, performance.now() - s.t);
        setOffset(0);
        if (s.horizontal && (Math.abs(dx) > threshold || (Math.abs(dx) > 30 && speed > 0.8))) onSlash();
      }}
      onPointerCancel={() => { start.current = undefined; setOffset(0); }}
      onKeyDown={(e) => { if (!locked && (e.key === "Enter" || e.key === " ")) onSlash(); }}
    >
      <div class="strong small" style={{ color: RARITY_COLOUR[parche.rarity] }}>{parche.name} <span class="amber tiny">{cost} DP</span></div>
      <div class="tiny muted">{parche.description}</div>
    </div>
  );
}

import { useEffect, useRef, useState } from "preact/hooks";
import type { Battle, Beat, Combatant, Outcome, Side } from "../systems/battle/battle";
import type { Attack, Parche } from "../data/models";
import { useGame } from "../game";
import { sound } from "../audio/sound";
import { PALETTE as P } from "../art/palette";
import { AffinityTag, PixelButton, StatBar, Tag, VariantTag } from "../ui/common";
import { RARITY_COLOUR } from "../ui/squad";
import { BattleScene } from "./scene";

const summary = (o: Outcome, b: Battle) => {
  const enemy = b.species("enemy").name;
  return o === "victory" ? `¡${enemy} ha caído!` : o === "defeat" ? "Tu compañero no puede seguir…" : o === "fled" ? "Has escapado." : `${enemy} se ha marchado.`;
};

/** One battle on screen: runs the engine, then plays its beats in the scene; input waits meanwhile. */
export function BattleView({ battle }: { battle: Battle }) {
  const g = useGame();
  const canvas = useRef<HTMLCanvasElement>(null);
  const box = useRef<HTMLDivElement>(null);
  const scene = useRef<BattleScene>();
  const [, rerender] = useState(0);
  const [busy, setBusy] = useState(false);
  const enemyName = battle.species("enemy").name;
  const [caption, setCaption] = useState(
    battle.isBoss
      ? `¡${enemyName}, el jefe de la zona, te cierra el paso!${battle.bossDefeats > 0 ? " Aún arrastra las heridas de vuestro último combate." : ""}`
      : `¡Un ${enemyName} salvaje te ataca!`,
  );

  useEffect(() => {
    const s = new BattleScene(canvas.current!, battle, g.save.settings.graphicsEffects);
    s.onCaption = setCaption;
    scene.current = s;
    const fit = () => { const r = box.current!.getBoundingClientRect(); s.resize(r.width, r.height); };
    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(box.current!);
    return () => { ro.disconnect(); s.destroy(); };
  }, []);

  const perform = (action: () => Beat[]) => {
    if (busy) return;
    const beats = action();
    rerender((n) => n + 1);
    if (!beats.length) return;
    setBusy(true);
    void scene.current!.play(beats).then(() => {
      setBusy(false);
      if (battle.outcome) {
        setCaption(summary(battle.outcome, battle));
        if (battle.outcome === "victory") sound.play("victory");
        if (battle.outcome === "defeat") sound.play("defeat");
      }
      rerender((n) => n + 1);
    });
  };
  const begin = () => { battle.begin(); setCaption("¿Básico o especial? El básico atraviesa al especial."); rerender((n) => n + 1); };
  const offer = battle.evolutionOffer;
  const partnerSpecies = battle.species("partner");

  return (
    <div class="battle">
      <FighterBar battle={battle} side="enemy" />
      <div class="battle-stage" ref={box}><canvas ref={canvas} aria-label="Combate" /></div>
      <FighterBar battle={battle} side="partner" />
      <div class="caption" aria-live="polite">{caption}</div>
      {battle.phase === "intro" && (
        <div class="stack">
          {offer && (
            <div class="stack tight">
              <PixelButton title={`¡EVOLUCIONAR! → ${offer.target.name}`} colour={P.teal2} disabled={!!offer.blocked || busy} onClick={() => perform(() => battle.evolveBeforeBattle())} />
              <div class="muted tiny center">
                {offer.blocked ?? `Cuesta ${offer.cost} DP${offer.failChance > 0.5 ? ` · riesgo de fallo ${Math.round(offer.failChance)} %` : ""} · solo durante este combate`}
              </div>
            </div>
          )}
          <PixelButton title="¡A luchar!" disabled={busy} onClick={begin} />
          <CardHand battle={battle} busy={busy} onSlash={(id) => perform(() => battle.slash(id))} />
        </div>
      )}
      {battle.phase === "choosing" && (
        <div class="stack">
          <div class="buttons">
            <AttackButton title="Básico" attack={partnerSpecies.basic} colour={P.amber2} disabled={busy} onClick={() => perform(() => battle.playTurn("basic"))} />
            <AttackButton title="Especial" attack={partnerSpecies.signature} colour={P.red3} disabled={busy || !battle.canUseStrong()} onClick={() => perform(() => battle.playTurn("strong"))} />
          </div>
          {!battle.isBoss && <button class="link-button center" disabled={busy} onClick={() => perform(() => battle.flee())}>Huir</button>}
          <CardHand battle={battle} busy={busy} onSlash={(id) => perform(() => battle.slash(id))} />
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
      {side === "partner" && <StatBar label="DP" value={c.dp} max={c.stats.dp} colour={P.amber2} text={`${c.dp}/${c.stats.dp}`} />}
    </div>
  );
}

function AttackButton({ title, attack, colour, disabled, onClick }: { title: string; attack: Attack; colour: string; disabled: boolean; onClick: () => void }) {
  return (
    <button class="attack-button" style={{ background: disabled ? P.slate : colour }} disabled={disabled} onClick={onClick}>
      <span class="strong">{title.toUpperCase()}</span>
      <span class="small ellipsis">{attack.name}</span>
      <span class="tiny">Poder {attack.power} · {attack.dpCost > 0 ? `${attack.dpCost} DP` : "gratis"}</span>
    </button>
  );
}

/** The deck's Parches: drag one sideways to slash it. One per turn; each card once per battle. */
function CardHand({ battle, busy, onSlash }: { battle: Battle; busy: boolean; onSlash: (id: string) => void }) {
  const data = useGame().data;
  const locked = battle.cardUsedThisTurn || busy || !!battle.outcome;
  return (
    <div class="hand">
      <div class="muted tiny">{battle.cardUsedThisTurn ? "Ya has usado un Parche este turno." : "Desliza un Parche hacia un lado para activarlo."}</div>
      {battle.hand.length === 0 && <div class="muted tiny">No te quedan Parches en este combate.</div>}
      <div class="cards">
        {battle.hand.map((id, i) => {
          const p = data.parche.get(id);
          return p ? <SlashCard key={`${id}-${i}`} parche={p} locked={locked} onSlash={() => onSlash(id)} /> : null;
        })}
      </div>
    </div>
  );
}

function SlashCard({ parche, locked, onSlash }: { parche: Parche; locked: boolean; onSlash: () => void }) {
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
      <div class="strong small" style={{ color: RARITY_COLOUR[parche.rarity] }}>{parche.name}</div>
      <div class="tiny muted">{parche.description}</div>
    </div>
  );
}

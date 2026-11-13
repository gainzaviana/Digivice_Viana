import type { EcoInstance } from "../core/save";
import { partnerOf } from "../core/save";
import { TIER_NAME, STAGE_TIER } from "../data/models";
import { maxStats, statText, winsPerLevel, xpToNext } from "../systems/progression";
import { evolutionTree, type EvolutionNode } from "../systems/evolution";
import { useGame } from "../game";
import { P, T } from "./theme";
import { AttackRow, EcoImg, Panel, SectionTitle, SpeciesTags, StatBar, Tag, fmt } from "./common";
import { StepsPanel } from "./steps";

/** The partner: who it is, its own stats and progress, and its evolution tree. */
export function PartnerScreen() {
  const g = useGame();
  const { save, data } = g;
  const partner = partnerOf(save);
  const species = partner && data.eco.get(partner.speciesID);
  const region = save.map.regionID ? data.region.get(save.map.regionID) : undefined;
  return (
    <div class="screen">
      {region && (
        <Panel pad={12}>
          <div class="amber strong">Zona {region.order}: {region.name}</div>
          <div class="muted small">{save.map.bossReady ? "¡El jefe te espera! Entrena en el camino si aún no puedes con él." : `Faltan ${fmt(save.map.stepsLeft)} pasos para el jefe.`}</div>
        </Panel>
      )}
      {partner && species && (
        <>
          <div class="center">
            <div class="sprite-frame"><EcoImg id={partner.speciesID} variant={partner.variant} size={176} /></div>
            <h1 class="name">{partner.nickname ?? species.name}</h1>
            <SpeciesTags species={species} level={partner.level} variant={partner.variant} archetype />
            <p class="muted small">{species.description}</p>
          </div>
          <PartnerStats eco={partner} />
          <Panel>
            <SectionTitle text="Ataques" />
            <AttackRow attack={species.basic} kind="basic" />
            <AttackRow attack={species.signature} kind="strong" />
          </Panel>
          <EvolutionTree eco={partner} />
        </>
      )}
      <StepsPanel />
      <Panel>
        <SectionTitle text="Inventario" />
        <div class="small">{fmt(save.bits)} bits · {Object.values(save.inventory).reduce((a, b) => a + b, 0)} objetos · {save.deck.length}/{data.rules.deckSize} Parches en la baraja</div>
        <div class="muted small">Guía: {save.guide.seen.length} de {data.ecos.length} Ecos vistos</div>
      </Panel>
    </div>
  );
}

export function PartnerStats({ eco }: { eco: EcoInstance }) {
  const data = useGame().data;
  const s = maxStats(eco, data);
  const next = xpToNext(eco.level, data);
  const maxed = eco.level >= data.rules.levelCap;
  return (
    <Panel>
      <SectionTitle text="Estado (solo de este Eco)" />
      <StatBar label="Vida (HP)" value={eco.hp} max={s.hp} colour={P.green2} text={`${eco.hp}/${s.hp}`} />
      <StatBar label="DP" value={eco.dp} max={data.rules.maxDP} colour={P.amber2} text={`${eco.dp}/${data.rules.maxDP}`} />
      <StatBar label="Exp." value={maxed ? 1 : eco.xp} max={maxed ? 1 : next} colour={P.blue2} text={maxed ? "máx." : `${eco.xp}/${next}`} />
      {!maxed && <div class="muted tiny">Unas {winsPerLevel(eco.level, data)} victorias por nivel ahora mismo (más contra rivales fuertes y jefes).</div>}
      <StatBar label="Vínculo" value={eco.bond} max={data.rules.maxBond} colour={P.pink} />
      {eco.bond < data.rules.battle.disobeyBelowBond && <div class="small red">Vínculo bajo: a veces no obedecerá en combate. Gana combates y entrena para subirlo.</div>}
      <hr />
      <StatBar label="Ataque (AP)" value={s.ap} max={Math.max(10, Math.max(s.ap, s.sp) * 1.3)} colour={P.red2} text={statText(s.ap)} />
      <StatBar label="Velocidad (SP)" value={s.sp} max={Math.max(10, Math.max(s.ap, s.sp) * 1.3)} colour={P.teal2} text={statText(s.sp)} />
      <div class="muted tiny">{eco.wins} victorias · {eco.losses} derrotas{eco.lossStreak >= 2 ? ` · ${eco.lossStreak} derrotas seguidas` : ""}</div>
    </Panel>
  );
}

/** The evolution tree: unlocked forms (usable in battle for DP) and what the rest need. */
export function EvolutionTree({ eco }: { eco: EcoInstance }) {
  const g = useGame();
  const nodes = evolutionTree(eco, g.save, g.data);
  const known = (n: EvolutionNode) => n.unlocked || g.save.guide.seen.includes(n.target.id);
  return (
    <Panel>
      <SectionTitle text="Evoluciones" />
      <div class="muted tiny">
        Siempre vuelve a su forma base. Al vencer a un jefe desbloquea su siguiente fase; antes de cada combate puedes gastar DP
        para luchar evolucionado ({g.data.rules.evolution.cost.slice(1).map((c, i) => `Fase ${i + 2}: ${c} DP, ×${g.data.rules.evolution.multiplier[i + 1]}`).join(" · ")}).
      </div>
      {nodes.length === 0 && <div class="muted small">No tiene evoluciones.</div>}
      {nodes.map((n) => (
        <div class="row top" key={n.target.id}>
          <EcoImg id={n.target.id} size={56} silhouette={!known(n)} />
          <div class="grow">
            <div class="tags">
              <span class="strong" style={{ color: n.unlocked ? T.green : T.text }}>{known(n) ? n.target.name : "???"}</span>
              <Tag text={n.kind === "fusion" ? "Fusión" : n.kind === "awaken" ? "Despertar" : TIER_NAME[STAGE_TIER[n.target.stage]]} colour={n.unlocked ? P.green2 : P.slate} ink={n.unlocked ? P.outline : P.white} />
              <span class="tiny amber">{n.cost} DP · ×{n.multiplier}</span>
            </div>
            {n.unlocked
              ? <div class="small green">✓ Desbloqueada: elígela antes de un combate.</div>
              : n.requirements.map((r) => {
                const met = !n.missing.includes(r);
                return <div key={r} class="small" style={{ color: met ? T.green : T.muted }}>{met ? "✓ " : "· "}{r}</div>;
              })}
          </div>
        </div>
      ))}
    </Panel>
  );
}

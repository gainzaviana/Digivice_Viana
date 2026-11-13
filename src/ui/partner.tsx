import { useState } from "preact/hooks";
import type { EcoInstance, GameSave } from "../core/save";
import { partnerOf } from "../core/save";
import { maxStats, xpToNext, evolutionStatus } from "../systems/progression";
import { evolve } from "../systems/actions";
import { fuse, fusionOptions, type FusionOption } from "../systems/fusion";
import { useGame } from "../game";
import { sound } from "../audio/sound";
import { PALETTE as P } from "../art/palette";
import { AttackRow, Confirm, EcoImg, Panel, PixelButton, SectionTitle, SpeciesTags, StatBar, fmt } from "./common";
import { StepsPanel } from "./steps";

/** The partner: who it is, how strong it is, and how close it is to evolving. */
export function PartnerScreen() {
  const g = useGame();
  const save = g.save;
  const data = g.data;
  const partner = partnerOf(save);
  const species = partner && data.eco.get(partner.speciesID);
  const region = save.map.regionID ? data.region.get(save.map.regionID) : undefined;
  const fusions = fusionOptions(save, data);
  return (
    <div class="screen">
      {region && (
        <Panel pad={12}>
          <div class="amber strong">Zona {region.order}: {region.name}</div>
          <div class="muted small">{save.map.bossReady ? "¡El jefe te espera!" : `Faltan ${fmt(save.map.stepsLeft)} pasos para el jefe.`}</div>
        </Panel>
      )}
      {partner && species && (
        <>
          <div class="center">
            <div class="sprite-frame"><EcoImg id={partner.speciesID} variant={partner.variant} size={176} /></div>
            <h1 class="name">{partner.nickname ?? species.name}</h1>
            <SpeciesTags species={species} level={partner.level} variant={partner.variant} />
            <p class="muted small">{species.description}</p>
          </div>
          <PartnerStats eco={partner} />
          <Panel>
            <SectionTitle text="Ataques" />
            <AttackRow attack={species.basic} kind="Básico" />
            <AttackRow attack={species.signature} kind="Especial" />
          </Panel>
          <EvolutionPanel eco={partner} save={save} />
          {fusions.length > 0 && <FusionPanel options={fusions} />}
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

function PartnerStats({ eco }: { eco: EcoInstance }) {
  const data = useGame().data;
  const s = maxStats(eco, data);
  const next = xpToNext(eco.level, data.rules);
  return (
    <Panel>
      <SectionTitle text="Estado" />
      <StatBar label="Vida" value={eco.hp} max={s.hp} colour={P.green2} text={`${eco.hp}/${s.hp}`} />
      <StatBar label="DP" value={eco.dp} max={s.dp} colour={P.amber2} text={`${eco.dp}/${s.dp}`} />
      <StatBar label="Exp." value={eco.xp} max={next} colour={P.blue2} text={`${eco.xp}/${next}`} />
      <StatBar label="Vínculo" value={eco.bond} max={data.rules.maxBond} colour={P.pink} />
      <hr />
      <StatBar label="Ataque" value={s.atk} max={120} colour={P.red2} />
      <StatBar label="Defensa" value={s.def} max={120} colour={P.blue2} />
      <StatBar label="Velocidad" value={s.spd} max={120} colour={P.teal2} />
    </Panel>
  );
}

function EvolutionPanel({ eco, save }: { eco: EcoInstance; save: GameSave }) {
  const g = useGame();
  const paths = evolutionStatus(eco, save, g.data);
  return (
    <Panel>
      <SectionTitle text="Evolución" />
      {paths.length === 0 && <div class="muted small">Ha alcanzado su forma final.</div>}
      {paths.map((path) => (
        <div class="row top" key={path.target.id}>
          <EcoImg id={path.target.id} size={64} silhouette={!save.guide.seen.includes(path.target.id)} />
          <div class="grow">
            <div class="strong" style={{ color: path.ready ? P.green2 : P.white }}>
              {save.guide.seen.includes(path.target.id) ? path.target.name : "???"}
            </div>
            {path.requirements.map((r) => {
              const met = !path.missing.includes(r);
              return <div key={r} class="small" style={{ color: met ? P.green2 : P.mist }}>{met ? "✓ " : "· "}{r}</div>;
            })}
            {path.ready && !path.evolution.conditions.inBattleOnly && (
              <PixelButton small title="Evolucionar" colour={P.green2} onClick={() => {
                const r = g.perform((s, d) => evolve(s, eco.id, path.target.id, d));
                if (r.ok) sound.play("evolve");
              }} />
            )}
          </div>
        </div>
      ))}
    </Panel>
  );
}

function FusionPanel({ options }: { options: FusionOption[] }) {
  const g = useGame();
  const [confirming, setConfirming] = useState<FusionOption>();
  return (
    <Panel>
      <SectionTitle text="Fusión" />
      {options.map((o) => (
        <div class="row top" key={o.fusion.id + (o.other?.id ?? "")}>
          <EcoImg id={o.result.id} size={64} silhouette={!g.save.guide.seen.includes(o.result.id)} />
          <div class="grow">
            <div class="strong" style={{ color: o.ready ? P.purple2 : P.white }}>{o.result.name} · con {o.otherSpecies.name}</div>
            {o.missing.map((m) => <div key={m} class="small muted">· {m}</div>)}
            {o.ready && <PixelButton small title="Fusionar" colour={P.purple2} onClick={() => setConfirming(o)} />}
          </div>
        </div>
      ))}
      {confirming && (
        <Confirm
          title="¿Fusionar para siempre?"
          text={`${confirming.otherSpecies.name} se unirá a tu compañero y dejará tu equipo. No se puede deshacer.`}
          ok="Fusionar"
          danger
          onCancel={() => setConfirming(undefined)}
          onOk={() => {
            const o = confirming;
            setConfirming(undefined);
            if (!o.other) return;
            sound.play("evolve");
            g.perform((s, d) => fuse(s, o.fusion.id, o.other!.id, d));
          }}
        />
      )}
    </Panel>
  );
}

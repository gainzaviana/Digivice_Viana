import type { Region } from "../data/models";
import { travel, unlockedRegions } from "../systems/actions";
import { useGame } from "../game";
import { PALETTE as P } from "../art/palette";
import { EcoImg, Panel, PixelButton, SectionTitle, StatBar, Tag, fmt } from "./common";
import { StepsPanel } from "./steps";

type RowState = "current" | "cleared" | "open" | "locked";
const ICON: Record<RowState, [string, string]> = { current: ["▶", P.amber2], cleared: ["✓", P.green2], open: ["•", P.white], locked: ["▪", P.slate] };

export function MapScreen() {
  const g = useGame();
  const { save, data } = g;
  const unlocked = new Set(unlockedRegions(save, data).map((r) => r.id));
  const region = save.map.regionID ? data.region.get(save.map.regionID) : undefined;
  const state = (r: Region): RowState =>
    r.id === save.map.regionID ? "current" : !unlocked.has(r.id) ? "locked" : save.map.clearedRegions.includes(r.id) ? "cleared" : "open";
  return (
    <div class="screen">
      {region && <CurrentRegion region={region} />}
      <StepsPanel />
      <Panel>
        <SectionTitle text="La Red Profunda" />
        {data.regions.map((r) => {
          const st = state(r);
          return (
            <div class="row" key={r.id}>
              <span class="icon" style={{ color: ICON[st][1] }}>{ICON[st][0]}</span>
              <div class="grow">
                <div class="strong" style={{ color: st === "locked" ? P.slate : P.white }}>Zona {r.order} · {st === "locked" ? "???" : r.name}</div>
                <div class="muted small">{subtitle(r, st)}</div>
              </div>
              {(st === "cleared" || st === "open") && <PixelButton small title="Ir" colour={P.mist} onClick={() => g.perform((s, d) => travel(s, r.id, d))} />}
            </div>
          );
        })}
      </Panel>
    </div>
  );

  function subtitle(r: Region, st: RowState) {
    if (st === "locked") {
      if (r.requiresItem) return `Necesitas: ${data.item.get(r.requiresItem)?.name ?? r.requiresItem}`;
      if (r.postGame) return "Tras salvar La Red Profunda";
      return "Vence al jefe de la zona anterior";
    }
    return `${fmt(r.steps)} pasos${r.requiresItem ? " · zona secreta" : r.postGame ? " · tras el final" : ""}`;
  }
}

function CurrentRegion({ region }: { region: Region }) {
  const g = useGame();
  const map = g.save.map;
  const walked = region.steps - map.stepsLeft;
  const boss = g.data.eco.get(region.boss.species);
  return (
    <Panel>
      <div class="amber title">Zona {region.order} · {region.name}</div>
      <p class="muted small">{region.description}</p>
      <StatBar label="Camino" value={walked} max={region.steps} colour={P.teal2} text={`${fmt(walked)}/${fmt(region.steps)}`} />
      {boss && (
        <div class="row">
          <EcoImg id={boss.id} size={72} flip dim={!map.bossReady} />
          <div class="grow">
            <div class="strong" style={{ color: map.bossReady ? P.red3 : P.white }}>{map.bossReady ? `¡${boss.name} te espera!` : `Jefe: ${boss.name}`}</div>
            <div class="muted small">
              Nivel {region.boss.level}. {map.bossReady ? "Hasta vencerlo no habrá más sucesos en esta zona." : "Aparecerá al final del camino."}
            </div>
          </div>
        </div>
      )}
      {map.bossReady && (
        <>
          {map.bossDefeats > 0 && <div class="small teal">Aún arrastra las heridas de {map.bossDefeats === 1 ? "tu último intento" : `tus ${map.bossDefeats} intentos`}.</div>}
          <PixelButton title="¡Enfrentarse al jefe!" colour={P.red3} onClick={() => g.startBattle()} />
        </>
      )}
      {(map.luckySteps > 0 || map.radarActive) && (
        <div class="tags">
          {map.luckySteps > 0 && <Tag text={`Suerte: ${fmt(map.luckySteps)} pasos`} colour={P.amber3} />}
          {map.radarActive && <Tag text="Radar activo" colour={P.teal2} />}
        </div>
      )}
    </Panel>
  );
}

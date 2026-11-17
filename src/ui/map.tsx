import { useState } from "preact/hooks";
import type { Region } from "../data/models";
import { travel, unlockedRegions } from "../systems/actions";
import { cityHeal, healCost, shopBuy, shopOffers, shrineBless, shrineOffer, shrineOffering } from "../systems/city";
import { useGame } from "../game";
import { partnerOf } from "../core/save";
import { P, T } from "./theme";
import { EcoImg, Panel, PixelButton, SectionTitle, StatBar, Tag, fmt } from "./common";
import { StepsPanel, SyncBanner } from "./steps";
import { cantFight } from "./events";

type RowState = "current" | "cleared" | "open" | "locked";
const ICON: Record<RowState, [string, string]> = { current: ["▶", T.amber], cleared: ["✓", T.green], open: ["•", T.muted], locked: ["•", T.faint] };

/** Landmarks along a city road, one every 1,000 steps. */
export const LANDMARKS = ["🔥", "⛩", "◇", "⚑", "✦", "⌂"];

/** The world: 6 Areas of 3 cities (plus a secret one), the current road and the city's services. */
export function MapScreen() {
  const g = useGame();
  const { save, data } = g;
  const [going, setGoing] = useState<Region>();
  const unlocked = new Set(unlockedRegions(save, data).map((r) => r.id));
  const region = save.map.regionID ? data.region.get(save.map.regionID) : undefined;
  const state = (r: Region): RowState =>
    r.id === save.map.regionID ? "current" : !unlocked.has(r.id) ? "locked" : save.map.clearedRegions.includes(r.id) ? "cleared" : "open";
  const secret = data.regions.filter((r) => r.requiresItem);
  const row = (r: Region, areaBoss: boolean) => {
    const st = state(r);
    const subtitle = st === "locked"
      ? r.requiresItem ? `Necesitas: ${data.item.get(r.requiresItem)?.name ?? r.requiresItem}` : "Vence al jefe de la ciudad anterior"
      : `${fmt(r.steps)} pasos · ~${Math.max(1, Math.round(r.steps / 3000))} día${r.steps > 4500 ? "s" : ""}${areaBoss ? " · jefe de área" : ""}${r.requiresItem ? " · secreto" : ""}`;
    return (
      <div class="row" key={r.id}>
        <span class="icon" style={{ color: ICON[st][1] }}>{ICON[st][0]}</span>
        <div class="grow">
          <div class="strong" style={{ color: st === "locked" ? T.faint : T.text }}>{st === "locked" ? "???" : r.name}</div>
          <div class="muted small">{subtitle}</div>
        </div>
        {(st === "cleared" || st === "open") && <PixelButton small title="Ir" colour={P.mist} onClick={() => setGoing(r)} />}
      </div>
    );
  };
  return (
    <div class="screen">
      <SyncBanner />
      <StepsPanel />
      {region && <CurrentCity region={region} />}
      <Incubator />
      {region && <CityServices />}
      {save.map.clearedRegions.length > 0 && (
        <Panel pad={12}>
          <div class="strong">Volver a entrenar</div>
          <div class="muted small">Pulsa «Ir» en cualquier ciudad ya superada para recorrer su camino otra vez. Ideal para subir de nivel a un Eco recién nacido o rescatado con rivales flojos antes de llevarlo a las áreas difíciles.</div>
        </Panel>
      )}
      {data.rules.areas.map((area) => {
        const cities = data.regions.filter((r) => r.area === area.order && !r.requiresItem);
        const open = cities.some((c) => state(c) !== "locked");
        return (
          <Panel key={area.order}>
            <SectionTitle text={`Área ${area.order} · ${open ? area.name : "???"}`} />
            {open && <div class="muted tiny">{area.description}</div>}
            {cities.map((r, i) => row(r, i === cities.length - 1))}
          </Panel>
        );
      })}
      {secret.length > 0 && (
        <Panel>
          <SectionTitle text="Lugares secretos" />
          {secret.map((r) => row(r, false))}
        </Panel>
      )}
      {going && <TravelDialog to={going} onClose={() => setGoing(undefined)} onGo={() => { setGoing(undefined); g.perform((s, d) => travel(s, going.id, d)); scrollTo(0, 0); }} />}
    </div>
  );
}

/** Confirms a trip: the road walked toward the current city is lost and the new one starts at 0. */
function TravelDialog({ to, onGo, onClose }: { to: Region; onGo: () => void; onClose: () => void }) {
  const { save, data } = useGame();
  const here = save.map.regionID ? data.region.get(save.map.regionID) : undefined;
  const walked = here ? here.steps - save.map.stepsLeft : 0;
  const boss = data.eco.get(to.boss.species);
  const levels = to.encounters.map((e) => [e.minLevel, e.maxLevel]).flat();
  const cleared = save.map.clearedRegions.includes(to.id);
  const partner = partnerOf(save);
  return (
    <div class="modal-backdrop" onClick={onClose}>
      <div class="modal panel stack" role="dialog" aria-label={`Viajar a ${to.name}`} onClick={(e) => e.stopPropagation()}>
        <h3 class="modal-title">¿Viajar a {to.name}?</h3>
        {here && (walked > 0 || save.map.bossReady) && (
          <div class="warn-box small">
            <strong>Perderás tu avance hacia {here.name}:</strong> {fmt(walked)} de {fmt(here.steps)} pasos{save.map.bossReady ? " y el jefe que ya te esperaba" : ""}. Al volver tendrás que recorrer el camino entero.
          </div>
        )}
        <div class="small">
          El camino a {to.name} empieza en 0: {fmt(to.steps)} pasos hasta {boss ? `${boss.name} (nivel ${to.boss.level})` : "su jefe"}.
          {levels.length > 0 && ` Ecos salvajes de nivel ${Math.min(...levels)}–${Math.max(...levels)}.`}
        </div>
        {cleared && partner && <div class="muted small">Ya superaste esta ciudad: buen sitio para entrenar a {partner.nickname ?? data.eco.get(partner.speciesID)?.name} (nivel {partner.level}). Cambia de compañero en Equipo.</div>}
        <div class="muted tiny">Tus pasos totales, huevos y sucesos pendientes no se pierden.</div>
        <PixelButton title="Viajar" colour={P.amber2} onClick={onGo} />
        <PixelButton small title="Cancelar" colour={P.mist} onClick={onClose} />
      </div>
    </div>
  );
}

/** The road to the current city: progress with a landmark every 1,000 steps, and its boss. */
export function CurrentCity({ region, compact }: { region: Region; compact?: boolean }) {
  const g = useGame();
  const { save, data } = g;
  const map = save.map;
  const walked = region.steps - map.stepsLeft;
  const boss = data.eco.get(region.boss.species);
  const area = data.rules.areas.find((a) => a.order === region.area);
  const cities = data.regions.filter((r) => r.area === region.area && !r.requiresItem);
  const areaBoss = cities[cities.length - 1]?.id === region.id;
  const milestones = Math.floor(region.steps / 1000);
  const blocked = cantFight(g);
  return (
    <Panel>
      <div class="muted tiny">Área {region.area}{area ? ` · ${area.name}` : ""} · ciudad {cities.findIndex((c) => c.id === region.id) + 1} de {cities.length}</div>
      <div class="amber title">Camino a {region.name}</div>
      {!compact && <p class="muted small">{region.description}</p>}
      <div class="route" role="img" aria-label={`${fmt(walked)} de ${fmt(region.steps)} pasos`}>
        <div class="route-fill" style={{ width: `${(walked / region.steps) * 100}%` }} />
        {Array.from({ length: milestones }, (_, i) => {
          const at = (i + 1) * 1000;
          if (at >= region.steps) return null;
          return <span key={i} class={`route-mark${walked >= at ? " passed" : ""}`} style={{ left: `${(at / region.steps) * 100}%` }}>{LANDMARKS[i % LANDMARKS.length]}</span>;
        })}
        <span class="route-mark boss" style={{ left: "100%" }}>{areaBoss ? "♛" : "★"}</span>
      </div>
      <div class="row small">
        <span class="grow">{fmt(walked)} / {fmt(region.steps)} pasos</span>
        <span class="muted">{map.bossReady ? "¡Has llegado!" : `faltan ${fmt(map.stepsLeft)}`}</span>
      </div>
      {!compact && boss && (
        <div class="row">
          <EcoImg id={boss.id} size={72} flip dim={!map.bossReady} />
          <div class="grow">
            <div class="strong" style={{ color: map.bossReady ? T.red : T.text }}>{map.bossReady ? `¡${boss.name} defiende la ciudad!` : `Jefe${areaBoss ? " de área" : ""}: ${boss.name}`}</div>
            <div class="muted small">
              Nivel {region.boss.level}. {map.bossReady ? "Sigue habiendo encuentros en el camino para entrenar." : "Te espera al llegar a la ciudad."}
              {areaBoss && " Vencerlo libera a un nuevo compañero."}
            </div>
          </div>
        </div>
      )}
      {map.bossReady && (
        <>
          {map.bossDefeats > 0 && <div class="small teal">Aún arrastra las heridas de {map.bossDefeats === 1 ? "tu último intento" : `tus ${map.bossDefeats} intentos`}.</div>}
          {blocked && <div class="small red">{blocked}</div>}
          <PixelButton title="¡Enfrentarse al jefe!" colour={P.red3} disabled={!!blocked} onClick={() => g.startBattle()} />
        </>
      )}
      {(map.luckySteps > 0 || map.radarActive) && (
        <div class="tags">
          {map.luckySteps > 0 && <Tag text={`Suerte: ${fmt(map.luckySteps)} pasos`} colour={P.amber3} />}
          {map.radarActive && <Tag text="Radar: próxima alerta SOS" colour={P.teal2} />}
        </div>
      )}
    </Panel>
  );
}

/** The healing spot, shrine and shop of the city you're heading to. */
function CityServices() {
  const g = useGame();
  const [shop, setShop] = useState(false);
  const { save, data } = g;
  const cost = g.peek(healCost);
  const offering = g.peek(shrineOffering);
  return (
    <Panel>
      <SectionTitle text="Servicios de la ciudad" />
      <div class="row">
        <div class="grow">
          <div class="strong">Centro de descanso</div>
          <div class="muted small">Vida al máximo y cura las heridas. {cost ? `${cost} bits` : "Gratis una vez al día"}.</div>
        </div>
        <PixelButton small title="Descansar" colour={P.green2} onClick={() => g.perform((s, d, rng) => cityHeal(s, d, rng))} />
      </div>
      <div class="row">
        <div class="grow">
          <div class="strong">Santuario</div>
          <div class="muted small">{save.cityDay.blessed ? "Ya te ha bendecido hoy." : `Bendición diaria: DP al máximo y vínculo +${data.rules.city.blessingBond}.`}</div>
        </div>
        <PixelButton small title="Rezar" colour={P.teal2} disabled={save.cityDay.blessed} onClick={() => g.perform((s, d, rng) => shrineBless(s, d, rng))} />
      </div>
      {offering && (
        <div class="row">
          <div class="grow">
            <div class="strong">Ofrenda: {offering.parche.name}</div>
            <div class="muted small">{offering.parche.description}</div>
          </div>
          <PixelButton small title={`${offering.cost} bits`} colour={save.bits >= offering.cost ? P.amber2 : P.slate} onClick={() => g.perform((s, d, rng) => shrineOffer(s, d, rng))} />
        </div>
      )}
      <PixelButton small title={shop ? "Cerrar tienda" : `Tienda (${fmt(save.bits)} bits)`} colour={P.mist} onClick={() => setShop(!shop)} />
      {shop && shopOffers(save, data).map((o) => (
        <div class="row" key={o.id}>
          <div class="grow">
            <div class="strong">{o.name}</div>
            <div class="muted small">{o.kind === "parche" ? "Parche · " : ""}{o.description}</div>
          </div>
          <PixelButton small title={`${o.price}`} colour={save.bits >= o.price ? P.amber2 : P.slate} onClick={() => g.perform((s, d) => shopBuy(s, o.id, d))} />
        </div>
      ))}
    </Panel>
  );
}

/** Eggs hatch with steps: their progress lives here, next to the road. */
function Incubator() {
  const { save, data } = useGame();
  if (!save.eggs.length) return null;
  return (
    <Panel>
      <SectionTitle text={`Incubadora (${save.eggs.length}/${data.rules.maxEggs})`} />
      {save.eggs.map((egg) => {
        const type = data.egg.get(egg.typeID);
        return type ? <StatBar key={egg.id} label={type.name} value={type.steps - egg.stepsLeft} max={type.steps} colour={P.pink} text={egg.stepsLeft ? `faltan ${fmt(egg.stepsLeft)}` : "¡Listo!"} /> : null;
      })}
    </Panel>
  );
}

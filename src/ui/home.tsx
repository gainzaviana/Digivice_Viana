import { useEffect, useRef, useState } from "preact/hooks";
import { partnerOf } from "../core/save";
import { maxStats } from "../systems/progression";
import { openCache } from "../systems/road";
import { useGame, game } from "../game";
import { sound } from "../audio/sound";
import type { HomeScene, HomeState } from "../three/home";
import { P } from "./theme";
import { AttackRow, Panel, PixelButton, SectionTitle, SpeciesTags, StatBar, fmt } from "./common";
import { PartnerStats, EvolutionTree } from "./partner";
import { CurrentCity } from "./map";
import { StepsPanel } from "./steps";

/** The partner's mood line, from its bond and state. */
function mood(bond: number, injured: boolean): string {
  if (injured) return "Está herido y un poco triste. Cuídalo en Cuidados.";
  if (bond >= 80) return "¡Te adora! Te sigue a todas partes dando saltitos.";
  if (bond >= 50) return "Está contento de caminar contigo.";
  if (bond >= 30) return "Te va cogiendo cariño.";
  return "Aún desconfía un poco: a veces no te hará caso en combate.";
}

/**
 * Home: a living Digivice view. The partner walks along the current city's road in its biome;
 * step events appear on the path and are tapped right there. Below, its status and details.
 */
export function HomeScreen({ go }: { go: (tab: number) => void }) {
  const g = useGame();
  const { save, data } = g;
  const canvas = useRef<HTMLCanvasElement>(null);
  const box = useRef<HTMLDivElement>(null);
  const scene = useRef<HomeScene>();
  const [ready, setReady] = useState(false);
  const partner = partnerOf(save);
  const region = save.map.regionID ? data.region.get(save.map.regionID) : undefined;

  useEffect(() => {
    let stop = false;
    let ro: ResizeObserver | undefined;
    const onSteps = (n: number) => scene.current?.pulse(n);
    void import("../three/home").then(({ HomeScene }) => {
      if (stop || !canvas.current) return;
      const s = new HomeScene(canvas.current, game.data, {
        effects: game.save.settings.graphicsEffects,
        onTapPartner: () => {
          const p = partnerOf(game.save);
          sound.play("tap");
          if (p) game.show(mood(p.bond, !!p.injured));
        },
        onTapEvent: (id) => tapEvent(id),
      });
      scene.current = s;
      const fit = () => { const r = box.current!.getBoundingClientRect(); s.resize(r.width, r.height); };
      fit();
      ro = new ResizeObserver(fit);
      ro.observe(box.current!);
      game.stepListeners.add(onSteps);
      setReady(true);
    });
    return () => { stop = true; ro?.disconnect(); game.stepListeners.delete(onSteps); scene.current?.destroy(); scene.current = undefined; };
  }, []);

  // Keep the scene in sync with the game on every update (cheap; it rebuilds only what changed).
  useEffect(() => {
    const s = scene.current;
    if (!s || !region) return;
    const h = new Date().getHours();
    const state: HomeState = {
      partner: partner ? { speciesID: partner.speciesID, variant: partner.variant, injured: !!partner.injured } : undefined,
      regionID: region.id,
      night: !(h >= 7 && h < 20),
      events: save.pending
        .filter((e) => e.kind === "battle" || e.kind === "cache" || e.kind === "sos" || e.kind === "hazard")
        .map((e) => ({ id: e.id, kind: e.kind as "battle" | "cache" | "sos" | "hazard", species: e.species, variant: e.variant })),
      progress: { walked: region.steps - save.map.stepsLeft, total: region.steps, bossReady: save.map.bossReady, bossSpecies: region.boss.species },
    };
    s.setState(state);
  });

  function tapEvent(id: string) {
    if (id === "boss") { game.startBattle(); return; }
    const e = game.save.pending.find((x) => x.id === id);
    if (!e) return;
    if (e.kind === "cache") { sound.play("reward"); game.perform((s, d, rng) => openCache(s, id, d, rng)); return; }
    if (e.kind === "battle" || e.kind === "sos") { game.startBattle(e); return; }
    go(2); // hazards (and anything else) are resolved in Sucesos
  }

  if (!partner) return null;
  const species = data.eco.get(partner.speciesID);
  const max = maxStats(partner, data);
  const roadEvents = save.pending.filter((e) => ["battle", "cache", "sos", "hazard"].includes(e.kind)).length;
  return (
    <div class="screen home">
      <div class="home-stage" ref={box}>
        <canvas ref={canvas} aria-label={`${species?.name ?? "Tu compañero"} caminando por ${region?.name ?? "el camino"}`} />
        {!ready && <div class="home-loading" aria-hidden="true" />}
        <div class="home-hud">
          <span class="hud-pill">{fmt(save.map.stepsLeft)} pasos a {region?.name ?? "la ciudad"}</span>
          {roadEvents > 0 && <button class="hud-pill alert" onClick={() => go(2)}>¡BIP! {roadEvents}</button>}
        </div>
      </div>
      <Panel>
        <div class="row">
          <div class="grow">
            <div class="title">{partner.nickname ?? species?.name}</div>
            {species && <SpeciesTags species={species} level={partner.level} variant={partner.variant} />}
          </div>
          {partner.injured && <PixelButton small title="Curar" colour={P.green2} onClick={() => go(3)} />}
        </div>
        <StatBar label="Vida" value={partner.hp} max={max.hp} colour={P.green2} text={`${partner.hp}/${max.hp}`} />
        <StatBar label="DP" value={partner.dp} max={data.rules.maxDP} colour={P.amber2} text={`${partner.dp}/${data.rules.maxDP}`} />
        <div class="muted small">{mood(partner.bond, !!partner.injured)}</div>
      </Panel>
      {region && <CurrentCity region={region} compact />}
      <StepsPanel />
      {save.eggs.length > 0 && (
        <Panel>
          <SectionTitle text={`Incubadora (${save.eggs.length}/${data.rules.maxEggs})`} />
          {save.eggs.map((egg) => {
            const type = data.egg.get(egg.typeID);
            return type ? <StatBar key={egg.id} label={type.name} value={type.steps - egg.stepsLeft} max={type.steps} colour={P.pink} text={egg.stepsLeft ? `faltan ${fmt(egg.stepsLeft)}` : "¡Listo!"} /> : null;
          })}
        </Panel>
      )}
      <PartnerStats eco={partner} />
      {species && (
        <Panel>
          <SectionTitle text="Ataques" />
          <AttackRow attack={species.basic} kind="basic" />
          <AttackRow kind="physical" species={species} />
          <AttackRow attack={species.signature} kind="strong" />
        </Panel>
      )}
      <EvolutionTree eco={partner} />
    </div>
  );
}

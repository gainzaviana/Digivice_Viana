import { useState } from "preact/hooks";
import type { Challenge, EcoSpecies } from "../data/models";
import { canClaim, claim, claimableCount, isClaimed, progress } from "../systems/challenges";
import { trainingSessionsLeft } from "../systems/training";
import { useGame } from "../game";
import { sound } from "../audio/sound";
import { P } from "./theme";
import { AttackRow, EcoImg, Panel, ProfilePanel, PixelButton, SectionTitle, Sheet, SpeciesTags, StatBar, Tag, fmt } from "./common";
import { TrainingMenu } from "./training";
import { SettingsScreen } from "./settings";

type Page = "entreno" | "retos" | "guia" | "ajustes";

/** The Tamer's Terminal: training, challenges, the field guide and settings. */
export function TerminalScreen() {
  const g = useGame();
  const [page, setPage] = useState<Page>();
  const close = () => setPage(undefined);
  if (page === "entreno") return <TrainingMenu onClose={close} />;
  if (page === "retos") return <ChallengesScreen onClose={close} />;
  if (page === "guia") return <GuideScreen onClose={close} />;
  if (page === "ajustes") return <SettingsScreen onClose={close} />;
  const ready = claimableCount(g.save, g.data);
  const rows: [Page, string, string, string, number?][] = [
    ["entreno", "Entrenamiento", `${trainingSessionsLeft(g.save, g.data)} sesiones hoy`, P.red3],
    ["retos", "Retos", ready > 0 ? `${ready} recompensa${ready === 1 ? "" : "s"} por recoger` : "Retos del día y logros", P.amber2, ready],
    ["guia", "Guía de Ecos", `${g.save.guide.seen.length} de ${g.data.ecos.length} vistos`, P.teal2],
    ["ajustes", "Ajustes", "Sonido, pasos, copia de seguridad y partida", P.slate],
  ];
  return (
    <div class="screen">
      <h1 class="logo small-logo">TERMINAL</h1>
      {rows.map(([id, title, subtitle, accent, badge]) => (
        <button class="panel nav-row" key={id} onClick={() => setPage(id)}>
          <span class="nav-dot" style={{ background: accent }} aria-hidden="true" />
          <div class="grow">
            <div class="title">{title}</div>
            <div class="muted small">{subtitle}</div>
          </div>
          {!!badge && <Tag text={String(badge)} colour={P.amber2} />}
          <span class="muted">›</span>
        </button>
      ))}
    </div>
  );
}

function ChallengesScreen({ onClose }: { onClose: () => void }) {
  const g = useGame();
  const { save, data } = g;
  const today = save.daily.chosen.map((id) => data.challenges.find((c) => c.id === id)).filter((c): c is Challenge => !!c);
  const order = (c: Challenge) => (canClaim(save, c) ? 0 : isClaimed(save, c) ? 2 : 1);
  const lifetime = data.challenges.filter((c) => !c.daily).sort((a, b) => order(a) - order(b));
  return (
    <Sheet title="Retos" onClose={onClose}>
      <SectionTitle text="Retos de hoy" />
      <div class="muted small">Se renuevan cada día a medianoche. Solo cuentan desde que empieza el día.</div>
      {today.map((c) => <ChallengeRow key={c.id} c={c} />)}
      <SectionTitle text={`Logros (${save.claimedAchievements.length}/${lifetime.length})`} />
      {lifetime.map((c) => <ChallengeRow key={c.id} c={c} />)}
    </Sheet>
  );
}

function ChallengeRow({ c }: { c: Challenge }) {
  const g = useGame();
  const { save, data } = g;
  const value = Math.min(progress(save, c), c.target);
  const claimed = isClaimed(save, c);
  const ready = canClaim(save, c);
  const reward = [
    c.reward.bits > 0 ? `${c.reward.bits} bits` : "",
    c.reward.item ? data.item.get(c.reward.item)?.name ?? c.reward.item : "",
    c.reward.parche ? data.parche.get(c.reward.parche)?.name ?? c.reward.parche : "",
  ].filter(Boolean).join(" · ");
  return (
    <Panel pad={12} class={claimed ? "faded" : ""}>
      <div class="row">
        <div class="grow strong">{c.name}</div>
        {claimed && <Tag text="Recogido" colour={P.slate} ink={P.white} />}
      </div>
      <div class="muted small">{c.description}</div>
      <StatBar label="Progreso" value={value} max={c.target} colour={ready ? P.green2 : P.amber2} text={`${fmt(value)}/${fmt(c.target)}`} />
      <div class="row">
        <div class="grow small amber">Premio: {reward}</div>
        {ready && <PixelButton small title="Recoger" colour={P.green2} onClick={() => { sound.play("reward"); g.perform((s, d) => claim(s, c.id, d)); }} />}
      </div>
    </Panel>
  );
}

type Filter = "Todos" | "Compañeros" | "Salvajes" | "Parches";

function GuideScreen({ onClose }: { onClose: () => void }) {
  const g = useGame();
  const { save, data } = g;
  const guide = save.guide;
  const [filter, setFilter] = useState<Filter>("Todos");
  const [selected, setSelected] = useState<EcoSpecies>();
  if (selected) return <GuideEntry species={selected} onClose={() => setSelected(undefined)} />;
  const shown = filter === "Compañeros" ? data.ecos.filter((e) => e.line) : filter === "Salvajes" ? data.ecos.filter((e) => !e.line) : data.ecos;
  return (
    <Sheet title="Guía de Ecos" onClose={onClose}>
      <div class="counters">
        {([["Vistos", guide.seen.length], ["Vencidos", guide.defeated.length], ["Tuyos", guide.owned.length]] as const).map(([l, v]) => (
          <div key={l}><div class="title amber">{v}</div><div class="muted small">{l}</div></div>
        ))}
      </div>
      <div class="segmented">
        {(["Todos", "Compañeros", "Salvajes", "Parches"] as Filter[]).map((f) => (
          <button key={f} class={f === filter ? "on" : ""} onClick={() => setFilter(f)}>{f}</button>
        ))}
      </div>
      {filter === "Parches" ? data.parches.map((p) => {
        const known = guide.discoveredParches.includes(p.id);
        return (
          <Panel pad={10} key={p.id}>
            <div class="strong">{known ? p.name : "???"}</div>
            <div class="muted small">{known ? p.description : "Aún no has encontrado este Parche."}</div>
          </Panel>
        );
      }) : (
        <div class="grid4">
          {shown.map((eco) => {
            const seen = guide.seen.includes(eco.id);
            const index = data.ecos.indexOf(eco);
            return (
              <button class="guide-cell" key={eco.id} onClick={() => seen && setSelected(eco)} aria-label={seen ? eco.name : "Eco desconocido"}>
                <EcoImg id={eco.id} size={64} silhouette={!seen} />
                <div class="tiny">{seen ? eco.name : `Nº ${index + 1}`}</div>
                <div class="tiny">
                  {guide.owned.includes(eco.id) && <span class="amber">★</span>}
                  {guide.defeated.includes(eco.id) && <span class="green">✓</span>}
                </div>
              </button>
            );
          })}
        </div>
      )}
    </Sheet>
  );
}

function GuideEntry({ species, onClose }: { species: EcoSpecies; onClose: () => void }) {
  const g = useGame();
  const { data } = g;
  const guide = g.save.guide;
  const from = data.ecos.filter((e) => e.evolutions.some((v) => v.to === species.id));
  const into = species.evolutions.map((v) => data.eco.get(v.to)).filter((e): e is EcoSpecies => !!e);
  const fusions = data.fusions.filter((f) => f.parts.includes(species.id) || f.result === species.id);
  const habitats = data.regions.filter((r) => r.encounters.some((e) => e.species === species.id));
  const boss = data.regions.filter((r) => r.boss.species === species.id);
  const known = (id: string) => guide.seen.includes(id);
  const line = (label: string, e: EcoSpecies) => (
    <div class="row" key={label + e.id}>
      <EcoImg id={e.id} size={40} silhouette={!known(e.id)} />
      <span class="small">{label}: {known(e.id) ? e.name : "???"}</span>
    </div>
  );
  return (
    <Sheet title={species.name} onClose={onClose}>
      <div class="center">
        <div class="sprite-frame"><EcoImg id={species.id} size={160} /></div>
        <SpeciesTags species={species} archetype />
        <p class="muted small">{species.description}</p>
      </div>
      <ProfilePanel species={species} />
      <Panel>
        <SectionTitle text="Ataques" />
        <AttackRow attack={species.basic} kind="basic" />
        <AttackRow attack={species.signature} kind="strong" />
      </Panel>
      {(from.length > 0 || into.length > 0 || fusions.length > 0) && (
        <Panel>
          <SectionTitle text="Evolución" />
          {from.map((e) => line("Viene de", e))}
          {into.map((e) => line("Evoluciona en", e))}
          {fusions.map((f) => (
            <div class="small" key={f.id}>
              Fusión: {f.parts.map((p) => (known(p) ? data.eco.get(p)?.name ?? p : "???")).join(" + ")} → {known(f.result) ? data.eco.get(f.result)?.name : "???"}
            </div>
          ))}
        </Panel>
      )}
      <Panel>
        <SectionTitle text="Dónde encontrarlo" />
        {habitats.length === 0 && boss.length === 0 && (
          <div class="muted small">
            {species.line ? "Compañero inicial, o en Huevos Raros y Ancestrales; sus formas superiores se alcanzan evolucionando." : "Solo evolucionando o fusionando."}
          </div>
        )}
        {habitats.map((r) => <div class="small" key={r.id}>Zona {r.order} · {r.name}</div>)}
        {boss.map((r) => <div class="small red" key={"b" + r.id}>Jefe de {r.name} (nivel {r.boss.level})</div>)}
      </Panel>
    </Sheet>
  );
}

import { useState } from "preact/hooks";
import { STAGE_NAME, STAGE_TIER, TIER_NAME, type EcoSpecies } from "../data/models";
import { game } from "../game";
import { AttackRow, Confirm, EcoImg, Panel, PixelButton, ProfilePanel, SectionTitle, Sheet, SpeciesTags } from "./common";

/** Choosing the partner that starts the adventure. */
export function StarterSelect() {
  const [selected, setSelected] = useState<EcoSpecies>();
  if (selected) return <StarterDetail species={selected} onBack={() => setSelected(undefined)} />;
  return (
    <div class="screen">
      <header class="center">
        <h1 class="logo">ENLACE</h1>
        <h2 class="title">Elige a tu compañero</h2>
        <p class="muted">Te acompañará por La Red Profunda. Podrás reclutar más Ecos por el camino.</p>
      </header>
      <div class="grid2">
        {game.data.starters.map((s) => (
          <button class="card" key={s.id} onClick={() => setSelected(s)}>
            <EcoImg id={s.id} size={112} />
            <div class="strong">{s.name}</div>
            <SpeciesTags species={s} archetype />
          </button>
        ))}
      </div>
    </div>
  );
}

function StarterDetail({ species, onBack }: { species: EcoSpecies; onBack: () => void }) {
  const [confirming, setConfirming] = useState(false);
  const data = game.data;
  const forms = species.line ? data.formsOfLine(species.line) : [];
  const mainTargets = new Set(forms.map((f) => f.evolutions[0]?.to).filter(Boolean));
  const isAlternative = (f: EcoSpecies) => forms.filter((x) => x.stage === f.stage).length > 1 && !mainTargets.has(f.id);
  return (
    <Sheet title={species.name} onClose={onBack}>
      <div class="center">
        <div class="sprite-frame"><EcoImg id={species.id} size={176} /></div>
        <SpeciesTags species={species} archetype />
        <p class="muted">{species.description}</p>
      </div>
      <ProfilePanel species={species} />
      <Panel>
        <SectionTitle text="Ataques" />
        <AttackRow attack={species.basic} kind="basic" />
        <AttackRow attack={species.signature} kind="strong" />
      </Panel>
      {forms.length > 0 && (
        <Panel>
          <SectionTitle text="Su línea evolutiva" />
          {forms.map((f) => (
            <div class="row" key={f.id}>
              <EcoImg id={f.id} size={48} silhouette={f.id !== species.id} />
              <div class="grow">
                <div class="strong">{f.id === species.id ? f.name : "???"}</div>
                <div class="muted small">{TIER_NAME[STAGE_TIER[f.stage]]} · {STAGE_NAME[f.stage]}{isAlternative(f) ? " · rama alternativa" : ""}</div>
              </div>
            </div>
          ))}
        </Panel>
      )}
      <PixelButton title={`Elegir a ${species.name}`} onClick={() => setConfirming(true)} />
      {confirming && (
        <Confirm
          title={`¿Empezar la aventura con ${species.name}?`}
          text="Tu compañero no se puede cambiar, pero podrás reclutar a otros Ecos."
          ok="¡Vamos!"
          onOk={() => game.startNewGame(species.id)}
          onCancel={() => setConfirming(false)}
        />
      )}
    </Sheet>
  );
}

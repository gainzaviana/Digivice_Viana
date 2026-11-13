import { useState } from "preact/hooks";
import { STAGE_NAME, type EcoSpecies } from "../data/models";
import { game } from "../game";
import { PALETTE as P } from "../art/palette";
import { AttackRow, Confirm, EcoImg, Panel, PixelButton, SectionTitle, Sheet, SpeciesTags, StatBar } from "./common";

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
      <Panel>
        <SectionTitle text="Estadísticas" />
        <StatBar label="Vida" value={species.stats.hp} max={90} colour={P.green2} />
        <StatBar label="Ataque" value={species.stats.atk} max={30} colour={P.red2} />
        <StatBar label="Defensa" value={species.stats.def} max={30} colour={P.blue2} />
        <StatBar label="Velocidad" value={species.stats.spd} max={30} colour={P.teal2} />
        <StatBar label="DP" value={species.stats.dp} max={60} colour={P.amber2} />
      </Panel>
      <Panel>
        <SectionTitle text="Ataques" />
        <AttackRow attack={species.basic} kind="Básico" />
        <AttackRow attack={species.signature} kind="Especial" />
      </Panel>
      {forms.length > 0 && (
        <Panel>
          <SectionTitle text="Su línea evolutiva" />
          {forms.map((f) => (
            <div class="row" key={f.id}>
              <EcoImg id={f.id} size={48} silhouette={f.id !== species.id} />
              <div class="grow">
                <div class="strong">{f.id === species.id ? f.name : "???"}</div>
                <div class="muted small">{STAGE_NAME[f.stage]}{isAlternative(f) ? " · forma alternativa" : ""}</div>
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

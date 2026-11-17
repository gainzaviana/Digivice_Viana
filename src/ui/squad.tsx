import { useState } from "preact/hooks";
import type { CardRarity, Item } from "../data/models";
import { addToDeck, makePartner, removeFromDeck, useItem } from "../systems/actions";
import { useGame } from "../game";
import { P, T } from "./theme";
import { EcoImg, Panel, PixelButton, SectionTitle, StatBar, Tag, VariantTag, StarsTag, fmt } from "./common";
import { STAGE_NAME } from "../data/models";

type Section = "Ecos" | "Huevos" | "Objetos" | "Parches";
const SECTIONS: Section[] = ["Ecos", "Huevos", "Objetos", "Parches"];

export function SquadScreen() {
  const [section, setSection] = useState<Section>("Ecos");
  return (
    <div class="screen">
      <div class="segmented" role="tablist">
        {SECTIONS.map((s) => (
          <button key={s} role="tab" aria-selected={s === section} class={s === section ? "on" : ""} onClick={() => setSection(s)}>{s}</button>
        ))}
      </div>
      {section === "Ecos" && <EcosList />}
      {section === "Huevos" && <EggsList />}
      {section === "Objetos" && <ItemsList />}
      {section === "Parches" && <DeckEditor />}
    </div>
  );
}

function EcosList() {
  const g = useGame();
  const { save, data } = g;
  return (
    <>
      <SectionTitle text={`Equipo (${save.squad.length}/${data.rules.squadCap})`} />
      <div class="muted tiny">Solo puedes tener un Eco de cada especie. Si un huevo trae uno que ya tienes, o vences a un Brillante de su especie, el tuyo despierta: ★ y más Vida, AP y SP para siempre.</div>
      {save.squad.map((eco) => {
        const sp = data.eco.get(eco.speciesID);
        if (!sp) return null;
        return (
          <Panel pad={10} key={eco.id}>
            <div class="row">
              <EcoImg id={eco.speciesID} variant={eco.variant} size={56} />
              <div class="grow">
                <div class="strong">{eco.nickname ?? sp.name}</div>
                <div class="tags">
                  <Tag text={STAGE_NAME[sp.stage]} colour={P.amber2} />
                  <Tag text={`Nv. ${eco.level}`} colour={P.slate} ink={P.white} />
                  <VariantTag variant={eco.variant} />
                  <StarsTag stars={eco.awakening} />
                </div>
              </div>
              {eco.id === save.partnerID
                ? <Tag text="Compañero" colour={P.green2} />
                : <PixelButton small title="Elegir" colour={P.mist} onClick={() => g.perform((s, d) => makePartner(s, eco.id, d))} />}
            </div>
          </Panel>
        );
      })}
    </>
  );
}

function EggsList() {
  const g = useGame();
  const { save, data } = g;
  return (
    <>
      <SectionTitle text={`Huevos (${save.eggs.length}/${data.rules.maxEggs})`} />
      {save.eggs.length === 0 && <Panel><div class="muted small">No llevas huevos. A veces aparecen por el camino.</div></Panel>}
      {save.eggs.map((egg) => {
        const type = data.egg.get(egg.typeID);
        if (!type) return null;
        return (
          <Panel key={egg.id}>
            <div class="strong">{type.name}</div>
            <div class="muted small">{type.description}</div>
            <StatBar label="Pasos" value={type.steps - egg.stepsLeft} max={type.steps} colour={P.pink} text={egg.stepsLeft === 0 ? "¡Listo!" : `faltan ${fmt(egg.stepsLeft)}`} />
            {egg.stepsLeft === 0 && <div class="small amber">Se abrirá en cuanto tengas sitio en el equipo.</div>}
          </Panel>
        );
      })}
    </>
  );
}

const usable = (i: Item) => !["cristal", "fusion", "clave"].includes(i.kind);

function ItemsList() {
  const g = useGame();
  const { save, data } = g;
  const owned = data.items.filter((i) => (save.inventory[i.id] ?? 0) > 0);
  return (
    <>
      <SectionTitle text={`Objetos · ${fmt(save.bits)} bits`} />
      {owned.length === 0 && <Panel><div class="muted small">No llevas objetos.</div></Panel>}
      {owned.map((item) => (
        <Panel pad={10} key={item.id}>
          <div class="row">
            <div class="grow">
              <div class="strong">{item.name} ×{save.inventory[item.id]}</div>
              <div class="muted small">{item.description}</div>
            </div>
            {usable(item) && <PixelButton small title="Usar" colour={P.green2} onClick={() => g.perform((s, d, rng) => useItem(s, item.id, d, rng))} />}
          </div>
        </Panel>
      ))}
    </>
  );
}

/** Text colour of a Parche by rarity. */
export const RARITY_COLOUR: Record<CardRarity, string> = { comun: T.text, rara: T.blue, epica: T.purple };

function DeckEditor() {
  const g = useGame();
  const { save, data } = g;
  const owned = data.parches.filter((p) => (save.parches[p.id] ?? 0) > 0);
  return (
    <>
      <SectionTitle text={`Baraja (${save.deck.length}/${data.rules.deckSize})`} />
      <div class="muted small">En combate puedes deslizar un Parche de tu baraja por turno, antes de atacar.</div>
      {owned.length === 0 && <Panel><div class="muted small">Aún no tienes Parches.</div></Panel>}
      {owned.map((p) => {
        const inDeck = save.deck.filter((x) => x === p.id).length;
        const count = save.parches[p.id] ?? 0;
        return (
          <Panel pad={10} key={p.id}>
            <div class="row">
              <div class="grow">
                <div class="strong" style={{ color: RARITY_COLOUR[p.rarity] }}>{p.name}</div>
                <div class="muted small">{p.description}</div>
                <div class="small teal">En baraja {inDeck} de {count}</div>
              </div>
              <PixelButton small title="−" colour={P.mist} disabled={inDeck === 0} onClick={() => g.perform((s, d) => removeFromDeck(s, p.id, d))} />
              <PixelButton small title="+" colour={P.amber2} disabled={inDeck >= count || save.deck.length >= data.rules.deckSize} onClick={() => g.perform((s, d) => addToDeck(s, p.id, d))} />
            </div>
          </Panel>
        );
      })}
    </>
  );
}

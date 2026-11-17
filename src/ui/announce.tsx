import { useEffect } from "preact/hooks";
import { game, useGame } from "../game";
import { sound } from "../audio/sound";
import { statText } from "../systems/progression";
import { P } from "./theme";
import { EcoImg, PixelButton } from "./common";

const SOURCE = { egg: "De un huevo", wild: "Capturado en el camino", recruit: "Se une a ti" } as const;

/**
 * The big moments, one at a time: a Species Resonance (a duplicate awakened your Eco) or a new
 * Eco joining (a Brillante caught in the wild, an egg hatching). Tap to continue.
 */
export function Announcements() {
  const g = useGame();
  const a = g.save.announcements[0];
  const eco = a && g.save.squad.find((e) => e.id === a.ecoID);
  useEffect(() => { if (a) sound.play(a.kind === "awakening" ? "evolve" : "hatch"); }, [a?.id]);
  if (!a) return null;
  const dismiss = () => { game.save.announcements.shift(); game.persist(); };
  const species = g.data.eco.get(a.speciesID);
  const name = eco?.nickname ?? species?.name ?? "Tu Eco";
  const shiny = a.variant === "brillante";
  const title = a.kind === "awakening" ? "¡Resonancia de especie!" : shiny ? "¡Eco Brillante!" : "¡Nuevo Eco!";
  return (
    <div class="modal-backdrop announce-backdrop" onClick={dismiss}>
      <div class={`announce ${a.kind}${shiny ? " shiny" : ""}`} role="dialog" aria-label={title} onClick={(e) => e.stopPropagation()}>
        <div class="announce-rays" aria-hidden="true" />
        <div class="announce-kicker">{SOURCE[a.source]}</div>
        <h2 class="announce-title">{title}</h2>
        <div class="announce-eco">
          <EcoImg id={a.speciesID} variant={a.variant} size={168} />
        </div>
        <div class="title">{name}{shiny ? " ✨" : ""}</div>
        {a.kind === "awakening" && (
          <>
            {!!a.stars && (
              <div class="announce-stars" aria-label={`${a.stars} estrellas`}>
                {Array.from({ length: g.data.rules.awakening.maxStars }, (_, i) => (
                  <span key={i} class={i < a.stars! ? "on" : ""} style={{ animationDelay: `${0.25 + i * 0.12}s` }}>★</span>
                ))}
              </div>
            )}
            {a.gains
              ? <div class="announce-gains"><span>Vida +{a.gains.hp}</span><span>AP +{statText(a.gains.ap)}</span><span>SP +{statText(a.gains.sp)}</span></div>
              : <div class="small">Ya tenía todas las estrellas: +{a.bits} bits.</div>}
            <p class="small muted">Otro {species?.name ?? "Eco"} ha resonado con el tuyo y lo ha despertado. Las mejoras son para siempre.</p>
            {a.turnedBrillante && <div class="strong amber">✨ ¡Ahora luce colores Brillantes!</div>}
          </>
        )}
        {a.kind === "newEco" && <p class="small muted">Se une a tu equipo en nivel {eco?.level ?? 1}. Elígelo en Equipo y entrénalo en las primeras ciudades.</p>}
        <PixelButton title="¡Genial!" colour={shiny ? P.amber2 : P.teal2} onClick={dismiss} />
        {g.save.announcements.length > 1 && <div class="tiny muted">y {g.save.announcements.length - 1} más</div>}
      </div>
    </div>
  );
}

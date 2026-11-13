import type { MerchantOffer, PendingEvent } from "../core/save";
import { partnerOf } from "../core/save";
import { acceptRecruit, buy, declineRecruit, flee, leave, makeOffering, receiveBlessing } from "../systems/actions";
import { useGame } from "../game";
import { P, T } from "./theme";
import { EcoImg, Panel, PixelButton, SectionTitle, SpeciesTags, fmt } from "./common";

export function EventsScreen() {
  const g = useGame();
  const { save, data } = g;
  return (
    <div class="screen">
      <SectionTitle text={`Pendientes (${save.pending.length}/${data.rules.maxPendingEvents})`} />
      {save.pending.length === 0 && <Panel><div class="muted">Nada pendiente. Activa el contador de pasos y sal a caminar.</div></Panel>}
      {save.pending.length >= data.rules.maxPendingEvents && (
        <div class="small red">Tienes el máximo de sucesos pendientes: los nuevos pasarán de largo hasta que resuelvas alguno.</div>
      )}
      {save.pending.map((e) => {
        switch (e.kind) {
          case "battle": return <BattleCard key={e.id} event={e} />;
          case "recruit": return <RecruitCard key={e.id} event={e} />;
          case "merchant": return <MerchantCard key={e.id} event={e} />;
          case "shrine": return <ShrineCard key={e.id} event={e} />;
        }
      })}
      <SectionTitle text="Registro" />
      <Panel>
        {save.log.length === 0 && <div class="muted small">Aún no ha pasado nada.</div>}
        {save.log.slice(0, 40).map((l) => (
          <div class="log-row" key={l.id}>
            <span class="muted small">{new Date(l.date).toLocaleTimeString("es", { hour: "2-digit", minute: "2-digit" })}</span>
            <span class="small">{l.text}</span>
          </div>
        ))}
      </Panel>
    </div>
  );
}

function WildEco({ event, title }: { event: PendingEvent; title: string }) {
  const data = useGame().data;
  const species = event.species ? data.eco.get(event.species) : undefined;
  if (!species) return null;
  return (
    <div class="row">
      <EcoImg id={species.id} variant={event.variant} size={80} flip />
      <div class="grow">
        <div class="muted small">{title}</div>
        <div class="title">{species.name}</div>
        <SpeciesTags species={species} level={event.level ?? 1} variant={event.variant} />
      </div>
    </div>
  );
}

function BattleCard({ event }: { event: PendingEvent }) {
  const g = useGame();
  const exhausted = (partnerOf(g.save)?.hp ?? 0) <= 0;
  return (
    <Panel>
      <WildEco event={event} title="¡Un Eco salvaje te corta el paso!" />
      {exhausted && <div class="small red">Tu compañero está agotado. Camina para que se recupere o usa un Disco Vida.</div>}
      <div class="buttons">
        <PixelButton title="Huir" colour={P.mist} onClick={() => g.perform((s, d) => flee(s, event.id, d))} />
        <PixelButton title="¡Luchar!" colour={P.red3} disabled={exhausted} onClick={() => g.startBattle(event)} />
      </div>
    </Panel>
  );
}

function RecruitCard({ event }: { event: PendingEvent }) {
  const g = useGame();
  const full = g.save.squad.length >= g.data.rules.squadCap;
  return (
    <Panel>
      <WildEco event={event} title="Quiere unirse a tu equipo" />
      {full && <div class="small red">Tu equipo está lleno ({g.data.rules.squadCap} Ecos). Libera sitio antes de aceptar.</div>}
      <div class="buttons">
        <PixelButton title="Rechazar" colour={P.mist} onClick={() => g.perform((s, d) => declineRecruit(s, event.id, d))} />
        {!full && <PixelButton title="Aceptar" colour={P.green2} onClick={() => g.perform((s, d) => acceptRecruit(s, event.id, d))} />}
      </div>
    </Panel>
  );
}

function MerchantCard({ event }: { event: PendingEvent }) {
  const g = useGame();
  const { data } = g;
  const name = (o: MerchantOffer) => (o.kind === "item" ? data.item.get(o.contentID)?.name : data.parche.get(o.contentID)?.name) ?? o.contentID;
  const detail = (o: MerchantOffer) => (o.kind === "item" ? data.item.get(o.contentID)?.description ?? "" : `Parche · ${data.parche.get(o.contentID)?.description ?? ""}`);
  return (
    <Panel>
      <div class="title amber">Mercader ambulante</div>
      <div class="muted small">Tienes {fmt(g.save.bits)} bits.</div>
      {(event.offers ?? []).map((o) => (
        <div class="row" key={o.id}>
          <div class="grow">
            <div class="strong">{name(o)}</div>
            <div class="muted small">{detail(o)}</div>
          </div>
          {o.sold ? <span class="muted small">Vendido</span> : (
            <PixelButton small title={`${o.price} bits`} colour={g.save.bits >= o.price ? P.amber2 : P.slate} onClick={() => g.perform((s, d) => buy(s, o.id, event.id, d))} />
          )}
        </div>
      ))}
      <PixelButton title="Marcharse" colour={P.mist} onClick={() => g.perform((s) => leave(s, event.id))} />
    </Panel>
  );
}

function ShrineCard({ event }: { event: PendingEvent }) {
  const g = useGame();
  const parche = event.parche ? g.data.parche.get(event.parche) : undefined;
  const cost = event.cost ?? 0;
  return (
    <Panel>
      <div class="title teal">Santuario misterioso</div>
      <p class="muted small">Una voz te ofrece dos caminos: una bendición gratuita, o un Parche a cambio de una ofrenda.</p>
      {parche && (
        <div>
          <div class="strong" style={{ color: parche.rarity === "epica" ? T.purple : T.blue }}>{parche.name}{parche.rarity === "epica" ? " · épica" : " · rara"}</div>
          <div class="muted small">{parche.description}</div>
        </div>
      )}
      <div class="buttons">
        <PixelButton title="Bendición" colour={P.teal2} onClick={() => g.perform((s, d) => receiveBlessing(s, event.id, d))} />
        <PixelButton title={`Ofrenda: ${cost}`} colour={g.save.bits >= cost ? P.amber2 : P.slate} onClick={() => g.perform((s, d) => makeOffering(s, event.id, d))} />
      </div>
    </Panel>
  );
}

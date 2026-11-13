import type { ComponentChildren } from "preact";
import { AFFINITY_NAME, ARCHETYPE_NAME, STAGE_NAME, STAGE_TIER, TIER_NAME, type Affinity, type Attack, type EcoSpecies } from "../data/models";
import { VARIANT_NAME, type Variant } from "../core/save";
import { ecoDataURL } from "../art/sprite";
import { PALETTE as P } from "../art/palette";
import { game } from "../game";
import { sound } from "../audio/sound";

// Shared interface pieces in the game's pixel style: palette colours, 2px borders,
// small corner radius, monospaced type.

export const AFFINITY_COLOUR: Record<Affinity, string> = { pulso: P.pulso, senal: P.senal, ruido: P.ruido };
export const fmt = (n: number) => n.toLocaleString("es");

export function Panel({ children, pad, class: cls }: { children: ComponentChildren; pad?: number; class?: string }) {
  return <section class={`panel ${cls ?? ""}`} style={pad !== undefined ? { padding: `${pad}px` } : undefined}>{children}</section>;
}

export const SectionTitle = ({ text }: { text: string }) => <h2 class="section-title">{text}</h2>;

export function Tag({ text, colour = P.slate, ink = P.outline }: { text: string; colour?: string; ink?: string }) {
  return <span class="tag" style={{ background: colour, color: ink }}>{text}</span>;
}

export const AffinityTag = ({ affinity }: { affinity: Affinity }) => <Tag text={AFFINITY_NAME[affinity]} colour={AFFINITY_COLOUR[affinity]} />;

export function VariantTag({ variant }: { variant?: Variant }) {
  if (!variant || variant === "normal") return null;
  return <Tag text={VARIANT_NAME[variant]} colour={variant === "brillante" ? P.amber3 : P.purple2} />;
}

export function SpeciesTags({ species, level, variant, archetype }: { species: EcoSpecies; level?: number; variant?: Variant; archetype?: boolean }) {
  return (
    <div class="tags">
      <Tag text={`${TIER_NAME[STAGE_TIER[species.stage]]} · ${STAGE_NAME[species.stage]}`} colour={P.amber2} />
      <AffinityTag affinity={species.affinity} />
      {archetype && <Tag text={ARCHETYPE_NAME[species.archetype]} colour={P.slate} ink={P.white} />}
      {level !== undefined && <Tag text={`Nivel ${level}`} colour={P.slate} ink={P.white} />}
      <VariantTag variant={variant} />
    </div>
  );
}

export function StatBar({ label, value, max, colour = P.amber2, text }: { label: string; value: number; max: number; colour?: string; text?: string }) {
  const fraction = max > 0 ? Math.min(1, Math.max(0, value / max)) : 0;
  return (
    <div class="stat" role="meter" aria-label={label} aria-valuenow={value} aria-valuemax={max}>
      <span class="stat-label">{label}</span>
      <span class="stat-bar"><span style={{ width: `${fraction * 100}%`, background: colour }} /></span>
      <span class="stat-value">{text ?? fmt(value)}</span>
    </div>
  );
}

export function PixelButton({ title, colour = P.amber2, onClick, disabled, small }: { title: string; colour?: string; onClick: () => void; disabled?: boolean; small?: boolean }) {
  return (
    <button
      class={`pixel-button${small ? " small" : ""}`}
      style={{ background: disabled ? P.slate : colour }}
      disabled={disabled}
      onClick={() => { sound.play("tap"); onClick(); }}
    >
      {title}
    </button>
  );
}

/** An Eco's sprite, pixel-crisp. Silhouette for not-yet-seen ones. */
export function EcoImg({ id, variant = "normal", size = 96, flip, silhouette, dim }: { id: string; variant?: Variant; size?: number; flip?: boolean; silhouette?: boolean; dim?: boolean }) {
  const species = game.data.eco.get(id);
  return (
    <img
      class={`eco-img${silhouette ? " silhouette" : ""}`}
      src={ecoDataURL(id, variant, game.data)}
      width={size}
      height={size}
      alt={silhouette ? "Eco desconocido" : species?.name ?? id}
      style={{ transform: flip ? "scaleX(-1)" : undefined, opacity: dim ? 0.35 : 1 }}
      draggable={false}
    />
  );
}

/** An attack: Basic (AP × 1.0, fast, pierces Strong) or Strong (AP × 2.2, costs 1 Carga). */
export function AttackRow({ attack, kind }: { attack: Attack; kind: "basic" | "strong" }) {
  const b = game.data.rules.battle;
  return (
    <div class="row">
      <div class="grow">
        <div class="strong">{attack.name}</div>
        <div class="muted small">{kind === "basic" ? "Básico · rápido, atraviesa al especial" : "Especial · choca con otros especiales"}</div>
      </div>
      <span class="small">AP ×{kind === "basic" ? b.basicAP : b.strongAP}</span>
      <span class="small amber">{kind === "basic" ? "Libre" : "1 Carga"}</span>
    </div>
  );
}

/** A line's stat profile: level 1 values and growth per level. */
export function ProfilePanel({ species }: { species: EcoSpecies }) {
  const p = game.data.rules.archetypes[species.archetype];
  const row = (label: string, base: number, growth: number, max: number, colour: string) => (
    <StatBar label={label} value={base} max={max} colour={colour} text={`${base} (+${growth}/nv.)`} />
  );
  return (
    <Panel>
      <SectionTitle text={`Estadísticas a nivel 1 · ${ARCHETYPE_NAME[species.archetype]}`} />
      {row("Vida (HP)", p.base.hp, p.growth.hp, 26, P.green2)}
      {row("Ataque (AP)", p.base.ap, p.growth.ap, 6, P.red2)}
      {row("Velocidad (SP)", p.base.sp, p.growth.sp, 6, P.teal2)}
      <div class="muted tiny">El SP decide quién dispara antes y la probabilidad de esquivar. El DP (0–{game.data.rules.maxDP}) se gana caminando y sirve para evolucionar antes de un combate y usar Parches.</div>
    </Panel>
  );
}

/** A confirmation dialog in the game's style. */
export function Confirm({ title, text, ok, onOk, onCancel, danger }: { title: string; text: string; ok: string; onOk: () => void; onCancel: () => void; danger?: boolean }) {
  return (
    <div class="modal-backdrop" onClick={onCancel}>
      <div class="modal panel" role="alertdialog" aria-label={title} onClick={(e) => e.stopPropagation()}>
        <h3 class="modal-title">{title}</h3>
        <p class="muted">{text}</p>
        <div class="buttons">
          <PixelButton title="Cancelar" colour={P.mist} onClick={onCancel} />
          <PixelButton title={ok} colour={danger ? P.red3 : P.amber2} onClick={onOk} />
        </div>
      </div>
    </div>
  );
}

/** A full-height sheet over the tabs, with a close button. */
export function Sheet({ title, onClose, children }: { title: string; onClose: () => void; children: ComponentChildren }) {
  return (
    <div class="sheet" role="dialog" aria-label={title}>
      <header class="sheet-header">
        <button class="link-button" onClick={onClose}>‹ Volver</button>
        <h1>{title}</h1>
      </header>
      <div class="screen">{children}</div>
    </div>
  );
}

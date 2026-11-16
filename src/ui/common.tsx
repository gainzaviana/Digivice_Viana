import type { ComponentChildren } from "preact";
import { useEffect, useState } from "preact/hooks";
import { AFFINITY_NAME, ARCHETYPE_NAME, STAGE_NAME, STAGE_TIER, TIER_NAME, type Affinity, type Attack, type EcoSpecies } from "../data/models";
import { VARIANT_NAME, type Variant } from "../core/save";
import { P } from "./theme";
import { game } from "../game";
import { physicalName } from "../systems/moves";
import { sound } from "../audio/sound";

// Shared interface pieces in the game's cozy style: frosted rounded panels, soft pills and
// tactile buttons. Colours are CSS variables (./theme), so they follow the light/dark theme.

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

/** A tactile pill button. Quiet (secondary) when its colour is the neutral one. */
export function PixelButton({ title, colour = P.amber2, onClick, disabled, small }: { title: string; colour?: string; onClick: () => void; disabled?: boolean; small?: boolean }) {
  const quiet = colour === P.mist || colour === P.slate;
  return (
    <button
      class={`pixel-button${small ? " small" : ""}${quiet ? " quiet" : ""}`}
      style={{ backgroundColor: disabled ? P.slate : colour }}
      disabled={disabled}
      onClick={() => { sound.play("tap"); onClick(); }}
    >
      {title}
    </button>
  );
}

type Thumbs = typeof import("../three/thumbs");
let thumbs: Thumbs | undefined;
let loadingThumbs: Promise<Thumbs> | undefined;
/** Three.js and the portrait renderer load on first use, so the first paint never waits for them. */
const loadThumbs = () => (loadingThumbs ??= import("../three/thumbs").then((m) => (thumbs = m)));

/** An Eco's soft 3D portrait. Silhouette for not-yet-seen ones; a shimmering placeholder while it renders. */
export function EcoImg({ id, variant = "normal", size = 96, flip, silhouette, dim }: { id: string; variant?: Variant; size?: number; flip?: boolean; silhouette?: boolean; dim?: boolean }) {
  const species = game.data.eco.get(id);
  const px = size <= 64 ? 128 : 256;
  const cached = thumbs?.cachedThumbnail(id, variant, px, !!silhouette);
  const [src, setSrc] = useState<string | undefined>(cached);
  useEffect(() => {
    if (cached) { setSrc(cached); return; }
    let alive = true;
    setSrc(undefined);
    loadThumbs()
      .then((m) => m.creatureThumbnail(id, variant, game.data, px, !!silhouette))
      .then((url) => { if (alive) setSrc(url); })
      .catch(() => { /* leave the placeholder */ });
    return () => { alive = false; };
  }, [id, variant, silhouette, px]);
  const style = { width: `${size}px`, height: `${size}px`, transform: flip ? "scaleX(-1)" : undefined, opacity: dim ? 0.4 : 1 };
  if (!src) return <span class="eco-img eco-loading" style={style} role="img" aria-label={silhouette ? "Eco desconocido" : species?.name ?? id} />;
  return (
    <img class="eco-img" src={src} width={size} height={size} alt={silhouette ? "Eco desconocido" : species?.name ?? id} style={style} draggable={false} />
  );
}

/** One of the three D-Ark moves, with this species' name for it. */
export function AttackRow({ attack, kind, species }: { attack?: Attack; kind: "basic" | "physical" | "strong"; species?: EcoSpecies }) {
  const b = game.data.rules.battle;
  const name = kind === "physical" ? (species ? physicalName(species) : "Golpe físico") : attack?.name ?? "";
  const info = { basic: ["Disparo rápido · gana al cargado", `AP ×${b.basicAP}`, "Libre"], physical: ["Golpe físico · gana al rápido", `AP ×${b.physicalAP}`, "Libre"], strong: ["Ataque cargado · gana al físico", `AP ×${b.strongAP}`, "1 Carga"] }[kind];
  return (
    <div class="row">
      <div class="grow">
        <div class="strong">{name}</div>
        <div class="muted small">{info[0]}</div>
      </div>
      <span class="small">{info[1]}</span>
      <span class="small amber">{info[2]}</span>
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

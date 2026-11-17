import { round1, type GameData } from "../data/models";
import { newID, type Announcement, type EcoInstance, type GameSave, type Variant } from "../core/save";
import { baseFormOf, maxStats, newEco } from "./progression";

/**
 * The collection: one Eco per species. A second copy (an egg hatching into a species you already
 * have, or a wild Brillante you beat) never joins the team; it awakens the one you have instead:
 * permanent stats and a ★, and a Brillante copy turns it Brillante too.
 */

/** The form an Eco of this species lives in: a line's Stage 1 (Novato), or the species itself. */
export function rootFormOf(speciesID: string, data: GameData): string {
  const s = data.eco.get(speciesID);
  if (!s) return speciesID;
  if (s.line) {
    const novato = data.ecos.find((e) => e.line === s.line && e.stage === "novato");
    if (novato) return novato.id;
  }
  return baseFormOf(speciesID, data);
}

/** The Eco you already own of this species, if any. */
export function ownedOf(save: GameSave, speciesID: string, data: GameData): EcoInstance | undefined {
  const root = rootFormOf(speciesID, data);
  return save.squad.find((e) => rootFormOf(e.speciesID, data) === root);
}

export interface AwakenResult { stars: number; gains?: { hp: number; ap: number; sp: number }; bits?: number }

/** One Awakening: +HP/AP/SP for good and a star; past the top star it gives bits instead. */
export function awaken(eco: EcoInstance, save: GameSave, data: GameData): AwakenResult {
  const a = data.rules.awakening;
  const stars = eco.awakening ?? 0;
  if (stars >= a.maxStars) {
    save.bits += a.overflowBits;
    return { stars, bits: a.overflowBits };
  }
  const before = maxStats(eco, data).hp;
  eco.bonus = { hp: eco.bonus.hp + a.hp, ap: round1(eco.bonus.ap + a.ap), sp: round1(eco.bonus.sp + a.sp) };
  eco.awakening = stars + 1;
  // The new max HP is filled too (an injured Eco stays at its HP: it still needs healing).
  if (!eco.injured) eco.hp = Math.min(maxStats(eco, data).hp, eco.hp + (maxStats(eco, data).hp - before));
  return { stars: eco.awakening, gains: { hp: a.hp, ap: a.ap, sp: a.sp } };
}

export interface Received {
  /** "new": joined the team; "awakened": it was a duplicate; "full": no room (nothing happened). */
  kind: "new" | "awakened" | "full";
  eco?: EcoInstance;
  text: string;
}

/**
 * An Eco of `speciesID` arrives (egg, wild Brillante, recruit). New species join the team at
 * `level`; a species you own awakens the one you have, and a Brillante copy recolours it.
 * Queues the on-screen celebration.
 */
export function receiveEco(save: GameSave, speciesID: string, level: number, variant: Variant, data: GameData, source: Announcement["source"]): Received {
  const addOnce = (list: string[], id: string) => { if (!list.includes(id)) list.push(id); };
  const owned = ownedOf(save, speciesID, data);
  const shiny = variant === "brillante";
  if (owned) {
    const turnedBrillante = shiny && owned.variant !== "brillante";
    if (turnedBrillante) owned.variant = "brillante";
    const r = awaken(owned, save, data);
    const name = owned.nickname ?? data.eco.get(owned.speciesID)?.name ?? "Tu Eco";
    let text = r.bits
      ? `Resonancia de ${name}: ya tiene todas las estrellas, se convierte en ${r.bits} bits.`
      : `¡Resonancia! ${name} despierta (${"★".repeat(r.stars)}): Vida +${r.gains!.hp}, AP +${r.gains!.ap}, SP +${r.gains!.sp} para siempre.`;
    if (turnedBrillante) text += ` ¡Y ahora es Brillante!`;
    save.announcements.push({ id: newID(), kind: "awakening", ecoID: owned.id, speciesID: owned.speciesID, variant: owned.variant, stars: r.stars, gains: r.gains, bits: r.bits, turnedBrillante, source });
    return { kind: "awakened", eco: owned, text };
  }
  if (save.squad.length >= data.rules.squadCap) return { kind: "full", text: `Tu equipo está lleno (${data.rules.squadCap} Ecos).` };
  const eco = newEco(rootFormOf(speciesID, data), level, data, variant === "infectado" ? "normal" : variant);
  save.squad.push(eco);
  for (const id of new Set([speciesID, eco.speciesID])) for (const list of [save.guide.seen, save.guide.owned]) addOnce(list, id);
  const name = data.eco.get(eco.speciesID)?.name ?? speciesID;
  if (shiny || source !== "recruit") save.announcements.push({ id: newID(), kind: "newEco", ecoID: eco.id, speciesID: eco.speciesID, variant: eco.variant, source });
  return { kind: "new", eco, text: `¡${name}${shiny ? " Brillante" : ""} se une a tu equipo (nivel ${eco.level})!` };
}

/**
 * Older saves could hold several Ecos of one species: the best one stays (your partner, else the
 * highest level) and each extra copy awakens it, passing on its unlocked evolutions and Brillante colours.
 */
export function mergeDuplicates(save: GameSave, data: GameData): number {
  const groups = new Map<string, EcoInstance[]>();
  for (const e of save.squad) {
    const root = rootFormOf(e.speciesID, data);
    groups.set(root, [...(groups.get(root) ?? []), e]);
  }
  let merged = 0;
  for (const list of groups.values()) {
    if (list.length < 2) continue;
    const keep = list.find((e) => e.id === save.partnerID) ?? [...list].sort((a, b) => b.level - a.level || b.xp - a.xp)[0];
    for (const extra of list) {
      if (extra === keep) continue;
      if (extra.variant === "brillante") keep.variant = "brillante";
      keep.unlocked = [...new Set([...keep.unlocked, ...extra.unlocked])];
      keep.history = [...new Set([...keep.history, ...extra.history])];
      awaken(keep, save, data);
      save.squad = save.squad.filter((e) => e !== extra);
      merged += 1;
    }
  }
  return merged;
}

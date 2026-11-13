import { STAGE_TIER, TIER_NAME, type EcoSpecies, type EvolutionCondition, type Fusion, type GameData } from "../data/models";
import type { EcoInstance, GameSave } from "../core/save";
import { timeOfDay } from "./progression";

/**
 * D-Ark evolution: an Eco always stays in its base form. Beating a boss unlocks its next
 * evolution(s), for that Eco only. Before a battle it can spend DP to fight in an unlocked
 * form, with its stats multiplied; it goes back to its base form afterwards.
 */

export type NodeKind = "evolution" | "awaken" | "fusion";

export interface EvolutionNode {
  target: EcoSpecies;
  kind: NodeKind;
  /** Steps above the base form (1 = next stage). */
  steps: number;
  multiplier: number;
  cost: number;
  unlocked: boolean;
  /** Everything it needs, and which of those are still missing (in Spanish). */
  requirements: string[];
  missing: string[];
  fusion?: Fusion;
  /** For a fusion: the squad member it merges with in battle. */
  with?: EcoInstance;
}

const tier = (s: EcoSpecies | undefined) => (s ? STAGE_TIER[s.stage] : 1);

/** Multiplier and DP cost of fighting as `target`, for an Eco whose base form is `base`. */
export function formCost(base: EcoSpecies | undefined, target: EcoSpecies, data: GameData): { steps: number; multiplier: number; cost: number } {
  const e = data.rules.evolution;
  if (target.stage === "despertar") return { steps: 4, multiplier: e.awakenMultiplier, cost: e.awakenCost };
  const steps = Math.max(1, Math.min(e.multiplier.length - 1, tier(target) - tier(base)));
  return { steps, multiplier: e.multiplier[steps], cost: e.cost[steps] };
}

/** The zone whose boss (or a later one) unlocks a form. */
export function unlockZone(target: EcoSpecies, data: GameData): number {
  const e = data.rules.evolution;
  if (target.stage === "despertar") return e.awakenZone;
  if (target.stage === "fusion") return e.fusionZone;
  return e.unlockZone[String(Math.min(4, tier(target)))] ?? 1;
}

/**
 * The conditions of an evolution besides the boss, in Spanish, and whether each is met. Level and
 * step requirements from the data don't apply: the zone of the boss already gates them.
 */
function conditionChecks(eco: EcoInstance, c: EvolutionCondition, save: GameSave, data: GameData, now: Date): [string, boolean][] {
  const out: [string, boolean][] = [];
  if (c.minBond !== undefined) out.push([`Vínculo ${c.minBond}`, eco.bond >= c.minBond]);
  if (c.maxBond !== undefined) out.push([`Vínculo ${c.maxBond} o menos`, eco.bond <= c.maxBond]);
  if (c.minWins !== undefined) out.push([`${c.minWins} victorias`, eco.wins >= c.minWins]);
  if (c.minLosses !== undefined) out.push([`${c.minLosses} derrotas`, eco.losses >= c.minLosses]);
  if (c.minTraining !== undefined) out.push([`${c.minTraining} entrenamientos`, eco.trainingSessions >= c.minTraining]);
  if (c.timeOfDay) out.push([c.timeOfDay === "noche" ? "Vencer al jefe de noche (20:00–7:00)" : "Vencer al jefe de día (7:00–20:00)", timeOfDay(now) === c.timeOfDay]);
  if (c.item) out.push([`Tener ${data.item.get(c.item)?.name ?? c.item}`, (save.inventory[c.item] ?? 0) > 0]);
  return out;
}

const has = (eco: EcoInstance, id: string) => eco.speciesID === id || eco.unlocked.includes(id);

/** Every evolution this Eco can ever reach from its base form, with what each one needs. */
export function evolutionTree(eco: EcoInstance, save: GameSave, data: GameData, now = new Date()): EvolutionNode[] {
  const base = data.eco.get(eco.speciesID);
  if (!base) return [];
  const nodes: EvolutionNode[] = [];
  const seen = new Set([base.id]);
  const frontier = [base];
  while (frontier.length) {
    const from = frontier.shift()!;
    for (const ev of from.evolutions) {
      const target = data.eco.get(ev.to);
      if (!target || seen.has(target.id) || tier(target) <= tier(base)) continue;
      seen.add(target.id);
      frontier.push(target);
      const awaken = target.stage === "despertar";
      const zone = unlockZone(target, data);
      const checks: [string, boolean][] = [];
      if (from.id !== base.id) checks.push([`Desbloquear antes ${from.name}`, has(eco, from.id)]);
      checks.push([`Vencer con él al jefe de la zona ${zone} o posterior`, eco.unlocked.includes(target.id)]);
      checks.push(...conditionChecks(eco, ev.conditions, save, data, now));
      nodes.push(node(target, awaken ? "awaken" : "evolution", checks));
    }
  }
  for (const fusion of data.fusions) {
    const mine = fusion.parts.find((p) => p === base.id || seen.has(p));
    const result = data.eco.get(fusion.result);
    if (!mine || !result) continue;
    const otherPart = fusion.parts.find((p) => p !== mine) ?? mine;
    const partner = fusionPartner(eco, otherPart, save);
    const checks: [string, boolean][] = [
      [`Desbloquear ${data.eco.get(mine)?.name ?? mine}`, has(eco, mine)],
      [`Tener en el equipo un Eco con ${data.eco.get(otherPart)?.name ?? otherPart} desbloqueado`, !!partner],
      [`Vínculo ${fusion.minBond} con ambos`, eco.bond >= fusion.minBond && (partner?.bond ?? 0) >= fusion.minBond],
      ...(fusion.item ? [[`Tener ${data.item.get(fusion.item)?.name ?? fusion.item}`, (save.inventory[fusion.item] ?? 0) > 0] as [string, boolean]] : []),
      [`Vencer con él al jefe de la zona ${data.rules.evolution.fusionZone} o posterior`, eco.unlocked.includes(result.id)],
    ];
    nodes.push({ ...node(result, "fusion", checks), fusion, with: partner });
  }
  return nodes;

  function node(target: EcoSpecies, kind: NodeKind, checks: [string, boolean][]): EvolutionNode {
    const { steps, multiplier, cost } = formCost(base, target, data);
    const unlocked = eco.unlocked.includes(target.id);
    return {
      target, kind, steps, multiplier, cost, unlocked,
      requirements: checks.map(([t]) => t),
      missing: unlocked ? [] : checks.filter(([, ok]) => !ok).map(([t]) => t),
    };
  }
}

/** A squad member (other than `eco`) that has `part` as its base form or an unlocked form. */
function fusionPartner(eco: EcoInstance, part: string, save: GameSave): EcoInstance | undefined {
  return save.squad.find((o) => o.id !== eco.id && has(o, part));
}

/**
 * After `eco` beats the boss of a zone with this order: unlocks the forms that boss opens and
 * whose other conditions are met, one stage at a time. Returns what it unlocked and why others weren't.
 */
export function unlockAfterBoss(eco: EcoInstance, zoneOrder: number, save: GameSave, data: GameData, now = new Date()): { unlocked: EcoSpecies[]; blocked: string[] } {
  const base = data.eco.get(eco.speciesID);
  if (!base) return { unlocked: [], blocked: [] };
  const highest = Math.max(tier(base), ...eco.unlocked.map((id) => data.eco.get(id)).filter((s) => s && s.stage !== "despertar" && s.stage !== "fusion").map(tier));
  const unlocked: EcoSpecies[] = [];
  const blocked: string[] = [];
  const forms = [base, ...eco.unlocked.map((id) => data.eco.get(id)!).filter(Boolean)];
  for (const from of forms) {
    for (const ev of from.evolutions) {
      const target = data.eco.get(ev.to);
      if (!target || has(eco, target.id) || unlocked.includes(target) || tier(target) <= tier(base)) continue;
      const awaken = target.stage === "despertar";
      if (!awaken && tier(target) > highest + 1) continue;
      if (zoneOrder < unlockZone(target, data)) continue;
      const missing = conditionChecks(eco, ev.conditions, save, data, now).filter(([, ok]) => !ok).map(([t]) => t);
      if (missing.length) blocked.push(`${target.name}: falta ${missing.join(", ")}`);
      else unlocked.push(target);
    }
  }
  if (zoneOrder >= data.rules.evolution.fusionZone) {
    for (const fusion of data.fusions) {
      const result = data.eco.get(fusion.result);
      const mine = fusion.parts.find((p) => has(eco, p));
      if (!result || !mine || has(eco, result.id)) continue;
      const other = fusionPartner(eco, fusion.parts.find((p) => p !== mine) ?? mine, save);
      const missing: string[] = [];
      if (!other) missing.push(`un compañero con ${data.eco.get(fusion.parts.find((p) => p !== mine)!)?.name}`);
      if (eco.bond < fusion.minBond || (other?.bond ?? 0) < fusion.minBond) missing.push(`vínculo ${fusion.minBond} con ambos`);
      if (fusion.item && !(save.inventory[fusion.item] > 0)) missing.push(data.item.get(fusion.item)?.name ?? fusion.item);
      if (missing.length) blocked.push(`${result.name}: falta ${missing.join(", ")}`);
      else unlocked.push(result);
    }
  }
  for (const t of unlocked) eco.unlocked.push(t.id);
  return { unlocked, blocked };
}

export interface BattleForm {
  target: EcoSpecies;
  kind: NodeKind;
  multiplier: number;
  cost: number;
  /** Why it can't be chosen now (not enough DP, fusion partner gone…). */
  blocked?: string;
}

/** The unlocked forms this Eco can fight as, before a battle, with their cost. */
export function battleForms(eco: EcoInstance, dp: number, save: GameSave, data: GameData): BattleForm[] {
  return evolutionTree(eco, save, data)
    .filter((n) => n.unlocked)
    .map((n) => {
      let blocked: string | undefined;
      if (n.kind === "fusion" && !n.with) blocked = "Su pareja de fusión no está en el equipo.";
      else if (dp < n.cost) blocked = `Necesita ${n.cost} DP.`;
      return { target: n.target, kind: n.kind, multiplier: n.multiplier, cost: n.cost, blocked };
    })
    .sort((a, b) => a.cost - b.cost || a.target.name.localeCompare(b.target.name));
}

export const tierLabel = (s: EcoSpecies) => TIER_NAME[STAGE_TIER[s.stage]] ?? "";

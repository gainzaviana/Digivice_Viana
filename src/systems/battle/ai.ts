import type { Rng } from "../../core/random";
import { other, type AttackKind, type Battle, type Side } from "./battle";

/**
 * Chooses Basic or Strong for one side:
 * 1. predict how likely the opponent goes Strong (fixed mix at tier 0; recent choices from tier 1;
 *    repeats and alternations from tier 2; no Carga means Basic for sure);
 * 2. score each option by expected damage dealt minus taken (shares of max HP) under the clash
 *    rules: Basic pierces Strong, Strong vs Strong goes to the higher AP (then SP), Basics trade;
 * 3. softmax with the tier's temperature, plus the tier's chance of a purely random pick.
 */
export function aiTier(side: Side, b: Battle): number {
  if (side !== "enemy") return 2;
  if (b.isBoss) return 3;
  const z = b.tuning.aiTierZones;
  return b.regionOrder >= z[1] ? 2 : b.regionOrder >= z[0] ? 1 : 0;
}

export function chooseAttack(side: Side, b: Battle, rng: Rng): AttackKind {
  if (!b.canUseStrong(side)) return "basic";
  const tier = aiTier(side, b);
  const t = b.tuning;
  if (rng.float() < t.aiRandomness[tier]) return rng.bool() ? "basic" : "strong";
  const opponentStrong = predictStrong(other(side), b, tier);
  // A small lean to Basic keeps Carga for later; an enraged boss leans into its Strong attack.
  const basic = score("basic", side, opponentStrong, b) + 0.02;
  let strong = score("strong", side, opponentStrong, b);
  if (side === "enemy" && b.enemy.enraged) strong += 0.08;
  const temp = t.aiTemperature[tier];
  const a = Math.exp((basic / temp) * 10), c = Math.exp((strong / temp) * 10);
  return rng.float() * (a + c) < a ? "basic" : "strong";
}

export function predictStrong(side: Side, b: Battle, tier: number): number {
  if (!b.canUseStrong(side)) return 0;
  const prior = 0.4;
  const history = side === "partner" ? b.partnerChoices : b.enemyChoices;
  if (tier === 0 || history.length === 0) return prior;
  const recent = history.slice(-4);
  let estimate = 0.3 * prior + 0.7 * (recent.filter((x) => x === "strong").length / recent.length);
  if (tier >= 2 && history.length >= 2) {
    const last = history[history.length - 1], before = history[history.length - 2];
    if (last === before) estimate = 0.35 * estimate + 0.65 * (last === "strong" ? 1 : 0);
    else if (history.length >= 3 && history[history.length - 3] === last) estimate = 0.35 * estimate + 0.65 * (last === "strong" ? 0 : 1);
  }
  // Full Carga makes a Strong attack more likely.
  if (b.combatant(side).charge >= b.tuning.chargeMax) estimate = Math.min(1, estimate + 0.15);
  return Math.min(1, Math.max(0, estimate));
}

export function score(mine: AttackKind, side: Side, opponentStrong: number, b: Battle): number {
  const hitValue = (attacker: Side, kind: AttackKind, dodgeable: boolean) => {
    const dodge = dodgeable ? b.dodgeChance(attacker) / 100 : 0;
    const damage = b.expectedDamage(attacker, kind) * (1 - dodge);
    const target = b.combatant(other(attacker));
    const value = damage / Math.max(1, target.stats.hp);
    return target.hp <= damage ? value + 0.5 : value;
  };
  const outcome = (theirs: AttackKind) => {
    if (mine !== theirs) return mine === "basic" ? hitValue(side, "basic", false) : -hitValue(other(side), "basic", false);
    if (mine === "strong") {
      const winner = b.strongClashWinner();
      return winner === side ? hitValue(side, "strong", false) : winner === other(side) ? -hitValue(other(side), "strong", false) : 0;
    }
    return hitValue(side, "basic", true) - hitValue(other(side), "basic", true);
  };
  return (1 - opponentStrong) * outcome("basic") + opponentStrong * outcome("strong");
}

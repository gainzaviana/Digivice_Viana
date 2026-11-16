import type { Rng } from "../../core/random";
import { clashWinner, MOVES, other, type AttackKind, type Battle, type Side } from "./battle";

/**
 * Chooses Quick, Physical or Charged for one side:
 * 1. predict the opponent's mix of moves (a fixed mix at tier 0; recent choices from tier 1;
 *    repeats from tier 2; no Carga means no Charged Attack);
 * 2. score each move by expected damage dealt minus taken (shares of max HP) under the triangle
 *    (Quick → Charged → Physical → Quick; mirrors go to the higher AP, then SP) and dodges;
 * 3. softmax with the tier's temperature, plus the tier's chance of a purely random pick.
 */
export function aiTier(side: Side, b: Battle): number {
  if (side !== "enemy") return 2;
  if (b.isBoss) return 3;
  const z = b.tuning.aiTierZones;
  return b.regionOrder >= z[1] ? 2 : b.regionOrder >= z[0] ? 1 : 0;
}

const options = (side: Side, b: Battle): AttackKind[] => (b.canUseCharged(side) ? MOVES : ["quick", "physical"]);

export function chooseAttack(side: Side, b: Battle, rng: Rng): AttackKind {
  const mine = options(side, b);
  const tier = aiTier(side, b);
  const t = b.tuning;
  if (rng.float() < t.aiRandomness[tier]) return rng.pick(mine) ?? "quick";
  const theirs = predict(other(side), b, tier);
  const scores = mine.map((m) => score(m, side, theirs, b) + (m === "charged" ? (side === "enemy" && b.enemy.enraged ? 0.06 : -0.01) : 0));
  const temp = t.aiTemperature[tier];
  const weights = scores.map((s) => Math.exp((s / temp) * 10));
  let roll = rng.float() * weights.reduce((a, w) => a + w, 0);
  for (let i = 0; i < mine.length; i++) { roll -= weights[i]; if (roll <= 0) return mine[i]; }
  return mine[mine.length - 1];
}

/** How likely `side` picks each move, as a player of this tier would guess. */
export function predict(side: Side, b: Battle, tier: number): Record<AttackKind, number> {
  const canCharge = b.canUseCharged(side);
  const prior: Record<AttackKind, number> = canCharge ? { quick: 0.36, physical: 0.34, charged: 0.3 } : { quick: 0.5, physical: 0.5, charged: 0 };
  const history = side === "partner" ? b.partnerChoices : b.enemyChoices;
  if (tier === 0 || history.length === 0) return prior;
  const recent = history.slice(-4);
  const est = { ...prior };
  for (const k of ["quick", "physical", "charged"] as AttackKind[]) est[k] = 0.35 * prior[k] + 0.65 * (recent.filter((x) => x === k).length / recent.length);
  if (tier >= 2 && history.length >= 2 && history[history.length - 1] === history[history.length - 2]) {
    const last = history[history.length - 1];
    for (const k of ["quick", "physical", "charged"] as AttackKind[]) est[k] = 0.4 * est[k] + (k === last ? 0.6 : 0);
  }
  if (!canCharge) est.charged = 0;
  const sum = est.quick + est.physical + est.charged || 1;
  return { quick: est.quick / sum, physical: est.physical / sum, charged: est.charged / sum };
}

export function score(mine: AttackKind, side: Side, theirs: Record<AttackKind, number>, b: Battle): number {
  const hitValue = (attacker: Side, kind: AttackKind) => {
    const damage = b.expectedDamage(attacker, kind) * (1 - b.dodgeChance(attacker) / 100);
    const target = b.combatant(other(attacker));
    const value = damage / Math.max(1, target.stats.hp);
    return target.hp <= damage ? value + 0.5 : value;
  };
  let total = 0;
  for (const k of ["quick", "physical", "charged"] as AttackKind[]) {
    if (!theirs[k]) continue;
    const [p, e] = side === "partner" ? [mine, k] : [k, mine];
    const w = clashWinner(p, e) ?? b.statWinner();
    const winnerIsMe = w === side;
    const outcome = w === undefined ? 0 : winnerIsMe ? hitValue(side, mine) : -hitValue(other(side), k);
    total += theirs[k] * outcome;
  }
  return total;
}

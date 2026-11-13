import type { Rng } from "../../core/random";
import { other, type AttackKind, type Battle, type Side } from "./battle";

/**
 * Chooses Basic or Strong for one side:
 * 1. predict how likely the opponent goes Strong (fixed mix at tier 0; recent choices from tier 1;
 *    repeats and alternations from tier 2; no DP for Strong means Basic for sure);
 * 2. score each option by expected damage dealt minus taken (shares of HP), with the clash rules;
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
  let basic = score("basic", side, opponentStrong, b) + 0.02;
  let strong = score("strong", side, opponentStrong, b);
  if (side === "enemy" && b.enemy.enraged) strong += 0.08;
  const temp = t.aiTemperature[tier];
  const a = Math.exp((basic / temp) * 10), c = Math.exp((strong / temp) * 10);
  basic = a; strong = c;
  return rng.float() * (basic + strong) < basic ? "basic" : "strong";
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
  return Math.min(1, Math.max(0, estimate));
}

export function score(mine: AttackKind, side: Side, opponentStrong: number, b: Battle): number {
  const t = b.tuning;
  const hitValue = (attacker: Side, kind: AttackKind, share: number, dodgeable: boolean) => {
    const dodge = dodgeable ? b.dodgeChance(attacker, kind) / 100 : 0;
    const damage = b.expectedDamage(attacker, kind) * share * (1 - dodge);
    const target = b.combatant(other(attacker));
    const value = damage / Math.max(1, target.stats.hp);
    return target.hp <= damage ? value + 0.5 : value;
  };
  const outcome = (theirs: AttackKind) => {
    if (mine !== theirs) return mine === "basic" ? hitValue(side, "basic", 1, false) : -hitValue(other(side), "basic", 1, false);
    const win = b.clashWinChance(side, mine), tie = t.clashTieMargin;
    const pWin = Math.max(0, win - tie / 2), pLose = Math.max(0, 1 - win - tie / 2);
    const share = mine === "strong" ? t.strongClashWinnerDamage : t.basicClashWinnerDamage;
    let value = pWin * hitValue(side, mine, share, true) - pLose * hitValue(other(side), theirs, share, true);
    if (mine === "basic") value += tie * (hitValue(side, "basic", t.basicClashTieDamage, true) - hitValue(other(side), "basic", t.basicClashTieDamage, true));
    return value;
  };
  return (1 - opponentStrong) * outcome("basic") + opponentStrong * outcome("strong");
}

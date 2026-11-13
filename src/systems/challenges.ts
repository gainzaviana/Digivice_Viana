import { DERIVED_METRICS, type Challenge, type ChallengeMetric, type GameData } from "../data/models";
import { Rng, seedFrom } from "../core/random";
import { addLog, dayKey, type GameSave } from "../core/save";
import { done, refused, type ActionResult } from "./result";

/** Counts something that happened, for today's bounties and the lifetime totals. */
export function record(save: GameSave, metric: ChallengeMetric, amount = 1, now = new Date()) {
  if (amount <= 0 || DERIVED_METRICS.includes(metric)) return;
  save.stats[metric] = (save.stats[metric] ?? 0) + amount;
  if (save.daily.day === dayKey(now)) save.daily.counters[metric] = (save.daily.counters[metric] ?? 0) + amount;
}

/** A new day of bounties when the date changes: the same date always picks the same set. */
export function refreshDaily(save: GameSave, data: GameData, now = new Date()) {
  const today = dayKey(now);
  if (save.daily.day === today) return;
  const pool = data.challenges.filter((c) => c.daily).sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
  const rng = new Rng(seedFrom(today));
  const chosen: string[] = [];
  while (chosen.length < data.rules.dailyChallenges && pool.length) chosen.push(pool.splice(rng.int(0, pool.length - 1), 1)[0].id);
  save.daily = { day: today, chosen, counters: {}, claimed: [] };
}

export function progress(save: GameSave, c: Challenge): number {
  if (c.daily) return save.daily.counters[c.metric] ?? 0;
  switch (c.metric) {
    case "zonesCleared": return save.map.clearedRegions.length;
    case "guideSeen": return save.guide.seen.length;
    case "guideOwned": return save.guide.owned.length;
    case "brillanteOwned": return save.squad.filter((e) => e.variant === "brillante").length;
    default: return save.stats[c.metric] ?? 0;
  }
}

export const isClaimed = (save: GameSave, c: Challenge) => (c.daily ? save.daily.claimed : save.claimedAchievements).includes(c.id);

export const canClaim = (save: GameSave, c: Challenge) =>
  !isClaimed(save, c) && progress(save, c) >= c.target && (!c.daily || save.daily.chosen.includes(c.id));

export function claimableCount(save: GameSave, data: GameData): number {
  return data.challenges.filter((c) => (c.daily ? save.daily.chosen.includes(c.id) : true) && canClaim(save, c)).length;
}

export function claim(save: GameSave, id: string, data: GameData): ActionResult {
  const c = data.challenges.find((x) => x.id === id);
  if (!c) return refused("Ese reto no existe.");
  if (isClaimed(save, c)) return refused("Ya has recogido este reto.");
  if (!canClaim(save, c)) return refused("Aún no has completado este reto.");
  (c.daily ? save.daily.claimed : save.claimedAchievements).push(c.id);
  const rewards: string[] = [];
  if (c.reward.bits > 0) { save.bits += c.reward.bits; rewards.push(`${c.reward.bits} bits`); }
  const item = c.reward.item ? data.item.get(c.reward.item) : undefined;
  if (item) { save.inventory[item.id] = (save.inventory[item.id] ?? 0) + 1; rewards.push(item.name); }
  const parche = c.reward.parche ? data.parche.get(c.reward.parche) : undefined;
  if (parche) {
    save.parches[parche.id] = (save.parches[parche.id] ?? 0) + 1;
    if (!save.guide.discoveredParches.includes(parche.id)) save.guide.discoveredParches.push(parche.id);
    rewards.push(parche.name);
  }
  const text = `¡Reto completado: ${c.name}! Recompensa: ${rewards.join(", ")}.`;
  addLog(save, "info", text);
  return done(text);
}

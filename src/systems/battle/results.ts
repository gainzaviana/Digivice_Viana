import type { GameData } from "../../data/models";
import { addLog, type GameSave } from "../../core/save";
import { gainXP, maxStats, xpForWin } from "../progression";
import { unlockAfterBoss } from "../evolution";
import { record } from "../challenges";
import { defeatBoss } from "../actions";
import { done, refused, type ActionResult } from "../result";
import type { Battle } from "./battle";

/**
 * Applies a finished battle to the Eco that fought it, and only to it: it returns to its base
 * form keeping its share of HP and the DP left, then gets XP and bond (victory) or loses bond on
 * a losing streak (defeat). Beating a boss unlocks its next evolution(s).
 */
export function finishBattle(save: GameSave, b: Battle, data: GameData, now = new Date()): ActionResult {
  const eco = save.squad.find((e) => e.id === b.partnerID);
  if (!b.outcome || !eco) return refused("El combate no ha terminado.");
  const t = data.rules.battle;
  const enemy = b.enemy;
  const enemySpecies = data.eco.get(enemy.speciesID);
  const enemyName = enemySpecies?.name ?? enemy.speciesID;
  const addOnce = (list: string[], id: string) => { if (!list.includes(id)) list.push(id); };

  const own = maxStats(eco, data);
  const ratio = b.partner.hp / Math.max(1, b.partner.stats.hp);
  eco.hp = b.outcome === "defeat" ? 0 : Math.max(1, Math.round(ratio * own.hp));
  eco.dp = Math.max(0, Math.min(data.rules.maxDP, b.dp));
  if (b.formID) { addOnce(save.guide.seen, b.formID); record(save, "evolutions", 1, now); }
  if (b.usedFusion) record(save, "fusions", 1, now);
  addOnce(save.guide.seen, enemy.speciesID);
  if (b.eventID) save.pending = save.pending.filter((e) => e.id !== b.eventID);
  record(save, "cardsUsed", Math.max(0, save.deck.length - b.hand.length), now);

  let text: string;
  switch (b.outcome) {
    case "victory": {
      addOnce(save.guide.defeated, enemy.speciesID);
      eco.wins += 1;
      eco.lossStreak = 0;
      record(save, "wins", 1, now);
      if (b.isBoss) record(save, "bossWins", 1, now);
      if (enemy.variant === "infectado") record(save, "infectedWins", 1, now);
      const xp = xpForWin(eco.level, enemy.level, enemySpecies, b.isBoss, enemy.variant === "brillante", data);
      const bits = enemy.level * t.bitsPerLevel;
      save.bits += bits;
      const levels = gainXP(xp, eco, data);
      const bond = t.winBond + (b.isBoss ? t.bossWinBond : 0);
      eco.bond = Math.min(data.rules.maxBond, eco.bond + bond);
      const name = eco.nickname ?? data.eco.get(eco.speciesID)?.name ?? "Tu Eco";
      text = `¡Has vencido a ${enemyName}! ${name}: +${xp} XP, +${bits} bits, vínculo +${bond}.`;
      if (levels > 0) text += ` ¡Sube al nivel ${eco.level}!`;
      break;
    }
    case "defeat": {
      eco.losses += 1;
      eco.lossStreak += 1;
      if (eco.lossStreak >= 2) eco.bond = Math.max(0, eco.bond - t.lossStreakBond);
      const region = data.region.get(b.regionID);
      const fraction = b.isBoss ? data.rules.bossDefeatPenaltyFraction : data.rules.defeatPenaltyFraction;
      const penalty = Math.max(data.rules.defeatPenaltyMin, Math.floor((region?.steps ?? 0) * fraction));
      if (b.isBoss) {
        save.map.bossReady = false;
        save.map.stepsLeft = penalty;
        save.map.bossDefeats += 1;
      } else if (save.map.regionID === b.regionID && !save.map.bossReady) save.map.stepsLeft += penalty;
      text = `${enemyName} te ha vencido. Retrocedes: +${penalty.toLocaleString("es")} pasos hasta el jefe. Camina para que tu compañero se recupere.`;
      if (eco.lossStreak >= 2) text += ` Varias derrotas seguidas: vínculo −${t.lossStreakBond}.`;
      if (b.isBoss) text += " Consejo: gana combates del camino para subir de nivel y guarda DP para evolucionar antes del jefe.";
      break;
    }
    case "fled": text = `Huiste de ${enemyName}.`; break;
    case "left": text = `${enemyName} se marchó.`; break;
  }
  addLog(save, "battle", text);
  if (b.outcome === "victory" && b.isBoss) {
    // Rewards first (a boss may hand over the crystal a Stage 4 needs), then the unlocks.
    const boss = defeatBoss(save, data);
    const unlock = unlockAfterBoss(eco, b.regionOrder, save, data, now);
    let extra = "";
    if (unlock.unlocked.length) {
      extra = ` ¡Nueva evolución desbloqueada: ${unlock.unlocked.map((s) => s.name).join(", ")}!`;
      for (const s of unlock.unlocked) addOnce(save.guide.seen, s.id);
      addLog(save, "evolution", extra.trim());
    } else if (unlock.blocked.length) extra = ` Sin evolución nueva (${unlock.blocked[0]}).`;
    return done(`${text} ${boss.message}${extra}`);
  }
  return done(text);
}

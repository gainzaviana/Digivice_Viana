import type { GameData } from "../../data/models";
import { addLog, type GameSave } from "../../core/save";
import { gainXP, maxStats } from "../progression";
import { record } from "../challenges";
import { defeatBoss } from "../actions";
import { done, refused, type ActionResult } from "../result";
import type { Battle } from "./battle";

/** Applies a finished battle: the partner returns to its own form, then rewards or penalty steps. */
export function finishBattle(save: GameSave, b: Battle, data: GameData): ActionResult {
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
  eco.dp = Math.min(own.dp, b.partner.dp);
  if (b.evolutionsThisBattle > 0) addOnce(save.guide.seen, b.partner.speciesID);
  addOnce(save.guide.seen, enemy.speciesID);
  if (b.eventID) save.pending = save.pending.filter((e) => e.id !== b.eventID);
  record(save, "cardsUsed", Math.max(0, save.deck.length - b.hand.length));

  let text: string;
  switch (b.outcome) {
    case "victory": {
      addOnce(save.guide.defeated, enemy.speciesID);
      eco.wins += 1;
      record(save, "wins");
      if (b.isBoss) record(save, "bossWins");
      if (enemy.variant === "infectado") record(save, "infectedWins");
      let xp = t.xpPerLevel * Math.pow(enemy.level, t.xpLevelExponent) * (t.xpStageMultiplier[enemySpecies?.stage ?? "novato"] ?? 1);
      if (b.isBoss) xp *= t.xpBossMultiplier;
      if (enemy.variant === "brillante") xp *= t.xpBrillanteMultiplier;
      const gained = Math.round(xp);
      const bits = enemy.level * t.bitsPerLevel;
      save.bits += bits;
      const levels = gainXP(gained, eco, data);
      const bond = b.isBoss ? t.bossWinBond : eco.wins % t.winsPerBond === 0 ? 1 : 0;
      eco.bond = Math.min(data.rules.maxBond, eco.bond + bond);
      text = `¡Has vencido a ${enemyName}! +${gained} XP, +${bits} bits.`;
      if (levels > 0) text += ` ¡Sube al nivel ${eco.level}!`;
      if (bond > 0) text += ` Vínculo +${bond}.`;
      break;
    }
    case "defeat": {
      eco.losses += 1;
      eco.bond = Math.max(0, eco.bond - t.lossBond);
      const region = data.region.get(b.regionID);
      const fraction = b.isBoss ? data.rules.bossDefeatPenaltyFraction : data.rules.defeatPenaltyFraction;
      const penalty = Math.max(data.rules.defeatPenaltyMin, Math.floor((region?.steps ?? 0) * fraction));
      if (b.isBoss) {
        save.map.bossReady = false;
        save.map.stepsLeft = penalty;
        save.map.bossDefeats += 1;
      } else if (save.map.regionID === b.regionID && !save.map.bossReady) save.map.stepsLeft += penalty;
      text = `${enemyName} te ha vencido. Retrocedes: +${penalty.toLocaleString("es")} pasos hasta el jefe. Camina para que tu compañero se recupere.`;
      if (b.isBoss) text += " Consejo: los combates del camino dan experiencia; también puedes volver a zonas anteriores para entrenar.";
      break;
    }
    case "fled": text = `Huiste de ${enemyName}.`; break;
    case "left": text = `${enemyName} se marchó.`; break;
  }
  addLog(save, "battle", text);
  if (b.outcome === "victory" && b.isBoss) return done(`${text} ${defeatBoss(save, data).message}`);
  return done(text);
}

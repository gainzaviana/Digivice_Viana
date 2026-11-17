import type { GameData } from "../../data/models";
import { addLog, type GameSave } from "../../core/save";
import { gainXP, maxStats, xpForWin } from "../progression";
import { unlockAfterBoss } from "../evolution";
import { record } from "../challenges";
import { defeatBoss } from "../actions";
import { done, refused, type ActionResult } from "../result";
import type { Battle } from "./battle";
import { Rng } from "../../core/random";
import { newEco } from "../progression";
import { addEgg } from "../walk";
import { receiveEco } from "../collection";
import { eggForArea } from "../road";

/**
 * Applies a finished battle to the Eco that fought it, and only to it: it returns to its base
 * form keeping its share of HP and the DP left, then gets XP and bond (victory) or loses bond on
 * a losing streak (defeat). Beating a boss unlocks its next evolution(s).
 */
export function finishBattle(save: GameSave, b: Battle, data: GameData, now = new Date(), rng: Rng = new Rng()): ActionResult {
  const eco = save.squad.find((e) => e.id === b.partnerID);
  if (!b.outcome || !eco) return refused("El combate no ha terminado.");
  const t = data.rules.battle;
  const enemy = b.enemy;
  const enemySpecies = data.eco.get(enemy.speciesID);
  const enemyName = enemySpecies?.name ?? enemy.speciesID;
  const addOnce = (list: string[], id: string) => { if (!list.includes(id)) list.push(id); };

  const own = maxStats(eco, data);
  const ratio = b.partner.hp / Math.max(1, b.partner.stats.hp);
  eco.hp = b.outcome === "defeat" ? 1 : Math.max(1, Math.round(ratio * own.hp));
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
      if (b.rescue) {
        // SOS: the freed Eco thanks you with a big bond boost, and often rare data.
        const s = data.rules.sos;
        eco.bond = Math.min(data.rules.maxBond, eco.bond + s.bond);
        text += ` ¡Rescate completado! Vínculo +${s.bond} más.`;
        if (rng.int(1, 100) <= s.rareChance) {
          const area = data.region.get(b.regionID)?.area ?? 1;
          if (rng.bool() && addEgg(save, eggForArea(area + 1), data)) text += ` En agradecimiento te da un ${data.egg.get(eggForArea(area + 1))?.name}.`;
          else {
            const card = rng.pick(data.parches.filter((p) => p.rarity === "rara"));
            if (card) { save.parches[card.id] = (save.parches[card.id] ?? 0) + 1; if (!save.guide.discoveredParches.includes(card.id)) save.guide.discoveredParches.push(card.id); text += ` En agradecimiento te da un Parche raro: ${card.name}.`; }
          }
        }
      }
      if (levels > 0) text += ` ¡Sube al nivel ${eco.level}!`;
      // A wild Brillante you beat joins you (or awakens and recolours the one you have).
      if (enemy.variant === "brillante" && !b.isBoss && !b.rescue) {
        const got = receiveEco(save, enemy.speciesID, 1, "brillante", data, "wild");
        text += got.kind === "full" ? ` El ${enemyName} Brillante quería unirse, pero ${got.text.charAt(0).toLowerCase()}${got.text.slice(1)}` : ` ✨ ${got.text}`;
      }
      break;
    }
    case "defeat": {
      // Pushed back on the road, injured (1 HP) and a little less bond. Lifetime steps and eggs are kept.
      const d = data.rules.defeat;
      eco.losses += 1;
      eco.lossStreak += 1;
      const bondLoss = d.bondLoss + (eco.lossStreak >= 2 ? t.lossStreakBond : 0);
      eco.bond = Math.max(0, eco.bond - bondLoss);
      eco.injured = { stepsLeft: d.recoverySteps, since: now.getTime() };
      const region = data.region.get(b.regionID);
      const pushback = Math.min(region?.steps ?? d.pushbackMax, rng.int(d.pushbackMin, d.pushbackMax));
      if (save.map.regionID === b.regionID) {
        if (save.map.bossReady) { save.map.bossReady = false; save.map.stepsLeft = 0; }
        save.map.stepsLeft = Math.min(region?.steps ?? Infinity, save.map.stepsLeft + pushback);
        if (b.isBoss) save.map.bossDefeats += 1;
      }
      text = `${enemyName} te ha vencido. Retrocedes ${pushback.toLocaleString("es")} pasos en el camino. ${data.eco.get(eco.speciesID)?.name} está herido (1 de vida): cúralo con el Pulso de datos, un objeto, descansando o caminando ${d.recoverySteps} pasos. Vínculo −${bondLoss}.`;
      if (b.isBoss) text += " Consejo: gana combates del camino para subir de nivel y guarda DP para evolucionar antes del jefe.";
      break;
    }
    case "fled": text = `Huiste de ${enemyName}.`; break;
    case "left": text = `${enemyName} se marchó.`; break;
  }
  addLog(save, "battle", text);
  if (b.outcome === "victory" && b.isBoss) {
    // Rewards first (a boss may hand over the crystal a Stage 4 needs), then the unlocks.
    const region = data.region.get(b.regionID);
    const firstWin = !!region && !save.map.clearedRegions.includes(region.id);
    const boss = defeatBoss(save, data);
    let found = "";
    if (region && firstWin) {
      const cities = data.regions.filter((r) => r.area === region.area && !r.requiresItem).sort((x, y) => x.order - y.order);
      if (cities[cities.length - 1]?.id === region.id) {
        // Area Boss: frees a new partner line, joining at level 1.
        const owned = new Set(save.squad.map((e) => data.eco.get(e.speciesID)?.line).filter(Boolean));
        const next = data.starters.find((s) => s.line && !owned.has(s.line));
        if (next && save.squad.length < data.rules.squadCap) {
          const freed = newEco(next.id, 1, data);
          save.squad.push(freed);
          for (const list of [save.guide.seen, save.guide.owned]) if (!list.includes(next.id)) list.push(next.id);
          found = ` ¡El jefe de área tenía atrapado a ${next.name}! Se une a tu equipo (nivel 1).`;
        }
      } else if (addEgg(save, eggForArea(region.area), data)) {
        found = ` Entre los datos del jefe encuentras un ${data.egg.get(eggForArea(region.area))?.name}.`;
      }
      if (found) addLog(save, "recruit", found.trim());
    }
    const unlock = unlockAfterBoss(eco, b.regionOrder, save, data, now);
    let extra = "";
    if (unlock.unlocked.length) {
      extra = ` ¡Nueva evolución desbloqueada: ${unlock.unlocked.map((s) => s.name).join(", ")}!`;
      for (const s of unlock.unlocked) addOnce(save.guide.seen, s.id);
      addLog(save, "evolution", extra.trim());
    } else if (unlock.blocked.length) extra = ` Sin evolución nueva (${unlock.blocked[0]}).`;
    return done(`${text} ${boss.message}${found}${extra}`);
  }
  return done(text);
}

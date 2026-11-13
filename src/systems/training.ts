import type { GameData, Stats } from "../data/models";
import { dayKey, partnerOf, type GameSave } from "../core/save";
import { statText } from "./progression";
import { record } from "./challenges";
import { done, refused, type ActionResult } from "./result";

/**
 * The Terminal's three mini-games. Each one trains one stat of the partner (and only the
 * partner) and raises its bond. XP only comes from winning battles.
 */
export type TrainingKind = "golpe" | "reflejos" | "rafaga";

export const TRAINING: Record<TrainingKind, { name: string; summary: string; stat: keyof Stats; statName: string }> = {
  golpe: { name: "Golpe preciso", summary: "Para el indicador dentro de la zona. Entrena el AP (ataque).", stat: "ap", statName: "AP" },
  reflejos: { name: "Reflejos", summary: "Pulsa el lado que se ilumina, lo más rápido posible. Entrena el SP (velocidad y esquiva).", stat: "sp", statName: "SP" },
  rafaga: { name: "Ráfaga", summary: "Pulsa tantas veces como puedas en 5 segundos. Entrena la vida (HP).", stat: "hp", statName: "Vida" },
};

export function trainingSessionsLeft(save: GameSave, data: GameData, now = new Date()): number {
  const doneToday = save.trainingDay.day === dayKey(now) ? save.trainingDay.count : 0;
  return Math.max(0, data.rules.training.sessionsPerDay - doneToday);
}

/** Applies a finished mini-game. `score` is 0–100. */
export function train(save: GameSave, kind: TrainingKind, score: number, data: GameData, now = new Date()): ActionResult {
  const partner = partnerOf(save);
  if (!partner) return refused("No tienes compañero.");
  if (trainingSessionsLeft(save, data, now) <= 0) return refused("Tu compañero ya ha entrenado bastante hoy. Vuelve mañana.");
  const t = data.rules.training;
  const tier = t.tierScores.filter((s) => score >= s).length;
  const boosted = save.boostedTraining > 0;
  const { stat, statName } = TRAINING[kind];
  const gain = t.gainByTier[tier][stat] * (boosted ? 2 : 1);
  partner.bonus[stat] = Math.round((partner.bonus[stat] + gain) * 10) / 10;
  if (stat === "hp") partner.hp += gain;
  if (tier > 0) partner.bond = Math.min(data.rules.maxBond, partner.bond + t.bondGain);
  partner.trainingSessions += 1;
  if (boosted) save.boostedTraining -= 1;
  const today = dayKey(now);
  save.trainingDay = { day: today, count: (save.trainingDay.day === today ? save.trainingDay.count : 0) + 1 };
  record(save, "training", 1, now);

  let text = `${["Flojo…", "¡Bien!", "¡Muy bien!", "¡Perfecto!"][tier]} Puntuación ${score}. `;
  text += gain > 0 ? `${statName} +${statText(gain)}${boosted ? " (pesas: ×2)" : ""}.` : "Esta vez no mejora.";
  if (tier > 0) text += ` Vínculo +${t.bondGain}.`;
  return done(text);
}

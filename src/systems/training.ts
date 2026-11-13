import type { GameData } from "../data/models";
import { dayKey, partnerOf, type GameSave } from "../core/save";
import { gainXP } from "./progression";
import { record } from "./challenges";
import { done, refused, type ActionResult } from "./result";

/** The Terminal's three mini-games, each training one stat. */
export type TrainingKind = "golpe" | "reflejos" | "rafaga";

export const TRAINING: Record<TrainingKind, { name: string; summary: string; stat: string }> = {
  golpe: { name: "Golpe preciso", summary: "Para el indicador dentro de la zona. Entrena el ataque.", stat: "Ataque" },
  reflejos: { name: "Reflejos", summary: "Pulsa el lado que se ilumina, lo más rápido posible. Entrena la defensa.", stat: "Defensa" },
  rafaga: { name: "Ráfaga", summary: "Pulsa tantas veces como puedas en 5 segundos. Entrena la velocidad.", stat: "Velocidad" },
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
  const gain = t.statGainByTier[tier] * (boosted ? 2 : 1);
  if (kind === "golpe") partner.bonus.atk += gain;
  if (kind === "reflejos") partner.bonus.def += gain;
  if (kind === "rafaga") partner.bonus.spd += gain;
  if (tier > 0) partner.bond = Math.min(data.rules.maxBond, partner.bond + t.bondGain);
  partner.trainingSessions += 1;
  const levels = gainXP(t.xpByTier[tier], partner, data);
  if (boosted) save.boostedTraining -= 1;
  const today = dayKey(now);
  save.trainingDay = { day: today, count: (save.trainingDay.day === today ? save.trainingDay.count : 0) + 1 };
  record(save, "training", 1, now);

  let text = `${["Flojo…", "¡Bien!", "¡Muy bien!", "¡Perfecto!"][tier]} Puntuación ${score}. `;
  text += gain > 0 ? `${TRAINING[kind].stat} +${gain}${boosted ? " (pesas: ×2)" : ""}.` : "Esta vez no mejora.";
  if (tier > 0) text += ` Vínculo +${t.bondGain}.`;
  if (levels > 0) text += ` ¡Sube al nivel ${partner.level}!`;
  return done(text);
}

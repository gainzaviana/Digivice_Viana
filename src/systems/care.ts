import type { GameData } from "../data/models";
import { addLog, partnerOf, type GameSave } from "../core/save";
import { maxStats } from "./progression";
import { cureInjury } from "./walk";
import { record } from "./challenges";
import { done, refused, type ActionResult } from "./result";

/**
 * Care mini-games (D-Ark style quick recovery). Each play costs a charge; charges refill every
 * 500 steps or 2 hours (max 3), so they help without replacing walking or items.
 * - Energy Charge (rapid taps): +3…+6 DP and bond.
 * - Timing Pulse (3 rounds): 30…75 % HP, and cures an injury.
 */
export type CareGame = "energia" | "pulso";

export const CARE: Record<CareGame, { name: string; summary: string }> = {
  energia: { name: "Carga de energía", summary: "Pulsa (o agita) lo más rápido que puedas durante 5 segundos para llenar el núcleo. Recupera DP y vínculo." },
  pulso: { name: "Pulso de datos", summary: "Toca cuando el pulso pase por la zona brillante, 3 rondas. Recupera vida y cura las heridas." },
};

export const careTier = (score: number, data: GameData) => data.rules.care.tierScores.filter((s) => score >= s).length;

export function playCare(save: GameSave, game: CareGame, score: number, data: GameData): ActionResult {
  const partner = partnerOf(save);
  if (!partner) return refused("No tienes compañero.");
  if (save.care.charges <= 0) return refused("No te quedan cargas de cuidados. Se recuperan caminando (500 pasos) o con el tiempo.");
  const c = data.rules.care;
  const tier = careTier(Math.max(0, Math.min(100, score)), data);
  if (save.care.charges >= c.maxCharges) save.care.lastCharge = Date.now();
  save.care.charges -= 1;
  const name = partner.nickname ?? data.eco.get(partner.speciesID)?.name ?? "Tu Eco";
  let text: string;
  if (game === "energia") {
    const before = partner.dp;
    partner.dp = Math.min(data.rules.maxDP, partner.dp + c.energyDP[tier]);
    partner.bond = Math.min(data.rules.maxBond, partner.bond + c.energyBond[tier]);
    text = `${["Bien", "¡Muy bien!", "¡Genial!", "¡Perfecto!"][tier]} ${name}: DP +${partner.dp - before}, vínculo +${c.energyBond[tier]}.`;
  } else {
    const max = maxStats(partner, data).hp;
    const heal = Math.round((max * c.pulseHeal[tier]) / 100);
    const before = partner.hp;
    partner.hp = Math.min(max, Math.max(partner.hp, 0) + heal);
    const cured = !!partner.injured && tier >= 1;
    if (cured) cureInjury(partner);
    text = `${["Bien", "¡Muy bien!", "¡Genial!", "¡Perfecto!"][tier]} ${name}: vida +${partner.hp - before}.${cured ? " ¡Ya no está herido!" : partner.injured ? " Sigue herido: acierta mejor para curarlo." : ""}`;
  }
  record(save, "training");
  addLog(save, "info", text);
  return done(text);
}

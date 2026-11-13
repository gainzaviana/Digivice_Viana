import type { GameData, Region } from "../data/models";
import type { Rng } from "../core/random";
import { addLog, dayKey, partnerOf, type GameSave } from "../core/save";
import { maxStats } from "./progression";
import { cureInjury } from "./walk";
import { record } from "./challenges";
import { done, refused, type ActionResult } from "./result";

/**
 * City services, for the city you're travelling to: a shop (stock by Area), a healing spot (free
 * once a day, then for bits) and a shrine (a free daily blessing, or a rare Parche for an offering).
 */

export const currentCity = (save: GameSave, data: GameData): Region | undefined => (save.map.regionID ? data.region.get(save.map.regionID) : undefined);

function refreshDay(save: GameSave, data: GameData, rng: Rng, now = new Date()) {
  const today = dayKey(now);
  if (save.cityDay.day === today) return;
  const c = data.rules.city;
  const epic = rng.int(1, 100) <= c.epicChance;
  const offering = rng.pick(data.parches.filter((p) => p.rarity === (epic ? "epica" : "rara")))?.id;
  save.cityDay = { day: today, healed: false, blessed: false, offering };
}

export interface ShopOffer { id: string; kind: "item" | "parche"; name: string; description: string; price: number }

export function shopOffers(save: GameSave, data: GameData): ShopOffer[] {
  const area = currentCity(save, data)?.area ?? 1;
  return (data.rules.city.shop[String(area)] ?? []).flatMap((id): ShopOffer[] => {
    const item = data.item.get(id);
    if (item?.price) return [{ id, kind: "item", name: item.name, description: item.description, price: item.price }];
    const p = data.parche.get(id);
    if (p?.price) return [{ id, kind: "parche", name: p.name, description: p.description, price: p.price }];
    return [];
  });
}

export function shopBuy(save: GameSave, id: string, data: GameData): ActionResult {
  const offer = shopOffers(save, data).find((o) => o.id === id);
  if (!offer) return refused("Esa tienda no lo vende.");
  if (save.bits < offer.price) return refused("No tienes bits suficientes.");
  save.bits -= offer.price;
  if (offer.kind === "item") save.inventory[id] = (save.inventory[id] ?? 0) + 1;
  else {
    save.parches[id] = (save.parches[id] ?? 0) + 1;
    if (!save.guide.discoveredParches.includes(id)) save.guide.discoveredParches.push(id);
  }
  record(save, "merchantBuys");
  return done(`Compraste ${offer.name} por ${offer.price} bits.`);
}

export function healCost(save: GameSave, data: GameData, rng: Rng): number {
  refreshDay(save, data, rng);
  return save.cityDay.healed ? data.rules.city.healCost * (currentCity(save, data)?.area ?? 1) : 0;
}

/** The healing spot: full HP and the injury cured. */
export function cityHeal(save: GameSave, data: GameData, rng: Rng): ActionResult {
  const partner = partnerOf(save);
  if (!partner) return refused("No tienes compañero.");
  const cost = healCost(save, data, rng);
  if (partner.hp >= maxStats(partner, data).hp && !partner.injured) return refused("Tu compañero está en plena forma.");
  if (save.bits < cost) return refused(`Curar cuesta ${cost} bits y no tienes suficientes.`);
  save.bits -= cost;
  save.cityDay.healed = true;
  partner.hp = maxStats(partner, data).hp;
  cureInjury(partner);
  return done(cost ? `Curado por ${cost} bits.` : "Tu compañero descansa en el centro de la ciudad: vida al máximo.");
}

export function shrineOffering(save: GameSave, data: GameData, rng: Rng) {
  refreshDay(save, data, rng);
  const p = save.cityDay.offering ? data.parche.get(save.cityDay.offering) : undefined;
  const c = data.rules.city;
  return p ? { parche: p, cost: c.offeringBase + c.offeringPerOrder * (currentCity(save, data)?.order ?? 1) } : undefined;
}

export function shrineBless(save: GameSave, data: GameData, rng: Rng): ActionResult {
  const partner = partnerOf(save);
  refreshDay(save, data, rng);
  if (!partner) return refused("No tienes compañero.");
  if (save.cityDay.blessed) return refused("El santuario ya te ha bendecido hoy.");
  save.cityDay.blessed = true;
  partner.dp = data.rules.maxDP;
  partner.bond = Math.min(data.rules.maxBond, partner.bond + data.rules.city.blessingBond);
  record(save, "shrineVisits");
  const text = `El santuario te bendice: DP al máximo, vínculo +${data.rules.city.blessingBond}.`;
  addLog(save, "shrine", text);
  return done(text);
}

export function shrineOffer(save: GameSave, data: GameData, rng: Rng): ActionResult {
  const o = shrineOffering(save, data, rng);
  if (!o) return refused("Hoy el santuario no ofrece nada.");
  if (save.bits < o.cost) return refused(`La ofrenda cuesta ${o.cost} bits.`);
  save.bits -= o.cost;
  save.parches[o.parche.id] = (save.parches[o.parche.id] ?? 0) + 1;
  if (!save.guide.discoveredParches.includes(o.parche.id)) save.guide.discoveredParches.push(o.parche.id);
  save.cityDay.offering = undefined;
  record(save, "shrineVisits");
  const text = `Ofreciste ${o.cost} bits. El santuario te entrega: ${o.parche.name}.`;
  addLog(save, "shrine", text);
  return done(text);
}

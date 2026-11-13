import type { CardRarity, GameData, Region } from "../data/models";
import type { Rng } from "../core/random";
import { addLog, newID, newSave, partnerOf, type GameSave, type LogKind, type PendingEvent } from "../core/save";
import { evolutionStatus, maxStats, newEco } from "./progression";
import { record, refreshDaily } from "./challenges";
import { done, refused, type ActionResult } from "./result";

const logged = (save: GameSave, kind: LogKind, result: ActionResult) => {
  if (result.ok) addLog(save, kind, result.message);
  return result;
};

const take = (save: GameSave, id: string): PendingEvent | undefined => {
  const i = save.pending.findIndex((e) => e.id === id);
  return i >= 0 ? save.pending.splice(i, 1)[0] : undefined;
};

const addOnce = (list: string[], id: string) => { if (!list.includes(id)) list.push(id); };

// MARK: New game

/** A fresh adventure with the chosen starter, keeping the step history and settings. */
export function newGame(starterID: string, old: GameSave, data: GameData): GameSave | undefined {
  const species = data.eco.get(starterID);
  const first = data.regions[0];
  if (!species?.starter || !first) return undefined;
  const save = newSave();
  save.totalSteps = old.totalSteps;
  save.steps = old.steps;
  save.settings = old.settings;
  const partner = newEco(species.id, data.rules.startingLevel, data);
  save.squad = [partner];
  save.partnerID = partner.id;
  save.bits = data.rules.startingBits;
  save.inventory = { ...data.rules.startingItems };
  for (const id of data.rules.startingCards) save.parches[id] = (save.parches[id] ?? 0) + 1;
  save.deck = [...data.rules.startingCards];
  save.map.regionID = first.id;
  save.map.stepsLeft = first.steps;
  save.map.stepsToNextEvent = data.rules.encounterEveryMaxSteps;
  save.guide.seen = [species.id];
  save.guide.owned = [species.id];
  save.guide.discoveredParches = [...data.rules.startingCards];
  addLog(save, "info", `Empieza tu aventura con ${species.name} en ${first.name}.`);
  refreshDaily(save, data);
  return save;
}

// MARK: Pending events

export function flee(save: GameSave, id: string, data: GameData): ActionResult {
  const e = take(save, id);
  if (!e) return refused("Ese suceso ya no está.");
  return logged(save, "battle", done(`Huiste de ${data.eco.get(e.species ?? "")?.name ?? "el Eco"}.`));
}

export function acceptRecruit(save: GameSave, id: string, data: GameData): ActionResult {
  const e = save.pending.find((x) => x.id === id);
  const species = e?.kind === "recruit" && e.species ? data.eco.get(e.species) : undefined;
  if (!e || !species) return refused("Ese suceso ya no está.");
  if (save.squad.length >= data.rules.squadCap) return refused(`Tu equipo está lleno (${data.rules.squadCap} Ecos).`);
  take(save, id);
  save.squad.push(newEco(species.id, e.level ?? 1, data, e.variant ?? "normal"));
  addOnce(save.guide.owned, species.id);
  record(save, "recruits");
  return logged(save, "recruit", done(`¡${species.name} se ha unido a tu equipo!`));
}

export function declineRecruit(save: GameSave, id: string, data: GameData): ActionResult {
  const e = take(save, id);
  if (!e) return refused("Ese suceso ya no está.");
  return logged(save, "recruit", done(`${data.eco.get(e.species ?? "")?.name ?? "El Eco"} siguió su camino.`));
}

export function buy(save: GameSave, offerID: string, eventID: string, data: GameData): ActionResult {
  const offer = save.pending.find((e) => e.id === eventID)?.offers?.find((o) => o.id === offerID);
  if (!offer || offer.sold) return refused("Esa oferta ya no está.");
  if (save.bits < offer.price) return refused("No tienes bits suficientes.");
  save.bits -= offer.price;
  offer.sold = true;
  record(save, "merchantBuys");
  let name: string;
  if (offer.kind === "item") {
    save.inventory[offer.contentID] = (save.inventory[offer.contentID] ?? 0) + 1;
    name = data.item.get(offer.contentID)?.name ?? offer.contentID;
  } else {
    save.parches[offer.contentID] = (save.parches[offer.contentID] ?? 0) + 1;
    addOnce(save.guide.discoveredParches, offer.contentID);
    name = data.parche.get(offer.contentID)?.name ?? offer.contentID;
  }
  return logged(save, "merchant", done(`Compraste ${name} por ${offer.price} bits.`));
}

export function leave(save: GameSave, id: string): ActionResult {
  return take(save, id) ? done("Seguiste tu camino.") : refused("Ese suceso ya no está.");
}

/** Shrine, option 1: a free blessing (full HP and DP, bond +3). */
export function receiveBlessing(save: GameSave, id: string, data: GameData): ActionResult {
  const partner = partnerOf(save);
  if (!partner || !save.pending.some((e) => e.id === id && e.kind === "shrine")) return refused("Ese suceso ya no está.");
  take(save, id);
  const max = maxStats(partner, data);
  partner.hp = max.hp;
  partner.dp = max.dp;
  partner.bond = Math.min(data.rules.maxBond, partner.bond + 3);
  record(save, "shrineVisits");
  return logged(save, "shrine", done("El santuario te bendice: vida y DP al máximo, vínculo +3."));
}

/** Shrine, option 2: pay bits for its Parche. */
export function makeOffering(save: GameSave, id: string, data: GameData): ActionResult {
  const e = save.pending.find((x) => x.id === id);
  const parche = e?.kind === "shrine" && e.parche ? data.parche.get(e.parche) : undefined;
  if (!e || !parche || e.cost === undefined) return refused("Ese suceso ya no está.");
  if (save.bits < e.cost) return refused(`La ofrenda cuesta ${e.cost} bits y no tienes suficientes.`);
  take(save, id);
  save.bits -= e.cost;
  record(save, "shrineVisits");
  save.parches[parche.id] = (save.parches[parche.id] ?? 0) + 1;
  addOnce(save.guide.discoveredParches, parche.id);
  return logged(save, "shrine", done(`Ofreciste ${e.cost} bits. El santuario te entrega: ${parche.name}.`));
}

// MARK: Map

const mainRoute = (data: GameData) => data.regions.filter((r) => !r.postGame && !r.requiresItem);

export function unlockedRegions(save: GameSave, data: GameData): Region[] {
  const main = mainRoute(data);
  const finalCleared = !!main.length && save.map.clearedRegions.includes(main[main.length - 1].id);
  const unlocked: Region[] = [];
  for (const r of main) {
    unlocked.push(r);
    if (!save.map.clearedRegions.includes(r.id)) break;
  }
  for (const r of data.regions.filter((x) => x.postGame || x.requiresItem)) {
    const hasKey = !r.requiresItem || (save.inventory[r.requiresItem] ?? 0) > 0;
    if (hasKey && (!r.postGame || finalCleared)) unlocked.push(r);
  }
  return unlocked.sort((a, b) => a.order - b.order);
}

export function travel(save: GameSave, regionID: string, data: GameData): ActionResult {
  const region = unlockedRegions(save, data).find((r) => r.id === regionID);
  if (!region) return refused("Todavía no puedes ir allí.");
  Object.assign(save.map, { regionID: region.id, stepsLeft: region.steps, bossReady: false, bossDefeats: 0 });
  save.map.stepsToNextEvent = Math.min(save.map.stepsToNextEvent, data.rules.encounterEveryMaxSteps);
  return logged(save, "region", done(`Viajas a ${region.name}. Faltan ${region.steps.toLocaleString("es")} pasos para el jefe.`));
}

/** The current zone's boss has been beaten: rewards, then on along the main route. */
export function defeatBoss(save: GameSave, data: GameData): ActionResult {
  const region = save.map.regionID ? data.region.get(save.map.regionID) : undefined;
  if (!save.map.bossReady || !region) return refused("No hay ningún jefe esperando.");
  addOnce(save.guide.defeated, region.boss.species);
  const bossName = data.eco.get(region.boss.species)?.name ?? region.boss.species;
  const rewards: string[] = [];
  if (!save.map.clearedRegions.includes(region.id)) {
    save.map.clearedRegions.push(region.id);
    const bits = data.rules.bossBitsPerOrder * region.order;
    save.bits += bits;
    rewards.push(`${bits} bits`);
    const item = region.bossReward ? data.item.get(region.bossReward) : undefined;
    if (item) { save.inventory[item.id] = (save.inventory[item.id] ?? 0) + 1; rewards.push(item.name); }
    const card = region.bossCard ? data.parche.get(region.bossCard) : undefined;
    if (card) { save.parches[card.id] = (save.parches[card.id] ?? 0) + 1; addOnce(save.guide.discoveredParches, card.id); rewards.push(card.name); }
    const line = data.eco.get(partnerOf(save)?.speciesID ?? "")?.line;
    const crystal = region.bossGivesPartnerCrystal && line ? data.crystalForLine(line) : undefined;
    if (crystal) { save.inventory[crystal.id] = (save.inventory[crystal.id] ?? 0) + 1; rewards.push(crystal.name); }
  } else {
    const bits = Math.floor((data.rules.bossBitsPerOrder * region.order) / 3);
    save.bits += bits;
    rewards.push(`${bits} bits`);
  }
  let text = `¡Has vencido a ${bossName}! Recompensa: ${rewards.join(", ")}.`;
  const main = mainRoute(data);
  const index = main.findIndex((r) => r.id === region.id);
  if (index >= 0 && index + 1 < main.length) {
    const next = main[index + 1];
    save.map.regionID = next.id;
    save.map.stepsLeft = next.steps;
    text += ` Siguiente zona: ${next.name}.`;
  } else {
    save.map.stepsLeft = region.steps;
    if (region.id === main[main.length - 1]?.id) text += " ¡Has salvado La Red Profunda! Se abren nuevos caminos.";
  }
  save.map.bossReady = false;
  save.map.bossDefeats = 0;
  return logged(save, "boss", done(text));
}

// MARK: Items

export function useItem(save: GameSave, itemID: string, data: GameData, rng: Rng, ecoID?: string): ActionResult {
  const item = data.item.get(itemID);
  if (!item || (save.inventory[itemID] ?? 0) <= 0) return refused("No te quedan.");
  const eco = save.squad.find((e) => e.id === (ecoID ?? save.partnerID));
  const consume = () => { save.inventory[itemID] -= 1; if (save.inventory[itemID] <= 0) delete save.inventory[itemID]; };
  const name = eco ? data.eco.get(eco.speciesID)?.name ?? "Tu Eco" : "";
  switch (item.kind) {
    case "recuperacion": {
      if (!eco || !item.effect) return refused("Elige a quién dárselo.");
      const max = maxStats(eco, data);
      if (eco.hp >= max.hp && eco.dp >= max.dp) return refused("Ya está en plena forma.");
      if (item.effect.healPercent) eco.hp = Math.min(max.hp, eco.hp + Math.ceil((max.hp * item.effect.healPercent) / 100));
      if (item.effect.dp) eco.dp = Math.min(max.dp, eco.dp + item.effect.dp);
      consume();
      return done(`Usaste ${item.name}. Vida ${eco.hp}/${max.hp}, DP ${eco.dp}/${max.dp}.`);
    }
    case "fruta": {
      if (!eco || !item.effect) return refused("Elige a quién dárselo.");
      const e = item.effect;
      eco.bonus.atk += e.atk ?? 0; eco.bonus.def += e.def ?? 0; eco.bonus.spd += e.spd ?? 0; eco.bonus.hp += e.hp ?? 0;
      eco.hp += e.hp ?? 0;
      eco.bond = Math.min(data.rules.maxBond, eco.bond + (e.bond ?? 0));
      consume();
      return done(`${name} se comió la ${item.name}. ${item.description}`);
    }
    case "antivirus":
      if (!eco) return refused("Elige a quién dárselo.");
      if (eco.variant !== "infectado") return refused("Ese Eco no está infectado.");
      eco.variant = "normal";
      consume();
      return done("El Antivirus limpió la infección.");
    case "radar":
      if (save.map.radarActive) return refused("Ya tienes un Radar activo.");
      save.map.radarActive = true;
      consume();
      return done("Radar activado: el próximo encuentro será un Eco que quiere unirse a ti.");
    case "amuleto":
      save.map.luckySteps += item.effect?.steps ?? 1000;
      consume();
      return done(`Amuleto activado: ${save.map.luckySteps.toLocaleString("es")} pasos de buena suerte.`);
    case "entrenamiento":
      save.boostedTraining += 3;
      consume();
      return done(`Las próximas ${save.boostedTraining} sesiones de entrenamiento darán el doble.`);
    case "sobre": {
      if (itemID === "huevo-raro-cofre") {
        const egg = data.egg.get("huevo-raro");
        if (!egg || save.eggs.length >= data.rules.maxEggs) return refused("No puedes llevar más huevos.");
        save.eggs.push({ id: newID(), typeID: egg.id, stepsLeft: egg.steps });
        consume();
        return done(`Abriste el cofre: ¡un ${egg.name}!`);
      }
      const weights: Record<CardRarity, number> = { comun: 70, rara: 25, epica: 5 };
      const card = rng.weighted(data.parches, (p) => weights[p.rarity]);
      if (!card) return refused("El sobre está vacío.");
      save.parches[card.id] = (save.parches[card.id] ?? 0) + 1;
      addOnce(save.guide.discoveredParches, card.id);
      consume();
      return done(`Abriste el sobre: ${card.name}.`);
    }
    case "cristal":
    case "fusion":
      return refused("Se usa al evolucionar, cuando se cumplen el resto de condiciones.");
    case "clave":
      return refused("Es un objeto clave: abre caminos en el mapa.");
  }
}

// MARK: Squad and evolution

export function makePartner(save: GameSave, ecoID: string, data: GameData): ActionResult {
  const eco = save.squad.find((e) => e.id === ecoID);
  if (!eco) return refused("Ese Eco no está en tu equipo.");
  save.partnerID = eco.id;
  return done(`${eco.nickname ?? data.eco.get(eco.speciesID)?.name ?? "Tu Eco"} es ahora tu compañero.`);
}

/** Permanent evolution outside battle, when every condition is met. */
export function evolve(save: GameSave, ecoID: string, targetID: string, data: GameData, now = new Date()): ActionResult {
  const eco = save.squad.find((e) => e.id === ecoID);
  if (!eco) return refused("Ese Eco no está en tu equipo.");
  const status = evolutionStatus(eco, save, data, now).find((s) => s.target.id === targetID);
  if (!status) return refused("No puede evolucionar en eso.");
  if (status.evolution.conditions.inBattleOnly) return refused("Esa forma solo se alcanza en combate.");
  if (!status.ready) return refused(`Le falta: ${status.missing.join(", ")}.`);
  const item = status.evolution.conditions.item;
  if (item) { save.inventory[item] -= 1; if (save.inventory[item] <= 0) delete save.inventory[item]; }
  const before = data.eco.get(eco.speciesID)?.name ?? eco.speciesID;
  eco.speciesID = targetID;
  eco.history.push(targetID);
  const max = maxStats(eco, data);
  eco.hp = max.hp;
  eco.dp = max.dp;
  addOnce(save.guide.seen, targetID);
  addOnce(save.guide.owned, targetID);
  record(save, "evolutions");
  return logged(save, "evolution", done(`¡${before} ha evolucionado en ${status.target.name}!`));
}

// MARK: Deck

export function addToDeck(save: GameSave, id: string, data: GameData): ActionResult {
  const name = data.parche.get(id)?.name ?? id;
  if (save.deck.length >= data.rules.deckSize) return refused(`La baraja ya tiene ${data.rules.deckSize} Parches. Quita uno antes.`);
  if ((save.parches[id] ?? 0) <= save.deck.filter((x) => x === id).length) return refused(`No tienes más copias de ${name}.`);
  save.deck.push(id);
  return done(`${name} entra en la baraja.`);
}

export function removeFromDeck(save: GameSave, id: string, data: GameData): ActionResult {
  const i = save.deck.lastIndexOf(id);
  if (i < 0) return refused("No está en la baraja.");
  save.deck.splice(i, 1);
  return done(`${data.parche.get(id)?.name ?? id} sale de la baraja.`);
}

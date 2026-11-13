import type { GameData, Region } from "../data/models";
import { Rng } from "../core/random";
import { addLog, newID, partnerOf, type GameSave, type LogEntry, type LogKind, type MerchantOffer, type Variant } from "../core/save";
import { maxStats, newEco } from "./progression";
import { record } from "./challenges";

/**
 * Turns walked steps into the game: zone progress, random events, egg hatching,
 * recovery and bond. Steps are processed in chunks up to the next moment
 * something can happen, so thousands at once stay in order.
 * Returns what happened, oldest first (also added to the log).
 */
export function walk(steps: number, save: GameSave, data: GameData, rng: Rng, now = Date.now()): LogEntry[] {
  if (steps <= 0 || !save.partnerID) return [];
  const events: LogEntry[] = [];
  const log = (kind: LogKind, text: string) => events.push({ id: newID(), date: now, kind, text });
  const rules = data.rules;
  let remaining = steps;

  while (remaining > 0) {
    let chunk = remaining;
    const walkingZone = !!save.map.regionID && !save.map.bossReady;
    if (walkingZone) chunk = Math.min(chunk, Math.max(1, save.map.stepsLeft), Math.max(1, save.map.stepsToNextEvent));
    for (const egg of save.eggs) if (egg.stepsLeft > 0) chunk = Math.min(chunk, egg.stepsLeft);
    remaining -= chunk;

    const region = save.map.regionID ? data.region.get(save.map.regionID) : undefined;
    if (walkingZone && region) {
      save.map.stepsLeft = Math.max(0, save.map.stepsLeft - chunk);
      save.map.stepsToNextEvent -= chunk;
      if (save.map.stepsLeft === 0) {
        save.map.bossReady = true;
        if (!save.guide.seen.includes(region.boss.species)) save.guide.seen.push(region.boss.species);
        log("boss", `¡Has cruzado ${region.name}! ${data.eco.get(region.boss.species)?.name} (nivel ${region.boss.level}) te espera.`);
      } else if (save.map.stepsToNextEvent <= 0) {
        rollEvent(region, save, data, rng, now, log);
        save.map.stepsToNextEvent = rng.int(rules.encounterEveryMinSteps, rules.encounterEveryMaxSteps);
      }
    }
    if (save.map.luckySteps > 0) save.map.luckySteps = Math.max(0, save.map.luckySteps - chunk);
    hatchEggs(chunk, save, data, rng, log);
  }

  recover(steps, save, data);
  record(save, "steps", steps, new Date(now));
  record(save, "hatches", events.filter((e) => e.kind === "hatch").length, new Date(now));
  for (const e of events) addLog(save, e.kind, e.text, e.date);
  return events;
}

function rollEvent(region: Region, save: GameSave, data: GameData, rng: Rng, now: number, log: (k: LogKind, t: string) => void) {
  const rules = data.rules;
  let kind: string;
  if (save.map.radarActive) {
    save.map.radarActive = false;
    kind = "recruit";
  } else {
    const w = rules.events;
    kind = rng.weighted(
      [["battle", w.battle], ["recruit", w.recruit], ["item", w.item], ["egg", w.egg], ["merchant", w.merchant], ["shrine", w.shrine], ["nothing", w.nothing]] as [string, number][],
      (x) => x[1],
    )?.[0] ?? "nothing";
  }
  const interactive = ["battle", "recruit", "merchant", "shrine"].includes(kind);
  if (interactive && save.pending.length >= rules.maxPendingEvents) {
    log("info", "Algo se movió entre los datos, pero tienes demasiados sucesos pendientes y pasó de largo.");
    return;
  }
  switch (kind) {
    case "battle":
    case "recruit": {
      const candidates = kind === "recruit" ? region.encounters.filter((e) => data.eco.get(e.species)?.recruitable) : region.encounters;
      const encounter = rng.weighted(candidates.length ? candidates : region.encounters, (e) => e.weight);
      const species = encounter && data.eco.get(encounter.species);
      if (!encounter || !species) return;
      const isRecruit = kind === "recruit" && candidates.length > 0;
      const level = rng.int(encounter.minLevel, encounter.maxLevel);
      const variant = rollVariant(save, data, rng);
      save.pending.push({ id: newID(), kind: isRecruit ? "recruit" : "battle", regionID: region.id, date: now, species: species.id, level, variant });
      if (!save.guide.seen.includes(species.id)) save.guide.seen.push(species.id);
      const name = species.name + (variant === "normal" ? "" : ` ${variant}`);
      log(isRecruit ? "recruit" : "battle", isRecruit ? `${name} (nivel ${level}) quiere unirse a tu equipo.` : `¡Un ${name} salvaje (nivel ${level}) te corta el paso!`);
      return;
    }
    case "item": {
      const drop = rng.weighted(rules.itemDrops.filter((d) => d.minRegion <= region.order), (d) => d.weight);
      const item = drop && data.item.get(drop.item);
      if (!item) return;
      save.inventory[item.id] = (save.inventory[item.id] ?? 0) + 1;
      log("item", `Encontraste: ${item.name}.`);
      return;
    }
    case "egg": {
      const drop = rng.weighted(rules.eggDrops.filter((d) => d.minRegion <= region.order), (d) => d.weight);
      const egg = drop && data.egg.get(drop.egg);
      if (!egg) return;
      if (save.eggs.length >= rules.maxEggs) {
        const bits = Math.floor(egg.steps / 50);
        save.bits += bits;
        log("bits", `Encontraste un ${egg.name}, pero no puedes llevar más huevos. Lo cambias por ${bits} bits.`);
      } else {
        save.eggs.push({ id: newID(), typeID: egg.id, stepsLeft: egg.steps });
        log("egg", `¡Encontraste un ${egg.name}! Se abrirá en ${egg.steps.toLocaleString("es")} pasos.`);
      }
      return;
    }
    case "merchant":
      save.pending.push({ id: newID(), kind: "merchant", regionID: region.id, date: now, offers: merchantOffers(data, rng) });
      log("merchant", "Un mercader ambulante ha montado su puesto en el camino.");
      return;
    case "shrine": {
      const epic = rng.int(1, 100) <= rules.shrineEpicChance;
      const parche = rng.pick(data.parches.filter((p) => p.rarity === (epic ? "epica" : "rara")));
      if (!parche) return;
      save.pending.push({ id: newID(), kind: "shrine", regionID: region.id, date: now, parche: parche.id, cost: rules.shrineBaseCost + rules.shrineCostPerOrder * region.order });
      log("shrine", "Has encontrado un santuario misterioso.");
      return;
    }
    default: {
      const bits = rng.int(rules.foundBitsMin, rules.foundBitsMax);
      save.bits += bits;
      log("bits", `Encontraste ${bits} bits por el camino.`);
    }
  }
}

export function rollVariant(save: GameSave, data: GameData, rng: Rng): Variant {
  const brillante = data.rules.brillanteChance * (save.map.luckySteps > 0 ? 2 : 1);
  const roll = rng.float() * 100;
  if (roll < brillante) return "brillante";
  if (roll < brillante + data.rules.infectadoChance) return "infectado";
  return "normal";
}

function merchantOffers(data: GameData, rng: Rng): MerchantOffer[] {
  const pool: MerchantOffer[] = [
    ...data.items.filter((i) => i.price !== undefined).map((i) => ({ id: newID(), kind: "item" as const, contentID: i.id, price: i.price!, sold: false })),
    ...data.parches.filter((p) => p.price !== undefined).map((p) => ({ id: newID(), kind: "parche" as const, contentID: p.id, price: p.price!, sold: false })),
  ];
  const offers: MerchantOffer[] = [];
  while (offers.length < data.rules.merchantOffers && pool.length) offers.push(pool.splice(rng.int(0, pool.length - 1), 1)[0]);
  return offers;
}

function hatchEggs(walked: number, save: GameSave, data: GameData, rng: Rng, log: (k: LogKind, t: string) => void) {
  for (const egg of save.eggs) egg.stepsLeft = Math.max(0, egg.stepsLeft - walked);
  const kept = [];
  for (const egg of save.eggs) {
    const type = data.egg.get(egg.typeID);
    if (egg.stepsLeft > 0 || !type || save.squad.length >= data.rules.squadCap) { kept.push(egg); continue; }
    const entry = rng.weighted(type.pool, (p) => p.weight);
    const species = entry && data.eco.get(entry.species);
    if (!species) continue;
    const variant: Variant = rng.int(1, 100) <= type.brillanteChance ? "brillante" : "normal";
    save.squad.push(newEco(species.id, species.stage === "brote" ? 1 : 3, data, variant));
    for (const list of [save.guide.seen, save.guide.owned]) if (!list.includes(species.id)) list.push(species.id);
    log("hatch", `¡Tu ${type.name} se ha abierto! Ha nacido ${species.name}${variant === "brillante" ? " (¡Brillante!)" : ""}.`);
  }
  save.eggs = kept;
}

function recover(steps: number, save: GameSave, data: GameData) {
  const partner = partnerOf(save);
  if (!partner) return;
  const r = data.rules;
  const crossed = (every: number) => Math.floor((partner.stepsWalked + steps) / every) - Math.floor(partner.stepsWalked / every);
  const bond = crossed(r.stepsPerBond), dp = crossed(r.stepsPerDP), heal = crossed(r.stepsPerHealPercent);
  partner.stepsWalked += steps;
  const max = maxStats(partner, data);
  partner.bond = Math.min(r.maxBond, partner.bond + bond);
  partner.dp = Math.min(max.dp, partner.dp + dp);
  partner.hp = Math.min(max.hp, partner.hp + Math.ceil((max.hp * heal) / 100));
}

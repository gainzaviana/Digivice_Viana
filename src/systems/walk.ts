import type { GameData, Region } from "../data/models";
import { Rng } from "../core/random";
import { addLog, newID, partnerOf, type EcoInstance, type GameSave, type LogEntry, type LogKind, type Variant } from "../core/save";
import { maxStats } from "./progression";
import { ownedOf, receiveEco } from "./collection";
import { record } from "./challenges";

/**
 * Turns walked steps into the game: the city road (toward its boss), a Digivice alert every
 * 150–350 steps (wild battle 60 %, data cache 20 %, SOS rescue 10 %, data hazard 10 %), egg
 * incubation, recovery (HP, DP, bond, injuries) and Care charges. Steps are processed in chunks up
 * to the next moment something can happen, so thousands at once stay in order. Lifetime steps and
 * egg progress are never lost.
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
    // The road keeps giving events while the boss waits: that's where the partner trains for it.
    const inZone = !!save.map.regionID;
    const approaching = inZone && !save.map.bossReady;
    if (inZone) chunk = Math.min(chunk, Math.max(1, save.map.stepsToNextEvent));
    if (approaching) chunk = Math.min(chunk, Math.max(1, save.map.stepsLeft));
    for (const egg of save.eggs) if (egg.stepsLeft > 0) chunk = Math.min(chunk, egg.stepsLeft);
    remaining -= chunk;

    const region = save.map.regionID ? data.region.get(save.map.regionID) : undefined;
    if (inZone && region) {
      if (approaching) save.map.stepsLeft = Math.max(0, save.map.stepsLeft - chunk);
      save.map.stepsToNextEvent -= chunk;
      if (approaching && save.map.stepsLeft === 0) {
        save.map.bossReady = true;
        if (!save.guide.seen.includes(region.boss.species)) save.guide.seen.push(region.boss.species);
        log("boss", `¡Has llegado a ${region.name}! ${data.eco.get(region.boss.species)?.name} (nivel ${region.boss.level}) defiende la ciudad.`);
      } else if (save.map.stepsToNextEvent <= 0) {
        rollEvent(region, save, data, rng, now, log);
        save.map.stepsToNextEvent = rng.int(rules.encounterEveryMinSteps, rules.encounterEveryMaxSteps);
      }
    }
    if (save.map.luckySteps > 0) save.map.luckySteps = Math.max(0, save.map.luckySteps - chunk);
    hatchEggs(chunk, save, data, rng, log);
  }

  recover(steps, save, data, log);
  record(save, "steps", steps, new Date(now));
  record(save, "hatches", events.filter((e) => e.kind === "hatch").length, new Date(now));
  for (const e of events) addLog(save, e.kind, e.text, e.date);
  return events;
}

export type RoadEvent = "battle" | "cache" | "sos" | "hazard";

/** A Digivice alert on the road. Every kind waits in Sucesos (and on the home path) until resolved. */
function rollEvent(region: Region, save: GameSave, data: GameData, rng: Rng, now: number, log: (k: LogKind, t: string) => void) {
  const rules = data.rules;
  const w = rules.events;
  // The Radar makes the next alert an SOS rescue.
  const kind: RoadEvent = save.map.radarActive ? "sos" : rng.weighted(
    [["battle", w.battle], ["cache", w.cache], ["sos", w.sos], ["hazard", w.hazard]] as [RoadEvent, number][],
    (x) => x[1],
  )?.[0] ?? "battle";
  save.map.radarActive = false;
  if (save.pending.length >= rules.maxPendingEvents) {
    log("info", "¡BIP! Algo apareció en el radar, pero tienes demasiados sucesos pendientes y pasó de largo.");
    return;
  }
  const encounter = rng.weighted(region.encounters, (e) => e.weight);
  const species = encounter && data.eco.get(encounter.species);
  switch (kind) {
    case "battle": {
      if (!encounter || !species) return;
      const level = rng.int(encounter.minLevel, encounter.maxLevel);
      const variant = rollVariant(save, data, rng);
      save.pending.push({ id: newID(), kind: "battle", regionID: region.id, date: now, species: species.id, level, variant });
      if (!save.guide.seen.includes(species.id)) save.guide.seen.push(species.id);
      const name = species.name + (variant === "normal" ? "" : ` ${variant}`);
      log("battle", variant === "brillante"
        ? `¡BIP! ✨ ¡Un ${name} salvaje (nivel ${level})! Si lo vences, se unirá a ti.`
        : `¡BIP! ¡Un ${name} salvaje (nivel ${level}) te corta el paso!`);
      return;
    }
    case "cache":
      save.pending.push({ id: newID(), kind: "cache", regionID: region.id, date: now });
      log("item", "¡BIP! Un cofre de datos brilla en el camino.");
      return;
    case "sos": {
      // A captor holds a little Eco; beating it (a bit stronger than usual) frees it.
      if (!encounter || !species) return;
      const level = encounter.maxLevel + rules.sos.levelBonus;
      save.pending.push({ id: newID(), kind: "sos", regionID: region.id, date: now, species: species.id, level, variant: "normal" });
      if (!save.guide.seen.includes(species.id)) save.guide.seen.push(species.id);
      log("battle", `¡BIP! ¡Señal de socorro! Un ${species.name} (nivel ${level}) tiene atrapado a un Eco.`);
      return;
    }
    case "hazard":
      save.pending.push({ id: newID(), kind: "hazard", regionID: region.id, date: now });
      log("info", "¡BIP! ¡Una tormenta de datos bloquea el camino!");
      return;
  }
}

export function rollVariant(save: GameSave, data: GameData, rng: Rng): Variant {
  const brillante = data.rules.brillanteChance * (save.map.luckySteps > 0 ? 2 : 1);
  const roll = rng.float() * 100;
  if (roll < brillante) return "brillante";
  if (roll < brillante + data.rules.infectadoChance) return "infectado";
  return "normal";
}

/** Puts an egg in a free incubator slot. False if the incubator is full. */
export function addEgg(save: GameSave, typeID: string, data: GameData): boolean {
  const egg = data.egg.get(typeID);
  if (!egg || save.eggs.length >= data.rules.maxEggs) return false;
  save.eggs.push({ id: newID(), typeID: egg.id, stepsLeft: egg.steps });
  return true;
}

function hatchEggs(walked: number, save: GameSave, data: GameData, rng: Rng, log: (k: LogKind, t: string) => void) {
  for (const egg of save.eggs) egg.stepsLeft = Math.max(0, egg.stepsLeft - walked);
  const kept = [];
  for (const egg of save.eggs) {
    const type = data.egg.get(egg.typeID);
    if (egg.stepsLeft > 0 || !type) { kept.push(egg); continue; }
    const entry = rng.weighted(type.pool, (p) => p.weight);
    const species = entry && data.eco.get(entry.species);
    if (!species) continue;
    // A species you already own needs no room: it awakens the one you have.
    if (!ownedOf(save, species.id, data) && save.squad.length >= data.rules.squadCap) { kept.push(egg); continue; }
    const variant: Variant = rng.int(1, 100) <= type.brillanteChance ? "brillante" : "normal";
    const got = receiveEco(save, species.id, 1, variant, data, "egg");
    if (got.kind === "new") {
      const name = data.eco.get(got.eco!.speciesID)?.name ?? species.name;
      log("hatch", `¡Tu ${type.name} se ha abierto! Ha nacido ${name}${variant === "brillante" ? " (¡Brillante! ✨)" : ""}, nivel 1.`);
    } else log("hatch", `¡Tu ${type.name} se ha abierto! ${got.text}`);
  }
  save.eggs = kept;
}

/** Ends an injury: the Eco can battle again. */
export function cureInjury(eco: EcoInstance) { eco.injured = undefined; }

function recover(steps: number, save: GameSave, data: GameData, log: (k: LogKind, t: string) => void) {
  const partner = partnerOf(save);
  const r = data.rules;
  // Care charges refill with steps too.
  if (save.care.charges < r.care.maxCharges) {
    save.care.steps += steps;
    const gained = Math.floor(save.care.steps / r.care.stepsPerCharge);
    if (gained > 0) {
      save.care.charges = Math.min(r.care.maxCharges, save.care.charges + gained);
      save.care.steps = save.care.charges >= r.care.maxCharges ? 0 : save.care.steps % r.care.stepsPerCharge;
    }
  }
  if (!partner) return;
  const crossed = (every: number) => Math.floor((partner.stepsWalked + steps) / every) - Math.floor(partner.stepsWalked / every);
  const bond = crossed(r.stepsPerBond), dp = crossed(r.stepsPerDP), heal = crossed(r.stepsPerHealPercent);
  partner.stepsWalked += steps;
  const max = maxStats(partner, data);
  partner.bond = Math.min(r.maxBond, partner.bond + bond);
  partner.dp = Math.min(r.maxDP, partner.dp + dp);
  partner.hp = Math.min(max.hp, partner.hp + Math.ceil((max.hp * heal) / 100));
  if (partner.injured) {
    partner.injured.stepsLeft -= steps;
    if (partner.injured.stepsLeft <= 0) {
      cureInjury(partner);
      log("info", `${partner.nickname ?? data.eco.get(partner.speciesID)?.name} se ha recuperado de sus heridas caminando.`);
    }
  }
}

/**
 * Resting (real time): the partner recovers 1 DP every few hours, injuries heal after a while,
 * and Care charges refill. Returns the DP gained.
 */
export function rest(save: GameSave, data: GameData, now = Date.now()): number {
  const r = data.rules;
  const charge = r.care.hoursPerCharge * 3_600_000;
  if (save.care.charges < r.care.maxCharges) {
    const ticks = Math.floor((now - save.care.lastCharge) / charge);
    if (ticks > 0) { save.care.charges = Math.min(r.care.maxCharges, save.care.charges + ticks); save.care.lastCharge += ticks * charge; }
  } else save.care.lastCharge = now;
  const partner = partnerOf(save);
  if (partner?.injured && now - partner.injured.since >= r.defeat.recoveryHours * 3_600_000) cureInjury(partner);
  const every = r.restHoursPerDP * 3_600_000;
  if (!save.lastRest) { save.lastRest = now; return 0; }
  const ticks = Math.floor((now - save.lastRest) / every);
  if (ticks <= 0) return 0;
  save.lastRest += ticks * every;
  if (!partner) return 0;
  const before = partner.dp;
  partner.dp = Math.min(r.maxDP, partner.dp + ticks);
  return partner.dp - before;
}

import { AFFINITY_NAME, BEATS, type Affinity, type BattleTuning, type EcoSpecies, type GameData, type StatKind, type Stats } from "../../data/models";
import { Rng } from "../../core/random";
import { partnerOf, type GameSave, type PendingEvent, type Variant } from "../../core/save";
import { battleEvolution, maxStats } from "../progression";
import { chooseAttack } from "./ai";

// State machine: intro (EVOLVE allowed) → choosing → resolve turn (obedience → enemy AI → DP →
// clash → dodge → damage → statuses) → victory | defeat | fled | left. Every action returns
// the beats the scene animates, in order.

export type Side = "partner" | "enemy";
export const other = (s: Side): Side => (s === "partner" ? "enemy" : "partner");
export type AttackKind = "basic" | "strong";
export type Outcome = "victory" | "defeat" | "fled" | "left";
export type Effectiveness = "normal" | "strong" | "weak";

export type Beat =
  | { t: "text"; text: string }
  | { t: "emote"; side: Side; mark: string }
  | { t: "charge"; side: Side }
  | { t: "launch"; side: Side; kind: AttackKind }
  | { t: "pierce"; by: Side }
  | { t: "clash"; winner?: Side; kind: AttackKind }
  | { t: "hit"; target: Side; damage: number; critical: boolean; effectiveness: Effectiveness }
  | { t: "dodge"; side: Side }
  | { t: "blocked"; side: Side }
  | { t: "heal"; side: Side; amount: number }
  | { t: "card"; name: string }
  | { t: "status"; side: Side; text: string }
  | { t: "evolve"; side: Side; from: string; to: string; success: boolean }
  | { t: "ko"; side: Side }
  | { t: "revive"; side: Side };

interface Buff { stat: StatKind; percent: number; turns: number }
interface Statuses {
  buffs: Buff[]; shieldTurns: number; sureHitTurns: number; obeyTurns: number; doubleStrike: boolean; forcedCrit: boolean;
  convertedAffinity?: Affinity; convertTurns: number; drainPercent: number; drainTurns: number; stunTurns: number; revive: boolean;
}
const freshStatuses = (): Statuses => ({ buffs: [], shieldTurns: 0, sureHitTurns: 0, obeyTurns: 0, doubleStrike: false, forcedCrit: false, convertTurns: 0, drainPercent: 0, drainTurns: 0, stunTurns: 0, revive: false });

export interface Combatant { speciesID: string; level: number; variant: Variant; stats: Stats; hp: number; dp: number; statuses: Statuses; enraged: boolean }

export interface EvolutionOffer { target: EcoSpecies; cost: number; failChance: number; blocked?: string }

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

export class Battle {
  readonly isBoss: boolean;
  readonly regionID: string;
  readonly regionOrder: number;
  readonly eventID?: string;
  readonly partnerID: string;
  readonly partnerBond: number;
  readonly partnerBonus: Stats;
  readonly clearedRegions: string[];
  readonly bossDefeats: number;
  readonly tuning: BattleTuning;
  readonly data: GameData;
  partner: Combatant;
  enemy: Combatant;
  phase: "intro" | "choosing" | "over" = "intro";
  outcome?: Outcome;
  turn = 0;
  /** Parches still usable this battle (each deck card once). */
  hand: string[];
  cardUsedThisTurn = false;
  partnerChoices: AttackKind[] = [];
  enemyChoices: AttackKind[] = [];
  evolutionsThisBattle = 0;
  private disobeyedLastTurn = false;
  private rng: Rng;

  /** A battle against a pending wild Eco, or the current zone's boss (no event). Undefined if it can't start. */
  static start(event: PendingEvent | undefined, save: GameSave, data: GameData, seed: number): Battle | undefined {
    const p = partnerOf(save);
    if (!p || p.hp <= 0) return undefined;
    if (event) {
      if (event.kind !== "battle" || !event.species || !data.eco.has(event.species)) return undefined;
      return new Battle(save, data, seed, event.species, event.level ?? 1, event.variant ?? "normal", false, event.regionID, event.id);
    }
    const region = save.map.regionID ? data.region.get(save.map.regionID) : undefined;
    if (!save.map.bossReady || !region || !data.eco.has(region.boss.species)) return undefined;
    return new Battle(save, data, seed, region.boss.species, region.boss.level, "normal", true, region.id);
  }

  private constructor(save: GameSave, data: GameData, seed: number, enemySpecies: string, enemyLevel: number, variant: Variant, isBoss: boolean, regionID: string, eventID?: string) {
    const p = partnerOf(save)!;
    this.data = data;
    this.tuning = data.rules.battle;
    this.isBoss = isBoss;
    this.regionID = regionID;
    this.regionOrder = data.region.get(regionID)?.order ?? 1;
    this.eventID = eventID;
    this.partnerID = p.id;
    this.partnerBond = p.bond;
    this.partnerBonus = { ...p.bonus };
    this.clearedRegions = [...save.map.clearedRegions];
    this.bossDefeats = isBoss ? save.map.bossDefeats : 0;
    this.hand = [...save.deck];
    this.rng = new Rng(seed);
    const ps = maxStats(p, data);
    this.partner = { speciesID: p.speciesID, level: p.level, variant: p.variant, stats: ps, hp: Math.min(p.hp, ps.hp), dp: Math.min(p.dp, ps.dp), statuses: freshStatuses(), enraged: false };
    let s = maxStats({ speciesID: enemySpecies, level: enemyLevel, bonus: { hp: 0, atk: 0, def: 0, spd: 0, dp: 0 } }, data);
    if (isBoss) {
      const t = this.tuning;
      const weakened = 1 - Math.min(t.bossWeakenMax, t.bossWeakenPerDefeat * save.map.bossDefeats) / 100;
      s = { hp: Math.floor(s.hp * t.bossHP * weakened), atk: Math.floor(s.atk * t.bossAtk), def: Math.floor(s.def * t.bossDef), spd: Math.floor(s.spd * t.bossSpd), dp: Math.floor(s.dp * t.bossDP) };
    }
    this.enemy = { speciesID: enemySpecies, level: enemyLevel, variant, stats: s, hp: s.hp, dp: s.dp, statuses: freshStatuses(), enraged: false };
  }

  combatant(side: Side) { return side === "partner" ? this.partner : this.enemy; }
  species(side: Side) { return this.data.eco.get(this.combatant(side).speciesID)!; }

  // MARK: Pre-battle evolution

  get evolutionOffer(): EvolutionOffer | undefined {
    if (this.phase !== "intro") return undefined;
    const target = battleEvolution(this.partner.speciesID, this.data);
    const cost = target ? this.tuning.evolutionCost[target.stage] : undefined;
    if (!target || cost === undefined) return undefined;
    let blocked: string | undefined;
    const boss = this.tuning.evolutionUnlockBoss[target.stage];
    if (boss && !this.clearedRegions.includes(boss)) blocked = `Se desbloquea al vencer al jefe de ${this.data.region.get(boss)?.name ?? boss}.`;
    else if (this.partner.dp < cost) blocked = `Necesita ${cost} DP.`;
    const failChance = this.tuning.evolutionFailAtZeroBond * Math.max(0, 1 - this.partnerBond / Math.max(1, this.tuning.evolutionFailFreeBond));
    return { target, cost, failChance, blocked };
  }

  evolveBeforeBattle(): Beat[] {
    const offer = this.evolutionOffer;
    if (!offer || offer.blocked) return [];
    const from = this.species("partner").name;
    if (this.rng.float() * 100 < offer.failChance) {
      this.partner.dp -= Math.round(offer.cost * this.tuning.evolutionFailCostShare);
      return [{ t: "evolve", side: "partner", from, to: offer.target.name, success: false }, { t: "text", text: `¡La evolución ha fallado! ${from} no estaba preparado.` }];
    }
    this.partner.dp -= offer.cost;
    this.transformPartner(offer.target);
    this.evolutionsThisBattle += 1;
    return [{ t: "evolve", side: "partner", from, to: offer.target.name, success: true }, { t: "text", text: `¡${from} evoluciona en ${offer.target.name}!` }];
  }

  begin() { if (this.phase === "intro") this.phase = "choosing"; }

  // MARK: Turns

  canUseStrong(side: Side = "partner") { return this.combatant(side).dp >= this.species(side).signature.dpCost; }

  playTurn(intended: AttackKind, aiRng?: Rng): Beat[] {
    this.begin();
    if (this.phase !== "choosing") return [];
    const choice: AttackKind = intended === "strong" && !this.canUseStrong() ? "basic" : intended;
    const beats: Beat[] = [];
    const partnerAction = this.obey(choice, beats);
    this.partnerChoices.push(choice);
    let enemyAction: AttackKind | undefined;
    if (this.enemy.statuses.stunTurns > 0) beats.push({ t: "status", side: "enemy", text: "Aturdido" });
    else enemyAction = chooseAttack("enemy", this, aiRng ?? this.rng);
    if (enemyAction) this.enemyChoices.push(enemyAction);
    this.resolve(partnerAction, enemyAction, beats);
    this.endTurn(beats);
    return beats;
  }

  /** A failed escape gives the enemy a free attack. Bosses can't be fled. */
  flee(): Beat[] {
    this.begin();
    if (this.phase !== "choosing" || this.isBoss) return [{ t: "text", text: "¡No puedes huir de un jefe!" }];
    const p = this.partner.stats.spd, e = this.enemy.stats.spd, t = this.tuning;
    const chance = clamp(t.fleeBase + ((p - e) / Math.max(1, p + e)) * t.fleeSpeedFactor, t.fleeMin, t.fleeMax);
    if (this.rng.float() * 100 < chance) { this.finish("fled"); return [{ t: "text", text: "¡Has huido!" }]; }
    const beats: Beat[] = [{ t: "text", text: "¡No has podido huir!" }];
    const enemyAction = this.enemy.statuses.stunTurns > 0 ? undefined : chooseAttack("enemy", this, this.rng);
    this.resolve(undefined, enemyAction, beats);
    this.endTurn(beats);
    return beats;
  }

  private finish(outcome: Outcome) { this.phase = "over"; this.outcome = outcome; }

  private obey(choice: AttackKind, beats: Beat[]): AttackKind | undefined {
    if (this.partner.statuses.obeyTurns > 0) return choice;
    const t = this.tuning;
    const share = this.partnerBond / Math.max(1, this.data.rules.maxBond);
    let chance = t.disobeyAtZeroBond - (t.disobeyAtZeroBond - t.disobeyAtMaxBond) * share;
    if (this.partner.variant === "infectado") chance += t.infectedDisobeyBonus;
    if (this.disobeyedLastTurn) chance /= 2;
    if (this.rng.float() * 100 >= chance) { this.disobeyedLastTurn = false; return choice; }
    this.disobeyedLastTurn = true;
    const name = this.species("partner").name;
    const swapped: AttackKind = choice === "basic" ? "strong" : "basic";
    if (this.rng.float() * 100 < t.disobeyLoafShare || (swapped === "strong" && !this.canUseStrong())) {
      beats.push({ t: "emote", side: "partner", mark: "…" }, { t: "text", text: `${name} no obedece y se queda mirando a las nubes.` });
      return undefined;
    }
    beats.push({ t: "emote", side: "partner", mark: "!?" }, { t: "text", text: swapped === "strong" ? `¡${name} se lanza con su ataque especial!` : `${name} prefiere un ataque básico.` });
    return swapped;
  }

  private resolve(p: AttackKind | undefined, e: AttackKind | undefined, beats: Beat[]) {
    for (const [side, action] of [["partner", p], ["enemy", e]] as [Side, AttackKind | undefined][]) {
      if (action === "strong") { this.combatant(side).dp -= this.species(side).signature.dpCost; beats.push({ t: "charge", side }); }
    }
    if (p) beats.push({ t: "launch", side: "partner", kind: p });
    if (e) beats.push({ t: "launch", side: "enemy", kind: e });

    const hits: [Side, AttackKind, number, boolean][] = [];
    const t = this.tuning;
    if (p && e && p !== e) {
      const basicSide: Side = p === "basic" ? "partner" : "enemy";
      beats.push({ t: "pierce", by: basicSide });
      hits.push([basicSide, "basic", 1, false]);
    } else if (p && e) {
      const chance = this.clashWinChance("partner", p);
      const roll = this.rng.float();
      if (Math.abs(roll - chance) < t.clashTieMargin / 2) {
        beats.push({ t: "clash", kind: p });
        if (p === "basic") hits.push(["partner", "basic", t.basicClashTieDamage, true], ["enemy", "basic", t.basicClashTieDamage, true]);
      } else {
        const winner: Side = roll < chance ? "partner" : "enemy";
        beats.push({ t: "clash", winner, kind: p });
        hits.push([winner, p, p === "strong" ? t.strongClashWinnerDamage : t.basicClashWinnerDamage, true]);
      }
    } else if (p) hits.push(["partner", p, 1, true]);
    else if (e) hits.push(["enemy", e, 1, true]);
    else beats.push({ t: "text", text: "Ninguno de los dos ataca." });

    const simultaneous = hits.length === 2;
    hits.sort((a, b) => this.effective("spd", b[0]) - this.effective("spd", a[0]));
    for (const [attacker, kind, share, dodgeable] of hits) {
      if (!simultaneous && this.combatant(attacker).hp <= 0) continue;
      this.land(attacker, kind, share, dodgeable, beats);
      if (this.combatant(attacker).statuses.doubleStrike) {
        this.combatant(attacker).statuses.doubleStrike = false;
        if (this.combatant(other(attacker)).hp > 0) {
          beats.push({ t: "status", side: attacker, text: "¡Doble golpe!" });
          this.land(attacker, kind, share * t.doubleStrikeSecondHit, dodgeable, beats);
        }
      }
    }
  }

  private land(attacker: Side, kind: AttackKind, share: number, dodgeable: boolean, beats: Beat[]) {
    const defender = other(attacker);
    const a = this.combatant(attacker), d = this.combatant(defender);
    if (d.statuses.shieldTurns > 0) { d.statuses.shieldTurns = 0; beats.push({ t: "blocked", side: defender }); return; }
    if (dodgeable && a.statuses.sureHitTurns <= 0 && this.rng.float() * 100 < this.dodgeChance(attacker, kind)) { beats.push({ t: "dodge", side: defender }); return; }
    const critical = a.statuses.forcedCrit || this.rng.float() * 100 < this.tuning.critChance;
    a.statuses.forcedCrit = false;
    let damage = this.expectedDamage(attacker, kind) * share * this.rng.range(1 - this.tuning.randomSpread, 1 + this.tuning.randomSpread);
    if (critical) damage *= this.tuning.critMultiplier;
    const dealt = Math.max(1, Math.round(damage));
    d.hp = Math.max(0, d.hp - dealt);
    beats.push({ t: "hit", target: defender, damage: dealt, critical, effectiveness: this.effectiveness(attacker) });
    if (a.statuses.drainTurns > 0 && a.statuses.drainPercent > 0) {
      const healed = Math.min(a.stats.hp - a.hp, Math.round((dealt * a.statuses.drainPercent) / 100));
      if (healed > 0) { a.hp += healed; beats.push({ t: "heal", side: attacker, amount: healed }); }
    }
    if (d.hp <= 0) {
      if (d.statuses.revive) { d.statuses.revive = false; d.hp = d.stats.hp; beats.push({ t: "revive", side: defender }); }
      else beats.push({ t: "ko", side: defender });
    }
  }

  private endTurn(beats: Beat[]) {
    this.turn += 1;
    this.cardUsedThisTurn = false;
    for (const c of [this.partner, this.enemy]) {
      const s = c.statuses;
      s.buffs = s.buffs.filter((b) => b.turns > 1).map((b) => ({ ...b, turns: b.turns - 1 }));
      s.shieldTurns = Math.max(0, s.shieldTurns - 1);
      s.sureHitTurns = Math.max(0, s.sureHitTurns - 1);
      s.obeyTurns = Math.max(0, s.obeyTurns - 1);
      s.stunTurns = Math.max(0, s.stunTurns - 1);
      s.drainTurns = Math.max(0, s.drainTurns - 1);
      s.convertTurns = Math.max(0, s.convertTurns - 1);
      if (s.convertTurns === 0) s.convertedAffinity = undefined;
    }
    const e = this.enemy;
    if (this.isBoss && !e.enraged && e.hp > 0 && e.hp < e.stats.hp * this.tuning.enrageThreshold) {
      e.enraged = true;
      beats.push({ t: "status", side: "enemy", text: "¡Enfurecido!" }, { t: "text", text: `¡${this.species("enemy").name} se enfurece! Sus ataques son más fuertes.` });
    }
    if (e.hp <= 0) this.finish("victory");
    else if (this.partner.hp <= 0) this.finish("defeat");
    else if (!this.isBoss && this.turn >= this.tuning.wildTurnLimit) {
      this.finish("left");
      beats.push({ t: "text", text: `${this.species("enemy").name} se aburre y se marcha.` });
    }
  }

  // MARK: Parches

  /** Slashes a Parche: once per turn, before choosing the attack; doesn't spend the turn. */
  slash(id: string): Beat[] {
    const index = this.hand.indexOf(id);
    const parche = this.data.parche.get(id);
    if (this.phase === "over" || this.cardUsedThisTurn || index < 0 || !parche) return [];
    const e = parche.effect, p = this.partner, s = p.statuses;
    const beats: Beat[] = [{ t: "card", name: parche.name }];
    const name = this.species("partner").name;
    const statName: Record<StatKind, string> = { atk: "Ataque", def: "Defensa", spd: "Velocidad" };
    switch (e.type) {
      case "buff": if (!e.stat) return [];
        s.buffs.push({ stat: e.stat!, percent: e.value ?? 0, turns: e.turns ?? 1 }); beats.push({ t: "status", side: "partner", text: `${statName[e.stat!]} +${e.value} %` }); break;
      case "heal": { const a = Math.min(p.stats.hp - p.hp, Math.round((p.stats.hp * (e.value ?? 0)) / 100)); p.hp += a; beats.push({ t: "heal", side: "partner", amount: a }); break; }
      case "dp": { const a = Math.min(p.stats.dp - p.dp, e.value ?? 0); p.dp += a; beats.push({ t: "status", side: "partner", text: `DP +${a}` }); break; }
      case "shield": s.shieldTurns = e.turns ?? 1; beats.push({ t: "status", side: "partner", text: "Escudo" }); break;
      case "sureHit": s.sureHitTurns = e.turns ?? 1; beats.push({ t: "status", side: "partner", text: "Precisión" }); break;
      case "obey": s.obeyTurns = e.turns ?? 1; beats.push({ t: "status", side: "partner", text: "Obediente" }); break;
      case "doubleStrike": s.doubleStrike = true; beats.push({ t: "status", side: "partner", text: "Doble golpe" }); break;
      case "crit": s.forcedCrit = true; beats.push({ t: "status", side: "partner", text: "Crítico listo" }); break;
      case "convert": if (!e.affinity) return [];
        s.convertedAffinity = e.affinity; s.convertTurns = e.turns ?? 1; beats.push({ t: "status", side: "partner", text: `Afinidad ${AFFINITY_NAME[e.affinity!]}` }); break;
      case "drain": s.drainPercent = e.value ?? 0; s.drainTurns = e.turns ?? 1; beats.push({ t: "status", side: "partner", text: "Drenaje" }); break;
      case "stun": this.enemy.statuses.stunTurns = e.turns ?? 1; beats.push({ t: "status", side: "enemy", text: "Aturdido" }); break;
      case "revive": s.revive = true; beats.push({ t: "status", side: "partner", text: "Reinicio preparado" }); break;
      case "evolve": {
        const target = battleEvolution(p.speciesID, this.data);
        if (!target) return [{ t: "text", text: `${name} no puede evolucionar más.` }];
        this.transformPartner(target);
        this.evolutionsThisBattle += 1;
        beats.push({ t: "evolve", side: "partner", from: name, to: target.name, success: true });
        break;
      }
      case "awaken": {
        const ev = this.species("partner").evolutions.find((x) => x.conditions.inBattleOnly && x.conditions.card === id);
        const target = ev && this.data.eco.get(ev.to);
        if (!ev || !target) return [{ t: "text", text: "Solo un Supremo puede alcanzar su Despertar." }];
        if (ev.conditions.minBond !== undefined && this.partnerBond < ev.conditions.minBond) return [{ t: "text", text: `Su vínculo aún no es suficiente (necesita ${ev.conditions.minBond}).` }];
        this.transformPartner(target);
        this.evolutionsThisBattle += 1;
        beats.push({ t: "evolve", side: "partner", from: name, to: target.name, success: true });
        break;
      }
    }
    this.hand.splice(index, 1);
    this.cardUsedThisTurn = true;
    return beats;
  }

  // MARK: Formulas

  effective(stat: StatKind, side: Side): number {
    const c = this.combatant(side);
    let v = c.stats[stat];
    v *= 1 + c.statuses.buffs.filter((b) => b.stat === stat).reduce((s, b) => s + b.percent, 0) / 100;
    if (stat === "atk") {
      if (c.enraged) v *= this.tuning.enrageAtk;
      if (side === "enemy" && c.variant === "infectado") v *= this.tuning.infectedEnemyAtk;
    }
    return Math.max(1, v);
  }

  affinity(side: Side): Affinity { return this.combatant(side).statuses.convertedAffinity ?? this.species(side).affinity; }

  effectiveness(attacker: Side): Effectiveness {
    const mine = this.affinity(attacker), theirs = this.affinity(other(attacker));
    if (BEATS[mine] === theirs) return "strong";
    if (BEATS[theirs] === mine) return "weak";
    return "normal";
  }

  power(side: Side, kind: AttackKind) { const s = this.species(side); return kind === "basic" ? s.basic.power : s.signature.power; }

  /** Average damage before dodge, critical and spread. */
  expectedDamage(attacker: Side, kind: AttackKind): number {
    const t = this.tuning;
    const atk = this.effective("atk", attacker), def = this.effective("def", other(attacker));
    const eff = this.effectiveness(attacker);
    const aff = eff === "strong" ? t.affinityAdvantage : eff === "weak" ? t.affinityDisadvantage : 1;
    return t.damageScale * atk * (this.power(attacker, kind) / t.basicReferencePower) * Math.pow(atk / def, t.statRatioExponent) * aff;
  }

  /** Collision strength: power × attack, nudged by speed (affinity left out: it already scales damage). */
  priority(side: Side, kind: AttackKind) {
    const share = this.effective("spd", side) / (this.effective("spd", side) + this.effective("spd", other(side)));
    return this.power(side, kind) * this.effective("atk", side) * (1 + share);
  }

  clashWinChance(side: Side, kind: AttackKind) {
    const mine = Math.pow(this.priority(side, kind), this.tuning.clashExponent);
    const theirs = Math.pow(this.priority(other(side), kind), this.tuning.clashExponent);
    return mine / (mine + theirs);
  }

  dodgeChance(attacker: Side, kind: AttackKind) {
    const t = this.tuning;
    const a = this.effective("spd", attacker), d = this.effective("spd", other(attacker));
    return clamp(t.dodgeBase + ((d - a) / (d + a)) * t.dodgeSpeedFactor + (kind === "strong" ? t.strongDodgeBonus : 0), t.dodgeMin, t.dodgeMax);
  }

  private transformPartner(target: EcoSpecies) {
    const ratio = this.partner.hp / Math.max(1, this.partner.stats.hp);
    const stats = maxStats({ speciesID: target.id, level: this.partner.level, bonus: this.partnerBonus }, this.data);
    this.partner.speciesID = target.id;
    this.partner.stats = stats;
    this.partner.hp = Math.max(1, Math.round(ratio * stats.hp));
    this.partner.dp = Math.min(this.partner.dp, stats.dp);
  }
}

import { AFFINITY_NAME, BEATS, scaleStats, type Affinity, type BattleTuning, type EcoSpecies, type GameData, type StatKind, type Stats } from "../../data/models";
import { Rng } from "../../core/random";
import { partnerOf, type GameSave, type PendingEvent, type Variant } from "../../core/save";
import { maxStats, wildStats } from "../progression";
import { battleForms, type BattleForm } from "../evolution";
import { chooseAttack } from "./ai";

/**
 * The D-Ark battle. Before it starts, the partner may spend DP to fight in an unlocked evolved
 * form (its stats multiplied); then each turn both sides pick at the same time:
 *
 * - Basic shot: fast. It pierces a Strong attack that's still charging.
 * - Strong attack: costs 1 Carga. Two Strongs collide; higher AP (then SP) overpowers the other.
 * - Parche (partner only): spends DP for an effect; the partner doesn't attack that turn.
 *
 * Basic vs Basic: both fire, the faster one first. Unopposed and Basic-vs-Basic shots can be
 * dodged ((defender SP − attacker SP) × 4 %, 5–35 %). Low bond makes the partner disobey.
 * Every action returns the beats the scene animates, in order.
 */

export type Side = "partner" | "enemy";
export const other = (s: Side): Side => (s === "partner" ? "enemy" : "partner");
export type AttackKind = "basic" | "strong";
export type TurnAction = AttackKind | { card: string };
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

export interface Combatant {
  speciesID: string; level: number; variant: Variant; stats: Stats; hp: number;
  /** Carga for Strong attacks (0 … chargeMax). */
  charge: number;
  statuses: Statuses; enraged: boolean;
}

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

export class Battle {
  readonly isBoss: boolean;
  readonly regionID: string;
  readonly regionOrder: number;
  readonly eventID?: string;
  readonly partnerID: string;
  readonly partnerBond: number;
  readonly bossDefeats: number;
  readonly tuning: BattleTuning;
  readonly data: GameData;
  /** The partner's base-form stats (evolutions multiply these). */
  readonly baseStats: Stats;
  readonly baseSpeciesID: string;
  partner: Combatant;
  enemy: Combatant;
  /** The partner's DP during this battle (evolution and Parches spend it). */
  dp: number;
  phase: "intro" | "choosing" | "over" = "intro";
  outcome?: Outcome;
  turn = 0;
  /** Parches still usable this battle (each deck card once). */
  hand: string[];
  partnerChoices: AttackKind[] = [];
  enemyChoices: AttackKind[] = [];
  evolutionsThisBattle = 0;
  /** Unlocked forms the partner can fight as (DP permitting). */
  readonly forms: BattleForm[];
  /** The form it fights as, if it evolved. */
  formID?: string;
  usedFusion = false;
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
    this.bossDefeats = isBoss ? save.map.bossDefeats : 0;
    this.hand = [...save.deck];
    this.dp = p.dp;
    this.rng = new Rng(seed);
    this.forms = battleForms(p, Number.POSITIVE_INFINITY, save, data);
    this.baseSpeciesID = p.speciesID;
    this.baseStats = maxStats(p, data);
    const t = this.tuning;
    this.partner = { speciesID: p.speciesID, level: p.level, variant: p.variant, stats: { ...this.baseStats }, hp: clamp(p.hp, 0, this.baseStats.hp), charge: t.chargeStart, statuses: freshStatuses(), enraged: false };
    let s = wildStats(enemySpecies, enemyLevel, data);
    if (isBoss) {
      const weakened = 1 - Math.min(t.bossWeakenMax, t.bossWeakenPerDefeat * save.map.bossDefeats) / 100;
      s = { hp: Math.round(s.hp * t.bossHP * weakened), ap: s.ap * t.bossAP, sp: s.sp * t.bossSP };
    }
    this.enemy = { speciesID: enemySpecies, level: enemyLevel, variant, stats: s, hp: s.hp, charge: t.chargeStart, statuses: freshStatuses(), enraged: false };
  }

  combatant(side: Side) { return side === "partner" ? this.partner : this.enemy; }
  species(side: Side): EcoSpecies { return this.data.eco.get(this.combatant(side).speciesID)!; }

  // MARK: Pre-battle evolution

  /** Unlocked forms with whether each is affordable right now. */
  formOptions(): BattleForm[] {
    if (this.phase !== "intro" || this.formID) return [];
    return this.forms.map((f) => ({ ...f, blocked: f.blocked ?? (this.dp < f.cost ? `Necesita ${f.cost} DP.` : undefined) }));
  }

  /** Spends DP to fight as an unlocked form (once, before the first turn). */
  evolveTo(targetID: string): Beat[] {
    const form = this.formOptions().find((f) => f.target.id === targetID);
    if (!form || form.blocked) return [];
    const from = this.species("partner").name;
    this.dp -= form.cost;
    this.transform(form.target, form.multiplier);
    this.formID = form.target.id;
    if (form.kind === "fusion") this.usedFusion = true;
    return [{ t: "evolve", side: "partner", from, to: form.target.name, success: true }, { t: "text", text: `¡${from} evoluciona en ${form.target.name}! (×${form.multiplier} · −${form.cost} DP)` }];
  }

  begin() { if (this.phase === "intro") this.phase = "choosing"; }

  // MARK: Turns

  canUseStrong(side: Side = "partner") { return this.combatant(side).charge >= 1; }
  cardCost(id: string) { const p = this.data.parche.get(id); return p ? this.tuning.cardCost[p.rarity] : 0; }

  /** One turn: the partner's action against the enemy's (chosen by the AI at the same time). */
  playTurn(intended: TurnAction, aiRng?: Rng): Beat[] {
    this.begin();
    if (this.phase !== "choosing") return [];
    const beats: Beat[] = [];
    let partnerAction: AttackKind | undefined;
    if (typeof intended === "object") {
      const used = this.useCard(intended.card, beats);
      if (!used) return beats;
    } else {
      const choice: AttackKind = intended === "strong" && !this.canUseStrong() ? "basic" : intended;
      partnerAction = this.partner.statuses.stunTurns > 0 ? undefined : this.obey(choice, beats);
      this.partnerChoices.push(choice);
    }
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
    const t = this.tuning;
    const chance = clamp(t.fleeBase + (this.effective("sp", "partner") - this.effective("sp", "enemy")) * t.fleePerSP, t.fleeMin, t.fleeMax);
    if (this.rng.float() * 100 < chance) { this.finish("fled"); return [{ t: "text", text: "¡Has huido!" }]; }
    const beats: Beat[] = [{ t: "text", text: "¡No has podido huir!" }];
    const enemyAction = this.enemy.statuses.stunTurns > 0 ? undefined : chooseAttack("enemy", this, this.rng);
    this.resolve(undefined, enemyAction, beats);
    this.endTurn(beats);
    return beats;
  }

  private finish(outcome: Outcome) { this.phase = "over"; this.outcome = outcome; }

  /** Disobedience chance (%): only with low bond, 15 % at 0 down to 10 % at the limit. */
  disobeyChance(): number {
    const t = this.tuning;
    let chance = this.partnerBond >= t.disobeyBelowBond ? 0
      : t.disobeyAtZeroBond - (t.disobeyAtZeroBond - t.disobeyAtLimit) * (this.partnerBond / Math.max(1, t.disobeyBelowBond));
    if (this.partner.variant === "infectado") chance += t.infectedDisobeyBonus;
    return chance;
  }

  private obey(choice: AttackKind, beats: Beat[]): AttackKind | undefined {
    if (this.partner.statuses.obeyTurns > 0) return choice;
    let chance = this.disobeyChance();
    if (this.disobeyedLastTurn) chance /= 2;
    if (chance <= 0 || this.rng.float() * 100 >= chance) { this.disobeyedLastTurn = false; return choice; }
    this.disobeyedLastTurn = true;
    const name = this.species("partner").name;
    if (this.rng.float() * 100 < this.tuning.disobeyLoafShare) {
      beats.push({ t: "emote", side: "partner", mark: "…" }, { t: "text", text: `${name} no obedece y se queda mirando a las nubes.` });
      return undefined;
    }
    const random: AttackKind = this.canUseStrong() && this.rng.bool() ? "strong" : "basic";
    beats.push({ t: "emote", side: "partner", mark: "!?" }, { t: "text", text: random === "strong" ? `¡${name} hace lo que quiere y lanza su ataque especial!` : `${name} hace lo que quiere y dispara un ataque básico.` });
    return random;
  }

  private resolve(p: AttackKind | undefined, e: AttackKind | undefined, beats: Beat[]) {
    for (const [side, action] of [["partner", p], ["enemy", e]] as [Side, AttackKind | undefined][]) {
      if (action === "strong") { this.combatant(side).charge -= 1; beats.push({ t: "charge", side }); }
    }
    if (p) beats.push({ t: "launch", side: "partner", kind: p });
    if (e) beats.push({ t: "launch", side: "enemy", kind: e });

    // Hits that land (before dodges): [attacker, kind, damage share, dodgeable].
    const hits: [Side, AttackKind, number, boolean][] = [];
    let simultaneous = false;
    if (p && e && p !== e) {
      // The Basic shot is faster: it pierces the charging Strong attack and cancels it.
      const basicSide: Side = p === "basic" ? "partner" : "enemy";
      beats.push({ t: "pierce", by: basicSide });
      hits.push([basicSide, "basic", 1, false]);
    } else if (p === "strong" && e === "strong") {
      const winner = this.strongClashWinner();
      beats.push({ t: "clash", winner, kind: "strong" });
      if (winner) hits.push([winner, "strong", 1, false]);
    } else if (p === "basic" && e === "basic") {
      // Both fire; the faster lands first (same SP: at the same time).
      const ps = this.effective("sp", "partner"), es = this.effective("sp", "enemy");
      simultaneous = ps === es;
      const first: Side = ps >= es ? "partner" : "enemy";
      hits.push([first, "basic", 1, true], [other(first), "basic", 1, true]);
    } else if (p) hits.push(["partner", p, 1, true]);
    else if (e) hits.push(["enemy", e, 1, true]);
    else beats.push({ t: "text", text: "Ninguno de los dos ataca." });

    for (const [attacker, kind, share, dodgeable] of hits) {
      if (!simultaneous && this.combatant(attacker).hp <= 0) continue;
      this.land(attacker, kind, share, dodgeable, beats);
      if (this.combatant(attacker).statuses.doubleStrike) {
        this.combatant(attacker).statuses.doubleStrike = false;
        if (this.combatant(other(attacker)).hp > 0) {
          beats.push({ t: "status", side: attacker, text: "¡Doble golpe!" });
          this.land(attacker, kind, share * this.tuning.doubleStrikeSecondHit, dodgeable, beats);
        }
      }
    }
  }

  /** Strong vs Strong: higher AP overpowers the other beam; SP breaks a tie; a full tie cancels both. */
  strongClashWinner(): Side | undefined {
    const pa = this.effective("ap", "partner"), ea = this.effective("ap", "enemy");
    if (pa !== ea) return pa > ea ? "partner" : "enemy";
    const ps = this.effective("sp", "partner"), es = this.effective("sp", "enemy");
    if (ps !== es) return ps > es ? "partner" : "enemy";
    return undefined;
  }

  private land(attacker: Side, kind: AttackKind, share: number, dodgeable: boolean, beats: Beat[]) {
    const defender = other(attacker);
    const a = this.combatant(attacker), d = this.combatant(defender);
    if (d.statuses.shieldTurns > 0) { d.statuses.shieldTurns = 0; beats.push({ t: "blocked", side: defender }); return; }
    if (dodgeable && a.statuses.sureHitTurns <= 0 && this.rng.float() * 100 < this.dodgeChance(attacker)) { beats.push({ t: "dodge", side: defender }); return; }
    const critical = a.statuses.forcedCrit;
    a.statuses.forcedCrit = false;
    let damage = this.expectedDamage(attacker, kind) * share;
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
    const t = this.tuning;
    for (const c of [this.partner, this.enemy]) {
      const s = c.statuses;
      c.charge = Math.min(t.chargeMax, c.charge + t.chargePerTurn);
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
    if (this.isBoss && !e.enraged && e.hp > 0 && e.hp < e.stats.hp * t.enrageThreshold) {
      e.enraged = true;
      beats.push({ t: "status", side: "enemy", text: "¡Enfurecido!" }, { t: "text", text: `¡${this.species("enemy").name} se enfurece! Sus ataques son más fuertes.` });
    }
    if (e.hp <= 0) this.finish("victory");
    else if (this.partner.hp <= 0) this.finish("defeat");
    else if (!this.isBoss && this.turn >= t.wildTurnLimit) {
      this.finish("left");
      beats.push({ t: "text", text: `${this.species("enemy").name} se aburre y se marcha.` });
    }
  }

  // MARK: Parches

  /** Uses a Parche as this turn's action: spends DP; each card of the deck once per battle. */
  private useCard(id: string, beats: Beat[]): boolean {
    const index = this.hand.indexOf(id);
    const parche = this.data.parche.get(id);
    if (index < 0 || !parche) return false;
    const cost = this.cardCost(id);
    if (this.dp < cost) { beats.push({ t: "text", text: `${parche.name} necesita ${cost} DP.` }); return false; }
    const e = parche.effect, p = this.partner, s = p.statuses;
    const name = this.species("partner").name;
    const effect: Beat[] = [];
    const statName: Record<StatKind, string> = { ap: "AP", sp: "SP", guard: "Defensa" };
    switch (e.type) {
      case "buff": if (!e.stat) return false; s.buffs.push({ stat: e.stat, percent: e.value ?? 0, turns: e.turns ?? 1 }); effect.push({ t: "status", side: "partner", text: `${statName[e.stat]} +${e.value} %` }); break;
      case "heal": { const a = Math.min(p.stats.hp - p.hp, Math.round((p.stats.hp * (e.value ?? 0)) / 100)); p.hp += a; effect.push({ t: "heal", side: "partner", amount: a }); break; }
      case "charge": p.charge = Math.min(this.tuning.chargeMax, p.charge + (e.value ?? 1)); effect.push({ t: "status", side: "partner", text: `Carga ${p.charge}` }); break;
      case "shield": s.shieldTurns = e.turns ?? 1; effect.push({ t: "status", side: "partner", text: "Escudo" }); break;
      case "sureHit": s.sureHitTurns = (e.turns ?? 1) + 1; effect.push({ t: "status", side: "partner", text: "Precisión" }); break;
      case "obey": s.obeyTurns = (e.turns ?? 1) + 1; effect.push({ t: "status", side: "partner", text: "Obediente" }); break;
      case "doubleStrike": s.doubleStrike = true; effect.push({ t: "status", side: "partner", text: "Doble golpe" }); break;
      case "crit": s.forcedCrit = true; effect.push({ t: "status", side: "partner", text: "Crítico listo" }); break;
      case "convert": if (!e.affinity) return false; s.convertedAffinity = e.affinity; s.convertTurns = (e.turns ?? 1) + 1; effect.push({ t: "status", side: "partner", text: `Afinidad ${AFFINITY_NAME[e.affinity]}` }); break;
      case "drain": s.drainPercent = e.value ?? 0; s.drainTurns = (e.turns ?? 1) + 1; effect.push({ t: "status", side: "partner", text: "Drenaje" }); break;
      case "stun": this.enemy.statuses.stunTurns = (e.turns ?? 1) + 1; effect.push({ t: "status", side: "enemy", text: "Aturdido" }); break;
      case "revive": s.revive = true; effect.push({ t: "status", side: "partner", text: "Reinicio preparado" }); break;
      case "evolve":
      case "awaken": {
        // A free evolution, to the next unlocked form (or the Despertar) above the current one.
        const current = this.forms.find((f) => f.target.id === this.formID)?.multiplier ?? 1;
        const target = this.forms
          .filter((f) => f.kind !== "fusion" && (e.type === "awaken" ? f.kind === "awaken" : f.kind === "evolution") && f.multiplier > current)
          .sort((a, b) => a.multiplier - b.multiplier)[0];
        if (!target) { beats.push({ t: "text", text: e.type === "awaken" ? `${name} aún no ha desbloqueado su Despertar.` : `${name} no tiene más evoluciones desbloqueadas.` }); return false; }
        this.transform(target.target, target.multiplier);
        this.formID = target.target.id;
        effect.push({ t: "evolve", side: "partner", from: name, to: target.target.name, success: true });
        break;
      }
    }
    this.dp -= cost;
    this.hand.splice(index, 1);
    beats.push({ t: "card", name: parche.name }, ...effect);
    return true;
  }

  // MARK: Formulas

  effective(stat: "ap" | "sp", side: Side): number {
    const c = this.combatant(side);
    let v = c.stats[stat];
    v *= 1 + c.statuses.buffs.filter((b) => b.stat === stat).reduce((s, b) => s + b.percent, 0) / 100;
    if (stat === "ap") {
      if (c.enraged) v *= this.tuning.enrageAP;
      if (side === "enemy" && c.variant === "infectado") v *= this.tuning.infectedEnemyAP;
    }
    return Math.max(0.1, Math.round(v * 10) / 10);
  }

  /** Damage taken reduction (%) from guard Parches. */
  guard(side: Side) {
    return Math.min(80, this.combatant(side).statuses.buffs.filter((b) => b.stat === "guard").reduce((s, b) => s + b.percent, 0));
  }

  affinity(side: Side): Affinity { return this.combatant(side).statuses.convertedAffinity ?? this.species(side).affinity; }

  effectiveness(attacker: Side): Effectiveness {
    const mine = this.affinity(attacker), theirs = this.affinity(other(attacker));
    if (BEATS[mine] === theirs) return "strong";
    if (BEATS[theirs] === mine) return "weak";
    return "normal";
  }

  /**
   * Basic: max(1, AP × 1.0 − defender AP × 0.3). Strong: max(2, AP × 2.2 − defender AP × 0.3).
   * Then affinity and guard. No randomness: dodging is the only luck.
   */
  expectedDamage(attacker: Side, kind: AttackKind): number {
    const t = this.tuning;
    const ap = this.effective("ap", attacker), def = this.effective("ap", other(attacker));
    let damage = kind === "basic" ? Math.max(t.basicMin, ap * t.basicAP - def * t.defenderAP) : Math.max(t.strongMin, ap * t.strongAP - def * t.defenderAP);
    const eff = this.effectiveness(attacker);
    damage *= eff === "strong" ? t.affinityAdvantage : eff === "weak" ? t.affinityDisadvantage : 1;
    damage *= 1 - this.guard(other(attacker)) / 100;
    return Math.max(1, damage);
  }

  /** Dodge % for a shot from `attacker`: (defender SP − attacker SP) × 4, between 5 and 35. */
  dodgeChance(attacker: Side): number {
    const t = this.tuning;
    return clamp((this.effective("sp", other(attacker)) - this.effective("sp", attacker)) * t.dodgePerSP, t.dodgeMin, t.dodgeMax);
  }

  private transform(target: EcoSpecies, multiplier: number) {
    const ratio = this.partner.hp / Math.max(1, this.partner.stats.hp);
    const stats = scaleStats(this.baseStats, multiplier);
    this.partner.speciesID = target.id;
    this.partner.stats = stats;
    this.partner.hp = Math.max(1, Math.round(ratio * stats.hp));
    this.evolutionsThisBattle += 1;
  }
}

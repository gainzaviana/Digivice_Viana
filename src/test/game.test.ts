import { describe, expect, it } from "vitest";
import { loadGameData } from "../data/load";
import { validate } from "../data/validate";
import { Rng } from "../core/random";
import { migrate, newSave, partnerOf } from "../core/save";
import { newGame } from "../systems/actions";
import { walk } from "../systems/walk";
import { Battle, clashWinner } from "../systems/battle/battle";
import { chooseAttack } from "../systems/battle/ai";
import { finishBattle } from "../systems/battle/results";
import { maxStats, newEco } from "../systems/progression";
import { unlockAfterBoss } from "../systems/evolution";
import { upgradeSave } from "../systems/upgrade";
import { playCare } from "../systems/care";

const data = loadGameData();

describe("game", () => {
  it("has coherent data", () => expect(validate(data)).toEqual([]));

  it("starts with every starter", () => {
    for (const s of data.starters) expect(partnerOf(newGame(s.id, newSave(), data)!)?.speciesID).toBe(s.id);
  });

  it("walks, fights and finishes battles deterministically", () => {
    const run = () => {
      const save = newGame("brasko", newSave(), data)!;
      const rng = new Rng(7);
      let battles = 0;
      for (let i = 0; i < 40; i++) {
        walk(500, save, data, rng, 0);
        for (const e of save.pending.filter((p) => p.kind === "battle")) {
          const b = Battle.start(e, save, data, rng.next());
          if (!b) continue;
          while (!b.outcome) b.playTurn(chooseAttack("partner", b, rng));
          expect(finishBattle(save, b, data, new Date(0), rng).ok).toBe(true);
          battles++;
        }
      }
      return { battles, steps: save.stats.steps, log: save.log.map((l) => l.text).join("|") };
    };
    const a = run(), b = run();
    expect(a.battles).toBeGreaterThan(0);
    expect(a.steps).toBe(20_000);
    expect(a.log).toBe(b.log);
  });

  it("starts every partner at level 1 in its Stage 1 form, with no evolutions", () => {
    const p = partnerOf(newGame("brasko", newSave(), data)!)!;
    expect(p.level).toBe(1);
    expect(p.unlocked).toEqual([]);
    expect(maxStats(p, data)).toEqual({ hp: 19, ap: 4, sp: 3 });
    const t = partnerOf(newGame("tuerkin", newSave(), data)!)!;
    expect(maxStats(t, data)).toEqual({ hp: 20, ap: 4, sp: 3 });
    t.level = 2;
    expect(maxStats(t, data)).toEqual({ hp: 24, ap: 5.5, sp: 4 });
    expect(data.rules.maxDP).toBe(20);
    expect(data.rules.levelCap).toBe(30);
  });

  it("uses the D-Ark damage and dodge formulas", () => {
    const save = newGame("tuerkin", newSave(), data)!;
    const b = Battle.start({ id: "e", kind: "battle", regionID: save.map.regionID!, date: 0, species: "pixelito", level: 1, variant: "normal" }, save, data, 1)!;
    const ap = b.effective("ap", "partner"), def = b.effective("ap", "enemy");
    const aff = b.effectiveness("partner") === "strong" ? 1.15 : b.effectiveness("partner") === "weak" ? 0.9 : 1;
    expect(b.expectedDamage("partner", "quick")).toBeCloseTo(Math.max(1, ap - def * 0.3) * aff);
    expect(b.expectedDamage("partner", "physical")).toBeCloseTo(Math.max(1, ap * 1.5 - def * 0.3) * aff);
    expect(b.expectedDamage("partner", "charged")).toBeCloseTo(Math.max(2, ap * 2.2 - def * 0.3) * aff);
    const d = (b.effective("sp", "enemy") - b.effective("sp", "partner")) * 4;
    expect(b.dodgeChance("partner")).toBe(Math.min(35, Math.max(5, d)));
  });

  it("resolves the 3-move triangle with a single winner per clash", () => {
    expect(clashWinner("quick", "charged")).toBe("partner");
    expect(clashWinner("physical", "quick")).toBe("partner");
    expect(clashWinner("charged", "physical")).toBe("partner");
    expect(clashWinner("charged", "quick")).toBe("enemy");
    expect(clashWinner("quick", "physical")).toBe("enemy");
    expect(clashWinner("physical", "charged")).toBe("enemy");
    expect(clashWinner("quick", "quick")).toBeUndefined();
    const save = newGame("brasko", newSave(), data)!;
    const b = Battle.start({ id: "e", kind: "battle", regionID: save.map.regionID!, date: 0, species: "pixelito", level: 1, variant: "normal" }, save, data, 3)!;
    b.enemy.stats.ap = 1;
    expect(b.statWinner()).toBe("partner");
    b.enemy.stats.ap = b.partner.stats.ap; b.enemy.stats.sp = b.partner.stats.sp + 1;
    expect(b.statWinner()).toBe("enemy");
    b.enemy.stats.sp = b.partner.stats.sp;
    expect(b.statWinner()).toBeUndefined();
    // Over many turns, never both sides hit in the same turn.
    const rng = new Rng(5);
    for (let i = 0; i < 200 && !b.outcome; i++) {
      const beats = b.playTurn(rng.pick(["quick", "physical", "charged"] as const)!, rng);
      const hit = new Set(beats.filter((x) => x.t === "hit").map((x) => (x as { target: string }).target));
      expect(hit.size).toBeLessThanOrEqual(1);
    }
  });

  it("unlocks evolutions only for the Eco that beats a boss, one stage at a time", () => {
    const save = newGame("brasko", newSave(), data)!;
    const p = partnerOf(save)!;
    const other = newEco("ajolin", 5, data);
    save.squad.push(other);
    const first = unlockAfterBoss(p, 1, save, data);
    expect(first.unlocked.map((s) => s.id)).toEqual(["fraguadrako"]);
    expect(other.unlocked).toEqual([]);
    // Stage 3 needs a boss from zone 5 on.
    expect(unlockAfterBoss(p, 2, save, data).unlocked).toEqual([]);
    p.bond = 60;
    expect(unlockAfterBoss(p, 5, save, data).unlocked).toEqual([]);
    expect(unlockAfterBoss(p, 6, save, data).unlocked.map((s) => s.id)).toContain("calderon");
  });

  it("evolves only temporarily, for DP, and reverts after the battle", () => {
    const save = newGame("brasko", newSave(), data)!;
    const p = partnerOf(save)!;
    p.unlocked = ["fraguadrako"];
    p.dp = 20;
    const before = maxStats(p, data);
    const b = Battle.start({ id: "e", kind: "battle", regionID: save.map.regionID!, date: 0, species: "pixelito", level: 1, variant: "normal" }, save, data, 5)!;
    save.pending.push({ id: "e", kind: "battle", regionID: save.map.regionID!, date: 0, species: "pixelito", level: 1 });
    b.evolveTo("fraguadrako");
    expect(b.partner.stats.ap).toBeCloseTo(before.ap * 1.6);
    expect(b.dp).toBe(15);
    b.begin();
    const rng = new Rng(2);
    while (!b.outcome) b.playTurn(chooseAttack("partner", b, rng));
    finishBattle(save, b, data);
    expect(p.speciesID).toBe("brasko");
    expect(p.dp).toBeLessThanOrEqual(15);
  });

  it("converts a version 1 save: back to Stage 1, reached forms unlocked", () => {
    const save = newGame("brasko", newSave(), data)!;
    const p = partnerOf(save)! as unknown as Record<string, unknown>;
    Object.assign(p, { speciesID: "calderon", history: ["brasko", "fraguadrako", "calderon"], bonus: { hp: 2, atk: 4, def: 3, spd: 2, dp: 0 }, unlocked: undefined, dp: 80 });
    const old = migrate({ ...save, version: 1 });
    expect(upgradeSave(old, data)).toBe(true);
    const q = partnerOf(old)!;
    expect(q.speciesID).toBe("brasko");
    expect(q.unlocked).toEqual(["fraguadrako", "calderon"]);
    expect(q.bonus).toEqual({ hp: 5, ap: 2, sp: 1 });
    expect(q.dp).toBe(20);
  });

  it("lays out 18 cities in 6 Areas with the multi-day distances", () => {
    const main = data.regions.filter((r) => !r.requiresItem);
    expect(main.length).toBe(18);
    expect([1, 2, 3, 4, 5, 6].map((a) => main.filter((r) => r.area === a).length)).toEqual([3, 3, 3, 3, 3, 3]);
    expect(main.map((r) => r.steps)).toEqual([1500, 1500, 1500, 3500, 3500, 3500, 6000, 6000, 6000, 9000, 9000, 9000, 12500, 12500, 12500, 16000, 19000, 22000]);
  });

  it("raises a Digivice alert every 150–350 steps with the 4 event kinds", () => {
    const save = newGame("brasko", newSave(), data)!;
    const rng = new Rng(4);
    const kinds: Record<string, number> = {};
    for (let i = 0; i < 400; i++) {
      walk(200, save, data, rng, 0);
      for (const e of save.pending) kinds[e.kind] = (kinds[e.kind] ?? 0) + 1;
      save.pending = [];
      save.map.bossReady = false; save.map.stepsLeft = 1500;
    }
    const total = Object.values(kinds).reduce((a, b) => a + b, 0);
    expect(total).toBeGreaterThan(200);
    expect(Object.keys(kinds).sort()).toEqual(["battle", "cache", "hazard", "sos"]);
    expect(kinds.battle / total).toBeGreaterThan(0.5);
  });

  it("injures and pushes back on defeat, keeping lifetime steps and eggs", () => {
    const save = newGame("brasko", newSave(), data)!;
    const p = partnerOf(save)!;
    save.totalSteps = 9999;
    save.eggs = [{ id: "g", typeID: "huevo-comun", stepsLeft: 200 }];
    save.map.stepsLeft = 700;
    const bond = (p.bond = 20);
    const b = Battle.start({ id: "e", kind: "battle", regionID: save.map.regionID!, date: 0, species: "cactuson", level: 30, variant: "normal" }, save, data, 1)!;
    save.pending.push({ id: "e", kind: "battle", regionID: save.map.regionID!, date: 0, species: "cactuson", level: 30 });
    b.begin();
    const rng = new Rng(9);
    while (!b.outcome) b.playTurn("quick");
    expect(b.outcome).toBe("defeat");
    finishBattle(save, b, data, new Date(0), rng);
    expect(p.hp).toBe(1);
    expect(p.injured).toBeTruthy();
    expect(p.bond).toBe(bond - 3);
    expect(save.map.stepsLeft).toBeGreaterThanOrEqual(700 + 300);
    expect(save.map.stepsLeft).toBeLessThanOrEqual(1500);
    expect(save.totalSteps).toBe(9999);
    expect(save.eggs[0].stepsLeft).toBe(200);
    expect(Battle.start(undefined, { ...save, map: { ...save.map, bossReady: true } }, data, 1)).toBeUndefined();
    // The Pulse mini-game (good score) cures it; it costs a charge.
    expect(playCare(save, "pulso", 80, data).ok).toBe(true);
    expect(p.injured).toBeUndefined();
    expect(save.care.charges).toBe(2);
  });

  it("refills Care charges every 500 steps", () => {
    const save = newGame("brasko", newSave(), data)!;
    save.care.charges = 0;
    walk(1100, save, data, new Rng(1), 0);
    expect(save.care.charges).toBe(2);
  });

  it("migrates partial saves", () => {
    const s = migrate({ bits: 5, settings: { sound: false } });
    expect(s.bits).toBe(5);
    expect(s.settings.sound).toBe(false);
    expect(s.settings.shortcutName).toBeTruthy();
    expect(migrate("basura").squad).toEqual([]);
  });
});

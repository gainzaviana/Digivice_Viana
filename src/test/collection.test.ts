import { describe, expect, it } from "vitest";
import { loadGameData } from "../data/load";
import { Rng } from "../core/random";
import { newSave, partnerOf } from "../core/save";
import { newGame, travel } from "../systems/actions";
import { walk } from "../systems/walk";
import { Battle } from "../systems/battle/battle";
import { chooseAttack } from "../systems/battle/ai";
import { finishBattle } from "../systems/battle/results";
import { maxStats, newEco } from "../systems/progression";
import { upgradeSave } from "../systems/upgrade";
import { receiveEco, rootFormOf } from "../systems/collection";

const data = loadGameData();
const a = data.rules.awakening;

describe("one Eco per species", () => {
  it("a duplicate awakens the one you have instead of joining", () => {
    const save = newGame("brasko", newSave(), data)!;
    const p = partnerOf(save)!;
    const hp = maxStats(p, data).hp;
    const got = receiveEco(save, "chispin", 1, "normal", data, "egg"); // chispin is brasko's Brote
    expect(got.kind).toBe("awakened");
    expect(save.squad).toHaveLength(1);
    expect(p.awakening).toBe(1);
    expect(maxStats(p, data).hp).toBe(hp + a.hp);
    expect(p.bonus).toEqual({ hp: a.hp, ap: a.ap, sp: a.sp });
    expect(save.announcements.at(-1)).toMatchObject({ kind: "awakening", ecoID: p.id, stars: 1 });
  });

  it("a Brillante duplicate also recolours it; past the top star it gives bits", () => {
    const save = newGame("brasko", newSave(), data)!;
    const p = partnerOf(save)!;
    expect(receiveEco(save, "brasko", 1, "brillante", data, "wild").kind).toBe("awakened");
    expect(p.variant).toBe("brillante");
    for (let i = 1; i < a.maxStars; i++) receiveEco(save, "brasko", 1, "normal", data, "egg");
    expect(p.awakening).toBe(a.maxStars);
    const bits = save.bits;
    receiveEco(save, "brasko", 1, "normal", data, "egg");
    expect(p.awakening).toBe(a.maxStars);
    expect(save.bits).toBe(bits + a.overflowBits);
  });

  it("evolved wild forms count as their line's Stage 1", () => {
    expect(rootFormOf("fraguadrako", data)).toBe("brasko");
    expect(rootFormOf("aranared", data)).toBe("aranared");
  });

  it("hatching a duplicate needs no room in a full team", () => {
    const save = newGame("brasko", newSave(), data)!;
    for (let i = save.squad.length; i < data.rules.squadCap; i++) save.squad.push({ ...newEco("pixelito", 1, data), id: `x${i}` });
    const egg = data.eggs.find((e) => e.pool.some((p) => rootFormOf(p.species, data) === "brasko"))!;
    save.eggs = [{ id: "e", typeID: egg.id, stepsLeft: 1 }];
    // Make the egg hatch into brasko's line only.
    const pool = egg.pool;
    egg.pool = [{ species: "chispin", weight: 1 }];
    try { walk(1, save, data, new Rng(1), 0); } finally { egg.pool = pool; }
    expect(save.eggs).toHaveLength(0);
    expect(save.squad).toHaveLength(data.rules.squadCap);
    expect(partnerOf(save)!.awakening).toBe(1);
  });

  it("beating a wild Brillante captures it (new species at level 1, or awakening)", () => {
    const fight = (species: string) => {
      const save = newGame("brasko", newSave(), data)!;
      const p = partnerOf(save)!;
      p.bonus = { hp: 5000, ap: 500, sp: 0 };
      p.hp = maxStats(p, data).hp;
      save.pending.push({ id: "w", kind: "battle", regionID: save.map.regionID!, date: 0, species, level: 3, variant: "brillante" });
      const rng = new Rng(3);
      const b = Battle.start(save.pending[0], save, data, 5)!;
      while (!b.outcome) b.playTurn(chooseAttack("partner", b, rng));
      expect(b.outcome).toBe("victory");
      finishBattle(save, b, data, new Date(0), rng);
      return save;
    };
    const fresh = fight("pixelito");
    const caught = fresh.squad.find((e) => e.speciesID === "pixelito")!;
    expect(caught).toMatchObject({ level: 1, variant: "brillante" });
    expect(fresh.announcements.at(-1)).toMatchObject({ kind: "newEco", source: "wild" });
    const dup = fight("fraguadrako");
    expect(dup.squad).toHaveLength(1);
    expect(partnerOf(dup)).toMatchObject({ variant: "brillante", awakening: 1 });
  });

  it("old saves with duplicates are merged into the best copy", () => {
    const save = newGame("brasko", newSave(), data)!;
    const strong = { ...newEco("brasko", 9, data, "normal"), id: "strong", unlocked: ["fraguadrako"] };
    const shiny = { ...newEco("chispin", 2, data, "brillante"), id: "shiny" };
    save.squad = [strong, shiny, newEco("pixelito", 1, data)];
    save.partnerID = "strong";
    save.version = 4;
    upgradeSave(save, data);
    expect(save.squad.map((e) => e.id)).toEqual(["strong", save.squad[1].id]);
    expect(strong).toMatchObject({ variant: "brillante", awakening: 1, level: 9 });
  });
});

describe("going back to an earlier city", () => {
  it("restarts that city's road from zero", () => {
    const save = newGame("brasko", newSave(), data)!;
    const [first, second] = data.regions;
    save.map.clearedRegions = [first.id];
    save.map.regionID = second.id;
    save.map.stepsLeft = second.steps - 700;
    expect(travel(save, first.id, data).ok).toBe(true);
    expect(save.map).toMatchObject({ regionID: first.id, stepsLeft: first.steps, bossReady: false });
  });
});

describe("custom creature art", () => {
  it("finds your PNGs by species id and variant, recolouring the normal one for Brillante", async () => {
    const { customArt } = await import("../art/custom");
    const table = new Map([["brasko", "b.png"], ["brasko_shiny", "bs.png"], ["ecoli_idle", "e.png"]]);
    expect(customArt("brasko", "normal", table)).toEqual({ url: "b.png", recolour: false });
    expect(customArt("brasko", "brillante", table)).toEqual({ url: "bs.png", recolour: false });
    expect(customArt("ecoli", "brillante", table)).toEqual({ url: "e.png", recolour: true });
    expect(customArt("ecoli", "infectado", table)).toEqual({ url: "e.png", recolour: false });
    expect(customArt("pixelito", "normal", table)).toBeUndefined();
  });
});

describe("creature art", () => {
  it("every species has its own sprite in src/assets/creatures", async () => {
    const { customArt } = await import("../art/custom");
    const missing = data.ecos.filter((e) => !customArt(e.id, "normal")).map((e) => e.id);
    expect(missing).toEqual([]);
  });
});

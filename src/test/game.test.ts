import { describe, expect, it } from "vitest";
import { loadGameData } from "../data/load";
import { validate } from "../data/validate";
import { Rng } from "../core/random";
import { migrate, newSave, partnerOf } from "../core/save";
import { newGame } from "../systems/actions";
import { walk } from "../systems/walk";
import { Battle } from "../systems/battle/battle";
import { chooseAttack } from "../systems/battle/ai";
import { finishBattle } from "../systems/battle/results";

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
          expect(finishBattle(save, b, data).ok).toBe(true);
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

  it("migrates partial saves", () => {
    const s = migrate({ bits: 5, settings: { sound: false } });
    expect(s.bits).toBe(5);
    expect(s.settings.sound).toBe(false);
    expect(s.settings.shortcutName).toBeTruthy();
    expect(migrate("basura").squad).toEqual([]);
  });
});

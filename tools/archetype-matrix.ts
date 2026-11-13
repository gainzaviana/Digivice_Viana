// Win rates between archetypes at equal level and stage (both unevolved), to balance their
// profiles in reglas.json: each one should beat the others about half the time.
//   npx tsx tools/archetype-matrix.ts
import { loadGameData } from "../src/data/load";
import { Rng } from "../src/core/random";
import { newSave, partnerOf } from "../src/core/save";
import type { Archetype } from "../src/data/models";
import { newGame } from "../src/systems/actions";
import { maxStats } from "../src/systems/progression";
import { Battle } from "../src/systems/battle/battle";
import { chooseAttack } from "../src/systems/battle/ai";

const data = loadGameData();
const archetypes = Object.keys(data.rules.archetypes) as Archetype[];
const starterOf = (a: Archetype) => data.starters.find((s) => s.archetype === a);
const wildOf = (a: Archetype) => data.ecos.find((e) => !e.line && e.stage === "novato" && e.archetype === a);
const rng = new Rng(11);
console.log("nivel  " + archetypes.map((a) => a.slice(0, 6).padStart(7)).join(""));
for (const level of [1, 5, 15, 35]) {
  for (const mine of archetypes) {
    const starter = starterOf(mine);
    if (!starter) continue;
    const row = archetypes.map((theirs) => {
      const wild = wildOf(theirs);
      if (!wild) return "      -";
      let wins = 0;
      for (let i = 0; i < 300; i++) {
        const save = newGame(starter.id, newSave(), data)!;
        const p = partnerOf(save)!;
        p.level = level; p.bond = 60; p.hp = maxStats(p, data).hp;
        save.deck = [];
        const b = Battle.start({ id: "x", kind: "battle", regionID: save.map.regionID!, date: 0, species: wild.id, level, variant: "normal" }, save, data, rng.next())!;
        b.begin();
        while (!b.outcome) b.playTurn(chooseAttack("partner", b, rng));
        if (b.outcome === "victory") wins++;
      }
      return `${Math.round((wins / 300) * 100)}%`.padStart(7);
    });
    console.log(`${String(level).padStart(3)} ${mine.slice(0, 6).padEnd(6)}${row.join("")}`);
  }
}

// Picks every zone's wild and boss levels by simulating battles, so difficulty follows the D-Ark
// curve: wild Ecos beatable without evolving (~75 % wins), bosses that need levels AND the
// evolutions unlocked by then (~35 % on a first try), and a first boss a level 1 partner can't beat.
//   npx tsx tools/tune-zones.ts [--write]
import { readFileSync, writeFileSync } from "node:fs";
import { loadGameData } from "../src/data/load";
import { Rng } from "../src/core/random";
import { newSave, partnerOf, type GameSave } from "../src/core/save";
import { STAGE_TIER, type Region } from "../src/data/models";
import { newGame } from "../src/systems/actions";
import { maxStats } from "../src/systems/progression";
import { Battle } from "../src/systems/battle/battle";
import { chooseAttack } from "../src/systems/battle/ai";

const data = loadGameData();
const write = process.argv.includes("--write");

/** Partner level when reaching each zone's boss, as measured by tools/simulate-walk.ts. */
const PARTNER_LEVEL: Record<number, number> = {
  1: 4, 2: 8, 3: 12, 4: 15, 5: 17, 6: 21, 7: 24, 8: 27, 9: 29, 10: 32,
  11: 36, 12: 40, 13: 44, 14: 46, 15: 48, 16: 51, 17: 54, 18: 57, 19: 48,
};
/** The best evolution tier unlocked when fighting each zone (zone 1: none yet). */
const tierAt = (zone: number) => {
  const u = data.rules.evolution.unlockZone;
  // The secret 19th zone opens in Area 5, so it's fought with Stage 4.
  if (zone === 19) return 4;
  return zone > u["4"] ? 4 : zone > u["3"] ? 3 : zone > u["2"] ? 2 : 1;
};
const WILD_TARGET = 0.75;
/** First-try win rate against each boss: early bosses are walls; later ones a bit more, since players arrive better trained. */
const bossTarget = (zone: number) => (zone <= 3 ? 0.35 : 0.25);
const RUNS = 160;

const starters = data.starters;

/** A save with a starter at `level`, its main line unlocked up to `tier`, full HP and DP. */
function partnerSave(starterID: string, level: number, tier: number, region: Region): GameSave {
  const save = newGame(starterID, newSave(), data)!;
  const p = partnerOf(save)!;
  p.level = Math.max(1, Math.round(level));
  p.bond = 60;
  let form = data.eco.get(p.speciesID)!;
  while (STAGE_TIER[form.stage] < tier && form.evolutions.length) {
    form = data.eco.get(form.evolutions[0].to)!;
    if (form.stage !== "despertar") p.unlocked.push(form.id);
  }
  p.hp = maxStats(p, data).hp;
  p.dp = data.rules.maxDP;
  save.map.regionID = region.id;
  save.deck = [];
  return save;
}

/** Win rate of the partner (best form allowed for bosses, none for wild Ecos) against an enemy. */
function winRate(species: string, level: number, region: Region, boss: boolean, partnerLevel: number, tier: number, seed: number): number {
  const rng = new Rng(seed);
  let wins = 0;
  for (let i = 0; i < RUNS; i++) {
    const save = partnerSave(starters[i % starters.length].id, partnerLevel, boss ? tier : 1, region);
    let b: Battle | undefined;
    if (boss) {
      save.map.bossReady = true;
      const r = { ...region, boss: { species, level } };
      const backup = data.region.get(region.id)!;
      data.region.set(region.id, r);
      b = Battle.start(undefined, save, data, rng.next());
      data.region.set(region.id, backup);
      const best = b?.formOptions().filter((f) => !f.blocked).sort((x, y) => y.multiplier - x.multiplier)[0];
      if (best) b!.evolveTo(best.target.id);
    } else {
      b = Battle.start({ id: "x", kind: "battle", regionID: region.id, date: 0, species, level, variant: "normal" }, save, data, rng.next());
    }
    if (!b) continue;
    b.begin();
    while (!b.outcome) b.playTurn(chooseAttack("partner", b, rng));
    if (b.outcome === "victory") wins++;
  }
  return wins / RUNS;
}

/** The highest enemy level whose win rate is still at least `target`. */
function levelFor(species: string, region: Region, boss: boolean, partnerLevel: number, tier: number, target: number): number {
  let lo = 1, hi = 90;
  while (lo < hi) {
    const mid = Math.ceil((lo + hi) / 2);
    if (winRate(species, mid, region, boss, partnerLevel, tier, mid * 7919 + region.order) >= target) lo = mid;
    else hi = mid - 1;
  }
  return lo;
}

const raw = JSON.parse(readFileSync("src/data/json/regiones.json", "utf8")) as Region[];
for (const region of data.regions) {
  const z = region.order;
  const atBoss = PARTNER_LEVEL[z];
  const atStart = PARTNER_LEVEL[z - 1] ?? 1;
  // Wild Ecos are tuned against the partner as it enters the zone (zone 1: level 1).
  // Zone 1 must be winnable by a brand-new level 1 partner.
  const wildPartner = z === 1 ? 1 : atStart + (atBoss - atStart) * 0.35;
  const out = raw.find((r) => r.id === region.id)!;
  const parts: string[] = [];
  for (const e of out.encounters) {
    const lv = levelFor(e.species, region, false, wildPartner, 1, WILD_TARGET);
    e.minLevel = Math.max(1, lv - 1);
    e.maxLevel = Math.max(e.minLevel, lv);
    parts.push(`${e.species} ${e.minLevel}–${e.maxLevel}`);
  }
  const bossLevel = levelFor(region.boss.species, region, true, atBoss, tierAt(z), bossTarget(z));
  out.boss.level = bossLevel;
  const check = z === 1 ? ` · nv.1 sin evolucionar gana ${Math.round(winRate(region.boss.species, bossLevel, region, true, 1, 1, 99) * 100)} %` : "";
  console.log(`Zona ${String(z).padStart(2)} (compañero nv. ~${atBoss}, fase ${tierAt(z)}): jefe ${region.boss.species} nv. ${bossLevel}${check} · ${parts.join(", ")}`);
}
if (write) {
  writeFileSync("src/data/json/regiones.json", JSON.stringify(raw, null, 2) + "\n");
  console.log("regiones.json actualizado.");
}

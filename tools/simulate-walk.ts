// Walks a simulated player through the game with a fixed random seed and reports what happened.
// For testing the engines and for balancing (same bot as the native tools/simulate-walk).
//   npm run simulate -- [steps] [seed] [starter] [--log] [--save=path]
import { writeFileSync } from "node:fs";
import { loadGameData } from "../src/data/load";
import { Rng } from "../src/core/random";
import { newSave, partnerOf, type PendingEvent } from "../src/core/save";
import { STAGE_NAME } from "../src/data/models";
import { walk } from "../src/systems/walk";
import { maxStats, stageMultiplier } from "../src/systems/progression";
import { acceptRecruit, declineRecruit, flee, leave, newGame, receiveBlessing, useItem } from "../src/systems/actions";
import { Battle, type Outcome } from "../src/systems/battle/battle";
import { chooseAttack } from "../src/systems/battle/ai";
import { finishBattle } from "../src/systems/battle/results";

const argv = process.argv.slice(2);
const args = argv.filter((a) => !a.startsWith("--"));
const showLog = argv.includes("--log");
const savePath = argv.find((a) => a.startsWith("--save="))?.slice(7);
const totalSteps = Number(args[0] ?? 50_000);
const seed = Number(args[1] ?? 1);
const starter = args[2] ?? "brasko";

const data = loadGameData();
const started = newGame(starter, newSave(), data);
if (!started) { console.log(`✗ ${starter} no es un compañero inicial.`); process.exit(1); }
let save = started;
const rng = new Rng(seed);
const counts: Record<string, number> = {};
let walked = 0;
interface ZoneStats { wins: number; losses: number; fled: number; left: number; turns: number; bossTries: number; bossWins: number }
const zones = new Map<number, ZoneStats>();
const bossLines: string[] = [];
let battleEvolutions = 0;
const say = (t: string) => { if (showLog) console.log(`${String(walked).padStart(7)}  ${t}`); };
const hpShare = () => { const p = partnerOf(save); return p ? p.hp / Math.max(1, maxStats(p, data).hp) : 0; };
const name = (id: string) => data.eco.get(id)?.name ?? id;

function maintain() {
  if (hpShare() < 0.5) {
    for (const disc of ["disco-vida-l", "disco-vida-m", "disco-vida-s", "disco-total"]) {
      if ((save.inventory[disc] ?? 0) > 0) { useItem(save, disc, data, rng); if (hpShare() >= 0.5) break; }
    }
  }
  for (const fruit of ["fruta-fuerza", "fruta-coraza", "fruta-viento", "fruta-vida", "fruta-dulce"]) {
    while ((save.inventory[fruit] ?? 0) > 0 && useItem(save, fruit, data, rng).ok) { /* eat them all */ }
  }
}

/** The best form the bot can afford for a boss (keeps nothing back). */
function bestBossCost(): number {
  const b = Battle.start(undefined, { ...save, map: { ...save.map, bossReady: true } }, data, 1);
  if (!b) return 0;
  const costs = b.forms.filter((f) => !f.blocked).map((f) => f.cost);
  return costs.length ? Math.min(data.rules.maxDP, Math.max(...costs)) : 0;
}

const RESERVE = 15;
let lastBossTryLevel = 0;

function fight(event?: PendingEvent): Outcome | undefined {
  const b = Battle.start(event, save, data, rng.next());
  if (!b) return undefined;
  // Evolve: for bosses, the strongest affordable form; for wild Ecos above Stage 1, the cheapest
  // form that matches them, keeping DP in reserve for the next boss.
  const options = b.formOptions().filter((f) => !f.blocked).sort((x, y) => x.multiplier - y.multiplier);
  const enemyK = stageMultiplier(data.eco.get(b.enemy.speciesID), data);
  let pick = b.isBoss ? options[options.length - 1] : options.find((f) => f.multiplier >= enemyK && b.dp - f.cost >= RESERVE);
  if (!b.isBoss && enemyK <= 1) pick = undefined;
  if (pick) { b.evolveTo(pick.target.id); battleEvolutions++; }
  b.begin();
  while (!b.outcome) {
    const me = b.partner;
    const usable = (ids: string[]) => ids.find((c) => b.hand.includes(c) && b.dp >= b.cardCost(c) + (b.isBoss ? 0 : RESERVE));
    let card: string | undefined;
    if (me.hp < me.stats.hp * 0.35) card = usable(["parche-cura-total", "parche-cura"]);
    else if (b.isBoss && b.turn === 0) card = usable(["parche-espada-plasma", "parche-fuerza"]);
    b.playTurn(card ? { card } : chooseAttack("partner", b, rng));
  }
  const z = zones.get(b.regionOrder) ?? { wins: 0, losses: 0, fled: 0, left: 0, turns: 0, bossTries: 0, bossWins: 0 };
  z.turns += b.turn;
  if (b.outcome === "victory") z.wins++; else if (b.outcome === "defeat") z.losses++; else if (b.outcome === "fled") z.fled++; else z.left++;
  if (b.isBoss) {
    z.bossTries++;
    const p = partnerOf(save)!;
    if (b.outcome === "victory") {
      z.bossWins++;
      bossLines.push(`  Zona ${String(b.regionOrder).padStart(2)}: ${name(b.enemy.speciesID)} nv. ${b.enemy.level} vencido al intento ${z.bossTries} · ${name(p.speciesID)} nv. ${p.level} (como ${name(b.partner.speciesID)}) en ${b.turn} turnos`);
    }
  }
  zones.set(b.regionOrder, z);
  say(finishBattle(save, b, data).message);
  return b.outcome;
}

while (walked < totalSteps) {
  const batch = Math.min(500, totalSteps - walked);
  walked += batch;
  for (const e of walk(batch, save, data, rng)) { counts[e.kind] = (counts[e.kind] ?? 0) + 1; say(e.text); }
  maintain();
  for (const event of [...save.pending]) {
    switch (event.kind) {
      case "battle": if (hpShare() >= 0.35 && fight(event)) maintain(); else flee(save, event.id, data); break;
      case "recruit": if (!acceptRecruit(save, event.id, data).ok) declineRecruit(save, event.id, data); break;
      case "merchant": leave(save, event.id); break;
      case "shrine": receiveBlessing(save, event.id, data); break;
    }
  }
  // Challenge the boss with HP ≥ 70 % and enough DP for the best unlocked form.
  // Challenge the boss with HP ≥ 70 % and enough DP for the best unlocked form; after a defeat,
  // only once the partner has gained a level (a sensible player trains first).
  const level = partnerOf(save)!.level;
  if (save.map.bossReady && hpShare() >= 0.7 && partnerOf(save)!.dp >= bestBossCost() && (save.map.bossDefeats === 0 || level > lastBossTryLevel)) {
    lastBossTryLevel = level;
    fight();
    maintain();
  }
}

const p = partnerOf(save)!;
const sp = data.eco.get(p.speciesID)!;
const n = (x: number) => x.toLocaleString("es");
console.log(`
${n(totalSteps)} pasos simulados (semilla ${seed}, compañero inicial ${starter})
Zonas superadas: ${save.map.clearedRegions.length} · zona actual: ${save.map.regionID ? data.region.get(save.map.regionID)?.name : "—"} (faltan ${n(save.map.stepsLeft)} pasos${save.map.bossReady ? ", jefe esperando" : ""})
Compañero: ${sp.name} (${STAGE_NAME[sp.stage]}) nivel ${p.level} · HP ${maxStats(p, data).hp} AP ${maxStats(p, data).ap} SP ${maxStats(p, data).sp} · vínculo ${p.bond}/${data.rules.maxBond} · ${p.wins} victorias, ${p.losses} derrotas
Combates evolucionado: ${battleEvolutions} · formas desbloqueadas: ${p.unlocked.map(name).join(", ") || "ninguna"} · DP ${p.dp}
Sucesos: ${Object.entries(counts).sort().map(([k, v]) => `${k} ${v}`).join(", ")}
Equipo: ${save.squad.length} Ecos · bits: ${n(save.bits)} · objetos: ${Object.values(save.inventory).reduce((a, b) => a + b, 0)} · Parches: ${Object.values(save.parches).reduce((a, b) => a + b, 0)}

Combates por zona (victorias/derrotas/huidas/se marchan · turnos medios):`);
for (const order of [...zones.keys()].sort((a, b) => a - b)) {
  const z = zones.get(order)!;
  const total = z.wins + z.losses + z.fled + z.left;
  console.log(`  Zona ${String(order).padStart(2)}: ${String(z.wins).padStart(3)}/${String(z.losses).padStart(2)}/${String(z.fled).padStart(2)}/${String(z.left).padStart(2)} · ${total ? Math.round((z.wins / total) * 100) : 0} % victorias · ${(z.turns / Math.max(1, total)).toFixed(1)} turnos · jefe ${z.bossWins}/${z.bossTries}`);
}
console.log("\nJefes:");
for (const l of bossLines) console.log(l);
if (savePath) { writeFileSync(savePath, JSON.stringify(save)); console.log(`Partida guardada en ${savePath}`); }

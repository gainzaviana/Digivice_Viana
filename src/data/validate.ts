import { DERIVED_METRICS, STAGES, stageOrder, type GameData, type Stage } from "./models";

/** Every inconsistency in the content, as readable sentences. Empty means the data is sound. */
export function validate(d: GameData): string[] {
  const issues: string[] = [];
  const check = (ok: boolean, message: string) => { if (!ok) issues.push(message); };
  const r = d.rules;

  const lists: [string, string[]][] = [
    ["Eco", d.ecos.map((e) => e.id)], ["fusion", d.fusions.map((f) => f.id)], ["region", d.regions.map((x) => x.id)],
    ["item", d.items.map((i) => i.id)], ["egg", d.eggs.map((g) => g.id)], ["Parche", d.parches.map((p) => p.id)], ["challenge", d.challenges.map((c) => c.id)],
  ];
  for (const [kind, ids] of lists) {
    const dup = [...new Set(ids.filter((id, i) => ids.indexOf(id) !== i))];
    check(dup.length === 0, `Duplicate ${kind} id(s): ${dup.join(", ")}`);
  }

  for (const eco of d.ecos) {
    const s = eco.stats;
    check(!!eco.name && !!eco.description, `${eco.id}: name and description are required`);
    check(s.hp > 0 && s.atk > 0 && s.def > 0 && s.spd > 0 && s.dp > 0, `${eco.id}: every stat must be positive`);
    check(eco.basic.dpCost === 0, `${eco.id}: the basic attack must cost 0 DP`);
    check(eco.signature.dpCost > 0 && eco.signature.dpCost <= s.dp, `${eco.id}: signature DP cost must be between 1 and max DP`);
    for (const ev of eco.evolutions) {
      const target = d.eco.get(ev.to);
      if (!target) { issues.push(`${eco.id}: evolves into unknown Eco ${ev.to}`); continue; }
      check(stageOrder(target.stage) > stageOrder(eco.stage), `${eco.id} → ${target.id}: must evolve to a later stage`);
      const c = ev.conditions;
      if (c.item) check(d.item.has(c.item), `${eco.id} → ${target.id}: unknown item ${c.item}`);
      if (c.defeatedBoss) check(d.region.has(c.defeatedBoss), `${eco.id} → ${target.id}: unknown region ${c.defeatedBoss}`);
      if (c.card) check(d.parche.has(c.card), `${eco.id} → ${target.id}: unknown Parche ${c.card}`);
      if (target.stage === "despertar") check(c.inBattleOnly === true && !!c.card, `${eco.id} → ${target.id}: Despertar must be in-battle only and need a Parche`);
    }
  }

  const starters = d.starters;
  check(starters.length === 8, `There must be 8 starters, found ${starters.length}`);
  for (const starter of starters) {
    if (!starter.line) { issues.push(`${starter.id}: starters belong to a line`); continue; }
    const brote = d.ecos.find((e) => e.line === starter.line && e.stage === "brote");
    if (!brote) { issues.push(`Line ${starter.line}: has no Brote`); continue; }
    const reachable = d.reachableForms(brote.id);
    for (const stage of ["novato", "avanzado", "elite", "supremo", "despertar"] as Stage[]) {
      check([...reachable].some((id) => d.eco.get(id)?.stage === stage), `Line ${starter.line}: no ${stage} reachable from ${brote.id}`);
    }
  }

  for (const f of d.fusions) {
    check(f.parts.length === 2 && f.parts.every((p) => d.eco.get(p)?.stage === "supremo"), `${f.id}: needs two existing Supremo parts`);
    check(d.eco.get(f.result)?.stage === "fusion", `${f.id}: result must be a Fusión`);
    if (f.item) check(d.item.has(f.item), `${f.id}: unknown item ${f.item}`);
  }

  check(d.regions.map((x) => x.order).join() === d.regions.map((_, i) => i + 1).join(), "Region orders must run 1…n without gaps");
  for (const region of d.regions) {
    check(region.steps > 0 && region.encounters.length > 0, `${region.id}: needs steps and encounters`);
    for (const e of region.encounters) check(d.eco.has(e.species) && e.weight > 0 && e.minLevel >= 1 && e.minLevel <= e.maxLevel, `${region.id}: bad encounter ${e.species}`);
    check(d.eco.has(region.boss.species), `${region.id}: unknown boss ${region.boss.species}`);
    if (region.requiresItem) check(d.item.get(region.requiresItem)?.kind === "clave", `${region.id}: requiresItem must be a key item`);
    if (region.bossReward) check(d.item.has(region.bossReward), `${region.id}: unknown boss reward`);
    if (region.bossCard) check(d.parche.has(region.bossCard), `${region.id}: unknown boss Parche`);
  }

  for (const item of d.items) {
    if (item.kind === "recuperacion" || item.kind === "fruta") check(!!item.effect, `${item.id}: needs an effect`);
    if (item.kind === "cristal") {
      const obtainable = r.itemDrops.some((x) => x.item === item.id) || d.regions.some((x) => x.bossReward === item.id || x.bossGivesPartnerCrystal);
      check(obtainable, `${item.id}: this crystal can't be obtained`);
    }
  }
  for (const egg of d.eggs) check(egg.steps > 0 && egg.pool.length > 0 && egg.pool.every((p) => d.eco.has(p.species)), `${egg.id}: bad egg`);

  check(r.encounterEveryMinSteps > 0 && r.encounterEveryMinSteps <= r.encounterEveryMaxSteps, "rules: encounter step range is invalid");
  check(r.startingCards.length <= r.deckSize, "rules: more starting cards than the deck holds");
  for (const id of Object.keys(r.startingItems)) check(d.item.has(id), `rules: unknown starting item ${id}`);
  for (const id of r.startingCards) check(d.parche.has(id), `rules: unknown starting Parche ${id}`);
  for (const x of r.itemDrops) check(d.item.has(x.item), `rules: unknown item drop ${x.item}`);
  for (const x of r.eggDrops) check(d.egg.has(x.egg), `rules: unknown egg drop ${x.egg}`);
  const b = r.battle;
  check(b.aiTierZones.length === 2 && b.aiRandomness.length === 4 && b.aiTemperature.length === 4, "battle: AI tier arrays have the wrong length");
  check(STAGES.every((s) => b.xpStageMultiplier[s] !== undefined), "battle: xpStageMultiplier needs every stage");
  for (const [stage, region] of Object.entries(b.evolutionUnlockBoss)) check(d.region.has(region) && b.evolutionCost[stage] !== undefined, `battle: bad unlock ${stage}`);
  check(r.training.statGainByTier.length === 4 && r.training.xpByTier.length === 4 && r.training.tierScores.length === 3, "training: wrong tier arrays");

  for (const c of d.challenges) {
    check(c.target > 0, `${c.id}: target must be positive`);
    check(!c.daily || !DERIVED_METRICS.includes(c.metric), `${c.id}: daily challenges must use a counted metric`);
    if (c.reward.item) check(d.item.has(c.reward.item), `${c.id}: unknown reward item`);
    if (c.reward.parche) check(d.parche.has(c.reward.parche), `${c.id}: unknown reward Parche`);
  }
  check(d.challenges.filter((c) => c.daily).length >= r.dailyChallenges, "rules: fewer daily challenges than dailyChallenges");

  // Every Eco can be met, hatched, evolved into or fused.
  const obtainable = new Set(starters.map((s) => s.id));
  for (const region of d.regions) { region.encounters.forEach((e) => obtainable.add(e.species)); obtainable.add(region.boss.species); }
  d.eggs.forEach((g) => g.pool.forEach((p) => obtainable.add(p.species)));
  d.fusions.forEach((f) => obtainable.add(f.result));
  const frontier = [...obtainable];
  while (frontier.length) {
    for (const ev of d.eco.get(frontier.pop()!)?.evolutions ?? []) if (!obtainable.has(ev.to)) { obtainable.add(ev.to); frontier.push(ev.to); }
  }
  const unreachable = d.ecos.filter((e) => !obtainable.has(e.id)).map((e) => e.id);
  check(unreachable.length === 0, `Ecos that can't be obtained: ${unreachable.join(", ")}`);
  return issues;
}

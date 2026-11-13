// Loads src/data/json with the game's own models and reports every inconsistency.
//   npm run validate
import { loadGameData } from "../src/data/load";
import { validate } from "../src/data/validate";
import { STAGES, STAGE_NAME } from "../src/data/models";

const data = loadGameData();
const issues = validate(data);
const summary = STAGES.map((s) => `${data.ecos.filter((e) => e.stage === s).length} ${STAGE_NAME[s]}`).join(", ");
console.log(`${data.ecos.length} Ecos (${summary})`);
console.log(`${data.starters.length} compañeros iniciales, ${data.fusions.length} fusiones, ${data.regions.length} zonas, ${data.items.length} objetos, ${data.eggs.length} huevos, ${data.parches.length} Parches, ${data.challenges.length} retos`);
const main = data.regions.filter((r) => !r.postGame && !r.requiresItem).reduce((s, r) => s + r.steps, 0);
console.log(`Pasos de la ruta principal: ${main.toLocaleString("es")}`);
if (issues.length === 0) console.log("✓ Todos los datos son coherentes.");
else {
  console.log(`✗ ${issues.length} problema(s):`);
  for (const i of issues) console.log(`  - ${i}`);
  process.exit(1);
}

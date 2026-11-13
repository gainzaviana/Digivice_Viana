import ecos from "./json/ecos.json";
import fusions from "./json/fusiones.json";
import regions from "./json/regiones.json";
import items from "./json/objetos.json";
import eggs from "./json/huevos.json";
import parches from "./json/parches.json";
import challenges from "./json/retos.json";
import rules from "./json/reglas.json";
import { GameData, type RawData } from "./models";

/** The bundled content (the JSON files are the source of truth). */
export function loadGameData(): GameData {
  return new GameData({ ecos, fusions, regions, items, eggs, parches, challenges, rules } as unknown as RawData);
}

import { defineConfig, type Plugin } from "vite";
import preact from "@preact/preset-vite";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

/**
 * Your creature art (src/assets/creatures): only images named after a species in ecos.json
 * (`<id>.png`, `<id>_idle.png`, `<id>_brillante.png`, `<id>_shiny.png`, `<id>_infectado.png`) are
 * bundled; anything else in the folder is ignored and never published.
 */
function creatureArt(): Plugin {
  const dir = resolve(__dirname, "src/assets/creatures");
  const VIRTUAL = "virtual:creature-art";
  return {
    name: "creature-art",
    resolveId: (id) => (id === VIRTUAL ? "\0" + VIRTUAL : undefined),
    load(id) {
      if (id !== "\0" + VIRTUAL) return;
      const raw = JSON.parse(readFileSync(resolve(__dirname, "src/data/json/ecos.json"), "utf8"));
      const ids = new Set<string>((Array.isArray(raw) ? raw : raw.ecos).map((e: { id: string }) => e.id.toLowerCase()));
      const files = existsSync(dir) ? readdirSync(dir) : [];
      const keep = files.filter((f) => {
        const m = /^(.+?)(_idle|_normal|_brillante|_shiny|_infectado)?\.(png|webp)$/i.exec(f);
        return !!m && ids.has(m[1].toLowerCase());
      });
      return keep.map((f, i) => `import u${i} from ${JSON.stringify(resolve(dir, f) + "?url")};`).join("\n")
        + `\nexport default {${keep.map((f, i) => `${JSON.stringify(f)}: u${i}`).join(",")}};\n`;
    },
  };
}

export default defineConfig({
  plugins: [preact(), creatureArt()],
  // Relative paths: the game works from any folder or subpath it's hosted under.
  base: "./",
  build: { target: "es2022", assetsInlineLimit: 0, chunkSizeWarningLimit: 700 },
});

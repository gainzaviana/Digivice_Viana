import { stageOrder, type EcoSpecies } from "../data/models";
import { PALETTE as P } from "./palette";
import { Material as M, SpriteForge, type Look, type Point } from "./forge";

// Body plans: how each Eco is built. Coordinates are 0…1 of the canvas, the Eco faces right,
// feet near the bottom. `s` is the stage index (Brote 0 … Supremo 4, Despertar 5, Fusión 6):
// features are added as the line grows. A faithful port of the native SpriteBodies.

/** Swift's floating `stride(from:through:by:)` / `stride(from:to:by:)` for a positive step. */
function stride(from: number, end: number, by: number, through: boolean): number[] {
  const out: number[] = [];
  for (let i = 0; ; i++) {
    const v = from + i * by;
    if (through ? v > end + 1e-9 : v >= end - 1e-9) break;
    out.push(v);
  }
  return out;
}

/** Builds an Eco's sprite: shape, look and seams. */
export function buildSprite(species: EcoSpecies, n: number): { forge: SpriteForge; look: Look } {
  const f = new SpriteForge(n);
  drawBody(f, species);
  return { forge: f, look: lookFor(species) };
}

/** Runs an Eco's body plan on a forge (the pixel forge, or a recorder that builds it in 3D). */
export function drawBody(f: SpriteForge, species: EcoSpecies): void {
  const s = stageOrder(species.stage);
  switch (species.line ?? fusionLine(species.id) ?? "") {
    case "forja": salamander(f, s, species.id === "escoria"); break;
    case "eco": hare(f, s); break;
    case "pliegue": paperFox(f, s); break;
    case "glitch": gremlin(f, s); break;
    case "quitina": beetle(f, s); break;
    case "telurica": armadillo(f, s); break;
    case "engranaje": robot(f, s); break;
    case "abisal": axolotl(f, s); break;
    default: wild(f, kindOf(species.id), s, species);
  }
  if (species.stage === "fusion") fusionTrim(f, species.id);
  if (species.stage === "despertar") awakening(f);
}

/** Which partner line's body a fusion is built on. */
function fusionLine(id: string): string | undefined {
  return ({ "emperador-crisol": "forja", "eclipse-plegado": "pliegue", "orquesta-omega": "engranaje", "tormenta-telurica": "telurica" } as Record<string, string>)[id];
}

// MARK: Looks (palette ramps: shadow, base, light, highlight)

const DARK = [P.outline, P.ink, P.slate, P.slate];

/** Swift's wrapping 64-bit djb2 over the id's Unicode scalars. */
function idHash(id: string): bigint {
  let h = 5381n;
  for (const ch of id) h = BigInt.asIntN(64, BigInt.asIntN(64, h * 33n) + BigInt(ch.codePointAt(0)!));
  return h;
}
const absBig = (v: bigint) => (v < 0n ? -v : v);

export function lookFor(species: EcoSpecies): Look {
  const seam = species.affinity === "pulso" ? P.pulso : species.affinity === "senal" ? P.senal : P.ruido;
  const red = [P.red1, P.red2, P.red3, P.amber3];
  const amber = [P.amber0, P.amber1, P.amber2, P.amber3];
  const blue = [P.blue1, P.blue2, P.blue3, P.white];
  const paper = [P.slate, P.mist, P.white, P.white];
  const teal = [P.teal0, P.teal1, P.teal2, P.blue3];
  const green = [P.green0, P.green1, P.green2, P.green3];
  const brown = [P.brown0, P.brown1, P.skin, P.cream];
  const stone = [P.ink, P.slate, P.mist, P.white];
  const purple = [P.purple0, P.purple1, P.purple2, P.pink];
  const pink = [P.purple1, P.pink, P.pink, P.cream];
  const cream = [P.skin, P.cream, P.cream, P.white];
  const ink = [P.outline, P.ink, P.slate, P.mist];
  const look = (main: string[], second: string[], accent: string[]): Look => ({ main, second, accent, dark: DARK, seam });

  switch (species.id) {
    case "escoria": return look(ink, red, amber);
    case "silencio": return look(paper, blue, stone);
    case "tinta-negra": return look(ink, purple, paper);
    case "bufon-leal": return look(amber, red, cream);
    case "emperador-crisol": return look(red, green, amber);
    case "eclipse-plegado": return look(ink, paper, purple);
    case "orquesta-omega": return look(amber, blue, stone);
    case "tormenta-telurica": return look(brown, teal, stone);
  }
  switch (species.line) {
    case "forja": return look(red, amber, [P.outline, P.ink, P.slate, P.mist]);
    case "eco": return look(blue, paper, stone);
    case "pliegue": return look(paper, teal, red);
    case "glitch": return look(stone, teal, paper);
    case "quitina": return look(green, amber, stone);
    case "telurica": return look(brown, stone, amber);
    case "engranaje": return look(amber, stone, teal);
    case "abisal": return look(teal, pink, cream);
    default: {
      // Wild Ecos: a ramp pair from their id, so each species keeps its colours.
      const ramps = [red, green, blue, brown, purple, teal, stone, amber, pink];
      const hash = idHash(species.id), count = BigInt(ramps.length);
      const main = ramps[Number(absBig(hash) % count)], second = ramps[Number(absBig(hash / 7n) % count)];
      return look(main, second === main ? cream : second, cream);
    }
  }
}

// MARK: Partner lines

/** Forja: ember spirit → iron-plated forge salamander → forge dragon with metal-sheet wings and a sun-ring. */
function salamander(f: SpriteForge, s: number, alt: boolean) {
  const n = f.n;
  if (s === 0) {
    f.triangle([0.5, 0.14], [0.36, 0.44], [0.64, 0.44], M.second);
    f.ellipse(0.5, 0.64, 0.3, 0.26, M.main);
    f.rect(0.36, 0.7, 0.64, 0.78, M.accent, 0.2);
    f.eye(0.42, 0.58); f.eye(0.6, 0.58);
    return;
  }
  if (s >= 4) f.ring(0.52, 0.4, 0.42, M.second, n / 30);
  if (s >= 3) {
    // Wings: two hammered metal sheets.
    f.triangle([0.42, 0.5], [0.14, 0.14], [0.5, 0.34], M.second);
    f.triangle([0.4, 0.5], [0.24, 0.26], [0.34, 0.5], M.accent, 0.1);
  }
  // Tail: tapering segments ending in an iron anvil plate.
  f.ellipse(0.27, 0.72, 0.1, 0.07, M.main);
  f.ellipse(0.17, 0.7, 0.07, 0.05, M.main);
  f.rect(0.04, 0.64, 0.12, 0.74, M.accent, 0.2);
  f.rect(0.34, 0.76, 0.42, 0.9, M.main);
  f.rect(0.54, 0.76, 0.62, 0.9, M.main);
  f.ellipse(0.46, 0.66, 0.22, 0.15 + s * 0.01, M.main, 0.1);
  // Iron belly plates.
  for (const x of stride(0.36, 0.56, 0.07, true)) f.rect(x, 0.7, x + 0.05, 0.78, M.accent, 0.25);
  if (s >= 2) {
    // Iron crest along the back.
    for (const x of [0.3, 0.39, 0.48]) f.rect(x, 0.48, x + 0.05, 0.53, M.accent, 0.3);
  }
  // Angular head: a skull block and a wedge snout.
  f.rect(0.6, 0.38, 0.76, 0.56, M.main, 0.3);
  f.triangle([0.74, 0.42], [0.92, 0.5], [0.74, 0.56], M.main, 0.35);
  if (s >= 2) f.triangle([0.6, 0.38], [0.56, 0.24], [0.66, 0.38], M.accent, 0.4);
  if (s >= 3) f.band(0.6, 0.64, M.main, M.dark, 0.3, 0.62);
  // Chest ember: the line's mark from Brote to Supremo.
  f.ellipse(0.56, 0.62, 0.035 + s * 0.004, 0.035 + s * 0.004, M.glow, 0.5);
  f.eye(0.7, 0.45);
  // Ember cracks across the body.
  f.seamLine([0.28, 0.64], [0.4, 0.62]); f.seamLine([0.4, 0.62], [0.5, 0.66]);
  if (s >= 3) f.seamLine([0.62, 0.5], [0.7, 0.54]);
  if (alt) f.glitchRows([0.6, 0.7], 1);
}

/** Eco: bell-eared puff → fennec-hare with speaker-cone ears → sound titan with ring waves. */
function hare(f: SpriteForge, s: number) {
  if (s === 0) {
    f.ellipse(0.38, 0.3, 0.08, 0.12, M.main); f.ellipse(0.62, 0.3, 0.08, 0.12, M.main);
    f.ellipse(0.38, 0.22, 0.05, 0.05, M.second, 0.2); f.ellipse(0.62, 0.22, 0.05, 0.05, M.second, 0.2);
    f.ellipse(0.5, 0.62, 0.28, 0.26, M.main);
    f.ellipse(0.5, 0.72, 0.15, 0.1, M.second, 0.2);
    f.eye(0.42, 0.58); f.eye(0.6, 0.58);
    return;
  }
  const earLength = 0.15 + Math.min(s, 4) * 0.012;
  if (s >= 4) {
    f.ring(0.82, 0.42, 0.14, M.second, 1);
    f.ring(0.82, 0.42, 0.22, M.second, 1);
  }
  f.ellipse(0.27, 0.66, 0.06, 0.06, M.second);
  f.ellipse(0.5, 0.88, 0.13, 0.05, M.main);
  f.ellipse(0.45, 0.68, 0.2, 0.19, M.main, 0.1);
  f.ellipse(0.48, 0.72, 0.11, 0.1, M.second, 0.25);
  if (s >= 2) {
    for (const [x, y] of [[0.45, 0.66], [0.5, 0.66], [0.45, 0.71], [0.5, 0.71]]) f.rect(x, y, x + 0.025, y + 0.025, M.dark, 0.3);
  }
  if (s >= 3) f.band(0.52, 0.56, M.main, M.second, 0.4, 0.75);
  // Ears end in speaker cones.
  for (const [x, lean] of [[0.54, -0.02], [0.66, 0.02]]) {
    f.ellipse(x + lean, 0.42 - earLength, 0.055, earLength, M.main, 0.2);
    f.ellipse(x + lean * 2, 0.42 - earLength * 1.8, 0.07, 0.05, M.second, 0.35);
    f.ellipse(x + lean * 2, 0.42 - earLength * 1.8, 0.03, 0.025, M.dark, 0.4);
  }
  f.ellipse(0.62, 0.44, 0.16, 0.14, M.main, 0.3);
  f.ellipse(0.74, 0.48, 0.06, 0.05, M.second, 0.35);
  f.eye(0.66, 0.42);
  f.seamLine([0.32, 0.64], [0.55, 0.62]);
}

/** Pliegue: folded scrap → paper fox in triangles → spell-folder with crane wings. */
function paperFox(f: SpriteForge, s: number) {
  if (s === 0) {
    f.triangle([0.5, 0.3], [0.2, 0.62], [0.8, 0.62], M.main);
    f.triangle([0.2, 0.62], [0.5, 0.88], [0.8, 0.62], M.second);
    f.eye(0.42, 0.56); f.eye(0.58, 0.56);
    return;
  }
  if (s >= 3) {
    f.triangle([0.38, 0.5], [0.08, 0.1], [0.48, 0.36], M.second);
    f.triangle([0.42, 0.5], [0.3, 0.06], [0.56, 0.36], M.main, 0.1);
  }
  if (s >= 4) {
    for (const [x, y] of [[0.86, 0.2], [0.12, 0.7], [0.9, 0.7]]) f.rect(x - 0.03, y - 0.05, x + 0.03, y + 0.05, M.accent, 0.5);
  }
  // Folded tail(s) curling up behind.
  f.triangle([0.28, 0.72], [0.04, 0.44], [0.3, 0.56], M.main);
  f.triangle([0.04, 0.44], [0.12, 0.42], [0.1, 0.5], M.accent, 0.2);
  if (s >= 2) f.triangle([0.3, 0.66], [0.1, 0.32], [0.34, 0.5], M.second, 0.1);
  f.rect(0.36, 0.78, 0.4, 0.9, M.main); f.rect(0.54, 0.78, 0.58, 0.9, M.main);
  f.triangle([0.26, 0.8], [0.62, 0.8], [0.46, 0.5], M.main, 0.1);
  f.triangle([0.46, 0.5], [0.62, 0.8], [0.46, 0.8], M.second, 0.15);
  f.triangle([0.48, 0.52], [0.84, 0.5], [0.6, 0.3], M.main, 0.3);
  f.triangle([0.56, 0.32], [0.6, 0.12], [0.66, 0.31], M.main, 0.35);
  f.triangle([0.64, 0.31], [0.73, 0.1], [0.76, 0.33], M.second, 0.35);
  f.eye(0.67, 0.41);
  f.seamLine([0.34, 0.74], [0.56, 0.72]);
}

/** Glitch: flickering pixel → grinning code gremlin → error king with a puppet and a crown of windows. */
function gremlin(f: SpriteForge, s: number) {
  if (s === 0) {
    f.rect(0.3, 0.42, 0.7, 0.82, M.main);
    f.rect(0.36, 0.36, 0.64, 0.42, M.main);
    f.eye(0.42, 0.56); f.eye(0.58, 0.56);
    f.glitchRows([0.5, 0.66], 1);
    return;
  }
  if (s >= 4) {
    for (const x of [0.36, 0.5, 0.64]) f.rect(x - 0.05, 0.04, x + 0.05, 0.14, M.second, 0.4);
  }
  if (s >= 2) {
    // The puppet on its strings.
    f.line([0.22, 0.04], [0.22, 0.46], M.second);
    f.ellipse(0.2, 0.56 + (s >= 3 ? 0.02 : 0), 0.08 + (s - 2) * 0.02, 0.1 + (s - 2) * 0.02, M.second, 0.1);
    f.line([0.3, 0.6], [0.42, 0.58], M.second);
  }
  f.ellipse(0.52, 0.76, 0.14, 0.12, M.main);
  f.rect(0.42, 0.84, 0.48, 0.92, M.main); f.rect(0.56, 0.84, 0.62, 0.92, M.main);
  // Sharp ears pointing straight up, with teal inner edges.
  f.triangle([0.38, 0.36], [0.36, 0.08], [0.48, 0.3], M.main, 0.2);
  f.triangle([0.64, 0.3], [0.76, 0.08], [0.76, 0.36], M.main, 0.2);
  f.line([0.4, 0.3], [0.39, 0.16], M.second, 1, 0.25);
  f.line([0.72, 0.3], [0.74, 0.16], M.second, 1, 0.25);
  f.ellipse(0.56, 0.46, 0.22, 0.18, M.main, 0.3);
  // A wide grin of white pixels.
  for (let i = 0; i < 4; i++) f.rect(0.5 + i * 0.04, 0.54, 0.52 + i * 0.04, 0.57, M.accent, 0.4);
  f.eye(0.52, 0.42); f.eye(0.66, 0.42);
  f.seamLine([0.4, 0.74], [0.64, 0.78]);
  f.glitchRows([0.38 + s * 0.03, 0.7], s >= 3 ? 2 : 1);
}

/** Quitina: round beetle → shelled crawler with a horn → upright shell knight with shield and plume. */
function beetle(f: SpriteForge, s: number) {
  const n = f.n;
  if (s < 3) {
    for (const x of [0.3, 0.44, 0.58]) f.line([x, 0.74], [x - 0.05, 0.88], M.dark, Math.max(1, n / 24));
    f.ellipse(0.46, 0.62, 0.28, 0.2 + s * 0.02, M.main);
    f.line([0.24, 0.6], [0.68, 0.6], M.dark);
    f.ellipse(0.75, 0.68, 0.11, 0.09, M.second, 0.2);
    if (s >= 1) f.triangle([0.76, 0.6], [0.86, 0.42 - s * 0.06], [0.82, 0.6], M.second, 0.3);
    f.eye(0.78, 0.66);
    f.seamLine([0.28, 0.66], [0.6, 0.66]);
    return;
  }
  // Knight: the shell becomes a cape behind an armoured body.
  f.ellipse(0.36, 0.54, 0.2, 0.32, M.main);
  f.line([0.36, 0.24], [0.36, 0.84], M.dark);
  f.rect(0.44, 0.8, 0.5, 0.94, M.second); f.rect(0.58, 0.8, 0.64, 0.94, M.second);
  f.rect(0.44, 0.4, 0.66, 0.82, M.second, 0.2);
  f.band(0.56, 0.6, M.second, M.dark, 0.44, 0.66);
  f.ellipse(0.56, 0.3, 0.1, 0.1, M.second, 0.3);
  f.triangle([0.54, 0.22], [0.62, 0.04], [0.6, 0.22], M.main, 0.4);
  if (s >= 4) f.triangle([0.48, 0.22], [0.38, 0.06], [0.52, 0.18], M.accent, 0.4);
  f.ellipse(0.74, 0.6, 0.1, 0.17, M.main, 0.4);
  f.ellipse(0.74, 0.6, 0.04, 0.07, M.second, 0.5);
  if (s >= 4) f.line([0.82, 0.3], [0.82, 0.82], M.accent, 2, 0.5);
  f.eye(0.6, 0.29);
  f.seamLine([0.46, 0.5], [0.64, 0.5]);
}

/** Telúrica: banded ball → horned armadillo-rhino → walking mountain with stone crests. */
function armadillo(f: SpriteForge, s: number) {
  if (s === 0) {
    f.ellipse(0.5, 0.62, 0.3, 0.28, M.main);
    for (const y of [0.5, 0.6, 0.7]) f.band(y, y + 0.03, M.main, M.second);
    f.eye(0.64, 0.58);
    return;
  }
  if (s >= 3) {
    for (const [x, h] of [[0.28, 0.28], [0.42, 0.22], [0.56, 0.3]]) f.triangle([x - 0.06, 0.5], [x, h - (s - 3) * 0.06], [x + 0.06, 0.5], M.second);
  }
  f.rect(0.24, 0.78, 0.32, 0.9, M.main); f.rect(0.56, 0.78, 0.64, 0.9, M.main);
  f.ellipse(0.44, 0.64, 0.3, 0.18 + s * 0.01, M.main, 0.1);
  for (const y of stride(0.52, 0.78, 0.06, false)) f.band(y, y + 0.02, M.main, M.second, 0.16, 0.7);
  f.ellipse(0.76, 0.66, 0.11, 0.1, M.main, 0.3);
  f.triangle([0.8, 0.6], [0.86, 0.44 - s * 0.04], [0.9, 0.62], M.accent, 0.4);
  if (s >= 2) f.triangle([0.72, 0.58], [0.74, 0.48], [0.78, 0.58], M.accent, 0.4);
  f.eye(0.74, 0.62);
  f.seamLine([0.22, 0.68], [0.62, 0.7]);
}

/** Engranaje: repair drone → boxy little robot with a back gear → great machine ringed by a gear halo. */
function robot(f: SpriteForge, s: number) {
  const n = f.n;
  if (s === 0) {
    f.line([0.5, 0.16], [0.5, 0.36], M.second);
    f.ellipse(0.5, 0.14, 0.05, 0.05, M.accent, 0.3);
    f.ellipse(0.5, 0.6, 0.28, 0.24, M.main);
    f.rect(0.32, 0.5, 0.68, 0.62, M.accent, 0.2);
    f.eye(0.42, 0.56); f.eye(0.58, 0.56);
    return;
  }
  const gear = s >= 4 ? 0.4 : 0.14 + s * 0.02;
  const gx = s >= 4 ? 0.5 : 0.32, gy = s >= 4 ? 0.48 : 0.54;
  f.ring(gx, gy, gear, M.second, n / 28);
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    f.ellipse(gx + Math.cos(a) * gear, gy + Math.sin(a) * gear, 0.03, 0.03, M.second);
  }
  f.rect(0.42, 0.8, 0.5, 0.94, M.second); f.rect(0.6, 0.8, 0.68, 0.94, M.second);
  f.rect(0.4, 0.5, 0.72, 0.82, M.main, 0.1);
  if (s >= 3) {
    f.rect(0.72, 0.54, 0.86, 0.62, M.second, 0.2);
    f.rect(0.82, 0.52, 0.9, 0.66, M.main, 0.3);
  }
  f.line([0.66, 0.1], [0.66, 0.28], M.second);
  f.ellipse(0.66, 0.1, 0.035, 0.035, M.glow, 0.4);
  f.rect(0.48, 0.26, 0.82, 0.5, M.main, 0.3);
  f.rect(0.54, 0.32, 0.8, 0.42, M.accent, 0.4);
  f.eye(0.62, 0.37); f.eye(0.74, 0.37);
  f.seamLine([0.42, 0.66], [0.7, 0.66]);
}

/** Abisal: bubble → frilled axolotl → glacial leviathan with ice crests. */
function axolotl(f: SpriteForge, s: number) {
  if (s === 0) {
    f.ellipse(0.5, 0.6, 0.3, 0.28, M.main);
    f.ellipse(0.4, 0.48, 0.07, 0.06, M.accent, 0.4);
    for (const [x, y] of [[0.2, 0.44], [0.8, 0.44]]) f.ellipse(x, y, 0.06, 0.05, M.second, 0.1);
    f.eye(0.42, 0.6); f.eye(0.6, 0.6);
    return;
  }
  if (s >= 3) {
    for (const [x, h] of [[0.32, 0.36], [0.44, 0.3], [0.56, 0.38]]) f.triangle([x - 0.04, 0.54], [x, h - (s - 3) * 0.08], [x + 0.04, 0.54], M.accent);
  }
  f.ellipse(0.18, 0.62, 0.13 + s * 0.01, 0.09, M.second);
  f.rect(0.34, 0.74, 0.4, 0.86, M.main); f.rect(0.54, 0.74, 0.6, 0.86, M.main);
  f.ellipse(0.44, 0.66, 0.26, 0.14, M.main, 0.1);
  f.ellipse(0.46, 0.72, 0.16, 0.06, M.accent, 0.2);
  // Three frilled gills on each side of the head.
  for (const [dx, dy] of [[-0.1, -0.12], [-0.13, -0.04], [-0.1, 0.04]]) {
    f.ellipse(0.66 + dx, 0.52 + dy, 0.06 + Math.min(s, 4) * 0.006, 0.035, M.second, 0.2);
  }
  f.ellipse(0.7, 0.54, 0.16, 0.13, M.main, 0.3);
  f.line([0.74, 0.62], [0.82, 0.6], M.dark);
  f.eye(0.74, 0.5);
  f.seamLine([0.24, 0.66], [0.6, 0.68]);
}

// MARK: Despertar and fusions

/** Despertar: more seams and a glowing core. */
function awakening(f: SpriteForge) {
  f.seamLine([0.2, 0.3], [0.5, 0.9]);
  f.seamLine([0.8, 0.3], [0.5, 0.9]);
  f.ellipse(0.5, 0.6, 0.04, 0.04, M.glow, 0.6);
}

/** Fusions carry a piece of their second partner. */
function fusionTrim(f: SpriteForge, id: string) {
  switch (id) {
    case "emperador-crisol":
      f.ellipse(0.5, 0.64, 0.14, 0.1, M.second, 0.6);
      f.band(0.6, 0.66, M.second, M.dark, 0.36, 0.64);
      break;
    case "eclipse-plegado":
      for (const x of [0.3, 0.5, 0.7]) f.rect(x - 0.04, 0.02, x + 0.04, 0.1, M.accent, 0.5);
      f.glitchRows([0.4, 0.62], 2);
      break;
    case "orquesta-omega":
      for (const [x, lean] of [[0.6, -0.02], [0.72, 0.02]]) {
        f.ellipse(x + lean, 0.12, 0.05, 0.1, M.second, 0.5);
        f.ellipse(x + lean, 0.04, 0.06, 0.03, M.second, 0.6);
      }
      break;
    case "tormenta-telurica":
      for (const [x, h] of [[0.3, 0.2], [0.46, 0.14], [0.6, 0.22]]) f.triangle([x - 0.04, 0.44], [x, h], [x + 0.04, 0.44], M.second, 0.5);
      break;
  }
}

// MARK: Wild Ecos

export type Kind = "insect" | "bird" | "amphibian" | "beast" | "shell" | "plant" | "jelly" | "serpent" | "golem" | "cube" | "dragon";

const KINDS: Record<string, Kind> = {};
for (const [kind, ids] of [
  ["insect", "bitbicho polillux aranared escorpiolag reina-colmena emperatriz-virica"],
  ["bird", "murciclic pajarrafaga gaviotaje buhoraculo grifo-bus fenix-reinicio arcangel-checksum"],
  ["amphibian", "ranadin sapotron"],
  ["beast", "topocable lobocifra ciervoltio manticora-spam minotauro-kernel yeti-criptografico"],
  ["shell", "caracolchon cangrejal tortuga-archivo"],
  ["plant", "hongolin cactuson"],
  ["jelly", "medusonica kraken-paquete senor-del-lag fantasma-cache"],
  ["serpent", "serpiente-bucle hidra-fork gusano-mundial"],
  ["golem", "golem-disco golemagma titan-cortafuegos coloso-nulo guardian-raiz"],
  ["cube", "pixelito"],
  ["dragon", "dragon-desbordamiento"],
] as [Kind, string][]) for (const id of ids.split(" ")) KINDS[id] = kind;

/** Creature type of each wild Eco, from its description. */
export const kindOf = (id: string): Kind => KINDS[id] ?? "beast";

function wild(f: SpriteForge, kind: Kind, s: number, species: EcoSpecies) {
  const id = species.id, n = f.n;
  const big = Math.min(s, 4) * 0.015;
  switch (kind) {
    case "insect":
      if (id === "polillux" || id === "reina-colmena" || id === "emperatriz-virica") {
        f.ellipse(0.4, 0.36, 0.18, 0.16, M.second, -0.1); f.ellipse(0.56, 0.32, 0.16, 0.14, M.second, -0.1);
      }
      for (const x of [0.32, 0.46, 0.6]) f.line([x, 0.7], [x - 0.06, 0.9], M.dark);
      f.ellipse(0.26, 0.64, 0.14 + big, 0.12, M.main);
      f.ellipse(0.48, 0.62, 0.12 + big, 0.11, M.main, 0.1);
      if (id === "escorpiolag") { f.line([0.16, 0.6], [0.2, 0.3], M.main, 2); f.triangle([0.16, 0.3], [0.26, 0.24], [0.22, 0.36], M.accent, 0.3); }
      f.ellipse(0.68, 0.58, 0.12 + big, 0.11, M.main, 0.2);
      f.line([0.72, 0.48], [0.78, 0.28], M.dark); f.line([0.66, 0.48], [0.64, 0.28], M.dark);
      if (id === "reina-colmena" || id === "emperatriz-virica") {
        for (const x of [0.62, 0.68, 0.74]) f.triangle([x - 0.03, 0.46], [x, 0.36], [x + 0.03, 0.46], M.accent, 0.4);
      }
      f.eye(0.72, 0.56);
      f.seamLine([0.2, 0.64], [0.56, 0.62]);
      break;
    case "bird":
      f.line([0.46, 0.76], [0.44, 0.9], M.dark); f.line([0.56, 0.76], [0.58, 0.9], M.dark);
      f.triangle([0.24, 0.66], [0.06, 0.6], [0.2, 0.74], M.second);
      if (id === "arcangel-checksum") f.ring(0.62, 0.3, 0.18, M.accent, 2);
      f.ellipse(0.46, 0.62, 0.22 + big, 0.16 + big, M.main);
      // A broad wing raised over the back.
      f.triangle([0.3, 0.6], [0.18, 0.28 - big * 4], [0.58, 0.5], M.second, 0.2);
      f.triangle([0.3, 0.6], [0.12, 0.42 - big * 2], [0.24, 0.62], M.second, 0.15);
      f.ellipse(0.68, 0.44, 0.13, 0.12, M.main, 0.3);
      f.triangle([0.78, 0.42], [0.92, 0.46], [0.78, 0.5], M.accent, 0.4);
      if (id === "buhoraculo") f.triangle([0.6, 0.36], [0.6, 0.24], [0.66, 0.34], M.main, 0.4);
      f.eye(0.72, 0.42);
      f.seamLine([0.3, 0.62], [0.6, 0.64]);
      break;
    case "amphibian":
      f.rect(0.26, 0.76, 0.36, 0.88, M.main); f.rect(0.62, 0.76, 0.72, 0.88, M.main);
      f.ellipse(0.5, 0.66, 0.3 + big, 0.18, M.main);
      f.ellipse(0.5, 0.72, 0.18, 0.08, M.accent, 0.2);
      f.ellipse(0.38, 0.46, 0.08, 0.08, M.main, 0.3); f.ellipse(0.62, 0.46, 0.08, 0.08, M.main, 0.3);
      f.eye(0.38, 0.46); f.eye(0.62, 0.46);
      f.line([0.38, 0.62], [0.62, 0.62], M.dark);
      f.seamLine([0.26, 0.68], [0.74, 0.68]);
      break;
    case "beast":
      for (const x of [0.28, 0.4, 0.56, 0.68]) f.rect(x, 0.74, x + 0.06, 0.9, M.main);
      f.line([0.2, 0.6], [0.08, 0.44], M.main, Math.max(1, n / 24));
      if (id === "manticora-spam") f.triangle([0.3, 0.56], [0.2, 0.16], [0.56, 0.46], M.second);
      f.ellipse(0.46, 0.64, 0.28 + big, 0.15 + big, M.main);
      f.ellipse(0.74, 0.5, 0.13, 0.12, M.main, 0.3);
      f.ellipse(0.84, 0.54, 0.06, 0.05, M.main, 0.35);
      f.triangle([0.66, 0.42], [0.66, 0.3], [0.72, 0.4], M.main, 0.4);
      if (id === "ciervoltio") { f.line([0.72, 0.4], [0.66, 0.16], M.accent, 2); f.line([0.68, 0.24], [0.58, 0.18], M.accent); }
      if (id === "minotauro-kernel") { f.triangle([0.68, 0.4], [0.6, 0.28], [0.72, 0.36], M.accent, 0.4); f.triangle([0.78, 0.4], [0.86, 0.28], [0.8, 0.42], M.accent, 0.4); }
      if (id === "yeti-criptografico") f.band(0.5, 0.8, M.main, M.second);
      f.eye(0.76, 0.47);
      f.seamLine([0.26, 0.62], [0.62, 0.64]);
      break;
    case "shell":
      f.ellipse(0.62, 0.74, 0.22, 0.1, M.second);
      f.ellipse(0.42, 0.6, 0.26 + big, 0.22 + big, M.main, 0.2);
      for (const r of [0.08, 0.15]) f.ring(0.42, 0.6, r + big, M.dark);
      if (id === "cangrejal") { f.ellipse(0.82, 0.56, 0.08, 0.06, M.accent, 0.4); f.ellipse(0.22, 0.56, 0.08, 0.06, M.accent, 0.4); }
      f.ellipse(0.78, 0.66, 0.09, 0.08, M.second, 0.3);
      f.eye(0.8, 0.64);
      f.seamLine([0.24, 0.7], [0.6, 0.7]);
      break;
    case "plant":
      if (id === "hongolin") {
        f.rect(0.42, 0.56, 0.58, 0.88, M.second);
        f.ellipse(0.5, 0.48, 0.3 + big, 0.18, M.main, 0.2);
        for (const [x, y] of [[0.38, 0.42], [0.56, 0.38], [0.66, 0.48]]) f.ellipse(x, y, 0.04, 0.03, M.accent, 0.4);
        f.eye(0.44, 0.7); f.eye(0.56, 0.7);
      } else {
        f.ellipse(0.5, 0.6, 0.18 + big, 0.3, M.main);
        f.ellipse(0.26, 0.54, 0.08, 0.14, M.main, 0.1); f.ellipse(0.74, 0.5, 0.08, 0.14, M.main, 0.1);
        for (const [x, y] of [[0.42, 0.4], [0.58, 0.5], [0.44, 0.7], [0.6, 0.76]]) f.rect(x, y, x + 0.02, y + 0.04, M.accent, 0.4);
        f.eye(0.44, 0.52); f.eye(0.56, 0.52);
      }
      f.seamLine([0.38, 0.84], [0.62, 0.84]);
      break;
    case "jelly":
      for (const x of stride(0.3, 0.7, 0.1, true)) f.line([x, 0.6], [x + 0.04, 0.92], M.second);
      f.ellipse(0.5, 0.48, 0.26 + big, 0.22 + big, M.main, 0.2);
      f.ellipse(0.42, 0.4, 0.06, 0.04, M.accent, 0.5);
      f.eye(0.44, 0.5); f.eye(0.58, 0.5);
      f.seamLine([0.3, 0.56], [0.7, 0.56]);
      break;
    case "serpent": {
      const heads = id === "hidra-fork" ? 3 : 1;
      const path: Point[] = [[0.16, 0.8], [0.3, 0.72], [0.46, 0.78], [0.6, 0.68], [0.66, 0.54]];
      path.forEach((p, i) => f.ellipse(p[0], p[1], 0.09 + big, 0.08 + big, M.main, Math.fround(i * 0.05)));
      for (let h = 0; h < heads; h++) {
        const y = 0.4 - h * 0.12, x = 0.72 + h * 0.04;
        f.line([0.66, 0.54], [x, y], M.main, Math.max(1, n / 20));
        f.ellipse(x + 0.04, y, 0.1, 0.08, M.main, 0.4);
        f.eye(x + 0.06, y - 0.02);
      }
      f.seamLine([0.16, 0.8], [0.6, 0.68]);
      break;
    }
    case "golem":
      f.rect(0.32, 0.78, 0.44, 0.94, M.main); f.rect(0.56, 0.78, 0.68, 0.94, M.main);
      f.rect(0.28, 0.42, 0.72, 0.8, M.main, 0.1);
      f.rect(0.16, 0.46, 0.28, 0.74, M.second, 0.2); f.rect(0.72, 0.46, 0.84, 0.74, M.second, 0.2);
      f.rect(0.38, 0.22, 0.62, 0.42, M.main, 0.3);
      if (id === "golem-disco") f.ring(0.5, 0.62, 0.12, M.accent, 2);
      if (id === "golemagma" || id === "titan-cortafuegos") f.band(0.56, 0.62, M.main, M.accent, 0.28, 0.72);
      if (id === "guardian-raiz") for (const x of [0.3, 0.5, 0.7]) f.line([x, 0.94], [x - 0.06, 0.99], M.second);
      f.eye(0.46, 0.3); f.eye(0.56, 0.3);
      f.seamLine([0.32, 0.5], [0.68, 0.5]);
      break;
    case "cube":
      f.rect(0.28, 0.34, 0.72, 0.78, M.main);
      f.rect(0.36, 0.42, 0.64, 0.7, M.second, 0.3);
      f.eye(0.44, 0.52); f.eye(0.58, 0.52);
      f.seamLine([0.3, 0.74], [0.7, 0.74]);
      break;
    case "dragon":
      salamander(f, 4, false);
      f.glitchRows([0.3, 0.5, 0.7], 1);
      break;
  }
}

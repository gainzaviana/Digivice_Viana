import * as THREE from "three";
import type { EcoSpecies, GameData } from "../data/models";
import { lookFor } from "../art/bodies";
import { PALETTE } from "../art/palette";
import { softDotTexture } from "./materials";
import { dashStyle, type DashStyle } from "../systems/moves";

/**
 * Signature attacks. Every species gets its own Basic and Strong attack look, built from a set of
 * motifs (embers, bubbles, crystal shards, gears, paper cranes, data cubes, bolts, leaves, spores,
 * rocks, sound rings, ink, wind, toxic orbs, stars, feathers, snowflakes, lava, webs, horns…) and
 * varied per species (colours from its own palette, count, size, spin, arc, trail and impact).
 * Each attack plays in three phases: charge (gathering), travel (projectile + trail, clashes)
 * and impact (elemental burst).
 */

export type Motif =
  | "ember" | "bubble" | "shard" | "gear" | "paper" | "cube" | "bolt" | "leaf" | "spore" | "rock"
  | "ring" | "ink" | "wind" | "toxic" | "star" | "feather" | "snow" | "lava" | "web" | "horn";
export type StrongForm = "big" | "barrage" | "beam" | "meteor" | "tornado";
export type Impact = "burst" | "splash" | "shatter" | "ring" | "bloom" | "pixels" | "zap";

export interface AttackRecipe {
  motif: Motif;
  colors: [string, string, string];
  count: number;
  size: number;
  spin: number;
  arc: number;
  wobble: number;
  speed: number;
  trail: Motif;
  impact: Impact;
  strong: StrongForm;
}

const KEYWORDS: [RegExp, Motif][] = [
  [/brasa|chisp|fuego|llama|ascua|horno|forja|ígne|igne|sol|calor|ceniza/i, "ember"],
  [/lava|magma|volc|erupci|colada/i, "lava"],
  [/burbuj|agua|chorro|marea|ola|torrent|abis|espuma|lluvi/i, "bubble"],
  [/hielo|glacia|escarcha|nieve|cero|helad|frío|frio|yeti/i, "snow"],
  [/cristal|prism|diamant|gema|fragment|vidrio|esquirla/i, "shard"],
  [/engran|tuerc|piñón|pinon|máquina|maquina|mecan|motor|reloj|tornill/i, "gear"],
  [/papel|pliegue|origami|grulla|plega|tinta de|hoja de papel/i, "paper"],
  [/glitch|error|bug|píxel|pixel|dato|bit|byte|cubo|código|codigo|caché|cache|nulo|fork/i, "cube"],
  [/rayo|trueno|voltio|eléctr|electr|chispazo|descarga|bus/i, "bolt"],
  [/hoja|rama|raíz|raiz|bosque|flor|pétal|petal|semilla/i, "leaf"],
  [/espora|hongo|polen|polvo/i, "spore"],
  [/roca|piedra|tierra|sísm|sism|terremoto|rodad|cuerno|telúr|telur|arena/i, "rock"],
  [/eco|sonid|onda|grito|canto|sinfon|orquest|campana|ruido/i, "ring"],
  [/tinta|sombra|oscur|eclipse|noche|silencio/i, "ink"],
  [/viento|ráfaga|rafaga|aire|torbellin|tornado|ciclón|ciclon/i, "wind"],
  [/veneno|tóxic|toxic|virus|spam|infec|ácido|acido|corrupt/i, "toxic"],
  [/estrella|luz|núcleo|nucleo|corona|aurora|brillo|despert|ángel|angel/i, "star"],
  [/pluma|ala|vuelo|pico|grifo|búho|buho|gaviot|pájar|pajar/i, "feather"],
  [/red|telaraña|telarana|hilo|araña|arana/i, "web"],
  [/embest|carga|cornada|placaje|golpe|puño|puno|martillo|garra|mordisco|colmillo/i, "horn"],
];

const AFFINITY_MOTIF: Record<string, Motif[]> = {
  pulso: ["ember", "horn", "star", "rock"],
  senal: ["bolt", "ring", "bubble", "shard"],
  ruido: ["cube", "ink", "toxic", "web"],
};

const TRAIL_FOR: Record<Motif, Motif> = {
  ember: "ember", lava: "ember", bubble: "bubble", snow: "snow", shard: "star", gear: "cube", paper: "paper", cube: "cube",
  bolt: "bolt", leaf: "leaf", spore: "spore", rock: "rock", ring: "ring", ink: "ink", wind: "wind", toxic: "toxic",
  star: "star", feather: "feather", web: "web", horn: "star",
};
const IMPACT_FOR: Record<Motif, Impact> = {
  ember: "burst", lava: "burst", bubble: "splash", snow: "shatter", shard: "shatter", gear: "burst", paper: "bloom", cube: "pixels",
  bolt: "zap", leaf: "bloom", spore: "bloom", rock: "shatter", ring: "ring", ink: "splash", wind: "ring", toxic: "splash",
  star: "burst", feather: "bloom", web: "ring", horn: "burst",
};

function hash(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
  return h >>> 0;
}
const pick = <T,>(list: T[], h: number, salt: number) => list[(((h >>> salt) ^ Math.imul(h, salt + 1)) >>> 0) % list.length];

/** Picks the motif from the attack's name, then the species, then its line/affinity. */
function motifFor(species: EcoSpecies, kind: "basic" | "strong", h: number): Motif {
  const attack = kind === "basic" ? species.basic.name : species.signature.name;
  for (const text of [attack, species.name + " " + species.description]) {
    for (const [re, motif] of KEYWORDS) if (re.test(text)) return motif;
  }
  return pick(AFFINITY_MOTIF[species.affinity] ?? AFFINITY_MOTIF.pulso, h, kind === "basic" ? 3 : 7);
}

const recipeCache = new Map<string, AttackRecipe>();

/** The signature look of a species' Basic or Strong attack (deterministic per species). */
export function recipeFor(speciesID: string, kind: "basic" | "strong", data: GameData): AttackRecipe {
  const key = `${speciesID}|${kind}`;
  const hit = recipeCache.get(key);
  if (hit) return hit;
  const species = data.eco.get(speciesID);
  const h = hash(key);
  if (!species) return { motif: "star", colors: [PALETTE.white, PALETTE.amber3, PALETTE.amber2], count: 1, size: 0.18, spin: 2, arc: 0, wobble: 0, speed: 1, trail: "star", impact: "burst", strong: "big" };
  const look = lookFor(species);
  const motif = motifFor(species, kind, h);
  const r = (salt: number) => ((h >>> salt) & 255) / 255;
  // Colours: the species' own seam plus its accent and main tones, so each one reads as "its" attack.
  const colors: [string, string, string] = [look.seam, look.accent[2] ?? look.accent[1], look.main[2] ?? look.main[1]];
  const strongForms: StrongForm[] = ["big", "barrage", "beam", "meteor", "tornado"];
  const recipe: AttackRecipe = {
    motif,
    colors,
    count: kind === "basic" ? 1 + Math.floor(r(2) * 3) : 3 + Math.floor(r(5) * 5),
    size: (kind === "basic" ? 0.13 : 0.2) * (0.8 + r(9) * 0.5),
    spin: (r(11) - 0.5) * 14,
    arc: (r(13) - 0.3) * (kind === "basic" ? 0.8 : 1.6),
    wobble: r(15) * 0.25,
    speed: kind === "basic" ? 1.15 + r(17) * 0.4 : 0.75 + r(19) * 0.3,
    trail: TRAIL_FOR[motif],
    impact: IMPACT_FOR[motif],
    strong: pick(strongForms, h, 21),
  };
  recipeCache.set(key, recipe);
  return recipe;
}

// MARK: Meshes for each motif (shared geometry; materials per colour)

const geo = new Map<string, THREE.BufferGeometry>();
function shape(name: string, make: () => THREE.BufferGeometry) {
  let g = geo.get(name);
  if (!g) { g = make(); geo.set(name, g); }
  return g;
}

function starShape(points: number, inner: number): THREE.Shape {
  const s = new THREE.Shape();
  for (let i = 0; i <= points * 2; i++) {
    const a = (i / (points * 2)) * Math.PI * 2 + Math.PI / 2;
    const r = i % 2 === 0 ? 1 : inner;
    if (i === 0) s.moveTo(Math.cos(a) * r, Math.sin(a) * r); else s.lineTo(Math.cos(a) * r, Math.sin(a) * r);
  }
  return s;
}

function gearGeometry(): THREE.BufferGeometry {
  const s = new THREE.Shape();
  const teeth = 8;
  for (let i = 0; i <= teeth * 4; i++) {
    const a = (i / (teeth * 4)) * Math.PI * 2;
    const r = i % 4 < 2 ? 1 : 0.78;
    if (i === 0) s.moveTo(Math.cos(a) * r, Math.sin(a) * r); else s.lineTo(Math.cos(a) * r, Math.sin(a) * r);
  }
  const hole = new THREE.Path();
  hole.absarc(0, 0, 0.32, 0, Math.PI * 2, true);
  s.holes.push(hole);
  return new THREE.ExtrudeGeometry(s, { depth: 0.35, bevelEnabled: true, bevelSize: 0.08, bevelThickness: 0.08, bevelSegments: 2, curveSegments: 6 }).center();
}

/** A small mesh for one projectile piece of a motif (unit size; scale by recipe.size). */
function motifGeometry(m: Motif): THREE.BufferGeometry {
  switch (m) {
    case "shard": case "snow": return shape("shard", () => new THREE.OctahedronGeometry(1, 0).scale(0.6, 1.3, 0.6));
    case "gear": return shape("gear", gearGeometry);
    case "paper": return shape("paper", () => new THREE.ConeGeometry(0.9, 1.4, 3, 1).rotateZ(-Math.PI / 2).scale(1, 0.55, 1.1));
    case "cube": return shape("cube", () => new THREE.BoxGeometry(1.2, 1.2, 1.2));
    case "bolt": return shape("bolt", () => new THREE.OctahedronGeometry(1, 0).scale(1.6, 0.45, 0.45));
    case "leaf": case "feather": return shape("leaf", () => new THREE.SphereGeometry(1, 10, 6).scale(1.2, 0.35, 0.7));
    case "rock": return shape("rock", () => new THREE.DodecahedronGeometry(1, 0));
    case "ring": case "wind": case "web": return shape("ring", () => new THREE.TorusGeometry(0.9, 0.18, 6, 20).rotateY(Math.PI / 2));
    case "star": return shape("star", () => new THREE.ExtrudeGeometry(starShape(5, 0.45), { depth: 0.3, bevelEnabled: true, bevelSize: 0.08, bevelThickness: 0.08, bevelSegments: 1 }).center());
    case "horn": return shape("horn", () => new THREE.ConeGeometry(0.6, 1.8, 10).rotateZ(-Math.PI / 2));
    default: return shape("orb", () => new THREE.IcosahedronGeometry(1, 2));
  }
}

const matCache = new Map<string, THREE.Material>();
function projectileMaterial(color: string, glassy: boolean): THREE.Material {
  const key = `${color}|${glassy}`;
  let m = matCache.get(key);
  if (!m) {
    m = glassy
      ? new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: 0.55, roughness: 0.15, metalness: 0, transparent: true, opacity: 0.85 })
      : new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: 0.9, roughness: 0.45 });
    matCache.set(key, m);
  }
  return m;
}

// MARK: Particles

/** A pooled, additive soft-particle system (one draw call). */
export class Particles {
  readonly points: THREE.Points;
  private pos: Float32Array;
  private col: Float32Array;
  private size: Float32Array;
  private alpha: Float32Array;
  private vel: Float32Array;
  private life: Float32Array;
  private maxLife: Float32Array;
  private grow: Float32Array;
  private gravity: Float32Array;
  private drag: Float32Array;
  private next = 0;
  private readonly tmp = new THREE.Color();

  constructor(private capacity: number) {
    const g = new THREE.BufferGeometry();
    this.pos = new Float32Array(capacity * 3);
    this.col = new Float32Array(capacity * 3);
    this.size = new Float32Array(capacity);
    this.alpha = new Float32Array(capacity);
    this.vel = new Float32Array(capacity * 3);
    this.life = new Float32Array(capacity);
    this.maxLife = new Float32Array(capacity);
    this.grow = new Float32Array(capacity);
    this.gravity = new Float32Array(capacity);
    this.drag = new Float32Array(capacity);
    g.setAttribute("position", new THREE.BufferAttribute(this.pos, 3).setUsage(THREE.DynamicDrawUsage));
    g.setAttribute("color", new THREE.BufferAttribute(this.col, 3).setUsage(THREE.DynamicDrawUsage));
    g.setAttribute("size", new THREE.BufferAttribute(this.size, 1).setUsage(THREE.DynamicDrawUsage));
    g.setAttribute("alpha", new THREE.BufferAttribute(this.alpha, 1).setUsage(THREE.DynamicDrawUsage));
    g.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 1e4);
    const m = new THREE.ShaderMaterial({
      uniforms: { map: { value: softDotTexture() }, scale: { value: 300 } },
      vertexShader: `attribute float size; attribute float alpha; attribute vec3 color; varying vec3 vColor; varying float vAlpha; uniform float scale;
        void main() { vColor = color; vAlpha = alpha; vec4 mv = modelViewMatrix * vec4(position, 1.0); gl_PointSize = size * scale / -mv.z; gl_Position = projectionMatrix * mv; }`,
      fragmentShader: `uniform sampler2D map; varying vec3 vColor; varying float vAlpha;
        void main() { vec4 t = texture2D(map, gl_PointCoord); float a = t.a * vAlpha; if (a < 0.01) discard;
          // A bright core fading to the particle's colour: reads on light skies and dark ones.
          gl_FragColor = vec4(mix(vColor, vec3(1.0), smoothstep(0.55, 1.0, t.a) * 0.6), a); }`,
      transparent: true, depthWrite: false, blending: THREE.NormalBlending,
    });
    this.points = new THREE.Points(g, m);
    this.points.frustumCulled = false;
    this.points.renderOrder = 10;
  }

  setScale(viewportHeightPx: number) { (this.points.material as THREE.ShaderMaterial).uniforms.scale.value = viewportHeightPx * 0.9; }

  spawn(p: THREE.Vector3, v: THREE.Vector3, color: THREE.ColorRepresentation, size: number, life: number, opts: { grow?: number; gravity?: number; drag?: number } = {}) {
    const i = this.next;
    this.next = (this.next + 1) % this.capacity;
    this.pos.set([p.x, p.y, p.z], i * 3);
    this.vel.set([v.x, v.y, v.z], i * 3);
    this.tmp.set(color);
    this.col.set([this.tmp.r, this.tmp.g, this.tmp.b], i * 3);
    this.size[i] = size;
    this.life[i] = life;
    this.maxLife[i] = life;
    this.grow[i] = opts.grow ?? -0.6;
    this.gravity[i] = opts.gravity ?? 0;
    this.drag[i] = opts.drag ?? 1.5;
    this.alpha[i] = 1;
  }

  /** A burst of `count` particles from a point. */
  burst(p: THREE.Vector3, count: number, colors: string[], speed: number, size: number, life: number, opts: { gravity?: number; up?: number; drag?: number } = {}) {
    const v = new THREE.Vector3();
    for (let k = 0; k < count; k++) {
      v.set(Math.random() - 0.5, Math.random() - 0.5 + (opts.up ?? 0), Math.random() - 0.5).normalize().multiplyScalar(speed * (0.4 + Math.random() * 0.8));
      this.spawn(p, v, colors[k % colors.length], size * (0.6 + Math.random() * 0.8), life * (0.6 + Math.random() * 0.7), { gravity: opts.gravity, drag: opts.drag });
    }
  }

  update(dt: number) {
    for (let i = 0; i < this.capacity; i++) {
      if (this.life[i] <= 0) { if (this.alpha[i] !== 0) { this.alpha[i] = 0; this.size[i] = 0; } continue; }
      this.life[i] -= dt;
      const k = Math.max(0, 1 - this.drag[i] * dt);
      this.vel[i * 3] *= k; this.vel[i * 3 + 1] = this.vel[i * 3 + 1] * k - this.gravity[i] * dt; this.vel[i * 3 + 2] *= k;
      this.pos[i * 3] += this.vel[i * 3] * dt; this.pos[i * 3 + 1] += this.vel[i * 3 + 1] * dt; this.pos[i * 3 + 2] += this.vel[i * 3 + 2] * dt;
      const t = this.life[i] / this.maxLife[i];
      this.alpha[i] = Math.min(1, t * 2.5);
      this.size[i] = Math.max(0, this.size[i] * (1 + this.grow[i] * dt));
    }
    const g = this.points.geometry;
    g.attributes.position.needsUpdate = true;
    g.attributes.color.needsUpdate = true;
    g.attributes.size.needsUpdate = true;
    g.attributes.alpha.needsUpdate = true;
  }
}

// MARK: Projectiles

/** One attack in flight: a group of motif pieces with a halo, spinning and trailing particles. */
export class Projectile {
  readonly group = new THREE.Group();
  private pieces: THREE.Object3D[] = [];
  private halo: THREE.Sprite;
  private age = 0;
  private trailTimer = 0;
  readonly position = new THREE.Vector3();

  constructor(readonly recipe: AttackRecipe, readonly kind: "basic" | "strong", private dir: 1 | -1, private particles: Particles, quality: number) {
    const r = recipe;
    const glassy = r.motif === "bubble" || r.motif === "shard" || r.motif === "snow";
    const strongScale = kind === "strong" ? (r.strong === "big" || r.strong === "meteor" ? 1.55 : 1.15) : 1;
    const count = kind === "strong" && r.strong === "barrage" ? r.count + 2 : kind === "strong" && (r.strong === "big" || r.strong === "meteor" || r.strong === "beam") ? 1 : r.count;
    for (let i = 0; i < count; i++) {
      const mesh = new THREE.Mesh(motifGeometry(r.motif), projectileMaterial(r.colors[i % 2 === 0 ? 0 : 1], glassy));
      const s = r.size * strongScale * (i === 0 ? 1 : 0.7);
      mesh.scale.setScalar(s);
      mesh.userData.offset = new THREE.Vector3((i === 0 ? 0 : -0.18 * i) * dir, Math.sin(i * 2.1) * 0.16 * (i ? 1 : 0), Math.cos(i * 1.7) * 0.16 * (i ? 1 : 0));
      this.group.add(mesh);
      this.pieces.push(mesh);
    }
    this.halo = new THREE.Sprite(new THREE.SpriteMaterial({ map: softDotTexture(), color: r.colors[0], transparent: true, opacity: 0.55, blending: THREE.AdditiveBlending, depthWrite: false }));
    this.halo.scale.setScalar(r.size * strongScale * 2.6);
    this.group.add(this.halo);
    if (kind === "strong" && r.strong === "beam") {
      const beam = new THREE.Mesh(new THREE.CylinderGeometry(r.size * 0.9, r.size * 1.2, 1, 12, 1, true).rotateZ(Math.PI / 2).translate(-0.5 * dir, 0, 0),
        new THREE.MeshBasicMaterial({ color: r.colors[0], transparent: true, opacity: 0.55, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }));
      beam.userData.beam = true;
      this.group.add(beam);
    }
    this.trailRate = quality;
  }
  private trailRate: number;

  setPosition(p: THREE.Vector3) { this.position.copy(p); this.group.position.copy(p); }

  update(dt: number, beamFrom?: THREE.Vector3) {
    this.age += dt;
    const r = this.recipe;
    for (const p of this.pieces) {
      const o = p.userData.offset as THREE.Vector3;
      p.position.set(o.x, o.y + Math.sin(this.age * 9 + o.z * 10) * r.wobble, o.z);
      p.rotation.x += r.spin * dt;
      p.rotation.z += r.spin * 0.6 * dt;
      if (r.motif === "bubble") p.scale.setScalar(p.scale.x * (1 + Math.sin(this.age * 12) * 0.01));
    }
    if (this.kind === "strong" && r.strong === "tornado") this.group.rotation.x += 10 * dt;
    this.halo.material.opacity = 0.45 + Math.sin(this.age * 20) * 0.15;
    for (const c of this.group.children) {
      if (c.userData.beam && beamFrom) {
        const len = Math.max(0.01, Math.abs(this.position.x - beamFrom.x));
        c.scale.set(len, 1 + Math.sin(this.age * 30) * 0.08, 1 + Math.sin(this.age * 30) * 0.08);
      }
    }
    // Trail.
    this.trailTimer -= dt;
    if (this.trailTimer <= 0) {
      this.trailTimer = (this.kind === "strong" ? 0.012 : 0.022) / Math.max(0.3, this.trailRate);
      const v = new THREE.Vector3(-this.dir * (0.3 + Math.random() * 0.5), (Math.random() - 0.5) * 0.6, (Math.random() - 0.5) * 0.6);
      const trailGravity = r.trail === "ember" ? -0.6 : r.trail === "leaf" || r.trail === "feather" || r.trail === "rock" ? 1.2 : r.trail === "bubble" ? -0.8 : 0;
      this.particles.spawn(this.position, v, r.colors[Math.random() < 0.5 ? 0 : 2], r.size * (this.kind === "strong" ? 2.2 : 1.3), 0.35 + Math.random() * 0.25, { gravity: trailGravity, grow: -1.2 });
    }
  }

  dispose() {
    this.group.removeFromParent();
    this.halo.material.dispose();
    for (const c of this.group.children) if (c.userData.beam) { (c as THREE.Mesh).geometry.dispose(); ((c as THREE.Mesh).material as THREE.Material).dispose(); }
  }
}

// MARK: Charge and impact effects

/** Phase 1: elemental particles gather into the attacker (more and longer for Strong). */
export function chargeEffect(particles: Particles, at: THREE.Vector3, recipe: AttackRecipe, strong: boolean, quality: number) {
  const n = Math.round((strong ? 46 : 14) * quality);
  const v = new THREE.Vector3(), p = new THREE.Vector3();
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2, r = strong ? 1.1 : 0.6;
    p.set(at.x + Math.cos(a) * r, at.y + Math.sin(a * 1.3) * r * 0.7, at.z + Math.sin(a) * r * 0.6);
    v.subVectors(at, p).multiplyScalar(strong ? 2.2 : 3);
    particles.spawn(p, v, recipe.colors[i % 3], recipe.size * (strong ? 2.4 : 1.6), strong ? 0.45 : 0.3, { drag: 0, grow: -0.5 });
  }
}

/** Phase 3: the elemental burst on the target. */
export function impactEffect(particles: Particles, at: THREE.Vector3, recipe: AttackRecipe, strong: boolean, quality: number) {
  const k = (strong ? 1.8 : 1) * quality;
  const c = recipe.colors;
  switch (recipe.impact) {
    case "splash": particles.burst(at, Math.round(36 * k), [c[0], c[2], "#ffffff"], 4.5, recipe.size * 2.2, 0.6, { gravity: 6, up: 0.6 }); break;
    case "shatter": particles.burst(at, Math.round(30 * k), [c[1], c[0], "#ffffff"], 6, recipe.size * 1.6, 0.55, { gravity: 4 }); break;
    case "ring": ringEffect(particles, at, c[0], strong ? 1.6 : 1, quality); particles.burst(at, Math.round(12 * k), [c[1]], 2, recipe.size * 2, 0.5); break;
    case "bloom": particles.burst(at, Math.round(28 * k), [c[1], c[2], c[0]], 3, recipe.size * 2.2, 0.9, { gravity: -0.4, drag: 2.5 }); break;
    case "pixels": particles.burst(at, Math.round(40 * k), [c[0], c[1], "#ffffff"], 5, recipe.size * 1.2, 0.5, { drag: 4 }); break;
    case "zap": particles.burst(at, Math.round(24 * k), [c[0], "#ffffff"], 8, recipe.size * 1.3, 0.3, { drag: 6 }); ringEffect(particles, at, c[0], 0.8, quality); break;
    default: particles.burst(at, Math.round(34 * k), [c[0], c[1], c[2], "#fff6d6"], 5.5, recipe.size * 2, 0.55, { gravity: 1, up: 0.2 });
  }
}

/** An expanding ring of particles (shockwaves, sound, clashes). */
export function ringEffect(particles: Particles, at: THREE.Vector3, color: string, radius: number, quality: number) {
  const n = Math.round(36 * quality);
  const v = new THREE.Vector3();
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2;
    v.set(0, Math.cos(a), Math.sin(a)).multiplyScalar(5 * radius);
    particles.spawn(at, v, color, 0.18, 0.35, { drag: 5, grow: 0.5 });
  }
}

/** A clash: sparks, a double shockwave and a white flash core. */
export function clashEffect(particles: Particles, at: THREE.Vector3, a: AttackRecipe, b: AttackRecipe, big: boolean, quality: number) {
  ringEffect(particles, at, "#ffffff", big ? 1.6 : 1, quality);
  ringEffect(particles, at, a.colors[0], big ? 1.1 : 0.7, quality);
  particles.burst(at, Math.round((big ? 60 : 30) * quality), [a.colors[0], b.colors[0], "#fff6d6"], big ? 8 : 6, 0.2, 0.5, { gravity: 2 });
  particles.spawn(at, new THREE.Vector3(), "#ffffff", big ? 2.6 : 1.6, 0.18, { grow: 3 });
}

/** Gentle sparkles rising (heals, revives, evolution auras). */
export function riseEffect(particles: Particles, at: THREE.Vector3, colors: string[], count: number, width: number, quality: number) {
  const p = new THREE.Vector3(), v = new THREE.Vector3();
  for (let i = 0; i < Math.round(count * quality); i++) {
    p.set(at.x + (Math.random() - 0.5) * width, at.y + Math.random() * 0.3, at.z + (Math.random() - 0.5) * width * 0.6);
    v.set((Math.random() - 0.5) * 0.3, 1.4 + Math.random() * 1.6, (Math.random() - 0.5) * 0.3);
    particles.spawn(p, v, colors[i % colors.length], 0.16 + Math.random() * 0.14, 0.9 + Math.random() * 0.6, { drag: 0.6, grow: -0.3 });
  }
}

// MARK: Physical Strike styles

export interface PhysicalRecipe { style: DashStyle; colors: [string, string, string]; speed: number; lean: number }

const physCache = new Map<string, PhysicalRecipe>();

/** Each species' own Physical Strike: how it dashes (tackle, claw swipe, spin, horn charge, pounce) and its colours. */
export function physicalFor(speciesID: string, data: GameData): PhysicalRecipe {
  const hit = physCache.get(speciesID);
  if (hit) return hit;
  const species = data.eco.get(speciesID);
  const h = hash(`${speciesID}|physical`);
  const style = dashStyle(species, speciesID);
  const look = species ? lookFor(species) : undefined;
  const r = (salt: number) => ((h >>> salt) & 255) / 255;
  const recipe: PhysicalRecipe = {
    style,
    colors: look ? [look.seam, look.main[2] ?? look.main[1], look.accent[2] ?? look.accent[1]] : [PALETTE.white, PALETTE.amber3, PALETTE.amber2],
    speed: 0.9 + r(3) * 0.3,
    lean: 0.2 + r(9) * 0.25,
  };
  physCache.set(speciesID, recipe);
  return recipe;
}

/** Slash arcs for claw strikes (three curved streaks of particles). */
export function slashEffect(particles: Particles, at: THREE.Vector3, colors: string[], dir: 1 | -1, quality: number) {
  const v = new THREE.Vector3(), p = new THREE.Vector3();
  for (let line = 0; line < 3; line++) {
    for (let i = 0; i < Math.round(12 * quality); i++) {
      const t = i / 11;
      const a = -0.9 + t * 1.8;
      p.set(at.x - dir * 0.1 + Math.cos(a) * 0.45 * dir, at.y + Math.sin(a) * 0.45 + (line - 1) * 0.18, at.z + 0.05);
      v.set(dir * 1.2, -0.8, 0);
      particles.spawn(p, v, colors[line % colors.length], 0.14, 0.35, { drag: 4, grow: -1 });
    }
  }
}

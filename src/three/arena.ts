import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
import { softDotTexture, softMaterial, type Quality } from "./materials";

/**
 * Battle arenas: a floating miniature diorama island per zone, in a cozy, soft, rounded style.
 * The island's top is at y = 0; the two fighters stand on it along x (partner left, enemy right)
 * with the centre lane kept clear. Props are merged per material; only a few things animate
 * (tree canopies, floating bits, glows, ambient particles).
 */

export interface Arena {
  root: THREE.Group;
  background: THREE.Color | THREE.Texture;
  fog: THREE.Fog;
  sun: THREE.DirectionalLight;
  lights: THREE.Light[];
  slots: { partner: THREE.Vector3; enemy: THREE.Vector3 };
  camera: { position: THREE.Vector3; target: THREE.Vector3; fov: number };
  update(dt: number, t: number): void;
  dispose(): void;
}

type ParticleKind = "pollen" | "snow" | "embers" | "bubbles" | "spores" | "data" | "stars" | "petals";

interface Theme {
  name: string;
  accent: string;
  skyDay: [string, string];
  skyNight: [string, string];
  /** Top surface and its rim. */
  top: string;
  rim: string;
  /** Soil layers, top to bottom. */
  soil: [string, string, string];
  particles: ParticleKind;
  props: (b: Builder, r: Rand, night: boolean) => void;
}

// MARK: Small helpers

type Rand = () => number;
function seeded(text: string): Rand {
  let h = 2166136261;
  for (const ch of text) h = Math.imul(h ^ ch.charCodeAt(0), 16777619);
  let a = h >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let x = Math.imul(a ^ (a >>> 15), 1 | a);
    x = (x + Math.imul(x ^ (x >>> 7), 61 | x)) ^ x;
    return ((x ^ (x >>> 14)) >>> 0) / 4294967296;
  };
}
const between = (r: Rand, a: number, b: number) => a + (b - a) * r();
const pick = <T,>(r: Rand, list: T[]) => list[Math.floor(r() * list.length)];

const tmp = new THREE.Object3D();
/** A geometry moved into place (position, scale, rotation). */
function at(geo: THREE.BufferGeometry, x: number, y: number, z: number, s: [number, number, number] | number = 1, rot: [number, number, number] = [0, 0, 0]): THREE.BufferGeometry {
  const sc = typeof s === "number" ? [s, s, s] : s;
  tmp.position.set(x, y, z);
  tmp.scale.set(sc[0], sc[1], sc[2]);
  tmp.rotation.set(rot[0], rot[1], rot[2]);
  tmp.updateMatrix();
  const g = geo.clone();
  g.applyMatrix4(tmp.matrix);
  return g;
}

/** Unifies a geometry for merging: non-indexed, position + normal only. */
function plain(geo: THREE.BufferGeometry): THREE.BufferGeometry {
  const g = geo.index ? geo.toNonIndexed() : geo;
  for (const name of Object.keys(g.attributes)) if (name !== "position" && name !== "normal") g.deleteAttribute(name);
  if (!g.attributes.normal) g.computeVertexNormals();
  return g;
}

// Base shapes (shared, cloned when placed).
const SPHERE = new THREE.SphereGeometry(1, 12, 9);
const LOW_SPHERE = new THREE.SphereGeometry(1, 10, 7);
const TINY = new THREE.SphereGeometry(1, 6, 4);
const BLADE = new THREE.ConeGeometry(1, 1, 4);
const STEM = new THREE.CylinderGeometry(1, 1, 1, 4, 1, true);
const ROCK = new THREE.IcosahedronGeometry(1, 1);
const CYL = new THREE.CylinderGeometry(1, 1, 1, 10);
const CONE = new THREE.ConeGeometry(1, 1, 10);
const OCTA = new THREE.OctahedronGeometry(1, 0);
const HEX = new THREE.CylinderGeometry(1, 1, 1, 6);
const BOX = new RoundedBoxGeometry(1, 1, 1, 2, 0.18);
const DISC = new THREE.CircleGeometry(1, 24).rotateX(-Math.PI / 2);
const HALF_TORUS = new THREE.TorusGeometry(1, 0.16, 8, 18, Math.PI);

/** Collects props: static ones merged per material, animated ones as their own meshes. */
class Builder {
  readonly root = new THREE.Group();
  readonly animators: ((dt: number, t: number) => void)[] = [];
  readonly disposables: { dispose(): void }[] = [];
  private batches = new Map<THREE.Material, THREE.BufferGeometry[]>();
  readonly lanterns: THREE.Vector3[] = [];

  constructor(readonly theme: Theme, readonly night: boolean, readonly quality: Quality) {}

  add(geo: THREE.BufferGeometry, mat: THREE.Material) {
    const list = this.batches.get(mat) ?? [];
    list.push(plain(geo));
    this.batches.set(mat, list);
  }

  soft(color: string, o: Parameters<typeof softMaterial>[1] = {}) { return softMaterial(color, o); }

  /** An animated mesh from several placed geometries (merged), inside a pivot group at (x, y, z). */
  animated(geos: THREE.BufferGeometry[], mat: THREE.Material, x: number, y: number, z: number, fn: (g: THREE.Group, dt: number, t: number) => void, shadows = true): THREE.Group {
    const merged = mergeGeometries(geos.map(plain))!;
    const mesh = new THREE.Mesh(merged, mat);
    mesh.castShadow = shadows && this.quality.shadows;
    mesh.receiveShadow = this.quality.shadows;
    const g = new THREE.Group();
    g.position.set(x, y, z);
    g.add(mesh);
    this.root.add(g);
    this.disposables.push(merged);
    this.animators.push((dt, t) => fn(g, dt, t));
    return g;
  }

  /** Merges the static batches into one mesh per material. */
  finish() {
    for (const [mat, geos] of this.batches) {
      const merged = mergeGeometries(geos)!;
      const mesh = new THREE.Mesh(merged, mat);
      const glowing = (mat as THREE.MeshBasicMaterial).isMeshBasicMaterial;
      mesh.castShadow = this.quality.shadows && !glowing;
      mesh.receiveShadow = this.quality.shadows && !glowing;
      this.root.add(mesh);
      this.disposables.push(merged);
    }
    this.batches.clear();
  }
}

// MARK: The island

const R = 3.5;

function island(b: Builder, t: Theme) {
  // Top cap: a soft rounded slab with a little overhang.
  // Listed outside-in so the lathe's normals face up and out.
  const cap = new THREE.LatheGeometry([
    new THREE.Vector2(R - 0.02, -0.28), new THREE.Vector2(R + 0.06, -0.2), new THREE.Vector2(R + 0.04, -0.1),
    new THREE.Vector2(R - 0.08, -0.03), new THREE.Vector2(R - 0.3, 0), new THREE.Vector2(R * 0.5, 0.02), new THREE.Vector2(0, 0.02),
  ], 56);
  b.add(cap, b.soft(t.top, { roughness: 0.8 }));
  // Soil: tapering layered rock with an uneven, hand-made edge, coloured by depth.
  const soil = new THREE.LatheGeometry([
    new THREE.Vector2(R - 0.02, -0.22), new THREE.Vector2(R - 0.1, -0.55), new THREE.Vector2(R - 0.45, -0.9),
    new THREE.Vector2(R - 1.0, -1.25), new THREE.Vector2(R - 1.8, -1.6), new THREE.Vector2(1.0, -1.95), new THREE.Vector2(0.25, -2.2), new THREE.Vector2(0, -2.25),
  ], 40);
  const pos = soil.attributes.position as THREE.BufferAttribute;
  const colors: number[] = [];
  const c = t.soil.map((x) => new THREE.Color(x));
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i), y = pos.getY(i), z = pos.getZ(i);
    const a = Math.atan2(z, x);
    const k = 1 + 0.06 * Math.sin(a * 7 + y * 3) + 0.04 * Math.sin(a * 13 - y * 5);
    if (y < -0.3) pos.setXYZ(i, x * k, y, z * k);
    const band = y > -0.7 ? 0 : y > -1.35 ? 1 : 2;
    const col = c[band].clone().lerp(new THREE.Color(0x000000), 0.04 * Math.sin(a * 5) + 0.04);
    colors.push(col.r, col.g, col.b);
  }
  soil.setAttribute("color", new THREE.Float32BufferAttribute(colors, 3));
  soil.computeVertexNormals();
  const soilMat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.95 });
  const soilMesh = new THREE.Mesh(soil, soilMat);
  soilMesh.receiveShadow = b.quality.shadows;
  b.root.add(soilMesh);
  b.disposables.push(soil, soilMat);
  // Rim tufts / drips hanging over the edge.
  const rimMat = b.soft(t.rim, { roughness: 0.85 });
  for (let i = 0; i < 34; i++) {
    const a = (i / 34) * Math.PI * 2 + 0.05 * Math.sin(i * 3.1);
    const s = 0.07 + 0.035 * ((i * 7) % 3);
    b.add(at(LOW_SPHERE, Math.cos(a) * (R + 0.03), -0.22 - s * 0.3, Math.sin(a) * (R + 0.03), [s * 1.5, s, s * 1.5]), rimMat);
  }
}

// MARK: Prop shapes

/** Where props may go: the back half, the sides, and small things at the front rim. Not the fighters' lane. */
function spot(r: Rand, where: "back" | "side" | "front" | "any" = "any"): [number, number] {
  for (let i = 0; i < 40; i++) {
    const a = r() * Math.PI * 2;
    const d = Math.sqrt(between(r, 0.15, 1)) * (R - 0.45);
    const x = Math.cos(a) * d, z = Math.sin(a) * d;
    const lane = Math.abs(x) < 2.6 && z > -0.95 && z < 1.55;
    if (lane) continue;
    if (where === "back" && z > -0.9) continue;
    if (where === "side" && Math.abs(x) < 2.5) continue;
    if (where === "front" && z < 1.6) continue;
    return [x, z];
  }
  return [0, -2.5];
}

function tree(b: Builder, r: Rand, x: number, z: number, s: number, leaf: string, trunk: string, shape: "round" | "pine" | "acacia" | "palm" = "round") {
  const trunkMat = b.soft(trunk, { roughness: 0.9 });
  const leafMat = b.soft(leaf, { roughness: 0.75, rim: 0.45 });
  const h = s * (shape === "palm" ? 1.5 : shape === "acacia" ? 1.0 : 0.8);
  b.add(at(CYL, x, h / 2, z, [0.09 * s, h, 0.09 * s], shape === "palm" ? [0, 0, 0.12] : [0, 0, 0]), trunkMat);
  const geos: THREE.BufferGeometry[] = [];
  if (shape === "round") {
    geos.push(at(SPHERE, 0, 0, 0, 0.55 * s), at(SPHERE, 0.35 * s, -0.12 * s, 0.1 * s, 0.4 * s), at(SPHERE, -0.32 * s, -0.08 * s, -0.1 * s, 0.42 * s), at(SPHERE, 0, 0.32 * s, -0.05 * s, 0.38 * s));
  } else if (shape === "pine") {
    for (let i = 0; i < 3; i++) geos.push(at(CONE, 0, i * 0.38 * s, 0, [0.55 * s * (1 - i * 0.25), 0.6 * s, 0.55 * s * (1 - i * 0.25)]));
  } else if (shape === "acacia") {
    geos.push(at(SPHERE, 0, 0, 0, [0.85 * s, 0.22 * s, 0.6 * s]), at(SPHERE, 0.3 * s, 0.08 * s, 0, [0.5 * s, 0.18 * s, 0.4 * s]));
  } else {
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2;
      geos.push(at(SPHERE, Math.cos(a) * 0.35 * s, -0.08 * s, Math.sin(a) * 0.35 * s, [0.42 * s, 0.07 * s, 0.14 * s], [0, -a, -0.35]));
    }
  }
  const phase = r() * 6;
  b.animated(geos, leafMat, x + (shape === "palm" ? 0.1 * s : 0), h + (shape === "pine" ? 0.1 * s : 0.15 * s), z, (g, _dt, t) => {
    g.rotation.z = 0.03 * Math.sin(t * 0.9 + phase);
    g.rotation.x = 0.02 * Math.sin(t * 0.7 + phase * 1.3);
  });
}

function rock(b: Builder, x: number, z: number, s: number, color: string, flat = 0.65) {
  b.add(at(ROCK, x, s * flat * 0.45, z, [s, s * flat, s * 0.9], [0, x * 3, 0]), b.soft(color, { roughness: 0.9 }));
}

function flowers(b: Builder, r: Rand, n: number, colors: string[], where: "any" | "front" = "any") {
  const stem = b.soft("#5fae5a");
  for (let i = 0; i < n; i++) {
    const [x, z] = where === "front" ? spot(r, "front") : spot(r);
    const h = between(r, 0.12, 0.22);
    b.add(at(STEM, x, h / 2, z, [0.015, h, 0.015]), stem);
    b.add(at(TINY, x, h, z, 0.06), b.soft(pick(r, colors), { rim: 0.5 }));
  }
}

function grass(b: Builder, r: Rand, n: number, color: string) {
  const m = b.soft(color, { roughness: 0.85 });
  for (let i = 0; i < n; i++) {
    const [x, z] = spot(r);
    for (let k = 0; k < 3; k++) b.add(at(BLADE, x + (k - 1) * 0.05, 0.09, z + (k % 2) * 0.04, [0.035, 0.2 + k * 0.04, 0.035], [0.15 * (k - 1), 0, 0.2 * (k - 1)]), m);
  }
}

function mushroom(b: Builder, x: number, z: number, s: number, cap: string) {
  b.add(at(CYL, x, 0.12 * s, z, [0.06 * s, 0.24 * s, 0.06 * s]), b.soft("#fff1d6"));
  b.add(at(SPHERE, x, 0.25 * s, z, [0.18 * s, 0.11 * s, 0.18 * s]), b.soft(cap, { rim: 0.5 }));
  b.add(at(LOW_SPHERE, x + 0.07 * s, 0.31 * s, z + 0.05 * s, 0.03 * s), b.soft("#fffaf0"));
}

function crystal(b: Builder, r: Rand, x: number, z: number, s: number, color: string) {
  const mat = b.soft(color, { roughness: 0.25, emissive: color, emissiveIntensity: 0.55, rim: 0.7 });
  for (let i = 0; i < 3; i++) {
    const h = s * (1 - i * 0.25);
    b.add(at(OCTA, x + (i - 1) * 0.16 * s, h * 0.55, z + (i % 2) * 0.1 * s, [0.16 * s, h * 0.7, 0.16 * s], [0.25 * (i - 1), r() * 2, 0.2 * (i - 1)]), mat);
  }
  // A soft twinkling halo (its own material, so it can pulse).
  const halo = haloSprite(b, color, 0.9 * s);
  halo.position.set(x, s * 0.55, z);
  const phase = r() * 6;
  b.animators.push((_dt, t) => { (halo.material as THREE.SpriteMaterial).opacity = 0.35 + 0.25 * Math.sin(t * 2.2 + phase); });
}

function haloSprite(b: Builder, color: string, size: number): THREE.Sprite {
  let map: THREE.Texture | undefined;
  try { map = softDotTexture(); } catch { map = undefined; }
  const mat = new THREE.SpriteMaterial({ ...(map ? { map } : {}), color, transparent: true, opacity: 0.45, depthWrite: false, blending: THREE.AdditiveBlending });
  const sprite = new THREE.Sprite(mat);
  sprite.scale.setScalar(size);
  b.root.add(sprite);
  b.disposables.push(mat);
  return sprite;
}

function pillar(b: Builder, x: number, z: number, h: number, color: string, broken = false) {
  const m = b.soft(color, { roughness: 0.85 });
  b.add(at(CYL, x, 0.06, z, [0.32, 0.12, 0.32]), m);
  b.add(at(CYL, x, h / 2 + 0.1, z, [0.22, h, 0.22]), m);
  if (!broken) b.add(at(BOX, x, h + 0.18, z, [0.6, 0.14, 0.6]), m);
  else b.add(at(ROCK, x + 0.35, 0.1, z + 0.2, [0.22, 0.14, 0.2]), m);
}

function arch(b: Builder, x: number, z: number, s: number, color: string, ry = 0) {
  const m = b.soft(color, { roughness: 0.85 });
  const c = Math.cos(ry), sn = Math.sin(ry);
  for (const side of [-1, 1]) b.add(at(BOX, x + side * 0.55 * s * c, 0.45 * s, z - side * 0.55 * s * sn, [0.24 * s, 0.9 * s, 0.24 * s], [0, ry, 0]), m);
  b.add(at(HALF_TORUS, x, 0.9 * s, z, [0.55 * s, 0.55 * s, 0.9 * s], [0, ry, 0]), m);
}

function cactus(b: Builder, x: number, z: number, s: number) {
  const m = b.soft("#58b36a", { rim: 0.4 });
  b.add(at(SPHERE, x, 0.45 * s, z, [0.16 * s, 0.5 * s, 0.16 * s]), m);
  b.add(at(SPHERE, x + 0.2 * s, 0.5 * s, z, [0.07 * s, 0.18 * s, 0.07 * s], [0, 0, -0.3]), m);
  b.add(at(SPHERE, x - 0.18 * s, 0.38 * s, z, [0.06 * s, 0.14 * s, 0.06 * s], [0, 0, 0.3]), m);
  b.add(at(LOW_SPHERE, x, 0.95 * s, z, 0.05 * s), b.soft("#ff9bc0"));
}

function spike(b: Builder, x: number, z: number, h: number, color: string) {
  b.add(at(CONE, x, h / 2, z, [0.18 * h, h, 0.18 * h], [0.1, 0, 0.08]), b.soft(color, { roughness: 0.2, rim: 0.8, emissive: color, emissiveIntensity: 0.12 }));
}

function mound(b: Builder, x: number, z: number, s: number, color: string) {
  b.add(at(SPHERE, x, 0, z, [s, s * 0.45, s * 0.85]), b.soft(color, { roughness: 0.9, rim: 0.5 }));
}

function pool(b: Builder, x: number, z: number, s: number, color: string, glow = false) {
  const mat = glow ? new THREE.MeshBasicMaterial({ color, toneMapped: false }) : b.soft(color, { roughness: 0.15, rim: 0.6 });
  if (glow) b.disposables.push(mat);
  b.add(at(DISC, x, 0.045, z, [s, 1, s * 0.75]), mat);
  for (let i = 0; i < 7; i++) {
    const a = (i / 7) * Math.PI * 2;
    rock(b, x + Math.cos(a) * s * 1.02, z + Math.sin(a) * s * 0.78, 0.11, "#7d7590");
  }
}

function coral(b: Builder, r: Rand, x: number, z: number, s: number, color: string) {
  const m = b.soft(color, { rim: 0.6 });
  for (let i = 0; i < 5; i++) {
    const a = r() * Math.PI * 2, tilt = between(r, 0.15, 0.5);
    const h = s * between(r, 0.3, 0.6);
    b.add(at(CYL, x + Math.cos(a) * 0.05, h / 2, z + Math.sin(a) * 0.05, [0.04 * s, h, 0.04 * s], [Math.sin(a) * tilt, 0, Math.cos(a) * tilt]), m);
    b.add(at(LOW_SPHERE, x + Math.cos(a) * tilt * h * 0.9, h, z - Math.sin(a) * tilt * h * 0.9, 0.06 * s), m);
  }
}

function shell(b: Builder, x: number, z: number, color: string) {
  b.add(at(SPHERE, x, 0.02, z, [0.12, 0.08, 0.1], [0, x, 0]), b.soft(color, { rim: 0.6 }));
}

function house(b: Builder, r: Rand, x: number, z: number, s: number, wall: string, roof: string) {
  const h = s * between(r, 0.8, 1.4);
  b.add(at(BOX, x, h / 2, z, [0.8 * s, h, 0.7 * s]), b.soft(wall));
  b.add(at(CONE, x, h + 0.25 * s, z, [0.62 * s, 0.5 * s, 0.62 * s], [0, Math.PI / 4, 0]), b.soft(roof));
  const win = b.soft(b.night ? "#ffd27a" : "#bfe6ff", { emissive: b.night ? "#ffb347" : "#000000", emissiveIntensity: b.night ? 1.2 : 0, roughness: 0.3 });
  for (let i = 0; i < 2; i++) for (let k = 0; k < Math.max(1, Math.floor(h / (0.45 * s))); k++) {
    b.add(at(BOX, x - 0.18 * s + i * 0.36 * s, 0.3 * s + k * 0.42 * s, z + 0.355 * s, [0.16 * s, 0.2 * s, 0.03]), win);
  }
  if (b.night && r() < 0.5) b.lanterns.push(new THREE.Vector3(x, h * 0.6, z + 0.6 * s));
}

function lamp(b: Builder, x: number, z: number) {
  b.add(at(CYL, x, 0.4, z, [0.025, 0.8, 0.025]), b.soft("#4b4466"));
  b.add(at(LOW_SPHERE, x, 0.83, z, 0.08), b.night ? b.soft("#ffd27a", { emissive: "#ffb347", emissiveIntensity: 1.5 }) : b.soft("#fff1c9", { emissive: "#ffe2a0", emissiveIntensity: 0.2 }));
  if (b.night) b.lanterns.push(new THREE.Vector3(x, 0.85, z));
}

function hive(b: Builder, r: Rand, x: number, z: number, s: number) {
  const m = b.soft("#ffb13b", { rim: 0.5 });
  const glow = b.soft("#ffe27a", { emissive: "#ffb13b", emissiveIntensity: 0.6 });
  for (let i = 0; i < 7; i++) {
    const a = (i / 6) * Math.PI * 2;
    const cx = i === 6 ? x : x + Math.cos(a) * 0.3 * s, cz = i === 6 ? z : z + Math.sin(a) * 0.3 * s;
    const h = s * between(r, 0.3, 0.8);
    b.add(at(HEX, cx, h / 2, cz, [0.16 * s, h, 0.16 * s]), m);
    b.add(at(HEX, cx, h + 0.005, cz, [0.11 * s, 0.02, 0.11 * s]), glow);
  }
}

function roots(b: Builder, r: Rand, n: number, color: string) {
  const m = b.soft(color, { roughness: 0.9 });
  for (let i = 0; i < n; i++) {
    const a = r() * Math.PI * 2;
    const pts = [0, 1, 2, 3].map((k) => new THREE.Vector3(Math.cos(a) * (0.6 + k * 0.85) - 0.0, 0.08 * Math.sin(k * 2 + i), -2.2 + Math.sin(a) * (0.3 + k * 0.5) * 0.6));
    const tube = new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 16, 0.09 - i * 0.004, 6);
    b.add(tube, m);
  }
}

function gear(b: Builder, r: Rand, x: number, y: number, z: number, s: number, color: string, upright = true) {
  const geos = [at(new THREE.TorusGeometry(0.32, 0.1, 6, 18), 0, 0, 0, s)];
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    geos.push(at(BOX, Math.cos(a) * 0.44 * s, Math.sin(a) * 0.44 * s, 0, [0.14 * s, 0.14 * s, 0.14 * s], [0, 0, a]));
  }
  geos.push(at(CYL, 0, 0, 0, [0.1 * s, 0.16 * s, 0.1 * s], [Math.PI / 2, 0, 0]));
  const dir = r() < 0.5 ? 1 : -1;
  b.animated(geos, b.soft(color, { roughness: 0.4, rim: 0.5 }), x, y, z, (g, dt) => { g.rotation.z += dt * 0.5 * dir; }).rotation.set(upright ? 0 : -Math.PI / 2, r(), 0);
}

function dataCube(b: Builder, r: Rand, x: number, y: number, z: number, s: number, color: string) {
  const phase = r() * 6;
  b.animated([at(BOX, 0, 0, 0, s)], b.soft(color, { emissive: color, emissiveIntensity: 0.45, roughness: 0.3, rim: 0.6 }), x, y, z, (g, _dt, t) => {
    g.position.y = y + 0.12 * Math.sin(t * 1.1 + phase);
    g.rotation.y = t * 0.5 + phase;
    g.rotation.x = 0.4 + 0.2 * Math.sin(t * 0.7 + phase);
  }, false);
}

function cloud(b: Builder, r: Rand, x: number, y: number, z: number, s: number, color = "#ffffff") {
  const geos = [at(SPHERE, 0, 0, 0, [0.7 * s, 0.4 * s, 0.5 * s]), at(SPHERE, 0.5 * s, -0.05 * s, 0, [0.5 * s, 0.32 * s, 0.4 * s]), at(SPHERE, -0.5 * s, -0.08 * s, 0, [0.45 * s, 0.28 * s, 0.38 * s]), at(SPHERE, 0.1 * s, 0.22 * s, 0, [0.4 * s, 0.3 * s, 0.35 * s])];
  const phase = r() * 6;
  b.animated(geos, b.soft(color, { roughness: 1, rim: 0.6, wrap: 0.8 }), x, y, z, (g, _dt, t) => { g.position.x = x + 0.15 * Math.sin(t * 0.15 + phase); }, false);
}

/** A little floating islet in the background, bobbing. */
function islet(b: Builder, r: Rand, x: number, y: number, z: number, s: number, top: string, soil: string, withTree?: [string, string, "round" | "pine" | "palm"]) {
  const geosTop = [at(new THREE.CylinderGeometry(1, 0.95, 0.18, 14), 0, 0, 0, [s, 1, s])];
  const geosSoil = [at(CONE, 0, -0.5 * s, 0, [0.95 * s, 1.0 * s, 0.95 * s], [Math.PI, 0, 0])];
  const phase = r() * 6;
  const move = (g: THREE.Group, _dt: number, t: number) => { g.position.y = y + 0.08 * Math.sin(t * 0.6 + phase); };
  b.animated(geosTop, b.soft(top), x, y, z, move, false);
  b.animated(geosSoil, b.soft(soil, { roughness: 0.95 }), x, y, z, move, false);
  if (withTree) {
    const [leaf, trunk, shape] = withTree;
    const geos = [at(CYL, 0, 0.35 * s, 0, [0.06 * s, 0.7 * s, 0.06 * s])];
    if (shape === "pine") for (let i = 0; i < 2; i++) geos.push(at(CONE, 0, (0.75 + i * 0.3) * s, 0, [0.4 * s * (1 - i * 0.3), 0.5 * s, 0.4 * s * (1 - i * 0.3)]));
    else geos.push(at(SPHERE, 0, 0.85 * s, 0, 0.4 * s));
    b.animated(geos.slice(0, 1), b.soft(trunk), x, y, z, move, false);
    b.animated(geos.slice(1), b.soft(leaf), x, y, z, move, false);
  }
}

/** Calm water around the island, out to the horizon (sea zones). */
function water(b: Builder, color: string) {
  const mat = new THREE.MeshStandardMaterial({ color, roughness: 0.15, metalness: 0, transparent: true, opacity: 0.88 });
  b.disposables.push(mat);
  const geo = new THREE.RingGeometry(R - 0.6, 40, 64, 1).rotateX(-Math.PI / 2);
  b.disposables.push(geo);
  const mesh = new THREE.Mesh(geo, mat);
  mesh.position.y = -0.5;
  mesh.receiveShadow = b.quality.shadows;
  b.root.add(mesh);
  // Foam ring hugging the island.
  const foam = new THREE.Mesh(new THREE.TorusGeometry(R - 0.05, 0.06, 6, 64).rotateX(Math.PI / 2), b.soft("#ffffff", { rim: 0.6 }));
  foam.position.y = -0.48;
  b.root.add(foam);
  b.disposables.push(foam.geometry);
  b.animators.push((_dt, t) => { mesh.position.y = -0.5 + 0.025 * Math.sin(t * 0.8); foam.position.y = mesh.position.y + 0.02; foam.scale.setScalar(1 + 0.008 * Math.sin(t * 1.3)); });
}

/** Big background shapes (mountains, a volcano, a tower) far behind the island. */
function backdropCone(b: Builder, x: number, z: number, h: number, w: number, color: string, cap?: string) {
  b.add(at(CONE, x, h / 2 - 1.5, z, [w, h, w * 0.7]), b.soft(color, { roughness: 1, wrap: 0.8 }));
  if (cap) b.add(at(CONE, x, h - 1.5 - h * 0.12, z, [w * 0.27, h * 0.25, w * 0.19]), b.soft(cap, { roughness: 1 }));
}

// MARK: Themes

const T = (t: Theme) => t;

const THEMES: Record<string, Theme> = {
  "parque-arranque": T({
    name: "Prado", accent: "#7fcb5a", skyDay: ["#8fd3ff", "#fff1c9"], skyNight: ["#1d2b6b", "#5a4a8a"],
    top: "#8fd16a", rim: "#6fb65a", soil: ["#c88a5a", "#a86c48", "#7d5040"], particles: "pollen",
    props: (b, r) => {
      tree(b, r, -2.6, -1.9, 1.15, "#7fcb5a", "#8c5a3c");
      tree(b, r, 2.3, -2.3, 1.35, "#9ad66b", "#8c5a3c");
      tree(b, r, 0.2, -2.9, 0.9, "#6fbf62", "#8c5a3c");
      rock(b, 2.9, -0.9, 0.35, "#b9b3cc"); rock(b, -2.9, 0.2, 0.28, "#b9b3cc");
      mushroom(b, -1.6, -2.4, 1, "#ff8a5c"); mushroom(b, 3.0, 1.2, 0.8, "#ff9bc0");
      grass(b, r, 26, "#6fb65a");
      flowers(b, r, 26, ["#ff9bc0", "#ffe27a", "#ffffff", "#b4dcff"]);
      flowers(b, r, 8, ["#ff9bc0", "#ffe27a"], "front");
    },
  }),
  "bosque-cache": T({
    name: "Bosque", accent: "#3c8c4e", skyDay: ["#9fd8c8", "#f3f7d0"], skyNight: ["#16294d", "#2f4a5e"],
    top: "#6aa85a", rim: "#4e8c4a", soil: ["#8a6040", "#6a4a36", "#4a3428"], particles: "spores",
    props: (b, r) => {
      for (const [x, z, s] of [[-2.7, -1.6, 1.3], [-1.3, -2.7, 1.5], [0.6, -2.9, 1.2], [2.0, -2.4, 1.45], [3.0, -1.0, 1.0]] as const) tree(b, r, x, z, s, pick(r, ["#3c8c4e", "#4fa35a", "#2f7a48"]), "#6b4430", r() < 0.4 ? "pine" : "round");
      b.add(at(CYL, -2.8, 0.15, 1.6, [0.16, 1.1, 0.16], [0, 0.4, Math.PI / 2]), b.soft("#8c5a3c"));
      for (let i = 0; i < 6; i++) { const [x, z] = spot(r); mushroom(b, x, z, between(r, 0.6, 1.1), pick(r, ["#e04a3f", "#ff8a5c", "#ffb13b"])); }
      grass(b, r, 22, "#4e8c4a");
      flowers(b, r, 10, ["#b4dcff", "#ffffff"]);
    },
  }),
  "isla-firmware": T({
    name: "Playa", accent: "#4fe3e0", skyDay: ["#6fc9ff", "#fff6d6"], skyNight: ["#1d2b6b", "#3d5a8a"],
    top: "#f4dca6", rim: "#e8c886", soil: ["#d4a46a", "#b4844e", "#8c6440"], particles: "pollen",
    props: (b, r) => {
      tree(b, r, -2.5, -2.1, 1.3, "#3fae6a", "#a6764a", "palm");
      tree(b, r, 2.7, -1.6, 1.1, "#4fbf72", "#a6764a", "palm");
      pool(b, 1.0, -2.4, 0.7, "#4fe3e0");
      water(b, "#4fc8e0");
      for (let i = 0; i < 6; i++) { const [x, z] = spot(r); shell(b, x, z, pick(r, ["#ff9bc0", "#fff6d6", "#ffb13b"])); }
      rock(b, -3.0, 0.9, 0.3, "#c9c3d9"); rock(b, 0.0, -3.0, 0.35, "#c9c3d9");
      flowers(b, r, 6, ["#ff9bc0", "#ffe27a"]);
    },
  }),
  "desierto-servidor": T({
    name: "Desierto", accent: "#ffb13b", skyDay: ["#ffc98a", "#fff1c9"], skyNight: ["#3d1e5e", "#8a4b5a"],
    top: "#f2c78a", rim: "#e0a866", soil: ["#d08a4e", "#b0703e", "#8a5232"], particles: "pollen",
    props: (b, r) => {
      cactus(b, -2.6, -1.7, 1.2); cactus(b, 2.8, -1.2, 0.9); cactus(b, 1.0, -2.8, 1.0);
      mound(b, -1.0, -2.8, 1.0, "#f6d39a"); mound(b, 3.0, 0.6, 0.6, "#f6d39a");
      b.add(at(BOX, -2.9, 0.3, 0.8, [0.5, 0.6, 0.45], [0, 0.3, 0.05]), b.soft("#9a93b8"));
      b.add(at(BOX, -2.9, 0.35, 0.8, [0.36, 0.06, 0.47], [0, 0.3, 0.05]), b.soft("#4fe3e0", { emissive: "#4fe3e0", emissiveIntensity: 0.6 }));
      rock(b, 2.2, -2.4, 0.35, "#d6a874");
      flowers(b, r, 4, ["#ff9bc0"]);
    },
  }),
  "sabana-engranaje": T({
    name: "Sabana", accent: "#e08a1e", skyDay: ["#ffcf8a", "#fff6d6"], skyNight: ["#2a2050", "#7a4a50"],
    top: "#d9c26a", rim: "#bfa652", soil: ["#b97e4e", "#956040", "#6e4632"], particles: "pollen",
    props: (b, r) => {
      tree(b, r, -2.5, -2.0, 1.4, "#8fb85a", "#7a5034", "acacia");
      tree(b, r, 2.4, -2.5, 1.2, "#9ac262", "#7a5034", "acacia");
      gear(b, r, 0.4, 0.7, -2.9, 1.3, "#c9a24a");
      gear(b, r, 3.0, 0.38, -0.6, 0.7, "#b4b0c8");
      grass(b, r, 34, "#c9b05a");
      rock(b, -3.0, 0.9, 0.3, "#c9a982");
    },
  }),
  "pantano-latencia": T({
    name: "Pantano", accent: "#3c8c4e", skyDay: ["#a6c9a0", "#e7efc9"], skyNight: ["#13263a", "#2e4a46"],
    top: "#7a9a5a", rim: "#5e7e48", soil: ["#6e5a40", "#55452f", "#3d3224"], particles: "spores",
    props: (b, r) => {
      pool(b, -1.2, -2.3, 1.0, "#4b7a6a");
      for (let i = 0; i < 4; i++) b.add(at(DISC, -1.6 + i * 0.35, 0.06, -2.2 + (i % 2) * 0.3, [0.14, 1, 0.12]), b.soft("#7fcb5a"));
      for (let i = 0; i < 9; i++) { const x = -2.2 + r() * 0.9, z = -2.9 + r() * 0.6; b.add(at(CYL, x, 0.25, z, [0.02, 0.5 + r() * 0.3, 0.02], [0.1 * (r() - 0.5), 0, 0.15 * (r() - 0.5)]), b.soft("#5e8a48")); }
      tree(b, r, 2.4, -2.3, 1.3, "#5e8a5a", "#5a4430");
      for (let i = 0; i < 5; i++) { const [x, z] = spot(r); mushroom(b, x, z, between(r, 0.6, 1.0), pick(r, ["#e04fd0", "#b4dcff", "#ff9bc0"])); }
      rock(b, 3.0, 0.5, 0.32, "#8a8aa0");
    },
  }),
  "ciudad-pixel": T({
    name: "Ciudad", accent: "#5a9bff", skyDay: ["#9cc8ff", "#ffe7d6"], skyNight: ["#141c4a", "#3d2e6b"],
    top: "#c9c3d9", rim: "#a9a2c0", soil: ["#8c7aa0", "#6b5e86", "#4a3f66"], particles: "pollen",
    props: (b, r) => {
      house(b, r, -2.5, -1.9, 0.9, "#ffe0c2", "#e04a3f");
      house(b, r, -1.1, -2.7, 1.0, "#d8ecff", "#5a9bff");
      house(b, r, 0.6, -2.85, 0.85, "#ffe6f0", "#e04fd0");
      house(b, r, 2.2, -2.3, 1.05, "#f4f1ff", "#4fbf72");
      lamp(b, -3.0, 0.7); lamp(b, 3.0, 0.9);
      tree(b, r, 3.1, -0.9, 0.7, "#7fcb5a", "#8c5a3c");
      flowers(b, r, 10, ["#ff9bc0", "#ffe27a"]);
    },
  }),
  "cumbres-ancho-de-banda": T({
    name: "Cumbres", accent: "#b4dcff", skyDay: ["#8ec5ff", "#f4f1ff"], skyNight: ["#141c4a", "#3a4a7a"],
    top: "#9ccf8a", rim: "#e8f0ff", soil: ["#9a93b8", "#7a7298", "#5a5478"], particles: "pollen",
    props: (b, r) => {
      backdropCone(b, -6, -13, 7, 3.8, "#6f7fc0", "#ffffff");
      backdropCone(b, 0.5, -16, 10, 5, "#5f6fb4", "#ffffff");
      backdropCone(b, 6.5, -13.5, 6.5, 3.6, "#7a88c8", "#ffffff");
      tree(b, r, -2.6, -1.8, 1.2, "#3c8c6e", "#6b4430", "pine");
      tree(b, r, 2.5, -2.2, 1.4, "#3c8c6e", "#6b4430", "pine");
      rock(b, 0.4, -2.8, 0.5, "#c9c3d9"); rock(b, 3.0, 0.6, 0.3, "#c9c3d9");
      mound(b, -2.9, 0.8, 0.45, "#f4f8ff");
      flowers(b, r, 8, ["#b4dcff", "#ffffff", "#ff9bc0"]);
    },
  }),
  "mar-de-paquetes": T({
    name: "Mar", accent: "#4fe3e0", skyDay: ["#5fc0ff", "#e6fbff"], skyNight: ["#0f1f4d", "#1f5a7a"],
    top: "#f0dcb0", rim: "#dcc28e", soil: ["#c99a6a", "#a07650", "#7a5a40"], particles: "bubbles",
    props: (b, r) => {
      coral(b, r, -2.6, -1.8, 1.3, "#ff8a5c"); coral(b, r, -1.2, -2.8, 1.0, "#ff9bc0"); coral(b, r, 2.5, -2.2, 1.2, "#e04fd0");
      for (let i = 0; i < 7; i++) { const [x, z] = spot(r); shell(b, x, z, pick(r, ["#ff9bc0", "#fff6d6", "#b4dcff"])); }
      rock(b, 3.0, 0.4, 0.34, "#7fb8c8"); rock(b, 0.6, -3.0, 0.3, "#7fb8c8");
      dataCube(b, r, -3.6, 1.6, -2.0, 0.22, "#4fe3e0");
      water(b, "#3fb8e0");
    },
  }),
  "ruinas-legado": T({
    name: "Ruinas", accent: "#ffe27a", skyDay: ["#ffd9a6", "#fff6e6"], skyNight: ["#22184a", "#5a3e6a"],
    top: "#a6c27a", rim: "#86a562", soil: ["#a89a86", "#867a6a", "#665c50"], particles: "pollen",
    props: (b, r) => {
      pillar(b, -2.6, -1.7, 1.4, "#e8dcc6"); pillar(b, 2.5, -2.0, 1.1, "#e8dcc6", true);
      arch(b, 0.0, -2.75, 1.3, "#d9ccb4");
      pillar(b, -1.2, -2.8, 0.7, "#e8dcc6", true);
      rock(b, 3.0, 0.6, 0.3, "#d9ccb4"); rock(b, -3.0, 0.7, 0.25, "#d9ccb4");
      grass(b, r, 18, "#7fa85a");
      flowers(b, r, 10, ["#ffe27a", "#ffffff"]);
    },
  }),
  "glaciar-criptografico": T({
    name: "Glaciar", accent: "#b4dcff", skyDay: ["#a6d6ff", "#f4fbff"], skyNight: ["#0f1a44", "#2a4a7a"],
    top: "#f4f8ff", rim: "#dfeaff", soil: ["#a9c6e6", "#7fa0cc", "#5a78a8"], particles: "snow",
    props: (b, r) => {
      spike(b, -2.6, -1.8, 1.4, "#b4dcff"); spike(b, -2.2, -2.3, 0.9, "#cfe8ff");
      spike(b, 2.4, -2.2, 1.6, "#b4dcff"); spike(b, 2.9, -1.4, 0.8, "#cfe8ff");
      crystal(b, r, 0.4, -2.8, 1.0, "#5a9bff");
      mound(b, -3.0, 0.7, 0.5, "#ffffff"); mound(b, 3.0, 0.8, 0.45, "#ffffff"); mound(b, -0.8, -2.9, 0.6, "#ffffff");
      tree(b, r, 1.6, -2.9, 0.9, "#e8f4ff", "#6b4430", "pine");
    },
  }),
  "volcan-compilador": T({
    name: "Volcán", accent: "#ff8a5c", skyDay: ["#ff9a6a", "#ffe0b0"], skyNight: ["#2a0f2e", "#7a2a3a"],
    top: "#6e5a66", rim: "#584656", soil: ["#5a4250", "#45323e", "#30222c"], particles: "embers",
    props: (b, r) => {
      backdropCone(b, 1.5, -15, 9, 5.5, "#4a3040");
      backdropCone(b, -6, -13, 5, 3.5, "#5a3a4a");
      const lava = new THREE.MeshBasicMaterial({ color: "#ffb13b", toneMapped: false });
      b.disposables.push(lava);
      b.add(at(DISC, 1.5, 7.48, -15, [1.25, 1, 0.9]), lava);
      b.add(at(CONE, 1.9, 6.2, -14.2, [0.35, 2.4, 0.15], [Math.PI, 0, 0.12]), lava);
      pool(b, -2.2, -2.2, 0.75, "#ff8a3c", true); pool(b, 2.6, -1.4, 0.5, "#ff6a3c", true);
      b.lanterns.push(new THREE.Vector3(-2.2, 0.4, -2.2));
      rock(b, 0.5, -2.8, 0.5, "#8a7080"); rock(b, 3.0, 0.6, 0.35, "#8a7080"); rock(b, -3.0, 0.7, 0.3, "#8a7080");
      crystal(b, r, 1.6, -2.7, 0.7, "#ff8a5c");
    },
  }),
  "archipielago-proxy": T({
    name: "Archipiélago", accent: "#4fe3e0", skyDay: ["#76d0ff", "#fff6e0"], skyNight: ["#13205a", "#3a5a8a"],
    top: "#9ad66b", rim: "#f0dcb0", soil: ["#c99a6a", "#a07650", "#7a5a40"], particles: "pollen",
    props: (b, r) => {
      tree(b, r, -2.6, -1.9, 1.2, "#4fbf72", "#a6764a", "palm");
      tree(b, r, 2.3, -2.4, 1.0, "#3fae6a", "#a6764a", "palm");
      islet(b, r, -5.2, -0.6, -3.5, 0.9, "#9ad66b", "#a07650", ["#4fbf72", "#a6764a", "round"]);
      islet(b, r, 5.0, 0.4, -4.2, 0.7, "#f0dcb0", "#a07650", ["#3fae6a", "#a6764a", "round"]);
      islet(b, r, 1.0, 1.5, -7.0, 0.6, "#9ad66b", "#a07650");
      water(b, "#5fd0e8");
      for (let i = 0; i < 5; i++) { const [x, z] = spot(r); shell(b, x, z, pick(r, ["#ff9bc0", "#fff6d6"])); }
      flowers(b, r, 10, ["#ff9bc0", "#ffe27a", "#ffffff"]);
    },
  }),
  "ciudadela-cortafuegos": T({
    name: "Ciudadela", accent: "#e04a3f", skyDay: ["#ffb28a", "#fff0dc"], skyNight: ["#1c1440", "#5a2a4a"],
    top: "#b9b3cc", rim: "#9a93b8", soil: ["#8c7a90", "#6b5e74", "#4a4056"], particles: "embers",
    props: (b, r) => {
      const wall = b.soft("#d9cfe6"), roof = b.soft("#e04a3f");
      b.add(at(BOX, 0, 0.5, -2.8, [3.4, 1.0, 0.4]), wall);
      for (let i = 0; i < 5; i++) b.add(at(BOX, -1.4 + i * 0.7, 1.1, -2.8, [0.3, 0.25, 0.42]), wall);
      for (const x of [-2.4, 2.4]) {
        b.add(at(CYL, x, 0.8, -2.2, [0.45, 1.6, 0.45]), wall);
        b.add(at(CONE, x, 1.9, -2.2, [0.55, 0.65, 0.55]), roof);
        b.add(at(CYL, x, 2.45, -2.2, [0.015, 0.4, 0.015]), b.soft("#4b4466"));
        b.add(at(BOX, x + 0.13, 2.55, -2.2, [0.24, 0.14, 0.02]), b.soft("#ffb13b"));
      }
      lamp(b, -3.0, 0.8); lamp(b, 3.0, 0.8);
      rock(b, 3.0, -0.8, 0.28, "#9a93b8");
      flowers(b, r, 6, ["#ffe27a", "#ff9bc0"]);
    },
  }),
  "abismo-nulo": T({
    name: "Abismo", accent: "#e04fd0", skyDay: ["#4a3a7a", "#a98ad8"], skyNight: ["#0c0820", "#3a1e5e"],
    top: "#6a5a9a", rim: "#5a4a8a", soil: ["#4a3a7a", "#3a2a62", "#2a1e4a"], particles: "stars",
    props: (b, r) => {
      crystal(b, r, -2.5, -2.0, 1.3, "#e04fd0"); crystal(b, r, 2.6, -1.6, 1.0, "#7a3ba8"); crystal(b, r, 0.4, -2.9, 1.5, "#b4dcff");
      for (let i = 0; i < 6; i++) dataCube(b, r, between(r, -5, 5), between(r, 0.8, 3), between(r, -6, -2.5), between(r, 0.15, 0.35), pick(r, ["#e04fd0", "#b4dcff", "#7a3ba8"]));
      islet(b, r, -5, 0.6, -4, 0.5, "#6a5a9a", "#3a2a62");
      islet(b, r, 4.8, -0.2, -3.5, 0.6, "#6a5a9a", "#3a2a62");
      rock(b, -3.0, 0.7, 0.3, "#3a2a62"); rock(b, 3.0, 0.7, 0.25, "#3a2a62");
    },
  }),
  "santuario-nucleo": T({
    name: "Santuario", accent: "#ffe27a", skyDay: ["#ffd6ec", "#fff6d6"], skyNight: ["#1d1650", "#6a3a8a"],
    top: "#bfe6b0", rim: "#a6d39a", soil: ["#b9a6d0", "#9886b4", "#776898"], particles: "petals",
    props: (b, r) => {
      // A simple gate of two posts and beams (original, not any real-world shrine design).
      const gate = b.soft("#e8dcc6", { rim: 0.5 });
      for (const x of [-0.9, 0.9]) b.add(at(CYL, x, 0.8, -2.7, [0.1, 1.6, 0.1]), gate);
      b.add(at(BOX, 0, 1.65, -2.7, [2.3, 0.14, 0.2]), gate);
      b.add(at(BOX, 0, 1.4, -2.7, [1.9, 0.08, 0.14]), gate);
      crystal(b, r, 0, -2.75, 0.9, "#ffe27a");
      crystal(b, r, -2.6, -1.6, 1.0, "#ff9bc0"); crystal(b, r, 2.6, -1.8, 1.1, "#b4dcff");
      tree(b, r, 2.3, -2.6, 1.1, "#ffb6d5", "#8c5a3c");
      tree(b, r, -2.2, -2.6, 1.0, "#ffc6df", "#8c5a3c");
      flowers(b, r, 14, ["#ff9bc0", "#ffffff", "#ffe27a"]);
      lamp(b, -3.0, 0.9); lamp(b, 3.0, 0.9);
    },
  }),
  "colmena-corrupta": T({
    name: "Colmena", accent: "#ffb13b", skyDay: ["#ffcf8a", "#fff0c9"], skyNight: ["#2a1840", "#6a3a4a"],
    top: "#c9a85a", rim: "#b08e48", soil: ["#a0703e", "#80562e", "#603e22"], particles: "pollen",
    props: (b, r) => {
      hive(b, r, -2.4, -2.0, 1.3); hive(b, r, 2.4, -2.2, 1.1); hive(b, r, 0.3, -2.9, 0.9);
      flowers(b, r, 16, ["#ffe27a", "#ff9bc0", "#ffffff"]);
      crystal(b, r, 3.0, -0.6, 0.6, "#e04fd0");
      grass(b, r, 14, "#b0963e");
    },
  }),
  "torre-desbordamiento": T({
    name: "Torre", accent: "#5a9bff", skyDay: ["#8ec5ff", "#ffffff"], skyNight: ["#101a50", "#3a4a8a"],
    top: "#d9d3ec", rim: "#c2bbdc", soil: ["#a9a2c0", "#8c84a8", "#6b6490"], particles: "data",
    props: (b, r) => {
      const t = b.soft("#e6e0f4"), ring = b.soft("#5a9bff", { emissive: "#5a9bff", emissiveIntensity: 0.5 });
      b.add(at(CYL, 0.6, 2.5, -7.5, [0.9, 8, 0.9]), t);
      for (let i = 0; i < 6; i++) b.add(at(new THREE.TorusGeometry(1, 0.06, 6, 24), 0.6, 0.2 + i * 1.3, -7.5, [1.0, 1.0, 1.0], [Math.PI / 2, 0, 0]), ring);
      for (let i = 0; i < 6; i++) cloud(b, r, between(r, -6, 6), between(r, -1.8, 0.8), between(r, -6, -2.5), between(r, 0.8, 1.6));
      cloud(b, r, -4.6, -1.2, 1.0, 1.2); cloud(b, r, 4.8, -1.0, 0.5, 1.1);
      pillar(b, -2.6, -1.8, 1.0, "#e6e0f4"); pillar(b, 2.6, -1.8, 1.0, "#e6e0f4");
      dataCube(b, r, -1.0, 1.4, -2.6, 0.2, "#5a9bff"); dataCube(b, r, 1.4, 1.7, -2.5, 0.16, "#4fe3e0");
    },
  }),
  "raiz-del-mundo": T({
    name: "Raíz del mundo", accent: "#7fcb5a", skyDay: ["#a6e0c9", "#fff6d6"], skyNight: ["#10243a", "#3a4a5a"],
    top: "#7fbf6a", rim: "#62a252", soil: ["#7a5a40", "#5e4430", "#423022"], particles: "spores",
    props: (b, r) => {
      // The great tree behind the island.
      b.add(at(CYL, 0.3, 1.8, -4.6, [0.9, 6, 0.9], [0, 0, 0.03]), b.soft("#7a5034", { roughness: 0.95 }));
      const canopy = b.soft("#5fb36a", { rim: 0.4 });
      for (const [x, y, z, s] of [[0.3, 5.2, -4.6, 2.6], [-1.8, 4.6, -4.4, 1.8], [2.4, 4.7, -4.8, 1.9], [0.8, 6.3, -5.0, 1.7]] as const) b.add(at(SPHERE, x, y, z, s), canopy);
      roots(b, r, 4, "#7a5034");
      for (let i = 0; i < 5; i++) { const [x, z] = spot(r); mushroom(b, x, z, between(r, 0.6, 1.0), pick(r, ["#ffb13b", "#ff9bc0", "#b4dcff"])); }
      crystal(b, r, -2.8, -1.4, 0.7, "#7fcb5a");
      flowers(b, r, 14, ["#ffe27a", "#ffffff", "#ff9bc0"]);
      grass(b, r, 16, "#62a252");
    },
  }),
};

const FALLBACK = THEMES["parque-arranque"];

export function arenaTheme(regionID: string): { name: string; accent: string; sky: [string, string] } {
  const t = THEMES[regionID] ?? FALLBACK;
  return { name: t.name, accent: t.accent, sky: t.skyDay };
}

// MARK: Sky and particles

function skyTexture(top: string, bottom: string, night: boolean, seed: Rand): THREE.Texture | THREE.Color {
  if (typeof document === "undefined") return new THREE.Color(bottom);
  const c = document.createElement("canvas");
  c.width = 16; c.height = 256;
  if (night) { c.width = 256; }
  const g = c.getContext("2d")!;
  const grad = g.createLinearGradient(0, 0, 0, c.height);
  grad.addColorStop(0, top);
  grad.addColorStop(0.7, bottom);
  grad.addColorStop(1, new THREE.Color(bottom).lerp(new THREE.Color("#ffffff"), night ? 0.08 : 0.35).getStyle());
  g.fillStyle = grad;
  g.fillRect(0, 0, c.width, c.height);
  if (night) {
    for (let i = 0; i < 90; i++) {
      g.fillStyle = `rgba(255,248,220,${0.35 + seed() * 0.6})`;
      const s = seed() < 0.85 ? 1 : 2;
      g.fillRect(seed() * c.width, seed() * c.height * 0.65, s, s);
    }
  }
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

interface ParticleSpec { count: number; color: string; size: number; area: [number, number, number]; velocity: [number, number]; twinkle: boolean }

const PARTICLES: Record<ParticleKind, ParticleSpec> = {
  pollen: { count: 55, color: "#ffe9a0", size: 0.06, area: [9, 3.5, 6], velocity: [0.05, 0.08], twinkle: false },
  spores: { count: 60, color: "#d8ffb0", size: 0.07, area: [9, 3.5, 6], velocity: [0.03, 0.06], twinkle: true },
  petals: { count: 60, color: "#ffc6df", size: 0.09, area: [9, 4, 6], velocity: [0.06, -0.12], twinkle: false },
  snow: { count: 140, color: "#ffffff", size: 0.08, area: [10, 5, 7], velocity: [0.05, -0.35], twinkle: false },
  embers: { count: 90, color: "#ffb13b", size: 0.07, area: [9, 4, 6], velocity: [0.05, 0.35], twinkle: true },
  bubbles: { count: 60, color: "#cff6ff", size: 0.1, area: [9, 4, 6], velocity: [0.03, 0.3], twinkle: false },
  data: { count: 70, color: "#9cc8ff", size: 0.07, area: [10, 5, 7], velocity: [0.02, 0.2], twinkle: true },
  stars: { count: 110, color: "#f0d8ff", size: 0.06, area: [11, 6, 8], velocity: [0.01, 0.04], twinkle: true },
};

function particles(b: Builder, kind: ParticleKind, r: Rand) {
  const spec = PARTICLES[kind];
  const groups: [ParticleSpec, number][] = [[spec, spec.count]];
  // Fireflies at night, everywhere but the coldest or emptiest places.
  if (b.night && kind !== "snow" && kind !== "stars") groups.push([{ count: 26, color: "#e8ff8a", size: 0.1, area: [8, 2.5, 5], velocity: [0.15, 0.05], twinkle: true }, 26]);
  for (const [s, base] of groups) {
    const count = Math.max(4, Math.round(base * b.quality.particles));
    const pos = new Float32Array(count * 3), col = new Float32Array(count * 3);
    const seeds = new Float32Array(count);
    const c = new THREE.Color(s.color);
    for (let i = 0; i < count; i++) {
      pos[i * 3] = (r() - 0.5) * s.area[0];
      pos[i * 3 + 1] = r() * s.area[1] - 0.3;
      pos[i * 3 + 2] = (r() - 0.5) * s.area[2] - 0.5;
      seeds[i] = r() * 100;
      col[i * 3] = c.r; col[i * 3 + 1] = c.g; col[i * 3 + 2] = c.b;
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    geo.setAttribute("color", new THREE.BufferAttribute(col, 3));
    let map: THREE.Texture | undefined;
    try { map = softDotTexture(); } catch { map = undefined; }
    const mat = new THREE.PointsMaterial({ size: s.size, ...(map ? { map } : {}), vertexColors: true, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, sizeAttenuation: true, opacity: 0.75 });
    const points = new THREE.Points(geo, mat);
    points.frustumCulled = false;
    b.root.add(points);
    b.disposables.push(geo, mat);
    const [drift, rise] = s.velocity;
    b.animators.push((dt, t) => {
      for (let i = 0; i < count; i++) {
        const k = seeds[i];
        let x = pos[i * 3] + Math.sin(t * 0.5 + k) * drift * dt;
        let y = pos[i * 3 + 1] + rise * dt + Math.cos(t * 0.7 + k) * drift * 0.4 * dt;
        const z = pos[i * 3 + 2] + Math.cos(t * 0.4 + k) * drift * 0.5 * dt;
        if (y > s.area[1] - 0.3) y = -0.3;
        if (y < -0.3) y = s.area[1] - 0.3;
        if (x > s.area[0] / 2) x = -s.area[0] / 2;
        if (x < -s.area[0] / 2) x = s.area[0] / 2;
        pos[i * 3] = x; pos[i * 3 + 1] = y; pos[i * 3 + 2] = z;
        if (s.twinkle) {
          const v = 0.35 + 0.65 * (0.5 + 0.5 * Math.sin(t * 2.5 + k * 3));
          col[i * 3] = c.r * v; col[i * 3 + 1] = c.g * v; col[i * 3 + 2] = c.b * v;
        }
      }
      geo.attributes.position.needsUpdate = true;
      if (s.twinkle) geo.attributes.color.needsUpdate = true;
    });
  }
}

// MARK: Build

/** Builds the diorama for a zone. Unknown ids get the meadow. */
export function buildArena(regionID: string, night: boolean, quality: Quality): Arena {
  const theme = THEMES[regionID] ?? FALLBACK;
  const r = seeded(regionID);
  const b = new Builder(theme, night, quality);
  island(b, theme);
  theme.props(b, r, night);
  b.finish();
  particles(b, theme.particles, r);

  const [skyTop, skyBottom] = night ? theme.skyNight : theme.skyDay;
  const background = skyTexture(skyTop, skyBottom, night, seeded(regionID + "sky"));
  const fogColor = new THREE.Color(skyBottom);
  const fog = new THREE.Fog(fogColor, 14, 42);

  // Light: warm low sun by day; a cool moon plus warm lanterns by night.
  const sun = new THREE.DirectionalLight(night ? "#9fb4ff" : "#ffe2b0", night ? 1.1 : 2.6);
  sun.position.set(-4, 7, 5);
  sun.target.position.set(0, 0, 0);
  sun.castShadow = quality.shadows;
  if (quality.shadows) {
    sun.shadow.mapSize.set(1024, 1024);
    const cam = sun.shadow.camera;
    cam.left = -4.5; cam.right = 4.5; cam.top = 4.5; cam.bottom = -4.5; cam.near = 1; cam.far = 20;
    sun.shadow.radius = 4;
    sun.shadow.bias = -0.0005;
    sun.shadow.normalBias = 0.02;
  }
  const hemi = new THREE.HemisphereLight(night ? "#5a6ab8" : "#cfe8ff", night ? "#2a2440" : new THREE.Color(theme.top).lerp(new THREE.Color("#ffd9a0"), 0.4), night ? 0.9 : 1.25);
  const fill = new THREE.DirectionalLight(night ? "#6a5ab0" : "#ffd0e0", night ? 0.25 : 0.45);
  fill.position.set(5, 3, 4);
  const lights: THREE.Light[] = [sun, hemi, fill];
  // Up to two warm point lights from lanterns and glowing pools.
  for (const p of b.lanterns.slice(0, 2)) {
    const l = new THREE.PointLight("#ffb347", night ? 6 : 2.5, 4.5, 2);
    l.position.copy(p);
    lights.push(l);
  }
  b.root.add(sun, sun.target, ...lights.slice(1));
  for (const l of lights.slice(3)) {
    const k = Math.random() * 6;
    b.animators.push((_dt, t) => { (l as THREE.PointLight).intensity = (night ? 6 : 2.5) * (0.85 + 0.15 * Math.sin(t * 3 + k)); });
  }

  return {
    root: b.root,
    background,
    fog,
    sun,
    lights,
    slots: { partner: new THREE.Vector3(-1.6, 0, 0.25), enemy: new THREE.Vector3(1.6, 0, 0.25) },
    camera: { position: new THREE.Vector3(0, 3.9, 10.2), target: new THREE.Vector3(0, 0.55, -0.2), fov: 35 },
    update(dt, t) { for (const fn of b.animators) fn(dt, t); },
    dispose() {
      for (const d of b.disposables) d.dispose();
      if (background instanceof THREE.Texture) background.dispose();
      sun.shadow.map?.dispose();
    },
  };
}

/** Total triangles of an arena (for budgets and tests). */
export function triangleCount(root: THREE.Object3D): number {
  let n = 0;
  root.traverse((o) => {
    const m = o as THREE.Mesh;
    if (!m.isMesh || !m.geometry) return;
    const g = m.geometry;
    n += (g.index ? g.index.count : g.attributes.position.count) / 3;
  });
  return Math.round(n);
}

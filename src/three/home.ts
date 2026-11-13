import * as THREE from "three";
import type { GameData } from "../data/models";
import type { Variant } from "../core/save";
import { buildCreature, type CreatureRig } from "./creature";
import { CreatureAnimator } from "./rig";
import { arenaTheme } from "./arena";
import { defaultQuality, glowMaterial, softDotTexture, softMaterial, type Quality } from "./materials";
import { Particles, riseEffect, ringEffect } from "./vfx";

/**
 * The Home screen's living world view: the partner walks along a path through its current
 * zone's biome while the world scrolls past (a treadmill), landmarks mark every 1,000 steps of
 * the route, and step events wait on the path ahead (a wild Eco's shadow, a glowing data crate,
 * a trapped Eco calling for help, a digital storm). Tapping the partner or an event reacts.
 */

export interface HomeEvent { id: string; kind: "battle" | "cache" | "sos" | "hazard"; species?: string; variant?: Variant }
export interface HomeState {
  partner?: { speciesID: string; variant: Variant; injured: boolean };
  regionID: string;
  night: boolean;
  events: HomeEvent[];
  progress: { walked: number; total: number; bossReady: boolean; bossSpecies?: string };
}

type PropKind = "tree" | "pine" | "flower" | "bush" | "rock" | "palm" | "cactus" | "dune" | "grass" | "gear" | "reed" | "pond"
  | "house" | "snowrock" | "coral" | "shell" | "pillar" | "icespike" | "darkrock" | "lava" | "wall" | "tower" | "cube" | "crystal"
  | "cloud" | "platform" | "root" | "hex" | "mushroom";

interface Biome {
  ground: string; path: string; pathEdge: string; dots: string;
  props: PropKind[];
  particle: { colors: string[]; rise: number; size: number };
  fog: number;
  water?: string;
}

const BIOMES: [RegExp, Biome][] = [
  [/parque/, { ground: "#9fd47a", path: "#f1dcae", pathEdge: "#e2c48c", dots: "#ffffff", props: ["tree", "flower", "bush", "flower", "rock", "mushroom"], particle: { colors: ["#fff6d6", "#ffe27a"], rise: 0.15, size: 0.08 }, fog: 0.035 }],
  [/bosque/, { ground: "#6fae6a", path: "#d9c49a", pathEdge: "#b99e74", dots: "#cdeb8b", props: ["pine", "tree", "mushroom", "bush", "pine", "rock"], particle: { colors: ["#cdeb8b", "#fff6d6"], rise: 0.05, size: 0.09 }, fog: 0.07 }],
  [/isla|archipielago/, { ground: "#f3dfa8", path: "#fff1cf", pathEdge: "#e9cf94", dots: "#ffffff", props: ["palm", "shell", "rock", "palm", "coral"], particle: { colors: ["#b4dcff", "#ffffff"], rise: 0.2, size: 0.07 }, fog: 0.03, water: "#6fc9e0" }],
  [/desierto/, { ground: "#f0cf95", path: "#f7e2b8", pathEdge: "#e2bd80", dots: "#fff6d6", props: ["cactus", "dune", "rock", "cactus", "dune"], particle: { colors: ["#ffe27a", "#fff6d6"], rise: 0.05, size: 0.06 }, fog: 0.03 }],
  [/sabana/, { ground: "#d8c56e", path: "#efdcae", pathEdge: "#cdb27a", dots: "#fff6d6", props: ["grass", "gear", "tree", "grass", "rock"], particle: { colors: ["#ffe27a", "#ffb13b"], rise: 0.1, size: 0.06 }, fog: 0.035 }],
  [/pantano/, { ground: "#7fa36e", path: "#bfae86", pathEdge: "#9d8c68", dots: "#cdeb8b", props: ["reed", "pond", "mushroom", "reed", "tree"], particle: { colors: ["#cdeb8b", "#a9e8c8"], rise: 0.1, size: 0.08 }, fog: 0.08 }],
  [/ciudad/, { ground: "#b8d79a", path: "#e9dccb", pathEdge: "#cfc1ae", dots: "#ffffff", props: ["house", "tree", "house", "flower", "house"], particle: { colors: ["#fff6d6", "#ff9bc0"], rise: 0.1, size: 0.06 }, fog: 0.035 }],
  [/cumbres/, { ground: "#dfe8ef", path: "#f6f2ea", pathEdge: "#cdd6de", dots: "#ffffff", props: ["snowrock", "pine", "snowrock", "rock"], particle: { colors: ["#ffffff", "#e8f4ff"], rise: -0.5, size: 0.09 }, fog: 0.05 }],
  [/mar/, { ground: "#e9d7a8", path: "#fbedcf", pathEdge: "#e1c890", dots: "#ffffff", props: ["coral", "shell", "coral", "rock"], particle: { colors: ["#b4dcff", "#ffffff"], rise: 0.4, size: 0.08 }, fog: 0.04, water: "#5ab7d6" }],
  [/ruinas/, { ground: "#a9bf8a", path: "#d8ccb4", pathEdge: "#b8ab92", dots: "#efe6d2", props: ["pillar", "rock", "bush", "pillar", "tree"], particle: { colors: ["#fff6d6", "#e8d9b0"], rise: 0.05, size: 0.06 }, fog: 0.05 }],
  [/glaciar/, { ground: "#d9ecf7", path: "#f3f9fd", pathEdge: "#bcd6e6", dots: "#ffffff", props: ["icespike", "snowrock", "icespike", "crystal"], particle: { colors: ["#ffffff", "#cfeaff"], rise: -0.4, size: 0.08 }, fog: 0.05 }],
  [/volcan/, { ground: "#6b5a5a", path: "#a58a7a", pathEdge: "#7d665a", dots: "#ff8a5c", props: ["darkrock", "lava", "darkrock", "rock"], particle: { colors: ["#ff8a5c", "#ffb13b"], rise: 0.6, size: 0.06 }, fog: 0.05 }],
  [/ciudadela/, { ground: "#a9b8c9", path: "#dcd8d0", pathEdge: "#b9b2a6", dots: "#ffffff", props: ["wall", "tower", "pillar", "wall"], particle: { colors: ["#b4dcff", "#ffffff"], rise: 0.1, size: 0.06 }, fog: 0.045 }],
  [/abismo/, { ground: "#4a4470", path: "#7b72a8", pathEdge: "#5d558a", dots: "#e04fd0", props: ["cube", "crystal", "cube", "darkrock"], particle: { colors: ["#e04fd0", "#b4dcff", "#ffffff"], rise: 0.2, size: 0.06 }, fog: 0.05 }],
  [/santuario/, { ground: "#c5b4e6", path: "#efe6ff", pathEdge: "#cdbbe8", dots: "#ffffff", props: ["crystal", "pillar", "crystal", "flower"], particle: { colors: ["#e7d4ff", "#ffffff", "#ffe27a"], rise: 0.3, size: 0.07 }, fog: 0.04 }],
  [/colmena/, { ground: "#d9b25e", path: "#f2d999", pathEdge: "#d6b46a", dots: "#fff6d6", props: ["hex", "mushroom", "hex", "rock"], particle: { colors: ["#ffe27a", "#e04fd0"], rise: 0.2, size: 0.06 }, fog: 0.05 }],
  [/torre/, { ground: "#cfe3f5", path: "#f4f8ff", pathEdge: "#c9d9ec", dots: "#ffffff", props: ["cloud", "platform", "cloud", "tower"], particle: { colors: ["#ffffff", "#ffe27a"], rise: 0.1, size: 0.08 }, fog: 0.03 }],
  [/raiz/, { ground: "#7fae72", path: "#cdb48a", pathEdge: "#a88d66", dots: "#cdeb8b", props: ["root", "tree", "mushroom", "root", "crystal"], particle: { colors: ["#cdeb8b", "#ffe27a"], rise: 0.2, size: 0.08 }, fog: 0.05 }],
];
const DEFAULT_BIOME = BIOMES[0][1];
const biomeFor = (regionID: string) => BIOMES.find(([re]) => re.test(regionID))?.[1] ?? DEFAULT_BIOME;

/** World units per step of route progress (1,000 steps = 12 units between landmarks). */
const UNIT = 0.012;
const SPAN = 16;
const BASE_SPEED = 0.55;

const rand = (seed: number) => {
  let a = seed >>> 0;
  return () => { a = (a + 0x6d2b79f5) >>> 0; let x = Math.imul(a ^ (a >>> 15), 1 | a); x = (x + Math.imul(x ^ (x >>> 7), 61 | x)) ^ x; return ((x ^ (x >>> 14)) >>> 0) / 4294967296; };
};

// MARK: Canvas sprites (markers, bubbles)

function canvasTexture(w: number, h: number, draw: (g: CanvasRenderingContext2D) => void): THREE.Texture {
  const c = document.createElement("canvas");
  c.width = w; c.height = h;
  draw(c.getContext("2d")!);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

function roundRect(g: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  g.beginPath();
  g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r); g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r);
  g.closePath();
}

const spriteTextures = new Map<string, THREE.Texture>();
function markerTexture(kind: "alert" | "help" | "crown" | "bandage" | "heart" | "sweat"): THREE.Texture {
  const hit = spriteTextures.get(kind);
  if (hit) return hit;
  let t: THREE.Texture;
  switch (kind) {
    case "alert":
      t = canvasTexture(128, 128, (g) => {
        g.fillStyle = "#ff5a4f"; g.beginPath(); g.arc(64, 64, 54, 0, Math.PI * 2); g.fill();
        g.lineWidth = 8; g.strokeStyle = "#ffffff"; g.stroke();
        g.fillStyle = "#ffffff"; g.font = "900 84px ui-rounded, system-ui, sans-serif"; g.textAlign = "center"; g.textBaseline = "middle"; g.fillText("!", 64, 70);
      });
      break;
    case "help":
      t = canvasTexture(256, 128, (g) => {
        g.fillStyle = "rgba(255,255,255,0.95)"; roundRect(g, 8, 8, 240, 88, 40); g.fill();
        g.beginPath(); g.moveTo(110, 94); g.lineTo(128, 122); g.lineTo(146, 94); g.fill();
        g.fillStyle = "#e0446a"; g.font = "900 54px ui-rounded, system-ui, sans-serif"; g.textAlign = "center"; g.textBaseline = "middle"; g.fillText("¡AYUDA!", 128, 54);
      });
      break;
    case "crown":
      t = canvasTexture(128, 96, (g) => {
        g.fillStyle = "#ffcf4a"; g.strokeStyle = "#c98a1e"; g.lineWidth = 6;
        g.beginPath(); g.moveTo(14, 82); g.lineTo(14, 26); g.lineTo(40, 52); g.lineTo(64, 14); g.lineTo(88, 52); g.lineTo(114, 26); g.lineTo(114, 82); g.closePath(); g.fill(); g.stroke();
        g.fillStyle = "#ff6f91"; for (const x of [34, 64, 94]) { g.beginPath(); g.arc(x, 68, 7, 0, Math.PI * 2); g.fill(); }
      });
      break;
    case "bandage":
      t = canvasTexture(96, 96, (g) => {
        g.translate(48, 48); g.rotate(-0.5);
        g.fillStyle = "#fff4ea"; roundRect(g, -40, -14, 80, 28, 12); g.fill();
        g.strokeStyle = "#e9c7b0"; g.lineWidth = 3; g.stroke();
        g.fillStyle = "#f2b8a4"; for (const x of [-6, 6]) for (const y of [-5, 5]) { g.beginPath(); g.arc(x, y, 2.6, 0, Math.PI * 2); g.fill(); }
      });
      break;
    case "sweat":
      t = canvasTexture(64, 96, (g) => {
        g.fillStyle = "#8fd3ff"; g.beginPath(); g.moveTo(32, 8); g.bezierCurveTo(56, 44, 58, 62, 32, 86); g.bezierCurveTo(6, 62, 8, 44, 32, 8); g.fill();
        g.fillStyle = "rgba(255,255,255,0.8)"; g.beginPath(); g.ellipse(24, 58, 6, 10, 0.3, 0, Math.PI * 2); g.fill();
      });
      break;
    case "heart":
      t = canvasTexture(96, 96, (g) => {
        g.fillStyle = "#ff7aa8";
        g.beginPath(); g.moveTo(48, 82); g.bezierCurveTo(8, 56, 10, 18, 34, 18); g.bezierCurveTo(44, 18, 48, 28, 48, 32); g.bezierCurveTo(48, 28, 52, 18, 62, 18); g.bezierCurveTo(86, 18, 88, 56, 48, 82); g.fill();
        g.fillStyle = "rgba(255,255,255,0.7)"; g.beginPath(); g.ellipse(32, 34, 7, 5, -0.6, 0, Math.PI * 2); g.fill();
      });
      break;
  }
  spriteTextures.set(kind, t);
  return t;
}

const SHADOW = () => softMaterial("#3d3858", { roughness: 0.8, rim: 0.6, subsurface: "#6b5aa8" });
/** Mysterious dark silhouettes (wild Ecos, trapped ones, the waiting boss). */
function darken(rig: CreatureRig) {
  const m = SHADOW();
  rig.root.traverse((o) => { const mesh = o as THREE.Mesh; if (mesh.isMesh && !(mesh.material as THREE.Material & { map?: unknown }).map) mesh.material = m; });
}

function sprite(kind: Parameters<typeof markerTexture>[0], size: number): THREE.Sprite {
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: markerTexture(kind), transparent: true, depthWrite: false }));
  const img = (markerTexture(kind).image as HTMLCanvasElement);
  s.scale.set(size * (img.width / img.height), size, 1);
  s.renderOrder = 20;
  return s;
}

// MARK: Prop builders (shared geometry, cozy soft materials)

const G = {
  sphere: new THREE.SphereGeometry(1, 16, 12),
  cone: new THREE.ConeGeometry(1, 1, 12),
  cyl: new THREE.CylinderGeometry(1, 1, 1, 12),
  box: new THREE.BoxGeometry(1, 1, 1, 1, 1, 1),
  ico: new THREE.IcosahedronGeometry(1, 0),
  dodeca: new THREE.DodecahedronGeometry(1, 0),
  torus: new THREE.TorusGeometry(1, 0.18, 8, 24),
  octa: new THREE.OctahedronGeometry(1, 0),
  hex: new THREE.CylinderGeometry(1, 1, 1, 6),
};

function mesh(geo: THREE.BufferGeometry, color: string, s: [number, number, number], p: [number, number, number] = [0, 0, 0], opts: { emissive?: string; flat?: boolean } = {}): THREE.Mesh {
  const m = new THREE.Mesh(geo, opts.emissive ? softMaterial(color, { emissive: opts.emissive, emissiveIntensity: 0.9 }) : softMaterial(color, { flatShading: opts.flat }));
  m.scale.set(...s);
  m.position.set(...p);
  m.castShadow = true;
  m.receiveShadow = true;
  return m;
}

function buildProp(kind: PropKind, r: () => number, night: boolean): THREE.Group {
  const g = new THREE.Group();
  const k = 0.8 + r() * 0.5;
  const add = (o: THREE.Object3D) => g.add(o);
  switch (kind) {
    case "tree": add(mesh(G.cyl, "#a7744f", [0.09, 0.7, 0.09], [0, 0.35, 0])); add(mesh(G.sphere, r() < 0.5 ? "#7cc46a" : "#95d07a", [0.5, 0.45, 0.5], [0, 0.95, 0])); add(mesh(G.sphere, "#a6dc86", [0.32, 0.3, 0.32], [0.2, 1.2, 0.1])); break;
    case "pine": add(mesh(G.cyl, "#8e6142", [0.07, 0.4, 0.07], [0, 0.2, 0])); for (let i = 0; i < 3; i++) add(mesh(G.cone, "#4f8f63", [0.42 - i * 0.1, 0.5, 0.42 - i * 0.1], [0, 0.55 + i * 0.32, 0])); break;
    case "flower": for (let i = 0; i < 3; i++) { const x = (r() - 0.5) * 0.4, z = (r() - 0.5) * 0.3; add(mesh(G.cyl, "#6fae5a", [0.015, 0.22, 0.015], [x, 0.11, z])); add(mesh(G.sphere, ["#ff9bc0", "#ffe27a", "#ffffff", "#c9a7ff"][Math.floor(r() * 4)], [0.07, 0.06, 0.07], [x, 0.24, z])); } break;
    case "bush": add(mesh(G.sphere, "#86c46e", [0.35, 0.26, 0.3], [0, 0.18, 0])); add(mesh(G.sphere, "#9fd47a", [0.22, 0.2, 0.2], [0.22, 0.24, 0.05])); break;
    case "rock": add(mesh(G.dodeca, "#b7aea4", [0.28, 0.2, 0.24], [0, 0.12, 0], { flat: true })); break;
    case "palm": { add(mesh(G.cyl, "#c49a6c", [0.07, 1.1, 0.07], [0.08, 0.55, 0])); for (let i = 0; i < 5; i++) { const a = (i / 5) * Math.PI * 2; const leaf = mesh(G.sphere, "#6dbf6a", [0.45, 0.05, 0.14], [0.08 + Math.cos(a) * 0.32, 1.08, Math.sin(a) * 0.32]); leaf.rotation.y = -a; leaf.rotation.z = -0.3; add(leaf); } break; }
    case "cactus": add(mesh(G.cyl, "#69b56a", [0.13, 0.7, 0.13], [0, 0.35, 0])); add(mesh(G.sphere, "#69b56a", [0.13, 0.13, 0.13], [0, 0.7, 0])); add(mesh(G.cyl, "#69b56a", [0.07, 0.3, 0.07], [0.17, 0.45, 0])); add(mesh(G.sphere, "#ff9bc0", [0.06, 0.05, 0.06], [0, 0.82, 0])); break;
    case "dune": add(mesh(G.sphere, "#ecc888", [0.9, 0.22, 0.6], [0, 0, 0])); break;
    case "grass": for (let i = 0; i < 5; i++) add(mesh(G.cone, "#c9b24f", [0.04, 0.4 + r() * 0.2, 0.04], [(r() - 0.5) * 0.4, 0.2, (r() - 0.5) * 0.3])); break;
    case "gear": { const t = mesh(G.torus, "#d9a441", [0.32, 0.32, 0.6], [0, 0.42, 0]); t.userData.spin = 0.8; add(t); add(mesh(G.cyl, "#8e8e9e", [0.04, 0.4, 0.04], [0, 0.2, 0])); break; }
    case "reed": for (let i = 0; i < 4; i++) { const x = (r() - 0.5) * 0.3; add(mesh(G.cyl, "#7f9f55", [0.02, 0.6, 0.02], [x, 0.3, (r() - 0.5) * 0.2])); add(mesh(G.cyl, "#8e6142", [0.04, 0.12, 0.04], [x, 0.62, 0])); } break;
    case "pond": { const p = new THREE.Mesh(G.cyl, glowMaterial("#7fc8c8", false, 0.85)); p.scale.set(0.6, 0.02, 0.4); p.position.y = 0.01; add(p); add(mesh(G.sphere, "#7fbf6a", [0.12, 0.02, 0.12], [0.2, 0.03, 0.1])); break; }
    case "house": {
      const c = ["#ffd9b0", "#ffe9c9", "#cfe7ff", "#ffd1dc"][Math.floor(r() * 4)];
      add(mesh(G.box, c, [0.7, 0.55, 0.6], [0, 0.28, 0]));
      const roof = mesh(G.cone, ["#e0705e", "#7aa8d8", "#9c7ad8"][Math.floor(r() * 3)], [0.6, 0.4, 0.6], [0, 0.75, 0]); roof.geometry = new THREE.ConeGeometry(1, 1, 4); roof.rotation.y = Math.PI / 4; add(roof);
      for (const x of [-0.18, 0.18]) {
        const win = new THREE.Mesh(G.box, glowMaterial(night ? "#ffd27a" : "#cfe9ff"));
        win.position.set(x, 0.32, 0.301);
        win.scale.set(0.12, 0.14, 0.01);
        add(win);
      }
      break;
    }
    case "snowrock": add(mesh(G.dodeca, "#a8b3c0", [0.32, 0.24, 0.28], [0, 0.14, 0], { flat: true })); add(mesh(G.sphere, "#ffffff", [0.28, 0.08, 0.24], [0, 0.3, 0])); break;
    case "coral": for (let i = 0; i < 3; i++) add(mesh(G.cyl, ["#ff9bc0", "#ff8a5c", "#c9a7ff"][i], [0.05, 0.3 + r() * 0.3, 0.05], [(i - 1) * 0.1, 0.2, (r() - 0.5) * 0.1])); break;
    case "shell": add(mesh(G.sphere, "#ffe1d0", [0.14, 0.08, 0.12], [0, 0.05, 0])); break;
    case "pillar": add(mesh(G.cyl, "#e6dccb", [0.16, 0.9 * k, 0.16], [0, 0.45 * k, 0])); add(mesh(G.box, "#d9ceb9", [0.42, 0.1, 0.42], [0, 0.9 * k, 0])); break;
    case "icespike": add(mesh(G.cone, "#bfe6ff", [0.18, 0.8 * k, 0.18], [0, 0.4 * k, 0], { emissive: "#5fa8d8" })); break;
    case "darkrock": add(mesh(G.dodeca, "#4d4248", [0.34, 0.3, 0.3], [0, 0.18, 0], { flat: true })); break;
    case "lava": { const p = new THREE.Mesh(G.cyl, glowMaterial("#ff8a3c")); p.scale.set(0.5, 0.02, 0.35); p.position.y = 0.01; add(p); add(mesh(G.dodeca, "#4d4248", [0.14, 0.1, 0.12], [0.4, 0.06, 0], { flat: true })); break; }
    case "wall": add(mesh(G.box, "#c8c2b8", [1.2, 0.6, 0.25], [0, 0.3, 0])); for (const x of [-0.45, 0, 0.45]) add(mesh(G.box, "#c8c2b8", [0.2, 0.16, 0.25], [x, 0.68, 0])); break;
    case "tower": add(mesh(G.cyl, "#d7d1c6", [0.25, 1.2, 0.25], [0, 0.6, 0])); add(mesh(G.cone, "#7aa8d8", [0.32, 0.4, 0.32], [0, 1.4, 0])); break;
    case "cube": { const c = new THREE.Mesh(G.box, glowMaterial(["#e04fd0", "#4fe3e0", "#b4dcff"][Math.floor(r() * 3)], false, 0.9)); c.scale.setScalar(0.18 + r() * 0.15); c.position.y = 0.5 + r() * 0.8; c.userData.float = true; c.userData.spin = 1; add(c); break; }
    case "crystal": for (let i = 0; i < 3; i++) add(mesh(G.octa, ["#c9a7ff", "#9fe9ff", "#ffb3e0"][i], [0.12, 0.35 + r() * 0.25, 0.12], [(i - 1) * 0.15, 0.25, (r() - 0.5) * 0.12], { emissive: "#8a6ad8" })); break;
    case "cloud": for (let i = 0; i < 3; i++) add(mesh(G.sphere, "#ffffff", [0.3 - i * 0.05, 0.22, 0.25], [i * 0.28 - 0.28, 0.3 + (i === 1 ? 0.1 : 0), 0])); break;
    case "platform": add(mesh(G.cyl, "#e8eef8", [0.5, 0.12, 0.5], [0, 0.6, 0])); g.userData.float = true; break;
    case "root": { const t = mesh(G.torus, "#8e6142", [0.6, 0.6, 1.4], [0, 0, 0]); t.rotation.x = Math.PI / 2; t.rotation.z = r() * Math.PI; add(t); break; }
    case "hex": for (let i = 0; i < 3; i++) add(mesh(G.hex, "#f2c35c", [0.22, 0.28, 0.22], [(i - 1) * 0.36, 0.14, (r() - 0.5) * 0.2])); break;
    case "mushroom": add(mesh(G.cyl, "#fff1dc", [0.05, 0.18, 0.05], [0, 0.09, 0])); add(mesh(G.sphere, r() < 0.5 ? "#ff8a7a" : "#c9a7ff", [0.16, 0.1, 0.16], [0, 0.2, 0])); break;
  }
  g.scale.setScalar(k);
  return g;
}

// MARK: Landmarks (every 1,000 steps)

function buildLandmark(index: number, night: boolean): THREE.Group {
  const g = new THREE.Group();
  switch (index % 4) {
    case 0: { // Campfire
      for (let i = 0; i < 4; i++) { const log = mesh(G.cyl, "#8e6142", [0.05, 0.4, 0.05], [0, 0.06, 0]); log.rotation.z = Math.PI / 2; log.rotation.y = (i / 4) * Math.PI; g.add(log); }
      const flame = new THREE.Mesh(G.cone, glowMaterial("#ffb13b")); flame.scale.set(0.12, 0.3, 0.12); flame.position.y = 0.22; flame.userData.flicker = true; g.add(flame);
      const halo = new THREE.Sprite(new THREE.SpriteMaterial({ map: softDotTexture(), color: "#ffb13b", transparent: true, opacity: night ? 0.9 : 0.5, blending: THREE.AdditiveBlending, depthWrite: false })); halo.scale.setScalar(1.2); halo.position.y = 0.25; g.add(halo);
      break;
    }
    case 1: { // Little shrine
      for (const x of [-0.25, 0.25]) g.add(mesh(G.cyl, "#e0705e", [0.05, 0.7, 0.05], [x, 0.35, 0]));
      g.add(mesh(G.box, "#e0705e", [0.75, 0.07, 0.12], [0, 0.72, 0])); g.add(mesh(G.box, "#c9564a", [0.6, 0.05, 0.1], [0, 0.6, 0]));
      break;
    }
    case 2: { // Data gate
      const ring = new THREE.Mesh(G.torus, glowMaterial("#4fe3e0")); ring.scale.set(0.55, 0.55, 0.5); ring.position.y = 0.6; ring.userData.spin = 0.4; g.add(ring);
      g.add(mesh(G.box, "#a9b3c9", [0.3, 0.12, 0.3], [-0.55, 0.06, 0])); g.add(mesh(G.box, "#a9b3c9", [0.3, 0.12, 0.3], [0.55, 0.06, 0]));
      break;
    }
    default: { // Signpost
      g.add(mesh(G.cyl, "#a7744f", [0.04, 0.8, 0.04], [0, 0.4, 0]));
      const board = mesh(G.box, "#e9c58f", [0.5, 0.18, 0.04], [0.12, 0.65, 0]); g.add(board);
      g.add(mesh(G.cone, "#e9c58f", [0.12, 0.18, 0.04], [0.42, 0.65, 0]).rotateZ(-Math.PI / 2));
    }
  }
  return g;
}

// MARK: Scene

interface EventObject { id: string; kind: HomeEvent["kind"]; root: THREE.Group; rig?: CreatureRig; marker?: THREE.Sprite; slot: number; born: number; target: THREE.Vector3 }
interface Prop { obj: THREE.Group; x: number; side: number }

export class HomeScene {
  private renderer: THREE.WebGLRenderer;
  private scene = new THREE.Scene();
  private camera = new THREE.PerspectiveCamera(36, 4 / 3, 0.1, 80);
  private world = new THREE.Group();
  private biomeGroup = new THREE.Group();
  private particles: Particles;
  private quality: Quality;
  private sun = new THREE.DirectionalLight("#fff1dc", 2.2);
  private hemi = new THREE.HemisphereLight("#fff6e8", "#9fbf88", 1.1);
  private pathTex?: THREE.CanvasTexture;
  private props: Prop[] = [];
  private landmarks = new Map<number, THREE.Group>();
  private biome = DEFAULT_BIOME;
  private biomeKey = "";
  private partner?: { rig: CreatureRig; anim: CreatureAnimator; walker: THREE.Group; key: string; badge: THREE.Sprite };
  private boss?: { rig: CreatureRig; root: THREE.Group; species: string };
  private events = new Map<string, EventObject>();
  private seen = new Set<string>();
  private state?: HomeState;
  private shown = 0;
  private scroll = 0;
  private speed = 0;
  private boost = 0;
  private walkPhase = 0;
  private time = 0;
  private last = performance.now();
  private frame = 0;
  private running = true;
  private visible = true;
  private slowFrames = 0;
  private frameCount = 0;
  private ambientTimer = 0;
  private hopT = -1;
  private observer?: IntersectionObserver;
  private disposed = false;
  private readonly raycaster = new THREE.Raycaster();
  private readonly reduceMotion = typeof matchMedia !== "undefined" && matchMedia("(prefers-reduced-motion: reduce)").matches;

  constructor(private canvas: HTMLCanvasElement, private data: GameData, private opts: { effects: boolean; onTapPartner: () => void; onTapEvent: (id: string) => void }) {
    this.quality = defaultQuality(opts.effects);
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false, powerPreference: "high-performance" });
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.05;
    this.renderer.shadowMap.enabled = this.quality.shadows;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.setPixelRatio(Math.min(2, this.quality.pixelRatio));
    this.camera.position.set(-0.3, 2.45, 7.2);
    this.camera.lookAt(1, 0.8, 0);
    this.sun.position.set(-3, 6, 4);
    this.sun.castShadow = this.quality.shadows;
    this.sun.shadow.mapSize.set(1024, 1024);
    const sc = this.sun.shadow.camera;
    sc.left = -6; sc.right = 6; sc.top = 5; sc.bottom = -4; sc.near = 1; sc.far = 20;
    this.sun.shadow.bias = -0.0008;
    this.sun.shadow.radius = 4;
    this.scene.add(this.sun, this.sun.target, this.hemi, this.world);
    this.world.add(this.biomeGroup);
    this.particles = new Particles(opts.effects ? 700 : 300);
    this.scene.add(this.particles.points);

    canvas.addEventListener("pointerup", this.onTap);
    document.addEventListener("visibilitychange", this.onVisibility);
    if (typeof IntersectionObserver !== "undefined") {
      this.observer = new IntersectionObserver((entries) => { this.visible = entries.some((e) => e.isIntersecting); this.kick(); });
      this.observer.observe(canvas);
    }
    this.frame = requestAnimationFrame(this.loop);
  }

  // MARK: State

  setState(s: HomeState) {
    const prev = this.state;
    this.state = s;
    const key = `${s.regionID}|${s.night}`;
    if (key !== this.biomeKey) { this.biomeKey = key; this.buildBiome(s.regionID, s.night); }
    const pkey = s.partner ? `${s.partner.speciesID}|${s.partner.variant}` : "";
    if (pkey !== (this.partner?.key ?? "")) this.buildPartner(s.partner);
    if (this.partner) this.partner.badge.visible = !!s.partner?.injured;
    if (!prev) this.shown = s.progress.walked;
    if (prev && s.progress.walked < this.shown - 1) this.shown = s.progress.walked; // pushed back: snap
    this.syncEvents(s.events);
    this.syncBoss(s.progress.bossReady ? s.progress.bossSpecies : undefined);
    this.syncLandmarks();
  }

  /** Steps arrived: a smooth burst of walking speed (bigger for more steps). */
  pulse(steps: number) {
    if (steps <= 0) return;
    this.boost = Math.min(4, this.boost + 0.6 + Math.log10(1 + steps) * 0.9);
  }

  react(kind: "happy" | "sad" | "evolve") {
    const p = this.partner;
    if (!p) return;
    const at = p.walker.position.clone().setY(p.rig.height * 0.9 * p.walker.scale.y);
    if (kind === "happy") { void p.anim.play("victory"); this.hopT = 0; this.hearts(at); }
    else if (kind === "sad") void p.anim.play("hit");
    else { void p.anim.play("evolve"); riseEffect(this.particles, p.walker.position, [p.rig.colors.seam, "#ffffff", p.rig.colors.accent], 70, 1.2, this.quality.particles); ringEffect(this.particles, p.walker.position.clone().setY(0.1), p.rig.colors.seam, 1.2, this.quality.particles); }
  }

  resize(width: number, height: number) {
    const w = Math.max(1, Math.round(width)), h = Math.max(1, Math.round(height));
    this.renderer.setSize(w, h, false);
    this.canvas.style.width = `${w}px`;
    this.canvas.style.height = `${h}px`;
    this.camera.aspect = w / h;
    // Narrow screens: pull back a little so the scene still fits.
    this.camera.fov = w / h < 1.1 ? 44 : 36;
    this.camera.updateProjectionMatrix();
    this.particles.setScale(h * this.renderer.getPixelRatio());
  }

  destroy() {
    this.disposed = true;
    cancelAnimationFrame(this.frame);
    this.canvas.removeEventListener("pointerup", this.onTap);
    document.removeEventListener("visibilitychange", this.onVisibility);
    this.observer?.disconnect();
    this.partner?.rig.dispose();
    this.boss?.rig.dispose();
    for (const e of this.events.values()) e.rig?.dispose();
    this.pathTex?.dispose();
    this.particles.points.geometry.dispose();
    (this.particles.points.material as THREE.Material).dispose();
    this.renderer.dispose();
  }

  // MARK: Building

  private buildBiome(regionID: string, night: boolean) {
    this.biomeGroup.clear();
    this.props = [];
    for (const l of this.landmarks.values()) l.removeFromParent();
    this.landmarks.clear();
    const b = (this.biome = biomeFor(regionID));
    const theme = arenaTheme(regionID);
    const [top, bottom] = night ? ["#1d2350", "#4a4f8a"] : theme.sky;
    const horizon = new THREE.Color(bottom).lerp(new THREE.Color(b.ground), 0.25).lerp(new THREE.Color("#ffffff"), night ? 0.04 : 0.14);
    this.scene.background = canvasTexture(4, 256, (g) => {
      const grad = g.createLinearGradient(0, 0, 0, 256);
      grad.addColorStop(0, top); grad.addColorStop(0.45, bottom); grad.addColorStop(0.62, horizon.getStyle()); grad.addColorStop(1, horizon.getStyle());
      g.fillStyle = grad; g.fillRect(0, 0, 4, 256);
    });
    // The far ground melts into the horizon colour, so there's no hard edge.
    this.scene.fog = new THREE.Fog(horizon, 9, 26);
    this.sun.color.set(night ? "#9fb4ff" : "#fff1dc");
    this.sun.intensity = night ? 1.2 : 2.2;
    this.hemi.color.set(night ? "#6c75c7" : "#fff6e8");
    this.hemi.groundColor.set(new THREE.Color(b.ground).lerp(new THREE.Color("#000000"), night ? 0.5 : 0.1));
    this.hemi.intensity = night ? 1.0 : 1.1;

    // Ground: a wide soft plane, the path strip with a scrolling texture, optional water.
    const ground = new THREE.Mesh(new THREE.PlaneGeometry(120, 60), softMaterial(b.ground, { roughness: 0.9, rim: 0 }));
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    this.biomeGroup.add(ground);
    this.pathTex?.dispose();
    this.pathTex = canvasTexture(256, 128, (g) => {
      g.fillStyle = b.path; g.fillRect(0, 0, 256, 128);
      g.fillStyle = b.pathEdge; g.fillRect(0, 0, 256, 10); g.fillRect(0, 118, 256, 10);
      const r = rand(7);
      g.fillStyle = b.dots; g.globalAlpha = 0.55;
      for (let i = 0; i < 26; i++) { g.beginPath(); g.ellipse(r() * 256, 18 + r() * 92, 3 + r() * 5, 2 + r() * 3, 0, 0, Math.PI * 2); g.fill(); }
    }) as THREE.CanvasTexture;
    this.pathTex.wrapS = THREE.RepeatWrapping;
    this.pathTex.repeat.set(10, 1);
    const path = new THREE.Mesh(new THREE.PlaneGeometry(SPAN * 2.4, 1.5), new THREE.MeshStandardMaterial({ map: this.pathTex, roughness: 0.95 }));
    path.rotation.x = -Math.PI / 2;
    path.position.set(2, 0.01, 0);
    path.receiveShadow = true;
    this.biomeGroup.add(path);
    if (b.water) {
      const water = new THREE.Mesh(new THREE.PlaneGeometry(60, 10), new THREE.MeshStandardMaterial({ color: b.water, roughness: 0.2, metalness: 0, transparent: true, opacity: 0.92 }));
      water.rotation.x = -Math.PI / 2;
      water.position.set(0, 0.005, -9);
      water.userData.water = true;
      this.biomeGroup.add(water);
    }

    // Side props: behind the path (z < 0) mostly, a few small ones in front; recycled as they scroll.
    const r = rand(regionID.length * 131 + (night ? 7 : 0));
    for (let i = 0; i < 26; i++) {
      const back = i % 4 !== 0;
      const kind = b.props[Math.floor(r() * b.props.length)];
      const obj = buildProp(back ? kind : (["flower", "rock", "grass", "shell", "mushroom"].find((k) => b.props.includes(k as PropKind)) as PropKind) ?? "rock", r, night);
      const x = -SPAN + (i / 26) * SPAN * 2 + r() * 0.8;
      obj.position.set(x, 0, back ? -1.3 - r() * 3.5 : 1.15 + r() * 0.6);
      obj.rotation.y = r() * Math.PI * 2;
      this.biomeGroup.add(obj);
      this.props.push({ obj, x, side: back ? -1 : 1 });
    }
    // Night: warm lanterns along the path.
    if (night) {
      for (let i = 0; i < 4; i++) {
        const lantern = new THREE.Group();
        lantern.add(mesh(G.cyl, "#6b5a5a", [0.025, 0.7, 0.025], [0, 0.35, 0]));
        const bulb = new THREE.Mesh(G.sphere, glowMaterial("#ffd27a")); bulb.scale.setScalar(0.08); bulb.position.y = 0.74; lantern.add(bulb);
        const halo = new THREE.Sprite(new THREE.SpriteMaterial({ map: softDotTexture(), color: "#ffcf6a", transparent: true, opacity: 0.8, blending: THREE.AdditiveBlending, depthWrite: false })); halo.scale.setScalar(0.9); halo.position.y = 0.74; lantern.add(halo);
        const x = -SPAN + i * (SPAN / 2);
        lantern.position.set(x, 0, -0.95);
        this.biomeGroup.add(lantern);
        this.props.push({ obj: lantern, x, side: -1 });
      }
    }
    this.syncLandmarks();
  }

  private buildPartner(p: HomeState["partner"]) {
    if (this.partner) { this.partner.walker.removeFromParent(); this.partner.rig.dispose(); this.partner = undefined; }
    if (!p) return;
    const rig = buildCreature(p.speciesID, p.variant, this.data);
    const walker = new THREE.Group();
    walker.add(rig.root);
    // Big forms are scaled down a little so everyone fits the view.
    walker.scale.setScalar(Math.min(1, 1.35 / rig.height));
    rig.root.rotation.y = -0.55;
    walker.position.set(0, 0, 0.1);
    this.world.add(walker);
    const badge = sprite("bandage", 0.28);
    badge.position.set(0.15, rig.height * 0.95, 0.4);
    rig.root.add(badge);
    badge.visible = false;
    rig.root.traverse((o) => { o.userData.partner = true; });
    this.partner = { rig, anim: new CreatureAnimator(rig, 1), walker, key: `${p.speciesID}|${p.variant}`, badge };
  }

  private syncBoss(species?: string) {
    if (this.boss && this.boss.species !== species) { this.boss.root.removeFromParent(); this.boss.rig.dispose(); this.boss = undefined; }
    if (!species || this.boss) return;
    const rig = buildCreature(species, "normal", this.data, { silhouette: true });
    darken(rig);
    const root = new THREE.Group();
    root.add(rig.root);
    root.scale.setScalar(Math.min(1.3, 1.9 / rig.height));
    rig.root.scale.x *= -1;
    rig.root.rotation.y = 0.5;
    const aura = new THREE.Sprite(new THREE.SpriteMaterial({ map: softDotTexture(), color: "#ffb13b", transparent: true, opacity: 0.5, blending: THREE.AdditiveBlending, depthWrite: false }));
    aura.scale.set(rig.width * 2.2, rig.height * 2, 1);
    // Behind the boss, so the glow frames it instead of washing over it.
    aura.position.set(0, rig.height * 0.5, -rig.width * 0.9);
    aura.userData.pulse = true;
    root.add(aura);
    const crown = sprite("crown", 0.4);
    crown.position.y = rig.height + 0.35;
    root.add(crown);
    root.position.set(3.1, 0, -0.1);
    root.traverse((o) => { o.userData.eventId = "boss"; });
    this.world.add(root);
    this.boss = { rig, root, species };
    ringEffect(this.particles, root.position.clone().setY(0.2), "#ffcf4a", 1.4, this.quality.particles);
  }

  private syncEvents(list: HomeEvent[]) {
    const ids = new Set(list.map((e) => e.id));
    for (const [id, e] of this.events) if (!ids.has(id)) { e.root.removeFromParent(); e.rig?.dispose(); this.events.delete(id); }
    list.forEach((ev, i) => {
      const existing = this.events.get(ev.id);
      const target = new THREE.Vector3(2.3 + i * 1.3, 0, i % 2 ? -0.3 : 0.05);
      if (existing) { existing.slot = i; existing.target.copy(target); return; }
      const obj = this.buildEvent(ev, target, i);
      this.events.set(ev.id, obj);
      if (!this.seen.has(ev.id)) {
        // A brand-new event drops in with a bounce and a ring burst.
        this.seen.add(ev.id);
        obj.born = this.time;
        obj.root.position.y = 3;
      } else obj.born = -10;
    });
  }

  private buildEvent(ev: HomeEvent, target: THREE.Vector3, slot: number): EventObject {
    const root = new THREE.Group();
    root.position.copy(target);
    let rig: CreatureRig | undefined;
    let marker: THREE.Sprite | undefined;
    switch (ev.kind) {
      case "battle": {
        rig = buildCreature(ev.species ?? "pixelito", ev.variant ?? "normal", this.data, { silhouette: true });
        darken(rig);
        rig.root.scale.x *= -1;
        rig.root.rotation.y = 0.5;
        root.add(rig.root);
        root.scale.setScalar(Math.min(1, 1.3 / rig.height));
        marker = sprite("alert", 0.38);
        marker.position.y = rig.height + 0.35;
        root.add(marker);
        break;
      }
      case "cache": {
        const crate = mesh(G.box, "#ffd27a", [0.42, 0.36, 0.36], [0, 0.2, 0], { emissive: "#ffb13b" });
        crate.userData.crate = true;
        root.add(crate);
        for (const y of [0.12, 0.28]) {
          const stripe = new THREE.Mesh(G.box, glowMaterial("#4fe3e0"));
          stripe.position.y = y;
          stripe.scale.set(0.44, 0.03, 0.38);
          root.add(stripe);
        }
        const halo = new THREE.Sprite(new THREE.SpriteMaterial({ map: softDotTexture(), color: "#ffe27a", transparent: true, opacity: 0.7, blending: THREE.AdditiveBlending, depthWrite: false }));
        halo.scale.setScalar(1.3); halo.position.y = 0.25; halo.userData.pulse = true;
        root.add(halo);
        break;
      }
      case "sos": {
        rig = buildCreature(ev.species ?? "polillux", ev.variant ?? "normal", this.data, { silhouette: true });
        darken(rig);
        rig.root.scale.x *= -1;
        rig.root.rotation.y = 0.5;
        const holder = new THREE.Group();
        holder.add(rig.root);
        holder.scale.setScalar(Math.min(0.75, 0.8 / rig.height));
        root.add(holder);
        const h = 0.85;
        for (let i = 0; i < 8; i++) { const a = (i / 8) * Math.PI * 2; root.add(mesh(G.cyl, "#c9b8e8", [0.02, h, 0.02], [Math.cos(a) * 0.42, h / 2, Math.sin(a) * 0.42])); }
        root.add(mesh(G.cyl, "#a996d8", [0.46, 0.04, 0.46], [0, h, 0]));
        root.add(mesh(G.cyl, "#a996d8", [0.46, 0.04, 0.46], [0, 0.02, 0]));
        marker = sprite("help", 0.34);
        marker.position.y = h + 0.35;
        marker.userData.blink = true;
        root.add(marker);
        break;
      }
      case "hazard": {
        for (let i = 0; i < 5; i++) {
          const puff = new THREE.Mesh(G.sphere, softMaterial("#4f4a72", { emissive: "#3a2f6a", emissiveIntensity: 0.35 }));
          puff.scale.set(0.35 + (i % 2) * 0.12, 0.25, 0.3);
          puff.position.set(Math.cos(i * 1.3) * 0.3, 0.75 + Math.sin(i * 2.1) * 0.1, Math.sin(i * 1.3) * 0.2);
          puff.userData.cloud = i;
          root.add(puff);
        }
        const bolt = new THREE.Mesh(G.octa, glowMaterial("#e04fd0"));
        bolt.scale.set(0.05, 0.35, 0.05); bolt.position.y = 0.5; bolt.userData.bolt = true;
        root.add(bolt);
        root.userData.storm = true;
        break;
      }
    }
    root.traverse((o) => { o.userData.eventId = ev.id; });
    this.world.add(root);
    return { id: ev.id, kind: ev.kind, root, rig, marker, slot, born: this.time, target: target.clone() };
  }

  private syncLandmarks() {
    const s = this.state;
    if (!s) return;
    const want = new Set<number>();
    const first = Math.floor(this.shown / 1000);
    for (let m = first; m <= first + 2; m++) {
      const step = m * 1000;
      if (step <= 0 || step >= s.progress.total) continue;
      want.add(m);
    }
    for (const [m, obj] of this.landmarks) if (!want.has(m)) { obj.removeFromParent(); this.landmarks.delete(m); }
    for (const m of want) {
      if (this.landmarks.has(m)) continue;
      const obj = buildLandmark(m - 1, s.night);
      obj.position.set((m * 1000 - this.shown) * UNIT, 0, -0.95);
      this.world.add(obj);
      this.landmarks.set(m, obj);
    }
  }

  // MARK: Loop

  private onVisibility = () => { this.kick(); };
  private kick() {
    const should = !this.disposed && this.visible && document.visibilityState === "visible";
    if (should && !this.running) { this.running = true; this.last = performance.now(); this.frame = requestAnimationFrame(this.loop); }
    if (!should) this.running = false;
  }

  private loop = (now: number) => {
    if (this.disposed || !this.running) return;
    const dt = Math.min(0.05, (now - this.last) / 1000);
    this.last = now;
    this.adaptQuality(dt);
    this.update(dt);
    this.renderer.render(this.scene, this.camera);
    this.frame = requestAnimationFrame(this.loop);
  };

  private update(dt: number) {
    this.time += dt;
    const s = this.state;
    const injured = !!s?.partner?.injured;
    // Treadmill speed: idle walk, boosted by new steps; stops before an event or a waiting boss.
    const blocked = this.events.size > 0 || !!this.boss;
    const target = blocked ? 0 : (BASE_SPEED + this.boost) * (injured ? 0.5 : 1);
    this.speed += (target - this.speed) * Math.min(1, dt * (blocked ? 3 : 2));
    this.boost = Math.max(0, this.boost - dt * 0.8);
    // Route progress shown eases toward the real value (new steps make the landmarks approach).
    if (s) {
      const gap = s.progress.walked - this.shown;
      this.shown += gap * Math.min(1, dt * 1.5);
      if (Math.abs(gap) < 0.5) this.shown = s.progress.walked;
      if (Math.abs(gap) > 30) this.boost = Math.max(this.boost, Math.min(3, gap / 300));
    }
    const advance = this.speed * dt;
    this.scroll += advance;
    if (this.pathTex) this.pathTex.offset.x = (this.scroll * 0.25) % 1;

    // Props scroll left and wrap around.
    for (const p of this.props) {
      p.x -= advance;
      if (p.x < -SPAN) p.x += SPAN * 2;
      p.obj.position.x = p.x;
      if (p.obj.userData.float) p.obj.position.y = Math.sin(this.time + p.x) * 0.08;
      for (const c of p.obj.children) {
        if (c.userData.spin) c.rotation.z += c.userData.spin * dt;
        if (c.userData.float) c.position.y += Math.sin(this.time * 1.5 + p.x) * 0.002;
      }
    }
    for (const [m, obj] of this.landmarks) {
      obj.position.x = (m * 1000 - this.shown) * UNIT + 0.6;
      for (const c of obj.children) {
        if (c.userData.flicker) c.scale.y = 0.3 + Math.sin(this.time * 18) * 0.04;
        if (c.userData.spin) c.rotation.y += c.userData.spin * dt;
      }
    }
    this.syncLandmarks();

    // Partner: walk cycle on top of the animator's idle.
    const p = this.partner;
    if (p) {
      p.anim.update(dt);
      const moving = Math.min(1, this.speed / BASE_SPEED);
      this.walkPhase += dt * (5 + this.speed * 4) * (moving > 0.05 ? 1 : 0);
      const hop = Math.abs(Math.sin(this.walkPhase)) * 0.09 * moving;
      let extra = 0;
      if (this.hopT >= 0) { this.hopT += dt; extra = Math.sin(Math.min(1, this.hopT / 0.5) * Math.PI) * 0.35; if (this.hopT > 0.5) this.hopT = -1; }
      p.walker.position.y = hop + extra;
      p.walker.rotation.z = Math.sin(this.walkPhase) * 0.05 * moving - (injured ? 0.06 : 0);
      p.walker.rotation.x = injured ? 0.06 : 0;
      p.badge.position.y = p.rig.height * 0.95 + Math.sin(this.time * 2) * 0.03;
      // Dust puffs while walking.
      if (moving > 0.3 && this.quality.effects && Math.random() < dt * 6 * moving) {
        this.particles.spawn(new THREE.Vector3(-0.2, 0.05, 0.1), new THREE.Vector3(-0.6 - this.speed * 0.4, 0.3, (Math.random() - 0.5) * 0.3), this.biome.pathEdge, 0.14, 0.5, { drag: 2, grow: 1 });
      }
    }

    // Events: drop in, bob, pulse; the storm swirls.
    for (const e of this.events.values()) {
      const age = this.time - e.born;
      const tx = e.target.x;
      e.root.position.x += (tx - e.root.position.x) * Math.min(1, dt * 4);
      e.root.position.z = e.target.z;
      if (age >= 0 && age < 0.7) {
        const t = age / 0.7;
        const bounce = t < 0.6 ? 3 * (1 - t / 0.6) ** 2 : Math.abs(Math.sin((t - 0.6) * Math.PI * 5)) * 0.25 * (1 - t);
        e.root.position.y = bounce;
        if (age + dt >= 0.42 && age < 0.42) ringEffect(this.particles, e.root.position.clone().setY(0.15), e.kind === "battle" ? "#ff5a4f" : e.kind === "cache" ? "#ffe27a" : e.kind === "sos" ? "#ff9bc0" : "#e04fd0", 1, this.quality.particles);
      } else e.root.position.y = e.kind === "cache" ? Math.abs(Math.sin(this.time * 2.5)) * 0.08 : Math.sin(this.time * 2 + e.slot) * 0.03;
      if (e.marker) {
        const k = 1 + Math.sin(this.time * 8) * 0.12;
        const base = e.kind === "sos" ? 0.34 : 0.38;
        const img = e.marker.material.map!.image as HTMLCanvasElement;
        e.marker.scale.set(base * k * (img.width / img.height), base * k, 1);
        if (e.marker.userData.blink) e.marker.material.opacity = Math.sin(this.time * 6) > -0.3 ? 1 : 0.35;
      }
      e.rig && (e.rig.root.position.y = Math.sin(this.time * 3 + e.slot) * 0.02);
      for (const c of e.root.children) {
        if (c.userData.pulse) (c as THREE.Sprite).material.opacity = 0.5 + Math.sin(this.time * 4) * 0.2;
        if (c.userData.cloud !== undefined) { const i = c.userData.cloud as number; c.position.x = Math.cos(this.time * 1.5 + i * 1.3) * 0.3; c.position.z = Math.sin(this.time * 1.5 + i * 1.3) * 0.2; }
        if (c.userData.bolt) { c.visible = Math.sin(this.time * 13) > 0.6; c.rotation.z = Math.sin(this.time * 31) * 0.4; }
      }
      if (e.root.userData.storm && Math.random() < dt * 30 * this.quality.particles) {
        const a = Math.random() * Math.PI * 2, r = 0.5 + Math.random() * 0.3;
        const pos = e.root.position.clone().add(new THREE.Vector3(Math.cos(a) * r, 0.2 + Math.random() * 0.9, Math.sin(a) * r * 0.6));
        this.particles.spawn(pos, new THREE.Vector3(-Math.sin(a) * 2, 0.4, Math.cos(a) * 1.2), Math.random() < 0.5 ? "#e04fd0" : "#4fe3e0", 0.1, 0.5, { drag: 1 });
      }
      if (e.kind === "cache" && Math.random() < dt * 8 * this.quality.particles) {
        const pos = e.root.position.clone().add(new THREE.Vector3((Math.random() - 0.5) * 0.5, 0.3 + Math.random() * 0.3, (Math.random() - 0.5) * 0.3));
        this.particles.spawn(pos, new THREE.Vector3(0, 0.5, 0), Math.random() < 0.5 ? "#ffe27a" : "#ffffff", 0.08, 0.7, { drag: 0.5 });
      }
    }
    // Boss: menacing bob and aura.
    if (this.boss) {
      this.boss.root.position.y = Math.sin(this.time * 1.6) * 0.04;
      this.boss.root.traverse((o) => { if (o.userData.pulse) (o as THREE.Sprite).material.opacity = 0.4 + Math.sin(this.time * 3) * 0.15; });
    }

    // Ambient particles (pollen, snow, embers…) drifting through the view.
    this.ambientTimer -= dt;
    if (this.ambientTimer <= 0) {
      this.ambientTimer = 0.09 / Math.max(0.2, this.quality.particles);
      const b = this.biome.particle;
      const night = !!s?.night;
      const colors = night ? ["#fff3a8", "#cdeb8b"] : b.colors;
      const pos = new THREE.Vector3(-4 + Math.random() * 11, b.rise < 0 ? 3.5 : 0.2 + Math.random() * 2.4, -2.5 + Math.random() * 3.5);
      const vel = new THREE.Vector3(-this.speed * 0.6 - 0.1, night ? (Math.random() - 0.5) * 0.3 : b.rise * (0.5 + Math.random()), (Math.random() - 0.5) * 0.2);
      this.particles.spawn(pos, vel, colors[Math.floor(Math.random() * colors.length)], night ? 0.09 : b.size, 4 + Math.random() * 2, { drag: 0.05, grow: 0 });
    }
    // Camera: a slow breathing drift.
    if (!this.reduceMotion) {
      this.camera.position.x = -0.3 + Math.sin(this.time * 0.25) * 0.12;
      this.camera.position.y = 2.45 + Math.sin(this.time * 0.4) * 0.05;
      this.camera.lookAt(1, 0.8, 0);
    }
    for (const c of this.biomeGroup.children) if (c.userData.water) c.position.y = 0.005 + Math.sin(this.time * 1.2) * 0.01;
    this.particles.update(dt);
  }

  private adaptQuality(dt: number) {
    this.frameCount++;
    if (this.frameCount < 30) return;
    this.slowFrames = dt > 1 / 45 ? this.slowFrames + 1 : Math.max(0, this.slowFrames - 1);
    if (this.slowFrames < 40) return;
    this.slowFrames = 0;
    if (this.renderer.getPixelRatio() > 1.01) {
      this.renderer.setPixelRatio(Math.max(1, this.renderer.getPixelRatio() - 0.5));
      const size = this.renderer.getSize(new THREE.Vector2());
      this.resize(size.x, size.y);
    } else if (this.renderer.shadowMap.enabled) {
      this.renderer.shadowMap.enabled = false;
      this.quality.shadows = false;
    } else this.quality.particles = Math.max(0.3, this.quality.particles * 0.7);
  }

  // MARK: Taps

  private onTap = (e: PointerEvent) => {
    const r = this.canvas.getBoundingClientRect();
    const ndc = new THREE.Vector2(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
    this.raycaster.setFromCamera(ndc, this.camera);
    const targets: THREE.Object3D[] = [];
    if (this.partner) targets.push(this.partner.walker);
    for (const ev of this.events.values()) targets.push(ev.root);
    if (this.boss) targets.push(this.boss.root);
    const hit = this.raycaster.intersectObjects(targets, true).find((h) => !(h.object as THREE.Sprite).isSprite || h.object.userData.eventId);
    if (!hit) return;
    const id = hit.object.userData.eventId as string | undefined;
    if (id) { this.opts.onTapEvent(id); return; }
    if (hit.object.userData.partner) { this.react("happy"); this.opts.onTapPartner(); }
  };

  private hearts(at: THREE.Vector3) {
    if (!this.partner) return;
    const heart = sprite("heart", 0.32);
    heart.position.copy(at).add(new THREE.Vector3(0.2, 0.2, 0.3));
    this.world.add(heart);
    const start = this.time;
    const tick = () => {
      const t = this.time - start;
      heart.position.y += 0.012;
      heart.material.opacity = Math.max(0, 1 - t / 1.1);
      if (t < 1.1 && !this.disposed) requestAnimationFrame(tick); else { heart.removeFromParent(); heart.material.dispose(); }
    };
    requestAnimationFrame(tick);
    riseEffect(this.particles, this.partner.walker.position, ["#ff9bc0", "#ffffff", "#ffe27a"], 22, 0.8, this.quality.particles);
  }
}

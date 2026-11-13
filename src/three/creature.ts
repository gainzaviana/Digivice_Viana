import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import type { GameData, Stage } from "../data/models";
import type { Variant } from "../core/save";
import { Material as M, SpriteForge, type Look, type Point } from "../art/forge";
import { drawBody, lookFor } from "../art/bodies";
import { PALETTE } from "../art/palette";
import { glowMaterial, softDotTexture, softMaterial } from "./materials";

/**
 * Full 3D Ecos, built from the same body plans as the pixel sprites so every design keeps its
 * identity. The plan runs on a recorder; each 2D primitive becomes a soft volume:
 * ellipse → ellipsoid, triangle → rounded wedge, rect → rounded block, line → capsule,
 * ring → torus, eye → glossy eye, seam → glowing tube, glow → emissive bead.
 * Colours live in vertex colours (so the plan's bands become painted stripes) and the body is
 * one merged mesh; eyes and seams stay separate so they can animate.
 *
 * Space: the Eco faces +x, its feet touch y = 0, centred on x = 0, z = 0; the camera side is +z.
 */

// MARK: Recording the plan

type Prim =
  | { t: "ellipse"; cx: number; cy: number; rx: number; ry: number; m: M; lift: number; order: number }
  | { t: "triangle"; a: Point; b: Point; c: Point; m: M; lift: number; order: number }
  | { t: "rect"; x0: number; y0: number; x1: number; y1: number; m: M; lift: number; order: number }
  | { t: "line"; a: Point; b: Point; m: M; width: number; lift: number; order: number }
  | { t: "ring"; cx: number; cy: number; r: number; m: M; thickness: number; lift: number; order: number };

interface Band { y0: number; y1: number; over: M; to: M; x0: number; x1: number; after: number }
interface Seam { a: Point; b: Point; allowed: M[]; after: number }
interface Eye { cx: number; cy: number; after: number }

/** A forge that records the plan's primitives instead of drawing pixels. */
export class ShapeRecorder extends SpriteForge {
  prims: Prim[] = [];
  bands: Band[] = [];
  seams: Seam[] = [];
  eyes: Eye[] = [];
  glitch: { rows: number[]; offset: number }[] = [];
  private order = 0;
  constructor(n: number) { super(n); }
  override ellipse(cx: number, cy: number, rx: number, ry: number, m: M, lift = 0) { this.prims.push({ t: "ellipse", cx, cy, rx, ry, m, lift, order: this.order++ }); }
  override triangle(a: Point, b: Point, c: Point, m: M, lift = 0) { this.prims.push({ t: "triangle", a, b, c, m, lift, order: this.order++ }); }
  override rect(x0: number, y0: number, x1: number, y1: number, m: M, lift = 0) { this.prims.push({ t: "rect", x0, y0, x1, y1, m, lift, order: this.order++ }); }
  override line(a: Point, b: Point, m: M, width = 1, lift = 0) { this.prims.push({ t: "line", a, b, m, width, lift, order: this.order++ }); }
  override ring(cx: number, cy: number, r: number, m: M, thickness = 1, lift = 0) { this.prims.push({ t: "ring", cx, cy, r, m, thickness, lift, order: this.order++ }); }
  override band(y0: number, y1: number, over: M, to: M, x0 = 0, x1 = 1) { this.bands.push({ y0, y1, over, to, x0, x1, after: this.order }); }
  override eye(cx: number, cy: number) { this.eyes.push({ cx, cy, after: this.order }); }
  override seamLine(a: Point, b: Point, allowed: M[] = [M.main, M.second]) { this.seams.push({ a, b, allowed, after: this.order }); }
  override glitchRows(rows: number[], offset: number) { this.glitch.push({ rows, offset }); }
}

// MARK: Public API

export interface CreatureRig {
  root: THREE.Group;
  body: THREE.Group;
  height: number;
  width: number;
  eyes: THREE.Object3D[];
  seams: THREE.Mesh[];
  colors: { main: string; second: string; accent: string; seam: string };
  dispose(): void;
}

/** World height of each stage. */
export const STAGE_HEIGHT: Record<Stage, number> = { brote: 0.75, novato: 1, avanzado: 1.25, elite: 1.5, supremo: 1.75, despertar: 1.85, fusion: 2.1 };

const WARM = new THREE.Color("#fff1dc");

/** Cozy colour from a palette hex: a touch warmer and softer. */
function cozy(hex: string, amount = 0.12): THREE.Color {
  return new THREE.Color(hex).lerp(WARM, amount);
}

interface Palette3D { main: THREE.Color; second: THREE.Color; accent: THREE.Color; dark: THREE.Color; seam: string; hex: { main: string; second: string; accent: string; seam: string } }

function paletteFor(look: Look, variant: Variant): Palette3D {
  if (variant === "brillante") {
    look = { ...look, main: [PALETTE.amber1, PALETTE.amber2, PALETTE.amber3, PALETTE.cream], second: [PALETTE.skin, PALETTE.cream, PALETTE.white, PALETTE.white] };
  }
  const pick = (ramp: string[], i: number) => ramp[Math.min(ramp.length - 1, i)];
  const hex = { main: pick(look.main, 1), second: pick(look.second, 1), accent: pick(look.accent, 2), seam: look.seam };
  return { main: cozy(hex.main), second: cozy(hex.second), accent: cozy(hex.accent, 0.08), dark: cozy(pick(look.dark, 1), 0.2), seam: look.seam, hex };
}

/** A part being built: its 2D footprint (for bands, eyes and seams) and its geometry. */
interface Part { prim: Prim; geo: THREE.BufferGeometry; m: M; zc: number; depth: number; contains(x: number, y: number): boolean; frontZ(x: number, y: number): number }

const isBodyMaterial = (m: M) => m === M.main || m === M.second || m === M.accent || m === M.dark;

/**
 * Builds an Eco as a 3D figure. In node (tests) it builds geometry only; the halo needs a DOM.
 */
export function buildCreature(speciesID: string, variant: Variant, data: GameData, opts: { silhouette?: boolean } = {}): CreatureRig {
  const species = data.eco.get(speciesID);
  const rec = new ShapeRecorder(32);
  if (species) drawBody(rec, species);
  const look = species ? lookFor(species) : lookFor(data.ecos[0]);
  const pal = paletteFor(look, variant);
  const stageHeight = STAGE_HEIGHT[species?.stage ?? "novato"];

  // Torso: the biggest body ellipse is deeper, so the figure reads as round.
  let torso = -1, best = 0;
  rec.prims.forEach((p, i) => {
    if (p.t === "ellipse" && isBodyMaterial(p.m) && p.rx * p.ry > best) { best = p.rx * p.ry; torso = i; }
  });
  const total = Math.max(1, rec.prims.length);
  const zOf = (p: Prim) => (p.order / total - 0.5) * 0.14 + p.lift * 0.07;

  const parts: Part[] = [];
  const glowParts: THREE.BufferGeometry[] = [];
  rec.prims.forEach((p, i) => {
    const part = buildPart(p, zOf(p), i === torso);
    if (!part) return;
    if (p.m === M.glow || p.m === M.seam) glowParts.push(part.geo);
    else parts.push(part);
    // Far-side copies of small parts near the ground (legs, feet) so the figure has depth.
    if (isBodyMaterial(p.m) && footprintArea(p) < 0.02 && centreY(p) > 0.7) {
      const back = buildPart(p, -zOf(p) - 0.06, false)!;
      parts.push({ ...back, m: p.m === M.dark ? M.dark : p.m, zc: -1 });
    }
  });

  // Vertex colours: material colour, the plan's bands painted over, soft AO towards the feet.
  const yFeet = feetLine(rec.prims);
  const colourOf: Record<number, THREE.Color> = { [M.main]: pal.main, [M.second]: pal.second, [M.accent]: pal.accent, [M.dark]: pal.dark };
  const tmp = new THREE.Color();
  for (const part of parts) {
    const pos = part.geo.getAttribute("position");
    const colors = new Float32Array(pos.count * 3);
    const order = part.prim.order;
    for (let v = 0; v < pos.count; v++) {
      const x2 = pos.getX(v) + 0.5, y2 = 0.5 - pos.getY(v);
      let m = part.m;
      for (const b of rec.bands) {
        if (b.after > order && m === b.over && y2 >= b.y0 && y2 < b.y1 && x2 >= b.x0 && x2 < b.x1) m = b.to;
      }
      tmp.copy(colourOf[m] ?? pal.main);
      if (part.zc === -1) tmp.multiplyScalar(0.78);
      // Ambient occlusion: a little darker low down and in the back.
      const low = Math.min(1, Math.max(0, (y2 - (yFeet - 0.25)) / 0.25));
      tmp.multiplyScalar(1 - 0.18 * low - (pos.getZ(v) < -0.05 ? 0.06 : 0));
      if (variant === "infectado" && hashNoise(pos.getX(v), pos.getY(v), pos.getZ(v)) > 0.82) tmp.set(PALETTE.purple2);
      colors[v * 3] = tmp.r; colors[v * 3 + 1] = tmp.g; colors[v * 3 + 2] = tmp.b;
    }
    part.geo.setAttribute("color", new THREE.BufferAttribute(colors, 3));
  }

  // Glitch rows: a horizontal slip in those slices (glitch line, infected variants, fusions).
  const glitch = [...rec.glitch];
  if (variant === "infectado") glitch.push({ rows: [0.45, 0.62, 0.78], offset: 1 });
  if (glitch.length) {
    for (const part of parts) {
      const pos = part.geo.getAttribute("position");
      for (let v = 0; v < pos.count; v++) {
        const y2 = 0.5 - pos.getY(v);
        for (const g of glitch) for (const r of g.rows) if (Math.abs(y2 - r) < 0.025) pos.setX(v, pos.getX(v) + g.offset * 0.02);
      }
    }
  }

  // Merge the body into one mesh.
  // Each part keeps its own smooth normals (recomputing on merged triangles would make it faceted).
  const bodyGeo = mergeGeometries(parts.map((p) => toNonIndexedColored(p.geo)), false)!;
  const silhouette = !!opts.silhouette;
  const bodyMat = silhouette
    ? new THREE.MeshBasicMaterial({ color: "#5a5478" })
    : cloneSoft(softMaterial("#ffffff", { vertexColors: true, roughness: 0.58, wrap: 0.5, rim: 0.32, subsurface: pal.hex.main }));
  const bodyMesh = new THREE.Mesh(bodyGeo, bodyMat);
  bodyMesh.castShadow = true;
  bodyMesh.receiveShadow = false;

  const model = new THREE.Group();
  model.add(bodyMesh);

  // Glow beads.
  const seams: THREE.Mesh[] = [];
  if (glowParts.length && !silhouette) {
    const g = mergeGeometries(glowParts.map(toNonIndexedColored), false)!;
    const mesh = new THREE.Mesh(g, glowMaterial(lighten(pal.seam, 0.2)));
    model.add(mesh);
    seams.push(mesh);
  }

  // Seams: glowing tubes along the surface.
  if (!silhouette) {
    const tubes: THREE.BufferGeometry[] = [];
    for (const s of rec.seams) {
      const pts: THREE.Vector3[] = [];
      for (let i = 0; i <= 12; i++) {
        const t = i / 12, x = s.a[0] + (s.b[0] - s.a[0]) * t, y = s.a[1] + (s.b[1] - s.a[1]) * t;
        const under = topPartAt(parts, x, y, s.after, s.allowed);
        if (!under) { if (pts.length >= 2) { tubes.push(tube(pts)); } pts.length = 0; continue; }
        pts.push(new THREE.Vector3(x - 0.5, 0.5 - y, under.frontZ(x, y) + 0.004));
      }
      if (pts.length >= 2) tubes.push(tube(pts));
    }
    if (tubes.length) {
      const mesh = new THREE.Mesh(mergeGeometries(tubes, false)!, glowMaterial(lighten(pal.seam, 0.15)));
      model.add(mesh);
      seams.push(mesh);
    }
  }

  // Eyes: glossy, a bit larger than the pixel eye, on the surface they sit on.
  const eyes: THREE.Object3D[] = [];
  if (!silhouette) {
    const eyeR = 0.034;
    const white = new THREE.MeshStandardMaterial({ color: "#fbf8ff", roughness: 0.25 });
    const pupil = new THREE.MeshStandardMaterial({ color: "#221c38", roughness: 0.15, metalness: 0 });
    const shine = new THREE.MeshBasicMaterial({ color: "#ffffff", toneMapped: false });
    const whiteGeo = new THREE.SphereGeometry(eyeR, 16, 12);
    const pupilGeo = new THREE.SphereGeometry(eyeR * 0.72, 14, 10);
    const shineGeo = new THREE.SphereGeometry(eyeR * 0.26, 8, 6);
    for (const e of rec.eyes) {
      const under = topPartAt(parts, e.cx, e.cy, e.after);
      const z = under ? under.frontZ(e.cx, e.cy) : 0.1;
      const eye = new THREE.Group();
      eye.position.set(e.cx - 0.5, 0.5 - e.cy, z - eyeR * 0.35);
      const w = new THREE.Mesh(whiteGeo, white);
      const p = new THREE.Mesh(pupilGeo, pupil);
      p.position.set(eyeR * 0.22, -eyeR * 0.05, eyeR * 0.45);
      const h = new THREE.Mesh(shineGeo, shine);
      h.position.set(eyeR * 0.05, eyeR * 0.32, eyeR * 0.95);
      eye.add(w, p, h);
      model.add(eye);
      eyes.push(eye);
    }
  }

  // Normalise: feet on y = 0, centred, scaled to the stage's height.
  model.updateMatrixWorld(true);
  const box = new THREE.Box3().setFromObject(model);
  const size = new THREE.Vector3();
  box.getSize(size);
  const k = stageHeight / Math.max(0.01, size.y);
  model.scale.setScalar(k);
  model.position.set(-((box.min.x + box.max.x) / 2) * k, -box.min.y * k, -((box.min.z + box.max.z) / 2) * k);

  const body = new THREE.Group();
  body.add(model);

  // Despertar: a soft halo behind the figure.
  if (species?.stage === "despertar" && !silhouette && typeof document !== "undefined") {
    const halo = new THREE.Sprite(new THREE.SpriteMaterial({ map: softDotTexture(), color: lighten(pal.seam, 0.3), transparent: true, opacity: 0.32, blending: THREE.AdditiveBlending, depthWrite: false }));
    halo.scale.setScalar(stageHeight * 1.6);
    halo.position.set(0, stageHeight * 0.55, -0.3);
    body.add(halo);
  }

  const root = new THREE.Group();
  root.add(body);
  root.name = `eco:${speciesID}`;

  return {
    root, body, height: stageHeight, width: size.x * k, eyes, seams,
    colors: pal.hex,
    dispose() {
      root.traverse((o) => {
        const mesh = o as THREE.Mesh;
        if (mesh.geometry) mesh.geometry.dispose();
      });
      bodyMat.dispose();
    },
  };
}

// MARK: Parts

function buildPart(p: Prim, zc: number, isTorso: boolean): Part | undefined {
  const X = (x: number) => x - 0.5, Y = (y: number) => 0.5 - y;
  switch (p.t) {
    case "ellipse": {
      const rx = Math.max(0.012, p.rx), ry = Math.max(0.012, p.ry);
      const rz = isTorso ? (rx + ry) / 2 * 0.95 : Math.min(rx, ry) * 0.9 + 0.01;
      // Segments by size: smooth big volumes, cheap small beads.
      const seg = Math.round(Math.min(18, Math.max(8, 6 + Math.sqrt(rx * ry) * 55)));
      const geo = new THREE.SphereGeometry(1, seg, Math.max(6, Math.round(seg * 0.7)));
      geo.scale(rx, ry, rz);
      geo.translate(X(p.cx), Y(p.cy), zc);
      return {
        prim: p, geo, m: p.m, zc, depth: rz,
        contains: (x, y) => ((x - p.cx) / rx) ** 2 + ((y - p.cy) / ry) ** 2 <= 1,
        frontZ: (x, y) => zc + rz * Math.sqrt(Math.max(0, 1 - ((x - p.cx) / rx) ** 2 - ((y - p.cy) / ry) ** 2)),
      };
    }
    case "triangle": {
      const pts = [p.a, p.b, p.c];
      const area = Math.abs((p.b[0] - p.a[0]) * (p.c[1] - p.a[1]) - (p.c[0] - p.a[0]) * (p.b[1] - p.a[1])) / 2;
      if (area < 1e-5) return undefined;
      const minEdge = Math.min(...pts.map((q, i) => Math.hypot(q[0] - pts[(i + 1) % 3][0], q[1] - pts[(i + 1) % 3][1])));
      const depth = Math.min(0.09, Math.max(0.02, minEdge * 0.35));
      const bevel = Math.min(depth * 0.5, minEdge * 0.18);
      // Shrink the outline by the bevel so the rounded wedge keeps the plan's size.
      const c = [(p.a[0] + p.b[0] + p.c[0]) / 3, (p.a[1] + p.b[1] + p.c[1]) / 3];
      const shrink = (q: Point) => {
        const d = Math.hypot(q[0] - c[0], q[1] - c[1]) || 1;
        const k = Math.max(0.3, (d - bevel * 1.3) / d);
        return [c[0] + (q[0] - c[0]) * k, c[1] + (q[1] - c[1]) * k] as const;
      };
      const shape = new THREE.Shape(pts.map(shrink).map((q) => new THREE.Vector2(X(q[0]), Y(q[1]))));
      const geo = new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: true, bevelThickness: bevel, bevelSize: bevel, bevelSegments: 1, curveSegments: 1 });
      geo.translate(0, 0, zc - depth / 2);
      const front = zc + depth / 2 + bevel;
      return { prim: p, geo, m: p.m, zc, depth, contains: (x, y) => inTriangle(x, y, p.a, p.b, p.c), frontZ: () => front };
    }
    case "rect": {
      const w = Math.max(0.015, p.x1 - p.x0), h = Math.max(0.015, p.y1 - p.y0);
      const r = Math.min(w, h) * 0.32;
      const depth = Math.max(0.02, Math.min(w, h) * 0.75);
      const bevel = Math.min(r, depth * 0.35);
      const shape = roundedRect(X(p.x0) + bevel, Y(p.y1) + bevel, w - bevel * 2, h - bevel * 2, Math.max(0.001, r - bevel));
      // Big blocks get rounder edges; small ones stay cheap.
      const bigBlock = w * h > 0.03;
      const geo = new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: true, bevelThickness: bevel, bevelSize: bevel, bevelSegments: bigBlock ? 3 : 1, curveSegments: bigBlock ? 5 : 2 });
      geo.translate(0, 0, zc - depth / 2);
      const front = zc + depth / 2 + bevel;
      return {
        prim: p, geo, m: p.m, zc, depth,
        contains: (x, y) => x >= p.x0 && x <= p.x1 && y >= p.y0 && y <= p.y1,
        // The rounded edge falls away from the flat front.
        frontZ: (x, y) => {
          const edge = Math.min(x - p.x0, p.x1 - x, y - p.y0, p.y1 - y);
          return edge >= r ? front : front - (r - Math.max(0, edge)) * 0.9;
        },
      };
    }
    case "line": {
      const ax = X(p.a[0]), ay = Y(p.a[1]), bx = X(p.b[0]), by = Y(p.b[1]);
      const len = Math.hypot(bx - ax, by - ay);
      const radius = 0.012 + Math.max(1, p.width) * 0.008;
      const geo = new THREE.CapsuleGeometry(radius, Math.max(0.001, len), 3, 7);
      geo.rotateZ(Math.atan2(by - ay, bx - ax) - Math.PI / 2);
      geo.translate((ax + bx) / 2, (ay + by) / 2, zc);
      return {
        prim: p, geo, m: p.m, zc, depth: radius,
        contains: (x, y) => distToSegment(x, y, p.a, p.b) <= radius,
        frontZ: () => zc + radius,
      };
    }
    case "ring": {
      const tubeR = 0.008 + Math.max(1, p.thickness) * 0.006;
      const geo = new THREE.TorusGeometry(Math.max(0.02, p.r - tubeR), tubeR, 6, 32);
      geo.translate(X(p.cx), Y(p.cy), zc);
      return {
        prim: p, geo, m: p.m, zc, depth: tubeR,
        contains: (x, y) => Math.abs(Math.hypot(x - p.cx, y - p.cy) - p.r) <= tubeR * 1.5,
        frontZ: () => zc + tubeR,
      };
    }
  }
}

function roundedRect(x: number, y: number, w: number, h: number, r: number): THREE.Shape {
  const s = new THREE.Shape();
  r = Math.min(r, w / 2, h / 2);
  s.moveTo(x + r, y);
  s.lineTo(x + w - r, y);
  s.quadraticCurveTo(x + w, y, x + w, y + r);
  s.lineTo(x + w, y + h - r);
  s.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  s.lineTo(x + r, y + h);
  s.quadraticCurveTo(x, y + h, x, y + h - r);
  s.lineTo(x, y + r);
  s.quadraticCurveTo(x, y, x + r, y);
  return s;
}

function tube(points: THREE.Vector3[]): THREE.BufferGeometry {
  const curve = new THREE.CatmullRomCurve3(points);
  return new THREE.TubeGeometry(curve, Math.max(4, points.length * 2), 0.011, 5, false).toNonIndexed();
}

/** Mergeable geometry: non-indexed, with only position, normal and color. */
function toNonIndexedColored(g: THREE.BufferGeometry): THREE.BufferGeometry {
  const out = g.index ? g.toNonIndexed() : g;
  for (const name of Object.keys(out.attributes)) if (!["position", "normal", "color"].includes(name)) out.deleteAttribute(name);
  return out;
}

/** The last-drawn body part covering a point (optionally limited to earlier parts and some materials). */
function topPartAt(parts: Part[], x: number, y: number, before = Infinity, allowed?: M[]): Part | undefined {
  let hit: Part | undefined;
  for (const p of parts) {
    if (p.zc === -1 || p.prim.order >= before || !p.contains(x, y)) continue;
    if (allowed && !allowed.includes(p.m)) continue;
    if (!hit || p.prim.order > hit.prim.order) hit = p;
  }
  return hit;
}

function footprintArea(p: Prim): number {
  switch (p.t) {
    case "ellipse": return Math.PI * p.rx * p.ry;
    case "rect": return (p.x1 - p.x0) * (p.y1 - p.y0);
    case "triangle": return Math.abs((p.b[0] - p.a[0]) * (p.c[1] - p.a[1]) - (p.c[0] - p.a[0]) * (p.b[1] - p.a[1])) / 2;
    case "line": return Math.hypot(p.b[0] - p.a[0], p.b[1] - p.a[1]) * 0.03;
    case "ring": return 1;
  }
}

function centreY(p: Prim): number {
  switch (p.t) {
    case "ellipse": case "ring": return p.cy;
    case "rect": return (p.y0 + p.y1) / 2;
    case "triangle": return (p.a[1] + p.b[1] + p.c[1]) / 3;
    case "line": return (p.a[1] + p.b[1]) / 2;
  }
}

/** The lowest point of the plan (y grows downwards). */
function feetLine(prims: Prim[]): number {
  let y = 0.5;
  for (const p of prims) {
    switch (p.t) {
      case "ellipse": y = Math.max(y, p.cy + p.ry); break;
      case "rect": y = Math.max(y, p.y1); break;
      case "triangle": y = Math.max(y, p.a[1], p.b[1], p.c[1]); break;
      case "line": y = Math.max(y, p.a[1], p.b[1]); break;
      case "ring": y = Math.max(y, p.cy + p.r); break;
    }
  }
  return y;
}

function inTriangle(x: number, y: number, a: Point, b: Point, c: Point): boolean {
  const e = (p: Point, q: Point) => (q[0] - p[0]) * (y - p[1]) - (q[1] - p[1]) * (x - p[0]);
  const e1 = e(a, b), e2 = e(b, c), e3 = e(c, a);
  return (e1 >= 0 && e2 >= 0 && e3 >= 0) || (e1 <= 0 && e2 <= 0 && e3 <= 0);
}

function distToSegment(x: number, y: number, a: Point, b: Point): number {
  const dx = b[0] - a[0], dy = b[1] - a[1];
  const t = Math.max(0, Math.min(1, ((x - a[0]) * dx + (y - a[1]) * dy) / (dx * dx + dy * dy || 1)));
  return Math.hypot(x - (a[0] + dx * t), y - (a[1] + dy * t));
}

function hashNoise(x: number, y: number, z: number): number {
  const s = Math.sin(Math.floor(x * 40) * 12.9898 + Math.floor(y * 40) * 78.233 + Math.floor(z * 40) * 37.719) * 43758.5453;
  return s - Math.floor(s);
}

function lighten(hex: string, amount: number): THREE.Color {
  return new THREE.Color(hex).lerp(new THREE.Color("#ffffff"), amount);
}

/** A per-creature copy of a soft material (so flashes and fades don't touch other creatures). */
function cloneSoft(base: THREE.MeshStandardMaterial): THREE.MeshStandardMaterial {
  const m = base.clone();
  m.onBeforeCompile = base.onBeforeCompile;
  m.customProgramCacheKey = base.customProgramCacheKey;
  return m;
}

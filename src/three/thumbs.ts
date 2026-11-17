import * as THREE from "three";
import type { GameData } from "../data/models";
import type { Variant } from "../core/save";
import { buildCreature, preloadCreature } from "./creature";

/**
 * Portraits of the 3D Ecos for the interface (lists, guide, cards): a lit 3/4 view on a
 * transparent background, rendered by ONE shared offscreen renderer, one per idle slice so
 * scrolling never stutters, and cached in memory.
 */

const cache = new Map<string, string>();
const pending = new Map<string, Promise<string>>();
const queue: { key: string; run: () => string; done: (url: string) => void }[] = [];
let scheduled = false;

let renderer: THREE.WebGLRenderer | undefined;
let scene: THREE.Scene | undefined;
let camera: THREE.PerspectiveCamera | undefined;

const keyOf = (id: string, variant: Variant, size: number, silhouette: boolean) => `${id}|${variant}|${size}|${silhouette ? 1 : 0}`;

/** The portrait if it's already rendered (synchronous). */
export function cachedThumbnail(speciesID: string, variant: Variant, size = 128, silhouette = false): string | undefined {
  return cache.get(keyOf(speciesID, variant, size, silhouette));
}

/** A PNG data URL of the Eco's portrait, `size` pixels square. */
export function creatureThumbnail(speciesID: string, variant: Variant, data: GameData, size = 128, silhouette = false): Promise<string> {
  const key = keyOf(speciesID, variant, size, silhouette);
  const hit = cache.get(key);
  if (hit) return Promise.resolve(hit);
  const waiting = pending.get(key);
  if (waiting) return waiting;
  // Sprite figures need their pixels decoded first.
  const promise = preloadCreature(speciesID, variant).then(() => new Promise<string>((done) => {
    queue.push({ key, done, run: () => render(speciesID, variant, data, size, silhouette) });
    schedule();
  }));
  pending.set(key, promise);
  return promise;
}

function schedule() {
  if (scheduled || !queue.length) return;
  scheduled = true;
  const idle = (globalThis as { requestIdleCallback?: (cb: () => void, o?: { timeout: number }) => void }).requestIdleCallback;
  const next = () => {
    scheduled = false;
    const job = queue.shift();
    if (!job) return;
    let url = "";
    try { url = job.run(); } catch { url = ""; }
    cache.set(job.key, url);
    pending.delete(job.key);
    job.done(url);
    schedule();
  };
  if (idle) idle(next, { timeout: 120 });
  else setTimeout(next, 0);
}

function setup() {
  if (renderer) return;
  const canvas = document.createElement("canvas");
  renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true, preserveDrawingBuffer: true });
  renderer.setClearColor(0x000000, 0);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  scene = new THREE.Scene();
  // Warm key light from the front-right, soft cool fill, warm rim from behind.
  const key = new THREE.DirectionalLight("#fff0d8", 2.4);
  key.position.set(2.5, 3.5, 3);
  const fill = new THREE.DirectionalLight("#cfe0ff", 0.8);
  fill.position.set(-3, 1, 2);
  const rim = new THREE.DirectionalLight("#ffd9a8", 1.4);
  rim.position.set(-1, 2.5, -3);
  scene.add(key, fill, rim, new THREE.HemisphereLight("#fff6e8", "#b9a8d6", 1.1));
  camera = new THREE.PerspectiveCamera(28, 1, 0.1, 50);
}

function render(speciesID: string, variant: Variant, data: GameData, size: number, silhouette: boolean): string {
  setup();
  const r = renderer!, s = scene!, cam = camera!;
  const rig = buildCreature(speciesID, variant, data, { silhouette });
  // Slightly turned towards the viewer: a 3/4 view of an Eco facing right.
  rig.root.rotation.y = -0.45;
  s.add(rig.root);
  rig.root.updateMatrixWorld(true);
  const box = new THREE.Box3().setFromObject(rig.root);
  const centre = box.getCenter(new THREE.Vector3());
  const span = box.getSize(new THREE.Vector3());
  const radius = Math.max(span.x, span.y, span.z * 0.8) * 0.62;
  const dist = radius / Math.tan(THREE.MathUtils.degToRad(cam.fov / 2));
  cam.position.set(centre.x + dist * 0.18, centre.y + dist * 0.22, centre.z + dist);
  cam.lookAt(centre);
  r.setSize(size, size, false);
  r.render(s, cam);
  const url = r.domElement.toDataURL("image/png");
  s.remove(rig.root);
  rig.dispose();
  return url;
}

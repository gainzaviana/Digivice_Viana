import { PALETTE as P, rgb } from "./palette";

// The battle backdrop for each zone: dithered sky, two parallax silhouette layers, ground with
// perspective lines, light shafts and ambient particles. Drawn at the scene's 240 × 160 game
// pixels, palette colours only. A port of the native BattleBackdrop (same seeds and shapes).

export const BACKDROP_SIZE = { w: 240, h: 160 } as const;
export const GROUND_Y = 46;
/** Layers are wider than the scene, so drifting layers never show an edge. */
const CANVAS_W = BACKDROP_SIZE.w + 16;

export type Particles = "leaves" | "sand" | "bubbles" | "embers" | "snow" | "spores" | "motes";
export type Shape = "hills" | "canopy" | "sea" | "dunes" | "servers" | "savanna" | "gears" | "deadTrees" | "reeds" | "skyline" | "buildings" | "peaks" | "rocks" | "waves" | "columns" | "arches" | "spires" | "crystals" | "volcano" | "walls" | "fragments" | "pillars" | "hive" | "tower" | "roots";

export interface Theme {
  /** Top → horizon. */
  sky: string[];
  far: string;
  mid: string;
  ground: { top: string; base: string; lines: string };
  farShape: Shape;
  midShape: Shape;
  shafts: boolean;
  particles: Particles;
}

function theme(sky: string[], far: string, mid: string, ground: [string, string, string], farShape: Shape, midShape: Shape, shafts = false, particles: Particles = "motes"): Theme {
  return { sky, far, mid, ground: { top: ground[0], base: ground[1], lines: ground[2] }, farShape, midShape, shafts, particles };
}

const THEMES: Record<string, () => Theme> = {
  "parque-arranque": () => theme([P.blue1, P.blue2, P.blue3], P.green1, P.green0, [P.green2, P.green1, P.green0], "hills", "canopy"),
  "bosque-cache": () => theme([P.teal0, P.teal1, P.green3], P.green0, P.outline, [P.green1, P.green0, P.outline], "canopy", "deadTrees", true, "leaves"),
  "isla-firmware": () => theme([P.blue1, P.blue2, P.blue3], P.teal1, P.green1, [P.cream, P.skin, P.brown1], "sea", "canopy", false, "bubbles"),
  "desierto-servidor": () => theme([P.amber1, P.amber2, P.amber3], P.skin, P.slate, [P.cream, P.skin, P.brown1], "dunes", "servers", false, "sand"),
  "sabana-engranaje": () => theme([P.amber0, P.amber1, P.cream], P.brown1, P.brown0, [P.amber2, P.amber1, P.brown1], "savanna", "gears", false, "sand"),
  "pantano-latencia": () => theme([P.teal0, P.green0, P.green1], P.outline, P.green0, [P.teal1, P.teal0, P.outline], "deadTrees", "reeds", false, "spores"),
  "ciudad-pixel": () => theme([P.outline, P.purple0, P.purple1], P.ink, P.outline, [P.slate, P.ink, P.purple2], "skyline", "buildings"),
  "cumbres-ancho-de-banda": () => theme([P.blue1, P.blue2, P.blue3], P.mist, P.slate, [P.mist, P.slate, P.ink], "peaks", "rocks", false, "snow"),
  "mar-de-paquetes": () => theme([P.blue0, P.blue1, P.blue2], P.teal1, P.teal0, [P.slate, P.ink, P.outline], "sea", "waves", false, "bubbles"),
  "ruinas-legado": () => theme([P.red0, P.amber1, P.amber3], P.mist, P.brown0, [P.skin, P.brown1, P.brown0], "columns", "arches", true),
  "glaciar-criptografico": () => theme([P.blue2, P.blue3, P.white], P.blue3, P.white, [P.white, P.mist, P.blue3], "spires", "crystals", false, "snow"),
  "volcan-compilador": () => theme([P.outline, P.red0, P.red1], P.brown0, P.outline, [P.brown1, P.brown0, P.red1], "volcano", "rocks", false, "embers"),
  "archipielago-proxy": () => theme([P.teal1, P.teal2, P.blue3], P.green1, P.teal0, [P.cream, P.skin, P.brown1], "hills", "waves", false, "bubbles"),
  "ciudadela-cortafuegos": () => theme([P.red0, P.red1, P.amber1], P.ink, P.outline, [P.slate, P.ink, P.red1], "walls", "pillars", false, "embers"),
  "abismo-nulo": () => theme([P.outline, P.outline, P.purple0], P.ink, P.purple0, [P.ink, P.outline, P.purple1], "fragments", "fragments"),
  "santuario-nucleo": () => theme([P.purple0, P.purple1, P.pink], P.mist, P.purple0, [P.mist, P.slate, P.purple1], "pillars", "columns", true),
  "colmena-corrupta": () => theme([P.outline, P.purple0, P.purple1], P.amber0, P.purple0, [P.purple1, P.purple0, P.purple2], "hive", "reeds", false, "spores"),
  "torre-desbordamiento": () => theme([P.blue0, P.blue1, P.purple1], P.ink, P.outline, [P.slate, P.ink, P.blue2], "tower", "fragments"),
  "raiz-del-mundo": () => theme([P.outline, P.green0, P.teal0], P.brown0, P.outline, [P.brown1, P.brown0, P.green1], "roots", "roots", true),
};

/** A zone's colours and shapes (night swaps the sky for a dark one). Unknown zones get the first zone's. */
export function backdropTheme(regionID: string, night = false): Theme {
  const t = (THEMES[regionID] ?? THEMES["parque-arranque"])();
  if (night) t.sky = [P.outline, t.sky[0], P.blue0];
  return t;
}

// MARK: Pixel layers (y up, like the native SpriteKit version)

/** A small RGBA canvas, y up, palette colours only. */
class Pixels {
  readonly bytes: Uint8ClampedArray;
  constructor(readonly w: number, readonly h: number) { this.bytes = new Uint8ClampedArray(w * h * 4); }
  set(x: number, y: number, c: string) {
    if (x < 0 || y < 0 || x >= this.w || y >= this.h) return;
    const [r, g, b] = rgb(c);
    const i = ((this.h - 1 - y) * this.w + x) * 4;
    this.bytes[i] = r; this.bytes[i + 1] = g; this.bytes[i + 2] = b; this.bytes[i + 3] = 255;
  }
  disc(cx: number, cy: number, r: number, c: string) {
    for (let y = cy - r; y <= cy + r; y++) for (let x = cx - r; x <= cx + r; x++) if ((x - cx) ** 2 + (y - cy) ** 2 <= r * r) this.set(x, y, c);
  }
  ring(cx: number, cy: number, r: number, c: string) {
    for (let y = cy - r; y <= cy + r; y++) for (let x = cx - r; x <= cx + r; x++) {
      const d = (x - cx) ** 2 + (y - cy) ** 2;
      if (d <= r * r && d >= (r - 1) * (r - 1)) this.set(x, y, c);
    }
  }
}

const MASK64 = (1n << 64n) - 1n;
/** The native generator: a 64-bit LCG, top bits. */
class Seed {
  private s: bigint;
  constructor(regionID: string) {
    let s = 1469598103934665603n;
    for (const ch of regionID) s = ((s ^ BigInt(ch.codePointAt(0)!)) * 1099511628211n) & MASK64;
    this.s = s;
  }
  next(): number {
    this.s = (this.s * 6364136223846793005n + 1442695040888963407n) & MASK64;
    return Number(this.s >> 33n);
  }
}

const idiv = (a: number, b: number) => Math.trunc(a / b);

function drawSky(colours: string[], night: boolean, seed: Seed): Pixels {
  const px = new Pixels(CANVAS_W, BACKDROP_SIZE.h);
  const top = BACKDROP_SIZE.h, bottom = GROUND_Y;
  const band = idiv(top - bottom, colours.length);
  for (let y = bottom; y < top; y++) {
    const fromTop = top - 1 - y;
    const index = Math.min(colours.length - 1, idiv(fromTop, band));
    const inBand = fromTop % band;
    for (let x = 0; x < CANVAS_W; x++) {
      // A 2-row checker dither where bands meet.
      let c = colours[index];
      if (index + 1 < colours.length && inBand >= band - 2 && (x + y) % 2 === 0) c = colours[index + 1];
      px.set(x, y, c);
    }
  }
  if (night) {
    for (let i = 0; i < 26; i++) {
      const x = seed.next() % CANVAS_W;
      const y = bottom + 30 + (seed.next() % (top - bottom - 31));
      px.set(x, y, P.white);
    }
  }
  return px;
}

function drawSilhouette(shape: Shape, colour: string, height: number, base: number, seed: Seed): Pixels {
  const H = BACKDROP_SIZE.h, W = CANVAS_W;
  const px = new Pixels(W, H);
  const column = (x: number, h: number) => { for (let y = base; y < Math.min(H, base + Math.max(0, h)); y++) px.set(x, y, colour); };
  const r = (max: number) => seed.next() % max;
  switch (shape) {
    case "hills": {
      const a = r(100) / 100;
      for (let x = 0; x < W; x++) column(x, Math.trunc(height * (0.45 + 0.25 * Math.sin(x / 30 + a * 6) + 0.12 * Math.sin(x / 11))));
      break;
    }
    case "canopy": {
      let x = 0;
      while (x < W) {
        const radius = 8 + r(10), cy = base + idiv(height, 2) + r(10);
        px.disc(x, cy, radius, colour);
        column(x, cy - base);
        x += radius + r(8);
      }
      break;
    }
    case "sea":
      for (let x = 0; x < W; x++) column(x, 10 + (idiv(x, 6) % 2));
      for (let i = 0; i < 3; i++) { const x = r(W); px.disc(x, base + 12, 10, colour); column(x, 18); }
      break;
    case "dunes":
      for (let x = 0; x < W; x++) column(x, Math.trunc(height * (0.35 + 0.2 * Math.sin(x / 40) + 0.08 * Math.sin(x / 13))));
      break;
    case "servers": case "buildings": case "skyline": {
      let x = 0;
      while (x < W) {
        const w = 10 + r(16), h = (shape === "skyline" ? height : height - 6) - r(idiv(height, 2));
        for (let xx = x; xx < Math.min(W, x + w); xx++) column(xx, h);
        // Lit windows in the palette's light colours.
        if (shape !== "servers") {
          for (let wy = base + 4; wy < base + h - 3; wy += 5) for (let wx = x + 2; wx < x + w - 2; wx += 4) {
            if (r(3) === 0) px.set(wx, wy, r(2) === 0 ? P.amber2 : P.teal2);
          }
        } else {
          for (let wy = base + 3; wy < base + h - 2; wy += 4) px.set(x + 3, wy, P.green2);
        }
        x += w + 2 + r(6);
      }
      break;
    }
    case "savanna":
      for (let x = 0; x < W; x++) column(x, 3);
      for (let i = 0; i < 4; i++) {
        const x = r(W);
        for (let y = base; y < base + 16; y++) px.set(x, y, colour);
        for (let dx = -10; dx <= 10; dx++) { px.set(x + dx, base + 16 + (Math.abs(dx) > 7 ? 0 : 1), colour); px.set(x + dx, base + 17, colour); }
      }
      break;
    case "gears":
      for (let i = 0; i < 3; i++) { const x = r(W), radius = 6 + r(6); px.ring(x, base + radius, radius, colour); px.ring(x, base + radius, radius - 2, colour); }
      break;
    case "deadTrees": case "roots":
      for (let k = 0; k < (shape === "roots" ? 4 : 6); k++) {
        const x = r(W), h = height - r(16);
        for (let y = base; y < base + h; y++) { px.set(x, y, colour); px.set(x + 1, y, colour); }
        for (let i = 0; i < 3; i++) {
          const y = base + idiv(h, 2) + i * 6, dir = i % 2 === 0 ? 1 : -1;
          for (let d = 0; d < 8; d++) px.set(x + dir * d, y + idiv(d, 2), colour);
        }
      }
      break;
    case "reeds":
      for (let x = 0; x < W; x += 3) column(x, 6 + r(14));
      break;
    case "peaks": {
      let x = -20;
      while (x < W) {
        const w = 30 + r(30), h = height - r(14);
        for (let dx = 0; dx < w; dx++) {
          const hh = h - idiv(Math.abs(dx - idiv(w, 2)) * h * 2, w);
          column(x + dx, hh);
          if (hh > h - 8) for (let y = base + hh - 3; y < base + hh; y++) px.set(x + dx, y, P.white);
        }
        x += w - 8;
      }
      break;
    }
    case "rocks":
      for (let i = 0; i < 6; i++) { const x = r(W); px.disc(x, base, 5 + r(7), colour); }
      break;
    case "waves":
      for (let x = 0; x < W; x++) column(x, 4 + Math.trunc(2 * Math.sin(x / 5)));
      break;
    case "columns": case "pillars": {
      let x = 6;
      while (x < W) {
        const h = shape === "pillars" ? height : height - r(20);
        for (let xx = x; xx < x + 6; xx++) column(xx, h);
        for (let xx = x - 2; xx < x + 8; xx++) { px.set(xx, base + h, colour); px.set(xx, base + h - 1, colour); }
        x += 22 + r(10);
      }
      break;
    }
    case "arches":
      for (let i = 0; i < 2; i++) {
        const x = r(W - 40);
        for (let xx = x; xx < x + 4; xx++) column(xx, 22);
        for (let xx = x + 26; xx < x + 30; xx++) column(xx, 22);
        for (let xx = x; xx < x + 30; xx++) { px.set(xx, base + 22, colour); px.set(xx, base + 23, colour); }
      }
      break;
    case "spires": case "crystals":
      for (let i = 0; i < (shape === "spires" ? 6 : 9); i++) {
        const x = r(W), h = shape === "spires" ? height - r(18) : 8 + r(12), w = shape === "spires" ? 10 : 6;
        for (let dx = 0; dx < w; dx++) column(x + dx, h - idiv(Math.abs(dx - idiv(w, 2)) * h * 2, w));
      }
      break;
    case "volcano": {
      const cx = idiv(W, 2) + r(40) - 20;
      for (let x = 0; x < W; x++) {
        const h = Math.max(4, height - idiv(Math.abs(x - cx) * height, 70));
        column(x, h);
        if (Math.abs(x - cx) < 5) for (let y = base + h - 4; y < base + h; y++) px.set(x, y, P.amber2);
      }
      break;
    }
    case "walls":
      for (let x = 0; x < W; x++) column(x, height - 12 + (idiv(x, 6) % 2 === 0 ? 4 : 0));
      break;
    case "fragments":
      for (let i = 0; i < 9; i++) {
        const x = r(W), y = base + 6 + r(height), w = 4 + r(10), h = 3 + r(6);
        for (let yy = y; yy < Math.min(H, y + h); yy++) for (let xx = x; xx < Math.min(W, x + w); xx++) px.set(xx, yy, colour);
      }
      break;
    case "hive": {
      let y = base;
      while (y < base + height) {
        let x = idiv(y, 8) % 2 === 0 ? 0 : 6;
        while (x < W) { px.ring(x, y, 6, colour); x += 12; }
        y += 8;
      }
      break;
    }
    case "tower": {
      const cx = idiv(W, 2) + 20;
      for (let x = cx - 12; x < cx + 12; x++) column(x, H - base);
      for (let y = base + 6; y < H; y += 10) for (let x = cx - 16; x < cx + 16; x++) px.set(x, y, colour);
      break;
    }
  }
  return px;
}

function drawGround(g: Theme["ground"]): Pixels {
  const px = new Pixels(CANVAS_W, BACKDROP_SIZE.h);
  for (let y = 0; y < GROUND_Y; y++) for (let x = 0; x < CANVAS_W; x++) px.set(x, y, y >= GROUND_Y - 3 ? g.top : g.base);
  // Perspective lines towards a vanishing point above the horizon.
  const vx = CANVAS_W / 2, vy = GROUND_Y + 40;
  for (let i = -8; i <= 8; i++) {
    const bottomX = vx + i * 34;
    for (let y = 0; y < GROUND_Y - 3; y++) {
      const t = (vy - y) / vy;
      const x = Math.trunc(vx + (bottomX - vx) * t);
      if (x >= 0 && x < CANVAS_W) px.set(x, y, g.lines);
    }
  }
  for (const y of [8, 20, 32]) for (let x = idiv(y, 4) % 3; x < CANVAS_W; x += 3) px.set(x, y, g.lines);
  return px;
}

export interface BackdropLayers { sky: Uint8ClampedArray; far: Uint8ClampedArray; mid: Uint8ClampedArray; ground: Uint8ClampedArray; width: number; height: number }

/** The four layers as RGBA bytes (y down), each CANVAS_W × 160. No DOM needed. */
export function backdropLayers(regionID: string, night = false): BackdropLayers {
  const t = backdropTheme(regionID, night);
  const seed = new Seed(regionID);
  const sky = drawSky(t.sky, night, seed);
  const far = drawSilhouette(t.farShape, t.far, 46, GROUND_Y, seed);
  const mid = drawSilhouette(t.midShape, t.mid, 30, GROUND_Y, seed);
  return { sky: sky.bytes, far: far.bytes, mid: mid.bytes, ground: drawGround(t.ground).bytes, width: CANVAS_W, height: BACKDROP_SIZE.h };
}

// MARK: Drawing

interface Prepared { theme: Theme; sky: HTMLCanvasElement; far: HTMLCanvasElement; mid: HTMLCanvasElement; ground: HTMLCanvasElement }
const prepared = new Map<string, Prepared>();

function layerCanvas(bytes: Uint8ClampedArray, w: number, h: number): HTMLCanvasElement {
  const c = document.createElement("canvas");
  c.width = w; c.height = h;
  c.getContext("2d")?.putImageData(new ImageData(new Uint8ClampedArray(bytes), w, h), 0, 0);
  return c;
}

function prepare(regionID: string, night: boolean): Prepared {
  const key = `${regionID}|${night ? 1 : 0}`;
  let p = prepared.get(key);
  if (!p) {
    const l = backdropLayers(regionID, night);
    p = { theme: backdropTheme(regionID, night), sky: layerCanvas(l.sky, l.width, l.height), far: layerCanvas(l.far, l.width, l.height), mid: layerCanvas(l.mid, l.width, l.height), ground: layerCanvas(l.ground, l.width, l.height) };
    prepared.set(key, p);
  }
  return p;
}

/** Parallax drift over a 12 s loop: +a in 3 s, −2a in 6 s, +a in 3 s. */
function drift(t: number, a: number): number {
  const p = ((t % 12) + 12) % 12;
  if (p < 3) return (a * p) / 3;
  if (p < 9) return a - (2 * a * (p - 3)) / 6;
  return -a + (a * (p - 9)) / 3;
}

/** Light-shaft alpha: 0.08 → 0.14 in 2.5 s, then 0.14 ↔ 0.06 every 2.5 s. */
function shaftAlpha(t: number): number {
  if (t < 2.5) return 0.08 + (0.06 * t) / 2.5;
  const p = (t - 2.5) % 5;
  return p < 2.5 ? 0.14 - (0.08 * p) / 2.5 : 0.06 + (0.08 * (p - 2.5)) / 2.5;
}

interface Emitter { colour: string; speed: number; angle: number; range: number; rate: number; alpha: number; xAccel: number; additive: boolean }
function emitter(kind: Particles, night: boolean): Emitter {
  const e: Emitter = { colour: P.cream, speed: 0, angle: 0, range: 0, rate: 3, alpha: 0.8, xAccel: 0, additive: false };
  switch (kind) {
    case "leaves": return { ...e, colour: P.green2, speed: 8, angle: -Math.PI / 2, xAccel: 3, rate: 3 };
    case "sand": return { ...e, colour: P.cream, speed: 30, angle: Math.PI, rate: 10, alpha: 0.5 };
    case "bubbles": return { ...e, colour: P.blue3, speed: 10, angle: Math.PI / 2, rate: 4 };
    case "embers": return { ...e, colour: P.amber2, speed: 14, angle: Math.PI / 2, range: 0.6, rate: 8, additive: true };
    case "snow": return { ...e, colour: P.white, speed: 10, angle: -Math.PI / 2, range: 0.5, rate: 10 };
    case "spores": return { ...e, colour: P.green3, speed: 4, range: Math.PI * 2, rate: 5, additive: true };
    case "motes": return { ...e, colour: night ? P.blue3 : P.cream, speed: 3, range: Math.PI * 2, rate: 3, additive: true };
  }
}

/** A stable random number in [0, 1) for particle k, value j. */
function hash01(k: number, j: number): number {
  let h = Math.imul(k ^ 0x9e3779b9, 0x85ebca6b) ^ Math.imul(j + 0x632be5ab, 0xc2b2ae35);
  h ^= h >>> 15; h = Math.imul(h, 0x2c1b3c6d); h ^= h >>> 12; h = Math.imul(h, 0x297a2d39); h ^= h >>> 15;
  return (h >>> 0) / 4294967296;
}

export interface BackdropOptions {
  /** Night sky with stars (the native uses 20:00–7:00). */
  night?: boolean;
  /** Light shafts and ambient particles (the "graphics effects" setting). */
  effects?: boolean;
}

/**
 * Draws a zone's battle backdrop over the whole w × h area (the 240 × 160 scene scaled to fit),
 * animated by `t` seconds: parallax drift, pulsing light shafts and ambient particles.
 */
export function drawBackdrop(ctx: CanvasRenderingContext2D, regionID: string, w: number, h: number, t: number, opts: BackdropOptions = {}) {
  const night = opts.night ?? false, effects = opts.effects ?? true;
  const p = prepare(regionID, night);
  const { w: SW, h: SH } = BACKDROP_SIZE;
  ctx.save();
  ctx.imageSmoothingEnabled = false;
  ctx.scale(w / SW, h / SH);
  ctx.drawImage(p.sky, -8, 0);
  ctx.drawImage(p.far, Math.round(-8 + drift(t, 1)), 0);
  ctx.drawImage(p.mid, Math.round(-8 + drift(t, 2)), 0);
  ctx.drawImage(p.ground, -8, 0);

  if (effects) {
    if (p.theme.shafts && !night) {
      ctx.globalCompositeOperation = "lighter";
      ctx.globalAlpha = shaftAlpha(t);
      ctx.fillStyle = P.cream;
      for (const [x, width] of [[40, 14], [92, 9], [150, 18]]) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x + width, 0);
        ctx.lineTo(x + width + 30, SH - GROUND_Y);
        ctx.lineTo(x + 30, SH - GROUND_Y);
        ctx.closePath();
        ctx.fill();
      }
    }
    // Ambient particles: a steady stream (pre-warmed 6 s), each a 1px dot fading over 6 s.
    const e = emitter(p.theme.particles, night);
    ctx.globalCompositeOperation = e.additive ? "lighter" : "source-over";
    ctx.fillStyle = e.colour;
    const life = 6, now = t + life;
    const cx = SW / 2, cy = GROUND_Y + (SH - GROUND_Y) / 2, rx = SW, ry = SH - GROUND_Y;
    for (let k = Math.ceil((now - life) * e.rate); k <= Math.floor(now * e.rate); k++) {
      const age = now - k / e.rate;
      if (age < 0 || age >= life) continue;
      const alpha = e.alpha - 0.12 * age;
      if (alpha <= 0) continue;
      const theta = e.angle + (hash01(k, 3) - 0.5) * e.range;
      const x = cx + (hash01(k, 1) - 0.5) * rx + Math.cos(theta) * e.speed * age + 0.5 * e.xAccel * age * age;
      const y = cy + (hash01(k, 2) - 0.5) * ry + Math.sin(theta) * e.speed * age;
      ctx.globalAlpha = Math.min(1, alpha);
      ctx.fillRect(Math.round(x), Math.round(SH - 1 - y), 1, 1);
    }
  }
  ctx.restore();
}

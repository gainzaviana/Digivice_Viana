import type { Beat, Battle, Side, AttackKind, Effectiveness } from "../systems/battle/battle";
import { other } from "../systems/battle/battle";
import { ecoArt, type EcoArt } from "../art/sprite";
import { drawBackdrop, GROUND_Y } from "../art/backdrop";
import { PALETTE as P } from "../art/palette";
import { sound } from "../audio/sound";

/**
 * The battle stage, drawn on a 240 × 160 canvas shown at a whole-number scale: the partner on the
 * left, the enemy facing it on the right, over the zone's backdrop. It plays the engine's beats in
 * order: charge-ups, projectiles, mid-screen collisions, impacts with flashes, shake and floating
 * numbers, dodges, disobedience bubbles, card slashes and evolutions.
 *
 * With effects on, the Ecos are lit through normal maps built from their own volume (key light
 * from the top-left, warm by day and cool at night), their data seams pulse, and everything that
 * glows (seams, sparks, projectiles) blooms.
 */
export const W = 240;
export const H = 160;
/** The ground line, y-down (the backdrop works y-up from the bottom). */
const GROUND = H - GROUND_Y;

interface Fighter {
  side: Side;
  speciesID: string;
  lit: HTMLCanvasElement;
  glow: HTMLCanvasElement;
  n: number;
  /** Rows down to the sprite's lowest pixel (its feet). */
  foot: number;
  dx: number;
  dy: number;
  alpha: number;
  /** White flash 0–1. */
  flash: number;
  tint?: string;
  tintAmount: number;
  idle: boolean;
}
interface Particle { x: number; y: number; vx: number; vy: number; life: number; max: number; colour: string; size: number; glow: boolean; drag?: number }
interface Projectile { side: Side; kind: AttackKind; x: number; y: number; colour: string; trail: number }
interface FloatText { text: string; x: number; y: number; colour: string; size: number; t: number; dur: number }
interface Tween { start: number; dur: number; fn: (t: number) => void; done: () => void }

const ease = (t: number) => 1 - (1 - t) * (1 - t);

export class BattleScene {
  private ctx: CanvasRenderingContext2D;
  private stage = document.createElement("canvas");
  private sctx: CanvasRenderingContext2D;
  private glowLayer = document.createElement("canvas");
  private gctx: CanvasRenderingContext2D;
  private small = document.createElement("canvas");
  private smctx: CanvasRenderingContext2D;
  private fighters = new Map<Side, Fighter>();
  private particles: Particle[] = [];
  private projectiles = new Map<Side, Projectile>();
  private texts: FloatText[] = [];
  private tweens: Tween[] = [];
  private bubbles: { side: Side; mark: string; until: number }[] = [];
  private streak?: { x: number; label: string; until: number };
  private shake = 0;
  private time = 0;
  private last = 0;
  private frame = 0;
  private scale = 1;
  private readonly night: boolean;
  private readonly reduceMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;
  onCaption: (text: string) => void = () => {};

  constructor(private canvas: HTMLCanvasElement, private battle: Battle, private effects: boolean) {
    this.ctx = canvas.getContext("2d")!;
    this.stage.width = W; this.stage.height = H;
    this.sctx = this.stage.getContext("2d")!;
    this.glowLayer.width = W; this.glowLayer.height = H;
    this.gctx = this.glowLayer.getContext("2d")!;
    this.small.width = W / 4; this.small.height = H / 4;
    this.smctx = this.small.getContext("2d")!;
    const h = new Date().getHours();
    this.night = !(h >= 7 && h < 20);
    for (const side of ["partner", "enemy"] as Side[]) this.place(side);
    this.last = performance.now();
    this.frame = requestAnimationFrame(this.loop);
  }

  destroy() { cancelAnimationFrame(this.frame); }

  /** Fits the canvas to its box at a whole number of device pixels per game pixel. */
  resize(boxWidth: number, boxHeight: number) {
    const dpr = window.devicePixelRatio || 1;
    const k = Math.max(1, Math.floor(Math.min((boxWidth * dpr) / W, (boxHeight * dpr) / H)));
    this.scale = k;
    this.canvas.width = W * k;
    this.canvas.height = H * k;
    this.canvas.style.width = `${(W * k) / dpr}px`;
    this.canvas.style.height = `${(H * k) / dpr}px`;
  }

  // MARK: Sprites

  private home(side: Side) { return { x: side === "partner" ? 62 : 178, y: GROUND + 2 }; }

  private seamColour(side: Side) {
    const a = this.battle.species(side).affinity;
    return a === "pulso" ? P.pulso : a === "senal" ? P.senal : P.ruido;
  }

  private place(side: Side) {
    const c = this.battle.combatant(side);
    const art = ecoArt(c.speciesID, c.variant, this.battle.data);
    const facingLeft = side === "enemy";
    let foot = art.n;
    while (foot > 1 && !art.colors.slice((foot - 1) * art.n, foot * art.n).some(Boolean)) foot--;
    this.fighters.set(side, {
      side, speciesID: c.speciesID, n: art.n, foot,
      lit: this.bakeLit(art, facingLeft, side), glow: this.bakeGlow(art, facingLeft),
      dx: 0, dy: 0, alpha: 1, flash: 0, tintAmount: 0, idle: true,
    });
  }

  /** The sprite lit by the key light through its normals (or flat, without effects). */
  private bakeLit(art: EcoArt, flip: boolean, side: Side): HTMLCanvasElement {
    const n = art.n;
    const cv = document.createElement("canvas");
    cv.width = n; cv.height = n;
    const ctx = cv.getContext("2d")!;
    const img = ctx.createImageData(n, n);
    const lightRGB = hexRGB(this.night ? P.blue3 : P.cream);
    const ambient = this.night ? 0.5 : 0.62;
    const home = this.home(side);
    for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) {
      const src = y * n + x;
      const colour = art.colors[src];
      if (!colour) continue;
      const [r, g, b] = hexRGB(colour);
      let f: [number, number, number] = [1, 1, 1];
      if (this.effects && !art.emissive[src]) {
        // Light at (30, 10) on the stage, a little in front; pixel position on the stage.
        const sx = home.x - n / 2 + (flip ? n - 1 - x : x), sy = home.y - n + y;
        let lx = 30 - sx, ly = 10 - sy, lz = 60;
        const len = Math.hypot(lx, ly, lz); lx /= len; ly /= len; lz /= len;
        const nx = (flip ? -1 : 1) * art.normals[src * 3], ny = art.normals[src * 3 + 1], nz = art.normals[src * 3 + 2];
        const d = Math.max(0, nx * lx + ny * ly + nz * lz);
        const k = ambient + (1 - ambient) * d * 1.25;
        f = [k * (0.5 + 0.5 * lightRGB[0] / 255) * 1.08, k * (0.5 + 0.5 * lightRGB[1] / 255) * 1.08, k * (0.5 + 0.5 * lightRGB[2] / 255) * 1.08];
      }
      const dst = (y * n + (flip ? n - 1 - x : x)) * 4;
      img.data[dst] = Math.min(255, r * f[0]);
      img.data[dst + 1] = Math.min(255, g * f[1]);
      img.data[dst + 2] = Math.min(255, b * f[2]);
      img.data[dst + 3] = 255;
    }
    ctx.putImageData(img, 0, 0);
    return cv;
  }

  private bakeGlow(art: EcoArt, flip: boolean): HTMLCanvasElement {
    const n = art.n;
    const cv = document.createElement("canvas");
    cv.width = n; cv.height = n;
    const ctx = cv.getContext("2d")!;
    const img = ctx.createImageData(n, n);
    for (let i = 0; i < n * n; i++) {
      if (!art.emissive[i] || !art.colors[i]) continue;
      const [r, g, b] = hexRGB(art.colors[i]!);
      const x = i % n, y = Math.floor(i / n);
      const dst = (y * n + (flip ? n - 1 - x : x)) * 4;
      img.data.set([r, g, b, 255], dst);
    }
    ctx.putImageData(img, 0, 0);
    return cv;
  }

  // MARK: Loop

  private loop = (now: number) => {
    const dt = Math.min(0.05, (now - this.last) / 1000);
    this.last = now;
    this.time += dt;
    for (const tw of [...this.tweens]) {
      const t = Math.min(1, (now - tw.start) / (tw.dur * 1000));
      tw.fn(t);
      if (t >= 1) { this.tweens.splice(this.tweens.indexOf(tw), 1); tw.done(); }
    }
    for (const p of this.particles) {
      p.x += p.vx * dt; p.y += p.vy * dt; p.life -= dt;
      if (p.drag) { p.vx *= 1 - p.drag * dt; p.vy *= 1 - p.drag * dt; }
    }
    this.particles = this.particles.filter((p) => p.life > 0);
    for (const t of this.texts) t.t += dt;
    this.texts = this.texts.filter((t) => t.t < t.dur);
    if (this.effects) for (const pr of this.projectiles.values()) this.trail(pr);
    this.draw();
    this.frame = requestAnimationFrame(this.loop);
  };

  private trail(pr: Projectile) {
    const strong = pr.kind === "strong";
    for (let i = 0; i < (strong ? 3 : 1); i++) {
      this.particles.push({ x: pr.x, y: pr.y + (Math.random() - 0.5) * (strong ? 10 : 2), vx: 0, vy: 0, life: strong ? 0.35 : 0.18, max: strong ? 0.35 : 0.18, colour: pr.colour, size: strong ? 2 : 1, glow: true });
    }
  }

  private draw() {
    const s = this.sctx, g = this.gctx;
    s.imageSmoothingEnabled = false;
    g.clearRect(0, 0, W, H);
    const shakeX = this.shake && !this.reduceMotion ? Math.round((Math.random() * 2 - 1) * this.shake) : 0;
    s.save();
    s.translate(shakeX, 0);
    drawBackdrop(s, this.battle.regionID, W, H, this.time, { night: this.night, effects: this.effects });
    // Shadows.
    s.fillStyle = P.outline;
    s.globalAlpha = 0.45;
    for (const side of ["partner", "enemy"] as Side[]) {
      const h = this.home(side);
      s.beginPath(); s.ellipse(h.x, GROUND + 3, 17, 3, 0, 0, Math.PI * 2); s.fill();
    }
    s.globalAlpha = 1;
    // Fighters.
    for (const f of this.fighters.values()) {
      const h = this.home(f.side);
      const bob = f.idle && !this.reduceMotion && Math.floor(this.time * 8) % 4 === 1 ? -1 : 0;
      const x = Math.round(h.x - f.n / 2 + f.dx), y = Math.round(h.y - f.foot + f.dy + bob);
      s.globalAlpha = f.alpha;
      s.drawImage(f.lit, x, y);
      if (f.tint && f.tintAmount > 0) tintOver(s, f.lit, x, y, f.tint, f.tintAmount);
      if (f.flash > 0) tintOver(s, f.lit, x, y, "#ffffff", f.flash);
      s.globalAlpha = 1;
      if (this.effects) {
        const pulse = 0.45 + 0.5 * (0.5 + 0.5 * Math.sin(this.time * Math.PI / 0.9));
        g.globalAlpha = pulse * f.alpha;
        g.drawImage(f.glow, x, y);
        g.globalAlpha = 1;
        s.globalCompositeOperation = "lighter";
        s.globalAlpha = pulse * 0.6 * f.alpha;
        s.drawImage(f.glow, x, y);
        s.globalAlpha = 1;
        s.globalCompositeOperation = "source-over";
      }
    }
    // Projectiles.
    for (const pr of this.projectiles.values()) {
      const dir = pr.side === "partner" ? 1 : -1;
      const x = Math.round(pr.x), y = Math.round(pr.y);
      for (const ctx of this.effects ? [s, g] : [s]) {
        ctx.fillStyle = pr.colour;
        if (pr.kind === "basic") {
          ctx.fillRect(x - 3, y - 1, 6, 2);
          ctx.fillStyle = P.white; ctx.fillRect(x + (dir > 0 ? 2 : -4), y - 1, 2, 2);
        } else {
          ctx.fillRect(x - 5, y - 5, 10, 10);
          for (let i = 1; i <= 3; i++) {
            ctx.globalAlpha = 1 - i * 0.25;
            const h = 8 - i * 2;
            ctx.fillRect(x - dir * i * 7 - 3, y - h / 2, 6, h);
          }
          ctx.globalAlpha = 1;
          ctx.fillStyle = P.white; ctx.fillRect(x - 2, y - 2, 4, 4);
        }
      }
    }
    // Particles.
    for (const p of this.particles) {
      const a = Math.max(0, p.life / p.max);
      const sz = Math.max(1, Math.round(p.size * (0.5 + a * 0.5)));
      for (const ctx of p.glow && this.effects ? [s, g] : [s]) {
        ctx.globalAlpha = a;
        if (p.glow && ctx === s) ctx.globalCompositeOperation = "lighter";
        ctx.fillStyle = p.colour;
        ctx.fillRect(Math.round(p.x), Math.round(p.y), sz, sz);
        ctx.globalCompositeOperation = "source-over";
      }
      s.globalAlpha = 1; g.globalAlpha = 1;
    }
    // Speech bubbles.
    for (const b of this.bubbles) {
      const f = this.fighters.get(b.side);
      if (!f) continue;
      const h = this.home(b.side);
      const bx = Math.round(h.x + 3), by = Math.round(h.y - f.foot - 14);
      s.fillStyle = P.white; s.fillRect(bx, by, 18, 12);
      s.strokeStyle = P.outline; s.lineWidth = 1; s.strokeRect(bx + 0.5, by + 0.5, 17, 11);
      pixelText(s, b.mark, bx + 9, by + 9, P.outline, 8);
    }
    this.bubbles = this.bubbles.filter((b) => b.until > performance.now());
    // Card slash.
    if (this.streak) {
      s.save();
      s.translate(this.streak.x, 64);
      s.rotate(-0.18);
      s.fillStyle = P.white;
      s.fillRect(-150, -1, 300, 3);
      s.restore();
      pixelText(s, this.streak.label, W / 2, 58, P.amber3, 9);
      if (this.streak.until < performance.now()) this.streak = undefined;
    }
    // Floating texts.
    for (const t of this.texts) {
      const a = t.t < t.dur - 0.2 ? 1 : Math.max(0, (t.dur - t.t) / 0.2);
      s.globalAlpha = a;
      pixelText(s, t.text, t.x, Math.round(t.y - 25 * ease(Math.min(1, t.t / t.dur))), t.colour, t.size);
      s.globalAlpha = 1;
    }
    s.restore();

    // Present: crisp upscale, then bloom of the glowing layer.
    const c = this.ctx;
    c.imageSmoothingEnabled = false;
    c.drawImage(this.stage, 0, 0, W * this.scale, H * this.scale);
    if (this.effects) {
      const sm = this.smctx;
      sm.imageSmoothingEnabled = true;
      sm.clearRect(0, 0, W / 4, H / 4);
      sm.drawImage(this.glowLayer, 0, 0, W / 4, H / 4);
      c.save();
      c.imageSmoothingEnabled = true;
      c.globalCompositeOperation = "lighter";
      c.globalAlpha = 0.55;
      c.drawImage(this.small, shakeX * this.scale, 0, W * this.scale, H * this.scale);
      c.globalAlpha = 0.35;
      c.drawImage(this.small, shakeX * this.scale - this.scale * 2, -this.scale * 2, (W + 4) * this.scale, (H + 4) * this.scale);
      c.restore();
    }
  }

  // MARK: Tweens

  private tween(dur: number, fn: (t: number) => void): Promise<void> {
    return new Promise((done) => this.tweens.push({ start: performance.now(), dur: Math.max(0.001, dur), fn, done }));
  }
  private pause(s: number) { return this.tween(s, () => {}); }

  private burst(x: number, y: number, colour: string, count: number) {
    for (let i = 0; i < count; i++) {
      const a = (i / count) * Math.PI * 2, d = 8 + ((i * 5) % 9);
      this.particles.push({ x, y, vx: (Math.cos(a) * d) / 0.22, vy: (Math.sin(a) * d) / 0.22, life: 0.32, max: 0.32, colour: i % 2 ? P.amber2 : colour, size: 2, glow: false, drag: 6 });
    }
  }

  private sparks(x: number, y: number, colour: string, count: number) {
    if (!this.effects) return;
    for (let i = 0; i < count; i++) {
      const a = Math.random() * Math.PI * 2, v = 35 + Math.random() * 70, life = 0.18 + Math.random() * 0.35;
      this.particles.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, life, max: life, colour, size: 2, glow: true, drag: 3 });
    }
  }

  private doShake(amount: number) {
    this.shake = amount;
    void this.tween(0.24, (t) => { if (t >= 1) this.shake = 0; });
  }

  private vibrate(ms: number) { try { navigator.vibrate?.(ms); } catch { /* not on iOS */ } }

  private floatText(text: string, side: Side, colour: string, small = false) {
    const f = this.fighters.get(side);
    const h = this.home(side);
    this.texts.push({ text, x: h.x, y: h.y - (f?.foot ?? 32) - 2, colour, size: small ? 7 : 9, t: 0, dur: 0.75 });
    return this.pause(0.55);
  }

  // MARK: Beats

  /** Plays the beats in order; resolves when every animation has finished. */
  async play(beats: Beat[]) {
    for (const beat of beats) await this.beat(beat);
    this.projectiles.clear();
  }

  private sound(b: Beat) {
    switch (b.t) {
      case "launch": return sound.play("launch");
      case "charge": return sound.play("charge");
      case "pierce": case "clash": case "blocked": return sound.play("clash");
      case "hit": return sound.play(b.critical ? "crit" : "hit");
      case "dodge": return sound.play("dodge");
      case "card": return sound.play("slash");
      case "evolve": return sound.play(b.success ? "evolve" : "miss");
      case "emote": case "status": return sound.play("tap");
      case "heal": case "revive": return sound.play("reward");
    }
  }

  private async beat(b: Beat) {
    this.sound(b);
    switch (b.t) {
      case "text": this.onCaption(b.text); return this.pause(0.45);
      case "emote":
        this.bubbles.push({ side: b.side, mark: b.mark, until: performance.now() + 850 });
        return this.pause(0.85);
      case "charge": return this.charge(b.side);
      case "launch": {
        const h = this.home(b.side), dir = b.side === "partner" ? 1 : -1;
        this.projectiles.set(b.side, { side: b.side, kind: b.kind, x: h.x + 14 * dir, y: h.y - 16, colour: this.seamColour(b.side), trail: 0 });
        return;
      }
      case "pierce": return this.collide(b.by, true);
      case "clash": return this.collide(b.winner, false);
      case "hit": await this.flyIn(b.target); return this.impact(b.target, b.damage, b.critical, b.effectiveness);
      case "dodge": await this.flyIn(b.side, true); return this.dodge(b.side);
      case "blocked": await this.flyIn(b.side); return this.floatText("¡BLOQUEADO!", b.side, P.blue3);
      case "heal": return this.floatText(`+${b.amount}`, b.side, P.green2);
      case "card": return this.slash(b.name);
      case "status": return this.floatText(b.text, b.side, P.amber3, true);
      case "evolve": return this.evolve(b.side, b.success);
      case "ko": return this.knockOut(b.side);
      case "revive": return this.revive(b.side);
    }
  }

  private flightTime(kind: AttackKind, distance: number) { return Math.max(0.05, Math.abs(distance) / (kind === "basic" ? 420 : 220)); }

  private async charge(side: Side) {
    const f = this.fighters.get(side);
    if (!f) return;
    const h = this.home(side), colour = this.seamColour(side);
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2;
      this.particles.push({ x: h.x + Math.cos(a) * 22, y: h.y - 16 + Math.sin(a) * 22, vx: (-Math.cos(a) * 22) / 0.3, vy: (-Math.sin(a) * 22) / 0.3, life: 0.3, max: 0.3, colour, size: 2, glow: true });
    }
    f.tint = colour;
    await this.tween(0.3, (t) => { f.tintAmount = 0.6 * (t < 0.5 ? t * 2 : 2 - t * 2); });
    f.tintAmount = 0;
  }

  private async collide(winner: Side | undefined, through: boolean) {
    const mine = this.projectiles.get("partner"), theirs = this.projectiles.get("enemy");
    if (!mine || !theirs) return;
    const meetX = through ? (winner === "partner" ? 150 : 90) : W / 2;
    const y = mine.y;
    const t1 = this.flightTime(mine.kind, meetX - mine.x), t2 = this.flightTime(theirs.kind, theirs.x - meetX);
    const [m0, e0] = [mine.x, theirs.x];
    void this.tween(t1, (t) => { mine.x = m0 + (meetX - 3 - m0) * t; });
    await this.tween(Math.max(t1, t2), (t) => { theirs.x = e0 + (meetX + 3 - e0) * Math.min(1, (t * Math.max(t1, t2)) / t2); });
    this.burst(meetX, y, P.white, through ? 6 : 12);
    this.sparks(meetX, y, P.cream, through ? 14 : 28);
    this.doShake(through ? 1 : 2);
    this.vibrate(10);
    for (const side of ["partner", "enemy"] as Side[]) {
      if (side === winner) continue;
      const pr = this.projectiles.get(side);
      if (pr) { this.burst(pr.x, pr.y, P.mist, 6); this.projectiles.delete(side); }
    }
    if (!winner) this.onCaption("¡Los ataques chocan!");
    else if (through) this.onCaption("¡El ataque básico atraviesa al especial!");
    await this.pause(0.15);
  }

  private async flyIn(target: Side, passing = false) {
    const shooter = other(target);
    const pr = this.projectiles.get(shooter);
    if (!pr) return;
    const h = this.home(target);
    const endX = passing ? h.x + (target === "enemy" ? 40 : -40) : h.x;
    const x0 = pr.x;
    await this.tween(this.flightTime(pr.kind, endX - x0), (t) => { pr.x = x0 + (endX - x0) * t; });
    this.projectiles.delete(shooter);
  }

  private async impact(target: Side, damage: number, critical: boolean, eff: Effectiveness) {
    const f = this.fighters.get(target);
    if (!f) return;
    const h = this.home(target);
    this.burst(h.x, h.y - 14, critical ? P.amber3 : P.white, critical ? 14 : 8);
    this.sparks(h.x, h.y - 14, this.seamColour(other(target)), critical ? 36 : 18);
    this.doShake(critical ? 3 : 2);
    this.vibrate(critical ? 40 : 20);
    void this.tween(0.24, (t) => { f.flash = Math.floor(t * 4) % 2 === 0 ? 1 : 0; if (t >= 1) f.flash = 0; });
    const attacker = this.battle.species(other(target)).name;
    if (critical) this.onCaption(`¡Golpe crítico de ${attacker}!`);
    else if (eff === "strong") this.onCaption(`¡El ataque de ${attacker} es muy eficaz!`);
    else if (eff === "weak") this.onCaption(`El ataque de ${attacker} no es muy eficaz…`);
    else this.onCaption(`${attacker} acierta: ${damage} de daño.`);
    await this.floatText(critical ? `¡CRÍTICO! ${damage}` : String(damage), target, critical ? P.amber3 : P.white);
  }

  private async dodge(side: Side) {
    const f = this.fighters.get(side);
    if (!f) return;
    const away = side === "partner" ? -12 : 12;
    void this.tween(0.28, (t) => {
      const k = t < 0.3 ? t / 0.3 : t < 0.65 ? 1 : 1 - (t - 0.65) / 0.35;
      f.dx = away * k; f.dy = -2 * k;
    });
    await this.floatText("¡ESQUIVA!", side, P.teal2);
    f.dx = 0; f.dy = 0;
  }

  private async slash(name: string) {
    this.vibrate(15);
    this.streak = { x: -160, label: name.toUpperCase(), until: performance.now() + 800 };
    const s = this.streak;
    await this.tween(0.25, (t) => { s.x = -160 + 560 * t; });
    await this.pause(0.4);
  }

  private async evolve(side: Side, success: boolean) {
    const f = this.fighters.get(side);
    if (!f) return;
    f.idle = false;
    await this.tween(0.64, (t) => { f.flash = Math.floor(t * 8) % 2 === 0 ? 1 : 0.3; });
    if (success) {
      const h = this.home(side), cy = h.y - 16, colour = this.seamColour(side);
      for (let i = 0; i < 12; i++) {
        const a = (i / 12) * Math.PI * 2;
        this.particles.push({ x: h.x, y: cy, vx: (Math.cos(a) * 40) / 0.35, vy: (Math.sin(a) * 40) / 0.35, life: 0.35, max: 0.35, colour, size: 2, glow: true });
      }
      if (this.effects) for (let i = 0; i < 60; i++) {
        const a = -Math.PI / 2 + (Math.random() - 0.5) * 0.8, v = 20 + Math.random() * 40, life = 0.4 + Math.random() * 0.8;
        this.particles.push({ x: h.x + (Math.random() - 0.5) * 16, y: cy, vx: Math.cos(a) * v, vy: Math.sin(a) * v, life, max: life, colour, size: 2, glow: true });
      }
      this.vibrate(30);
      this.place(side);
      const fresh = this.fighters.get(side)!;
      await this.tween(0.45, (t) => { fresh.alpha = Math.min(1, t / 0.66); fresh.flash = 1 - t; });
      fresh.flash = 0;
    } else {
      f.flash = 0;
      f.idle = true;
      await this.floatText("¡FALLO!", side, P.red3);
    }
  }

  private async knockOut(side: Side) {
    const f = this.fighters.get(side);
    if (!f) return;
    f.idle = false;
    this.vibrate(50);
    await this.tween(0.36, (t) => { f.alpha = Math.floor(t * 6) % 2 === 0 ? 0.2 : 1; });
    await this.tween(0.3, (t) => { f.dy = 6 * t; f.alpha = 1 - t; });
  }

  private async revive(side: Side) {
    this.place(side);
    const f = this.fighters.get(side)!;
    await this.tween(0.3, (t) => { f.alpha = t; });
    await this.floatText("¡REINICIO!", side, P.green2);
  }
}

// MARK: Helpers

const rgbCache = new Map<string, [number, number, number]>();
function hexRGB(hex: string): [number, number, number] {
  let v = rgbCache.get(hex);
  if (!v) {
    const n = parseInt(hex.slice(1), 16);
    v = [(n >> 16) & 255, (n >> 8) & 255, n & 255];
    rgbCache.set(hex, v);
  }
  return v;
}

const tintCanvas = typeof document !== "undefined" ? document.createElement("canvas") : undefined;
/** Draws `img`'s silhouette in `colour` over it, with `amount` opacity. */
function tintOver(ctx: CanvasRenderingContext2D, img: HTMLCanvasElement, x: number, y: number, colour: string, amount: number) {
  if (!tintCanvas) return;
  tintCanvas.width = img.width; tintCanvas.height = img.height;
  const t = tintCanvas.getContext("2d")!;
  t.drawImage(img, 0, 0);
  t.globalCompositeOperation = "source-in";
  t.fillStyle = colour;
  t.fillRect(0, 0, img.width, img.height);
  const a = ctx.globalAlpha;
  ctx.globalAlpha = a * amount;
  ctx.drawImage(tintCanvas, x, y);
  ctx.globalAlpha = a;
}

/** Small bold monospace text with a 1px dark shadow, centred on x. */
function pixelText(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, colour: string, size: number) {
  ctx.font = `bold ${size}px ui-monospace, Menlo, monospace`;
  ctx.textAlign = "center";
  ctx.textBaseline = "alphabetic";
  ctx.fillStyle = P.outline;
  ctx.fillText(text, Math.round(x) + 1, Math.round(y) + 1);
  ctx.fillStyle = colour;
  ctx.fillText(text, Math.round(x), Math.round(y));
}

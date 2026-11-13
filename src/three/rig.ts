import * as THREE from "three";
import type { CreatureRig } from "./creature";

/**
 * Procedural, bouncy animation for a 3D Eco: breathing and blinking while idle, and short
 * expressive motions (wind-up, lunge, flinch, dodge hop, victory hops, knock-out, evolution spin…).
 * Everything is driven by update(dt); nothing is allocated per frame.
 */
export type Motion = "windup" | "attack" | "strongAttack" | "hit" | "bigHit" | "dodge" | "victory" | "ko" | "evolve" | "revive" | "charge" | "cardUse";

interface Pose { x: number; y: number; rotZ: number; rotY: number; sx: number; sy: number; flash: number; fade: number }

const DURATION: Record<Motion, number> = {
  windup: 0.45, attack: 0.42, strongAttack: 0.75, hit: 0.38, bigHit: 0.6, dodge: 0.42, victory: 1.6,
  ko: 0.9, evolve: 1.2, revive: 0.7, charge: 0.6, cardUse: 0.45,
};

const easeOut = (t: number) => 1 - (1 - t) * (1 - t);
const easeInOut = (t: number) => (t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2);
const bump = (t: number) => Math.sin(Math.PI * Math.min(1, Math.max(0, t)));

export class CreatureAnimator {
  private time = 0;
  private motion?: Motion;
  private motionTime = 0;
  private resolve?: () => void;
  private nextBlink: number;
  private blinkT = -1;
  /** Fainted: stays down until revive. */
  private down = false;
  private wasFainted = false;
  private readonly pose: Pose = { x: 0, y: 0, rotZ: 0, rotY: 0, sx: 1, sy: 1, flash: 0, fade: 1 };
  private readonly materials: THREE.MeshStandardMaterial[] = [];
  private readonly eyeScale: number[];
  private readonly phase: number;
  private readonly model: THREE.Object3D;
  /** Extra emissive tint (e.g. charging aura), 0–1. */
  tintAmount = 0;
  readonly tintColor = new THREE.Color("#ffd27a");

  constructor(private readonly rig: CreatureRig, private readonly facing: 1 | -1) {
    this.model = rig.body.children[0];
    this.model.scale.x = Math.abs(this.model.scale.x) * facing;
    if (facing === -1) this.model.position.x = -this.model.position.x;
    rig.body.traverse((o) => {
      const m = (o as THREE.Mesh).material as THREE.MeshStandardMaterial | undefined;
      if (m && "emissive" in m && !this.materials.includes(m)) this.materials.push(m);
    });
    this.eyeScale = rig.eyes.map((e) => e.scale.y);
    // Each creature breathes at its own phase.
    this.phase = (rig.root.name.length * 1.7) % (Math.PI * 2);
    this.nextBlink = 1.5 + (this.phase % 2);
  }

  /** Plays a motion; resolves when it ends (a new motion interrupts the current one). */
  play(m: Motion): Promise<void> {
    this.resolve?.();
    this.motion = m;
    this.motionTime = 0;
    if (m === "revive") this.down = false;
    return new Promise((r) => { this.resolve = r; });
  }

  update(dt: number): void {
    this.time += dt;
    const p = this.pose;
    const h = this.rig.height, f = this.facing;
    // Idle: breathing squash and a soft bob.
    const breath = Math.sin(this.time * 2.6 + this.phase);
    p.x = 0; p.y = Math.max(0, breath) * 0.015 * h; p.rotZ = 0; p.rotY = 0;
    p.sx = 1 - breath * 0.018; p.sy = 1 + breath * 0.03; p.flash = 0; p.fade = 1;
    if (this.down) { p.rotZ = 0.42 * f; p.sx = 1.1; p.sy = 0.68; p.y = 0; }

    if (this.motion) {
      this.motionTime += dt;
      const d = DURATION[this.motion];
      const t = Math.min(1, this.motionTime / d);
      this.apply(this.motion, t, h, f);
      if (t >= 1) {
        if (this.motion === "ko") this.down = true;
        this.motion = undefined;
        const r = this.resolve;
        this.resolve = undefined;
        r?.();
      }
    }

    // Fainted eyes stay shut.
    const fainted = this.down || (this.motion === "ko" && this.motionTime > DURATION.ko * 0.4);
    if (fainted) {
      this.rig.eyes.forEach((e, i) => { e.scale.y = this.eyeScale[i] * 0.1; });
      this.blinkT = -1;
    } else if (this.wasFainted) this.rig.eyes.forEach((e, i) => { e.scale.y = this.eyeScale[i]; });
    this.wasFainted = fainted;
    // Blinks.
    if (!fainted && this.blinkT < 0 && this.time >= this.nextBlink) this.blinkT = 0;
    if (this.blinkT >= 0) {
      this.blinkT += dt;
      const k = this.blinkT < 0.07 ? 1 - this.blinkT / 0.07 : Math.min(1, (this.blinkT - 0.07) / 0.07);
      this.rig.eyes.forEach((e, i) => { e.scale.y = this.eyeScale[i] * Math.max(0.08, k); });
      if (this.blinkT > 0.14) {
        this.blinkT = -1;
        this.nextBlink = this.time + 2.2 + ((Math.sin(this.time * 7.1 + this.phase) + 1) * 1.6);
        this.rig.eyes.forEach((e, i) => { e.scale.y = this.eyeScale[i]; });
      }
    }

    const b = this.rig.body;
    b.position.set(p.x, p.y, 0);
    b.rotation.set(0, p.rotY, p.rotZ);
    b.scale.set(p.sx, p.sy, p.sx);
    const flash = Math.max(p.flash, this.tintAmount);
    for (const m of this.materials) {
      if (flash > 0) m.emissive.copy(p.flash >= this.tintAmount ? WHITE : this.tintColor).multiplyScalar(flash);
      else m.emissive.setRGB(0, 0, 0);
      const transparent = p.fade < 0.999;
      if (m.transparent !== transparent) { m.transparent = transparent; m.needsUpdate = true; }
      m.opacity = p.fade;
    }
  }

  private apply(m: Motion, t: number, h: number, f: number) {
    const p = this.pose;
    const reach = 0.35 * Math.max(1, h);
    switch (m) {
      case "windup": {
        // Lean back, crouch and tremble.
        const k = easeOut(Math.min(1, t * 1.6));
        p.rotZ += 0.22 * f * k;
        p.sy *= 1 - 0.14 * k; p.sx *= 1 + 0.1 * k;
        p.x += -0.06 * f * k + Math.sin(this.motionTime * 70) * 0.008 * k;
        break;
      }
      case "attack": {
        // Lunge forward, stretch, spring back.
        const k = t < 0.35 ? easeOut(t / 0.35) : 1 - easeInOut((t - 0.35) / 0.65);
        p.x += reach * 0.6 * f * k;
        p.rotZ -= 0.18 * f * k;
        p.sx *= 1 + 0.12 * k; p.sy *= 1 - 0.06 * k;
        break;
      }
      case "strongAttack": {
        // Crouch, leap with a spin, slam forward.
        if (t < 0.3) { const k = easeOut(t / 0.3); p.sy *= 1 - 0.2 * k; p.sx *= 1 + 0.14 * k; p.rotZ += 0.15 * f * k; }
        else if (t < 0.7) {
          const k = (t - 0.3) / 0.4;
          p.y += bump(k) * 0.45 * h;
          p.rotY += easeInOut(k) * Math.PI * 2;
          p.x += reach * 0.4 * f * k;
          p.sy *= 1 + 0.1 * bump(k);
        } else {
          const k = (t - 0.7) / 0.3;
          p.x += reach * 0.4 * f * (1 - easeInOut(k));
          p.sy *= 1 - 0.15 * bump(k); p.sx *= 1 + 0.12 * bump(k);
        }
        break;
      }
      case "hit":
      case "bigHit": {
        // Squash, knock back, white flash; a wobble on big hits.
        const big = m === "bigHit" ? 1.8 : 1;
        const k = bump(t);
        p.x -= 0.12 * big * f * k * Math.max(1, h * 0.6);
        p.sx *= 1 + 0.16 * k; p.sy *= 1 - 0.2 * k;
        p.rotZ += 0.18 * big * f * k * Math.cos(t * Math.PI * 3);
        p.flash = t < 0.25 ? 1 - t / 0.25 : 0;
        break;
      }
      case "dodge": {
        // A quick hop back.
        const k = bump(t);
        p.y += k * 0.3 * h;
        p.x -= easeOut(Math.min(1, t * 2)) * (1 - easeInOut(Math.max(0, (t - 0.5) * 2))) * 0.3 * f;
        p.sy *= 1 + 0.12 * k;
        p.rotZ += 0.25 * f * k;
        break;
      }
      case "victory": {
        // Three happy hops and a spin on the last.
        const hop = (t * 3) % 1, n = Math.floor(t * 3);
        p.y += bump(hop) * 0.22 * h;
        p.sy *= hop < 0.15 || hop > 0.85 ? 0.88 : 1.08;
        if (n === 2) p.rotY += easeInOut(hop) * Math.PI * 2;
        break;
      }
      case "ko": {
        // Wobble, then slump down.
        const wobble = t < 0.35 ? Math.sin(t * 50) * 0.1 * (1 - t / 0.35) : 0;
        const k = t < 0.35 ? 0 : easeInOut((t - 0.35) / 0.65);
        // Fainted: slumps back, flattens, eyes shut (see update).
        p.rotZ += wobble + 0.42 * f * k;
        p.sx *= 1 + 0.1 * k; p.sy *= 1 - 0.32 * k;
        break;
      }
      case "evolve": {
        // Spin up, shrink to a spark, pop out bigger, settle.
        const spin = easeInOut(Math.min(1, t / 0.7));
        p.rotY += spin * Math.PI * 4;
        p.y += bump(Math.min(1, t / 0.7)) * 0.2 * h;
        const pop = t < 0.45 ? 1 - 0.4 * easeOut(t / 0.45) : t < 0.7 ? 0.6 + 0.6 * easeOut((t - 0.45) / 0.25) : 1.2 - 0.2 * easeInOut((t - 0.7) / 0.3);
        p.sx *= pop; p.sy *= pop;
        p.flash = t > 0.4 && t < 0.75 ? bump((t - 0.4) / 0.35) : 0;
        break;
      }
      case "revive": {
        const k = easeOut(t);
        p.sx *= 0.3 + 0.7 * k; p.sy *= 0.3 + 0.7 * k * (1 + 0.15 * bump(t));
        p.rotY += (1 - k) * Math.PI * 2;
        p.flash = 1 - t;
        break;
      }
      case "charge": {
        // Crouch and tremble while energy gathers.
        const k = bump(t);
        p.sy *= 1 - 0.1 * k; p.sx *= 1 + 0.07 * k;
        p.x += Math.sin(this.motionTime * 80) * 0.01 * k;
        break;
      }
      case "cardUse": {
        const k = bump(t);
        p.y += k * 0.14 * h;
        p.sy *= 1 + 0.1 * k;
        break;
      }
    }
  }
}

const WHITE = new THREE.Color("#ffffff");

import * as THREE from "three";
import type { AttackKind, Battle, Beat, Effectiveness, Side } from "../systems/battle/battle";
import { other } from "../systems/battle/battle";
import { buildCreature, type CreatureRig } from "../three/creature";
import { CreatureAnimator, type Motion } from "../three/rig";
import { buildArena, type Arena } from "../three/arena";
import { defaultQuality, type Quality } from "../three/materials";
import { chargeEffect, clashEffect, impactEffect, Particles, physicalFor, Projectile, recipeFor, riseEffect, ringEffect, slashEffect, type AttackRecipe } from "../three/vfx";
import { sound } from "../audio/sound";

/**
 * The 3D battle stage: a cozy diorama arena with the two creatures facing each other. It plays
 * the engine's beats in order, each attack in three phases — charge (gathering particles and a
 * wind-up), travel/clash (signature projectiles, Basic piercing Strong, Strong-vs-Strong beam
 * struggles with shockwaves) and impact (elemental burst, hit-stop, camera shake, bouncy numbers).
 * Quality adapts to keep 60 FPS: the pixel ratio and shadows drop if frames get slow.
 */

interface Fighter { rig: CreatureRig; anim: CreatureAnimator; side: Side; speciesID: string }
interface Tween { start: number; dur: number; fn: (t: number) => void; done: () => void }

const STYLE = `
.st-overlay { position: absolute; inset: 0; pointer-events: none; overflow: hidden; font-family: ui-rounded, "SF Pro Rounded", system-ui, sans-serif; }
.st-num { position: absolute; transform: translate(-50%, -50%); font-weight: 900; color: #fff; white-space: nowrap;
  text-shadow: 0 2px 0 rgba(60,40,80,.55), 0 0 10px rgba(255,255,255,.35); animation: st-pop .95s cubic-bezier(.2,1.6,.4,1) forwards; }
.st-num.big { font-size: 26px; } .st-num.small { font-size: 13px; } .st-num { font-size: 20px; }
@keyframes st-pop { 0% { opacity: 0; transform: translate(-50%, -20%) scale(.3); } 18% { opacity: 1; transform: translate(-50%, -60%) scale(1.25); }
  35% { transform: translate(-50%, -70%) scale(.95); } 75% { opacity: 1; } 100% { opacity: 0; transform: translate(-50%, -140%) scale(1); } }
.st-bubble { position: absolute; transform: translate(-50%, -100%); background: rgba(255,255,255,.92); color: #3a3557; font-weight: 900;
  border-radius: 14px; padding: 2px 10px; font-size: 16px; box-shadow: 0 4px 14px rgba(40,30,60,.25); animation: st-bob .9s ease-out forwards; }
@keyframes st-bob { 0% { opacity: 0; transform: translate(-50%, -60%) scale(.5); } 20% { opacity: 1; transform: translate(-50%, -110%) scale(1.1); } 80% { opacity: 1; } 100% { opacity: 0; } }
.st-slash { position: absolute; left: -30%; right: -30%; top: 38%; height: 70px; transform: rotate(-8deg);
  background: linear-gradient(90deg, transparent, rgba(255,240,200,.0) 20%, rgba(255,246,214,.95) 50%, rgba(255,240,200,0) 80%, transparent);
  animation: st-sweep .55s ease-out forwards; }
@keyframes st-sweep { from { transform: translateX(-60%) rotate(-8deg); } to { transform: translateX(60%) rotate(-8deg); opacity: 0; } }
.st-card { position: absolute; left: 50%; top: 32%; transform: translate(-50%, -50%); padding: 8px 16px; border-radius: 16px; font-weight: 900;
  background: rgba(255,255,255,.85); color: #5a3a2e; backdrop-filter: blur(6px); box-shadow: 0 6px 24px rgba(255,177,59,.45); animation: st-card .9s ease-out forwards; }
@keyframes st-card { 0% { opacity: 0; transform: translate(-50%, -30%) scale(.6); } 20% { opacity: 1; transform: translate(-50%, -50%) scale(1.08); } 75% { opacity: 1; } 100% { opacity: 0; transform: translate(-50%, -70%); } }
@media (prefers-reduced-motion: reduce) { .st-num, .st-bubble, .st-card { animation-duration: .01s; } .st-slash { display: none; } }
`;

export class BattleStage {
  private renderer: THREE.WebGLRenderer;
  private scene = new THREE.Scene();
  private camera: THREE.PerspectiveCamera;
  private arena: Arena;
  private fighters = new Map<Side, Fighter>();
  private particles: Particles;
  private projectiles = new Map<Side, Projectile>();
  private tweens: Tween[] = [];
  private overlay: HTMLDivElement;
  private frame = 0;
  private last = performance.now();
  private hitStop = 0;
  private shake = 0;
  private camBase = new THREE.Vector3();
  private camTarget = new THREE.Vector3();
  private time = 0;
  private quality: Quality;
  private slowFrames = 0;
  private frameCount = 0;
  private readonly reduceMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;
  private disposed = false;
  onCaption: (text: string) => void = () => {};

  constructor(private canvas: HTMLCanvasElement, private host: HTMLElement, private battle: Battle, effects: boolean) {
    this.quality = defaultQuality(effects);
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: "high-performance" });
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.05;
    this.renderer.shadowMap.enabled = this.quality.shadows;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.setPixelRatio(this.quality.pixelRatio);

    const h = new Date().getHours();
    this.arena = buildArena(battle.regionID, !(h >= 7 && h < 20), this.quality);
    this.scene.add(this.arena.root);
    this.scene.background = this.arena.background;
    this.scene.fog = this.arena.fog;
    this.camera = new THREE.PerspectiveCamera(38, 1.5, 0.1, 200);
    // A closer battle framing than the arena's overview: the fighters fill the stage.
    this.camTarget.set(0, 0.85, 0.2);
    this.camBase.set(0, 2.5, 6.4);
    this.camera.position.copy(this.camBase);
    this.camera.lookAt(this.camTarget);

    this.particles = new Particles(effects ? 2400 : 900);
    this.scene.add(this.particles.points);
    for (const side of ["partner", "enemy"] as Side[]) this.place(side);

    const style = document.createElement("style");
    style.textContent = STYLE;
    this.overlay = document.createElement("div");
    this.overlay.className = "st-overlay";
    this.overlay.appendChild(style);
    host.appendChild(this.overlay);
    this.frame = requestAnimationFrame(this.loop);
  }

  destroy() {
    this.disposed = true;
    cancelAnimationFrame(this.frame);
    for (const f of this.fighters.values()) f.rig.dispose();
    for (const p of this.projectiles.values()) p.dispose();
    this.arena.dispose();
    this.particles.points.geometry.dispose();
    (this.particles.points.material as THREE.Material).dispose();
    this.renderer.dispose();
    this.overlay.remove();
  }

  /** Fits the canvas to its box (3:2). */
  resize(width: number, height: number) {
    const w = Math.max(1, Math.round(Math.min(width, height * 1.5))), h = Math.round(w / 1.5);
    this.renderer.setSize(w, h, false);
    this.canvas.style.width = `${w}px`;
    this.canvas.style.height = `${h}px`;
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.particles.setScale(h * this.renderer.getPixelRatio());
  }

  // MARK: Fighters

  private place(side: Side) {
    const old = this.fighters.get(side);
    // Take the old form out of the scene, not just free its GPU data: three.js keeps drawing
    // anything still parented, so a disposed rig would linger behind the new one.
    if (old) { old.rig.root.removeFromParent(); old.rig.dispose(); }
    const c = this.battle.combatant(side);
    const rig = buildCreature(c.speciesID, c.variant, this.battle.data);
    const slot = side === "partner" ? this.arena.slots.partner : this.arena.slots.enemy;
    rig.root.position.copy(slot);
    // Partner faces right, enemy faces left; both turned a little toward the camera (3/4 view).
    // (The animator mirrors the enemy so it faces left.)
    rig.root.rotation.y = side === "enemy" ? 0.45 : -0.45;
    this.scene.add(rig.root);
    const anim = new CreatureAnimator(rig, side === "partner" ? 1 : -1);
    this.fighters.set(side, { rig, anim, side, speciesID: c.speciesID });
  }

  private dir(side: Side): 1 | -1 { return side === "partner" ? 1 : -1; }

  /** Where attacks leave from / land: the creature's chest. */
  private chest(side: Side, out = new THREE.Vector3()) {
    const f = this.fighters.get(side)!;
    out.copy(f.rig.root.position);
    out.y += f.rig.height * 0.55;
    // Just in front of its face, so attacks leave from the creature rather than inside it.
    out.x += this.dir(side) * (f.rig.width * 0.5 + 0.15);
    return out;
  }
  private center(side: Side, out = new THREE.Vector3()) {
    const f = this.fighters.get(side)!;
    return out.copy(f.rig.root.position).setY(f.rig.root.position.y + f.rig.height * 0.5);
  }
  private head(side: Side, out = new THREE.Vector3()) {
    const f = this.fighters.get(side)!;
    return out.copy(f.rig.root.position).setY(f.rig.root.position.y + f.rig.height + 0.15);
  }

  private motion(side: Side, m: Motion) { return this.fighters.get(side)?.anim.play(m) ?? Promise.resolve(); }

  // MARK: Loop

  private loop = (now: number) => {
    if (this.disposed) return;
    let dt = Math.min(0.05, (now - this.last) / 1000);
    this.last = now;
    this.adaptQuality(dt);
    if (this.hitStop > 0) { this.hitStop -= dt; dt *= 0.05; }
    this.time += dt;
    for (const tw of [...this.tweens]) {
      const t = Math.min(1, (now - tw.start) / (tw.dur * 1000));
      tw.fn(t);
      if (t >= 1) { this.tweens.splice(this.tweens.indexOf(tw), 1); tw.done(); }
    }
    for (const f of this.fighters.values()) f.anim.update(dt);
    for (const [side, p] of this.projectiles) p.update(dt, this.chest(side));
    this.particles.update(dt);
    this.arena.update(dt, this.time);
    // Camera: gentle breathing drift plus shake.
    const drift = this.reduceMotion ? 0 : 0.06;
    this.camera.position.set(
      this.camBase.x + Math.sin(this.time * 0.35) * drift + (this.shake ? (Math.random() - 0.5) * this.shake : 0),
      this.camBase.y + Math.sin(this.time * 0.5) * drift * 0.5 + (this.shake ? (Math.random() - 0.5) * this.shake : 0),
      this.camBase.z,
    );
    this.camera.lookAt(this.camTarget);
    this.shake = Math.max(0, this.shake - dt * 0.9);
    this.renderer.render(this.scene, this.camera);
    this.frame = requestAnimationFrame(this.loop);
  };

  /** Drops the pixel ratio, then shadows, if frames stay slow (aiming for 60 FPS). */
  private adaptQuality(dt: number) {
    this.frameCount++;
    if (this.frameCount < 30) return;
    this.slowFrames = dt > 1 / 45 ? this.slowFrames + 1 : Math.max(0, this.slowFrames - 1);
    if (this.slowFrames < 40) return;
    this.slowFrames = 0;
    if (this.renderer.getPixelRatio() > 1.01) {
      this.renderer.setPixelRatio(Math.max(1, this.renderer.getPixelRatio() - 0.5));
      const s = this.renderer.getSize(new THREE.Vector2());
      this.resize(s.x, s.y);
    } else if (this.renderer.shadowMap.enabled) {
      this.renderer.shadowMap.enabled = false;
      this.quality.shadows = false;
    } else this.quality.particles = Math.max(0.3, this.quality.particles * 0.7);
  }

  private tween(dur: number, fn: (t: number) => void): Promise<void> {
    return new Promise((done) => this.tweens.push({ start: performance.now(), dur: Math.max(0.001, dur), fn, done }));
  }
  private pause(s: number) { return this.tween(s, () => {}); }

  // MARK: Overlay text

  private project(p: THREE.Vector3) {
    const v = p.clone().project(this.camera);
    const r = this.canvas.getBoundingClientRect(), h = this.host.getBoundingClientRect();
    return { x: r.left - h.left + ((v.x + 1) / 2) * r.width, y: r.top - h.top + ((1 - v.y) / 2) * r.height };
  }

  private label(text: string, at: THREE.Vector3, colour: string, size: "small" | "normal" | "big" = "normal") {
    const { x, y } = this.project(at);
    const el = document.createElement("div");
    el.className = `st-num ${size === "normal" ? "" : size}`;
    el.textContent = text;
    el.style.left = `${x}px`;
    el.style.top = `${y}px`;
    el.style.color = colour;
    this.overlay.appendChild(el);
    setTimeout(() => el.remove(), 1000);
  }

  private bubble(side: Side, mark: string) {
    const { x, y } = this.project(this.head(side));
    const el = document.createElement("div");
    el.className = "st-bubble";
    el.textContent = mark;
    el.style.left = `${x}px`;
    el.style.top = `${y}px`;
    this.overlay.appendChild(el);
    setTimeout(() => el.remove(), 950);
  }

  private haptic(ms: number) { try { navigator.vibrate?.(ms); } catch { /* iOS has none */ } }

  // MARK: Beats

  /** HP as the player sees it: it only changes when a hit visibly lands. */
  private shownHP: Record<Side, number> = { partner: 0, enemy: 0 };
  /** Told each time the shown HP changes (the HUD bars follow it). */
  onHP: (side: Side, hp: number) => void = () => {};
  /** The moves launched this turn, waiting to clash/land. */
  private moves = new Map<Side, AttackKind>();
  /** Sides whose creature is away from its slot (dashing), to bring back after the turn. */
  private away = new Set<Side>();

  /** Plays one turn's beats. `before`: each side's HP before the turn (what the bars show until hits land). */
  async play(beats: Beat[], before?: Record<Side, number>) {
    this.shownHP = before ? { ...before } : { partner: this.battle.partner.hp, enemy: this.battle.enemy.hp };
    for (const beat of beats) await this.beat(beat);
    for (const p of this.projectiles.values()) p.dispose();
    this.projectiles.clear();
    this.moves.clear();
    await Promise.all([...this.away].map((side) => this.goHome(side)));
    if (this.battle.outcome === "victory") void this.motion("partner", "victory");
    if (this.battle.outcome === "defeat") void this.motion("enemy", "victory");
  }

  private setHP(side: Side, hp: number) {
    this.shownHP[side] = Math.max(0, hp);
    this.onHP(side, this.shownHP[side]);
  }

  private sfx(b: Beat) {
    switch (b.t) {
      case "charge": return sound.play("charge");
      case "card": return sound.play("slash");
      case "evolve": return sound.play(b.success ? "evolve" : "miss");
      case "emote": case "status": return sound.play("tap");
      case "heal": case "revive": return sound.play("reward");
    }
  }

  /** Projectile looks: Quick Shot uses the species' basic recipe, Charged Attack its strong one. */
  private recipe(side: Side, kind: AttackKind): AttackRecipe {
    return recipeFor(this.battle.combatant(side).speciesID, kind === "charged" ? "strong" : "basic", this.battle.data);
  }

  private async beat(b: Beat) {
    this.sfx(b);
    switch (b.t) {
      case "text": this.onCaption(b.text); return this.pause(0.5);
      case "emote": this.bubble(b.side, b.mark); return this.pause(0.9);
      case "charge": {
        // The Charged Attack gathers power: a long, glowing build-up.
        this.onCaption(`${this.battle.species(b.side).name} carga su ${this.battle.species(b.side).signature.name}…`);
        chargeEffect(this.particles, this.chest(b.side), this.recipe(b.side, "charged"), true, this.quality.particles);
        void this.motion(b.side, "charge");
        await this.pause(0.55);
        chargeEffect(this.particles, this.chest(b.side), this.recipe(b.side, "charged"), true, this.quality.particles);
        return this.pause(0.35);
      }
      case "launch": return this.launch(b.side, b.kind);
      case "clash": return this.exchange(b.winner, b.partner, b.enemy);
      case "hit": {
        await this.approach(other(b.target), false);
        return this.impact(b.target, b.damage, b.critical, b.effectiveness);
      }
      case "dodge": {
        await this.approach(other(b.side), true);
        sound.play("dodge");
        this.label("¡ESQUIVA!", this.head(b.side), "#9ff3ee", "big");
        return this.pause(0.6);
      }
      case "blocked": {
        await this.approach(other(b.side), false);
        sound.play("clash");
        ringEffect(this.particles, this.center(b.side), "#b4dcff", 1.2, this.quality.particles);
        this.label("¡BLOQUEADO!", this.head(b.side), "#b4dcff");
        return this.pause(0.6);
      }
      case "heal": {
        riseEffect(this.particles, this.center(b.side).setY(this.fighters.get(b.side)!.rig.root.position.y), ["#7fcb5a", "#cdeb8b", "#ffffff"], 30, 1, this.quality.particles);
        this.label(`+${b.amount}`, this.head(b.side), "#7fcb5a");
        this.setHP(b.side, this.shownHP[b.side] + b.amount);
        return this.pause(0.6);
      }
      case "card": return this.cardSlash(b.name);
      case "status": this.label(b.text, this.head(b.side), "#ffe27a", "small"); return this.pause(0.55);
      case "evolve": return this.evolve(b.side, b.success);
      case "ko": this.haptic(50); await this.motion(b.side, "ko"); return;
      case "revive": {
        this.place(b.side);
        this.setHP(b.side, this.battle.combatant(b.side).stats.hp);
        riseEffect(this.particles, this.fighters.get(b.side)!.rig.root.position, ["#7fcb5a", "#ffffff"], 40, 1.2, this.quality.particles);
        await this.motion(b.side, "revive");
        this.label("¡REINICIO!", this.head(b.side), "#7fcb5a");
        return this.pause(0.4);
      }
    }
  }

  /** Wind-up: each side readies its move; projectiles appear and hover, dashers crouch. */
  private async launch(side: Side, kind: AttackKind) {
    this.moves.set(side, kind);
    void this.motion(side, "windup");
    if (kind !== "physical") {
      const recipe = this.recipe(side, kind);
      if (kind === "quick") chargeEffect(this.particles, this.chest(side), recipe, false, this.quality.particles);
      const p = new Projectile(recipe, kind === "charged" ? "strong" : "basic", this.dir(side), this.particles, this.quality.particles);
      p.setPosition(this.chest(side));
      p.group.scale.setScalar(0.01);
      this.scene.add(p.group);
      this.projectiles.get(side)?.dispose();
      this.projectiles.set(side, p);
      void this.tween(0.3, (t) => p.group.scale.setScalar(Math.max(0.01, t)));
    }
    // Both launch beats arrive back to back; together they make a ~0.7 s wind-up.
    await this.pause(0.35);
  }

  /** Units per second: Quick Shots are fast, Charged Attacks heavy, dashes in between. */
  private speedOf(kind: AttackKind, side: Side) {
    const base = kind === "quick" ? 3.4 : kind === "charged" ? 2.3 : 3.0;
    const r = kind === "physical" ? physicalFor(this.battle.combatant(side).speciesID, this.battle.data).speed : this.projectiles.get(side)?.recipe.speed ?? 1;
    return base * r;
  }

  /** Moves a projectile along an arc to `to`; resolves on arrival. */
  private travel(p: Projectile, to: THREE.Vector3, time: number) {
    const from = p.position.clone();
    const arc = p.kind === "strong" && p.recipe.strong === "meteor" ? 1.2 : p.recipe.arc * 0.6;
    const pos = new THREE.Vector3();
    return this.tween(time, (t) => {
      const e = p.kind === "strong" && p.recipe.strong === "meteor" ? t * t : t;
      pos.lerpVectors(from, to, e);
      pos.y += Math.sin(Math.PI * e) * arc;
      p.setPosition(pos);
    });
  }

  /** The creature itself dashes to `toX` in its own style (tackle, claw, spin, horn, pounce). */
  private dash(side: Side, toX: number, time: number) {
    const f = this.fighters.get(side)!;
    const style = physicalFor(f.speciesID, this.battle.data);
    const root = f.rig.root;
    const fromX = root.position.x, y0 = this.slot(side).y, baseRot = root.rotation.clone();
    this.away.add(side);
    let trail = 0;
    const tmp = new THREE.Vector3();
    return this.tween(time, (t) => {
      const e = t < 0.15 ? t * 0.5 : t;
      root.position.x = fromX + (toX - fromX) * e;
      switch (style.style) {
        case "pounce": root.position.y = y0 + Math.sin(Math.PI * t) * 0.9; break;
        case "spin": root.rotation.y = baseRot.y + t * Math.PI * 4; break;
        case "horn": root.rotation.z = -this.dir(side) * style.lean * 0.8; root.position.y = y0; break;
        default: root.rotation.z = -this.dir(side) * style.lean * 0.5; root.position.y = y0 + Math.abs(Math.sin(t * Math.PI * 4)) * 0.08;
      }
      trail -= 1;
      if (trail <= 0) {
        trail = 2;
        tmp.copy(root.position).setY(root.position.y + f.rig.height * 0.4);
        this.particles.spawn(tmp, new THREE.Vector3(-this.dir(side) * 1.5, 0.3, 0), style.colors[Math.random() < 0.5 ? 0 : 1], 0.22, 0.4, { drag: 3 });
      }
    });
  }

  private slot(side: Side) { return side === "partner" ? this.arena.slots.partner : this.arena.slots.enemy; }

  /** Brings a dashing creature back to its slot. */
  private async goHome(side: Side) {
    const f = this.fighters.get(side);
    this.away.delete(side);
    if (!f) return;
    const root = f.rig.root, slot = this.slot(side);
    const from = root.position.clone(), rz = root.rotation.z, ry = root.rotation.y, homeY = side === "enemy" ? 0.45 : -0.45;
    await this.tween(0.45, (t) => {
      root.position.lerpVectors(from, slot, t);
      root.position.y = slot.y + Math.sin(Math.PI * t) * 0.25;
      root.rotation.z = rz * (1 - t);
      root.rotation.y = ry + (homeY - ry) * t;
    });
  }

  /** Knocked back: a dasher blown back to (near) its slot. */
  private knockBack(side: Side, time = 0.35) {
    const f = this.fighters.get(side)!;
    const root = f.rig.root, slot = this.slot(side), fromX = root.position.x;
    void this.motion(side, "bigHit");
    return this.tween(time, (t) => { root.position.x = fromX + (slot.x - this.dir(side) * 0.3 - fromX) * (1 - (1 - t) * (1 - t)); root.rotation.z *= 0.8; });
  }

  /**
   * Phase 2: both moves travel at once and meet. Only `winner` comes out of it:
   * Quick pierces a still-charging Charged Attack; Physical smashes through a Quick Shot; a
   * Charged Attack blasts a dashing Physical back; mirrors struggle mid-arena (higher AP, then SP).
   */
  private async exchange(winner: Side | undefined, pk: AttackKind, ek: AttackKind) {
    const kinds: Record<Side, AttackKind> = { partner: pk, enemy: ek };
    const A = this.chest("partner"), B = this.chest("enemy");
    sound.play("launch");
    // Where they meet: mirrors in the middle; a Quick Shot reaches a Charged Attack still near its
    // owner; a dash meets a Quick Shot early on the shot's side; a beam stops a dash mid-way.
    const quickVsCharged = (pk === "quick" && ek === "charged") || (pk === "charged" && ek === "quick");
    const physVsQuick = (pk === "physical" && ek === "quick") || (pk === "quick" && ek === "physical");
    const chargedVsPhys = (pk === "charged" && ek === "physical") || (pk === "physical" && ek === "charged");
    let meetT = 0.5;
    if (quickVsCharged) meetT = pk === "quick" ? 0.78 : 0.22;
    else if (physVsQuick) meetT = pk === "physical" ? 0.55 : 0.45;
    else if (chargedVsPhys) meetT = pk === "physical" ? 0.42 : 0.58;
    const meet = new THREE.Vector3().lerpVectors(A, B, meetT);
    const legs: Promise<void>[] = [];
    let time = 0;
    for (const side of ["partner", "enemy"] as Side[]) {
      const k = kinds[side];
      const startX = side === "partner" ? A.x : B.x;
      const target = meet.clone().setX(meet.x - this.dir(side) * (k === "physical" ? 0.45 : 0.14));
      // A Charged Attack pierced while charging never really leaves.
      const stays = k === "charged" && quickVsCharged;
      const t = stays ? 0 : Math.abs(target.x - startX) / this.speedOf(k, side);
      time = Math.max(time, t);
      if (stays) continue;
      if (k === "physical") legs.push(this.dash(side, target.x - this.dir(side) * 0.0, t));
      else { const p = this.projectiles.get(side); if (p) legs.push(this.travel(p, target, t)); }
    }
    this.onCaption("¡Los ataques se acercan…!");
    await Promise.all(legs);

    // The clash itself: a suspenseful struggle on mirrors, a sharp break otherwise.
    const mirror = pk === ek;
    const label = !winner ? "¡EMPATE!" : mirror ? (pk === "charged" ? "¡CHOQUE DE RAYOS!" : pk === "physical" ? "¡FORCEJEO!" : "¡CHOQUE!")
      : quickVsCharged ? "¡ATRAVIESA!" : physVsQuick ? "¡LO ROMPE!" : "¡ARRASA!";
    sound.play("clash");
    if (mirror) {
      const push = winner === "partner" ? 1 : winner === "enemy" ? -1 : 0;
      const pieces = (["partner", "enemy"] as Side[]).map((side) => ({ side, p: this.projectiles.get(side), root: this.fighters.get(side)!.rig.root }));
      const start = pieces.map((x) => (x.p ? x.p.position.x : x.root.position.x));
      const pos = new THREE.Vector3();
      const struggle = pk === "charged" ? 1.1 : pk === "physical" ? 0.8 : 0.6;
      await this.tween(struggle, (k) => {
        const wobble = Math.sin(k * 30) * 0.1 * (1 - k * 0.6) + push * k * k * 0.35;
        pieces.forEach((x, i) => {
          const nx = start[i] + wobble;
          if (x.p) x.p.setPosition(pos.copy(x.p.position).setX(nx));
          else x.root.position.x = nx;
        });
        if (Math.random() < 0.6) this.particles.burst(pos.copy(meet).setX(meet.x + wobble), 2, [this.recipe("partner", pk).colors[0], this.recipe("enemy", ek).colors[0], "#ffffff"], 4.5, 0.13, 0.35);
        this.shake = 0.03 + k * 0.05;
      });
    } else await this.pause(0.12);
    const at = meet.clone();
    clashEffect(this.particles, at, this.recipe("partner", pk === "physical" ? "quick" : pk), this.recipe("enemy", ek === "physical" ? "quick" : ek), mirror && pk === "charged", this.quality.particles);
    this.hitStop = mirror ? 0.14 : 0.08;
    this.shake = mirror ? 0.18 : 0.1;
    this.haptic(mirror ? 30 : 15);
    this.label(label, at.clone().setY(at.y + 0.6), winner ? "#ffe27a" : "#ffffff", "big");
    // The loser's move breaks: projectiles shatter, a dasher is knocked back.
    for (const side of ["partner", "enemy"] as Side[]) {
      if (side === winner) continue;
      const p = this.projectiles.get(side);
      if (p) { this.particles.burst(p.position, 18, [p.recipe.colors[1], "#ffffff"], 4.5, 0.15, 0.45, { gravity: 3 }); p.dispose(); this.projectiles.delete(side); }
      if (kinds[side] === "physical") void this.knockBack(side);
    }
    const name = (s: Side) => this.battle.species(s).name;
    if (!winner) this.onCaption("¡Los ataques se anulan! Nadie recibe daño.");
    else if (quickVsCharged) this.onCaption(`¡El disparo rápido de ${name(winner)} atraviesa el ataque cargado antes de que salga!`);
    else if (physVsQuick) this.onCaption(`¡${name(winner)} embiste a través del disparo!`);
    else if (chargedVsPhys) this.onCaption(`¡El ${this.battle.species(winner).signature.name} de ${name(winner)} arrasa la embestida!`);
    else this.onCaption(`¡${name(winner)} se impone en el choque!`);
    if (!winner) this.moves.clear();
    await this.pause(0.45);
  }

  /** Phase 3 approach: the winning move goes on to the defender (or past it, on a dodge). */
  private async approach(attacker: Side, dodged: boolean) {
    const defender = other(attacker);
    const kind = this.moves.get(attacker) ?? "quick";
    this.moves.delete(attacker);
    const to = this.chest(defender);
    if (kind === "physical") {
      const f = this.fighters.get(attacker)!;
      const target = this.slot(defender).x - this.dir(attacker) * (dodged ? -0.8 : f.rig.width * 0.5 + this.fighters.get(defender)!.rig.width * 0.35);
      if (!this.away.has(attacker)) await this.motion(attacker, "windup");
      if (dodged) void this.motion(defender, "dodge");
      await this.dash(attacker, target, Math.abs(target - f.rig.root.position.x) / (this.speedOf("physical", attacker) * 1.2));
      if (!dodged && physicalFor(f.speciesID, this.battle.data).style === "claw") {
        slashEffect(this.particles, this.chest(defender), physicalFor(f.speciesID, this.battle.data).colors, this.dir(attacker), this.quality.particles);
      }
      return;
    }
    let p = this.projectiles.get(attacker);
    if (!p) {
      // An unopposed attack (the other side didn't move): launch it now.
      const recipe = this.recipe(attacker, kind);
      p = new Projectile(recipe, kind === "charged" ? "strong" : "basic", this.dir(attacker), this.particles, this.quality.particles);
      p.setPosition(this.chest(attacker));
      this.scene.add(p.group);
      this.projectiles.set(attacker, p);
    }
    if (dodged) { to.x += this.dir(attacker) * 1.8; void this.motion(defender, "dodge"); }
    await this.travel(p, to, Math.abs(to.x - p.position.x) / this.speedOf(kind, attacker));
    if (dodged) { p.dispose(); this.projectiles.delete(attacker); }
  }

  /** Phase 3: elemental burst, hit-stop, shake, flinch and the bouncy number. */
  private async impact(target: Side, damage: number, critical: boolean, eff: Effectiveness) {
    const shooter = other(target);
    const p = this.projectiles.get(shooter);
    const recipe = p?.recipe ?? this.recipe(shooter, "quick");
    const strong = p?.kind === "strong" || !p;
    sound.play(critical ? "crit" : "hit");
    this.setHP(target, this.shownHP[target] - damage);
    const at = this.center(target);
    impactEffect(this.particles, at, recipe, strong || critical, this.quality.particles);
    if (p) { p.dispose(); this.projectiles.delete(shooter); }
    this.hitStop = critical ? 0.14 : strong ? 0.1 : 0.06;
    this.shake = critical ? 0.22 : strong ? 0.15 : 0.08;
    this.haptic(critical ? 40 : 20);
    void this.motion(target, strong || critical ? "bigHit" : "hit");
    const attacker = this.battle.species(shooter).name;
    if (critical) this.onCaption(`¡Golpe crítico de ${attacker}!`);
    else if (eff === "strong") this.onCaption(`¡El ataque de ${attacker} es muy eficaz!`);
    else if (eff === "weak") this.onCaption(`El ataque de ${attacker} no es muy eficaz…`);
    else this.onCaption(`${attacker} acierta: ${damage} de daño.`);
    if (critical) this.label("¡CRÍTICO!", this.head(target).add(new THREE.Vector3(0, 0.35, 0)), "#ffe27a", "big");
    this.label(String(damage), this.head(target), critical ? "#ffe27a" : eff === "strong" ? "#ff9b7a" : "#ffffff", critical || strong ? "big" : "normal");
    await this.pause(0.55);
  }

  private async cardSlash(name: string) {
    this.haptic(15);
    const slash = document.createElement("div");
    slash.className = "st-slash";
    const card = document.createElement("div");
    card.className = "st-card";
    card.textContent = name;
    this.overlay.append(slash, card);
    setTimeout(() => { slash.remove(); card.remove(); }, 950);
    riseEffect(this.particles, this.fighters.get("partner")!.rig.root.position, ["#ffe27a", "#ffffff"], 24, 1, this.quality.particles);
    await this.motion("partner", "cardUse");
    await this.pause(0.25);
  }

  private async evolve(side: Side, success: boolean) {
    const f = this.fighters.get(side)!;
    const base = f.rig.root.position.clone();
    const seam = f.rig.colors.seam;
    // Sparkling aura spiralling up, the old form spins away, the new one pops in.
    riseEffect(this.particles, base, [seam, "#ffffff", f.rig.colors.accent], 70, 1.4, this.quality.particles);
    ringEffect(this.particles, base.clone().setY(base.y + 0.1), seam, 1.4, this.quality.particles);
    await this.motion(side, "evolve");
    if (!success) { this.label("¡FALLO!", this.head(side), "#ff8a5c"); return this.pause(0.4); }
    this.place(side);
    const g = this.fighters.get(side)!;
    clashEffect(this.particles, this.center(side), recipeFor(g.speciesID, "strong", this.battle.data), recipeFor(g.speciesID, "basic", this.battle.data), true, this.quality.particles);
    this.shake = 0.12;
    this.haptic(30);
    await g.anim.play("revive");
    await this.pause(0.2);
  }
}

import * as THREE from "three";
import type { AttackKind, Battle, Beat, Effectiveness, Side } from "../systems/battle/battle";
import { other } from "../systems/battle/battle";
import { buildCreature, type CreatureRig } from "../three/creature";
import { CreatureAnimator, type Motion } from "../three/rig";
import { buildArena, type Arena } from "../three/arena";
import { defaultQuality, type Quality } from "../three/materials";
import { chargeEffect, clashEffect, impactEffect, Particles, Projectile, recipeFor, riseEffect, ringEffect, type AttackRecipe } from "../three/vfx";
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
    if (old) old.rig.dispose();
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

  async play(beats: Beat[]) {
    for (const beat of beats) await this.beat(beat);
    for (const p of this.projectiles.values()) p.dispose();
    this.projectiles.clear();
    if (this.battle.outcome === "victory") void this.motion("partner", "victory");
    if (this.battle.outcome === "defeat") void this.motion("enemy", "victory");
  }

  private sfx(b: Beat) {
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

  private recipe(side: Side, kind: AttackKind): AttackRecipe {
    return recipeFor(this.battle.combatant(side).speciesID, kind, this.battle.data);
  }

  private async beat(b: Beat) {
    this.sfx(b);
    switch (b.t) {
      case "text": this.onCaption(b.text); return this.pause(0.45);
      case "emote": this.bubble(b.side, b.mark); return this.pause(0.85);
      case "charge": {
        // Phase 1 (Strong): a big gathering and a wind-up pose.
        chargeEffect(this.particles, this.chest(b.side), this.recipe(b.side, "strong"), true, this.quality.particles);
        await this.motion(b.side, "charge");
        return;
      }
      case "launch": return this.launch(b.side, b.kind);
      case "pierce": return this.collide(b.by, true);
      case "clash": return this.collide(b.winner, false);
      case "hit": await this.flyIn(b.target); return this.impact(b.target, b.damage, b.critical, b.effectiveness);
      case "dodge": {
        await this.flyIn(b.side, true);
        void this.motion(b.side, "dodge");
        this.label("¡ESQUIVA!", this.head(b.side), "#9ff3ee");
        return this.pause(0.5);
      }
      case "blocked": {
        await this.flyIn(b.side);
        ringEffect(this.particles, this.center(b.side), "#b4dcff", 1.2, this.quality.particles);
        this.label("¡BLOQUEADO!", this.head(b.side), "#b4dcff");
        return this.pause(0.5);
      }
      case "heal": {
        riseEffect(this.particles, this.center(b.side).setY(this.fighters.get(b.side)!.rig.root.position.y), ["#7fcb5a", "#cdeb8b", "#ffffff"], 30, 1, this.quality.particles);
        this.label(`+${b.amount}`, this.head(b.side), "#7fcb5a");
        return this.pause(0.6);
      }
      case "card": return this.cardSlash(b.name);
      case "status": this.label(b.text, this.head(b.side), "#ffe27a", "small"); return this.pause(0.55);
      case "evolve": return this.evolve(b.side, b.success);
      case "ko": this.haptic(50); await this.motion(b.side, "ko"); return;
      case "revive": {
        this.place(b.side);
        riseEffect(this.particles, this.fighters.get(b.side)!.rig.root.position, ["#7fcb5a", "#ffffff"], 40, 1.2, this.quality.particles);
        await this.motion(b.side, "revive");
        this.label("¡REINICIO!", this.head(b.side), "#7fcb5a");
        return this.pause(0.4);
      }
    }
  }

  /** Phase 1 (Basic) and the throw: a quick gathering, the attack pose, the projectile appears. */
  private async launch(side: Side, kind: AttackKind) {
    const recipe = this.recipe(side, kind);
    if (kind === "basic") chargeEffect(this.particles, this.chest(side), recipe, false, this.quality.particles);
    await this.motion(side, "windup");
    void this.motion(side, kind === "strong" ? "strongAttack" : "attack");
    const p = new Projectile(recipe, kind, this.dir(side), this.particles, this.quality.particles);
    p.setPosition(this.chest(side));
    this.scene.add(p.group);
    this.projectiles.get(side)?.dispose();
    this.projectiles.set(side, p);
    await this.pause(0.08);
  }

  private flightTime(p: Projectile, distance: number) {
    const speed = (p.kind === "basic" ? 9 : 5.5) * p.recipe.speed;
    return Math.max(0.08, Math.abs(distance) / speed);
  }

  /** Moves a projectile along an arc (or straight for beams) to x; resolves on arrival. */
  private travel(p: Projectile, to: THREE.Vector3, time: number) {
    const from = p.position.clone();
    const arc = p.kind === "strong" && p.recipe.strong === "meteor" ? 1.4 : p.recipe.arc;
    const pos = new THREE.Vector3();
    return this.tween(time, (t) => {
      const e = p.kind === "strong" && p.recipe.strong === "meteor" ? t * t : t;
      pos.lerpVectors(from, to, e);
      pos.y += Math.sin(Math.PI * e) * arc;
      p.setPosition(pos);
    });
  }

  /** Phase 2: both attacks meet. Basic pierces Strong early; Strong vs Strong struggles mid-screen. */
  private async collide(winner: Side | undefined, pierce: boolean) {
    const mine = this.projectiles.get("partner"), theirs = this.projectiles.get("enemy");
    if (!mine || !theirs) return;
    const a = this.chest("partner"), b = this.chest("enemy");
    const meet = new THREE.Vector3().lerpVectors(a, b, pierce ? (winner === "partner" ? 0.7 : 0.3) : 0.5);
    const t = Math.max(this.flightTime(mine, meet.x - mine.position.x), this.flightTime(theirs, theirs.position.x - meet.x));
    await Promise.all([
      this.travel(mine, meet.clone().add(new THREE.Vector3(-0.12, 0, 0)), t),
      this.travel(theirs, meet.clone().add(new THREE.Vector3(0.12, 0, 0)), t),
    ]);
    if (!pierce) {
      // Beam struggle: the meeting point wobbles, then the stronger one pushes through.
      const push = winner === "partner" ? 1 : winner === "enemy" ? -1 : 0;
      const base = meet.clone();
      const pos = new THREE.Vector3();
      await this.tween(0.55, (k) => {
        const x = base.x + Math.sin(k * 26) * 0.08 * (1 - k) + push * k * k * 0.5;
        mine.setPosition(pos.set(x - 0.12, base.y, base.z));
        theirs.setPosition(pos.set(x + 0.12, base.y, base.z));
        if (Math.random() < 0.5) this.particles.burst(pos.set(x, base.y, base.z), 2, [mine.recipe.colors[0], theirs.recipe.colors[0]], 4, 0.12, 0.3);
      });
      meet.x += push * 0.5;
    }
    clashEffect(this.particles, meet, mine.recipe, theirs.recipe, !pierce, this.quality.particles);
    this.hitStop = pierce ? 0.06 : 0.12;
    this.shake = pierce ? 0.08 : 0.16;
    this.haptic(pierce ? 15 : 30);
    this.label(pierce ? "¡ATRAVIESA!" : winner ? "¡CHOQUE!" : "¡EMPATE!", meet.clone().setY(meet.y + 0.5), pierce ? "#ffe27a" : "#ffffff", "big");
    for (const side of ["partner", "enemy"] as Side[]) {
      if (side === winner) continue;
      const p = this.projectiles.get(side);
      if (p) { this.particles.burst(p.position, 14, [p.recipe.colors[1], "#ffffff"], 4, 0.14, 0.4, { gravity: 3 }); p.dispose(); this.projectiles.delete(side); }
    }
    if (!winner) this.onCaption("¡Los ataques chocan y se anulan!");
    else if (pierce) this.onCaption("¡El ataque básico atraviesa al especial!");
    else this.onCaption(`¡El especial de ${this.battle.species(winner).name} se impone!`);
    await this.pause(0.15);
  }

  /** Phase 2 end: the projectile aimed at `target` arrives (or flies past on a dodge). */
  private async flyIn(target: Side, passing = false) {
    const shooter = other(target);
    const p = this.projectiles.get(shooter);
    if (!p) return;
    const to = this.chest(target);
    if (passing) to.x += this.dir(shooter) * 1.6;
    await this.travel(p, to, this.flightTime(p, to.x - p.position.x));
    if (passing) { p.dispose(); this.projectiles.delete(shooter); }
  }

  /** Phase 3: elemental burst, hit-stop, shake, flinch and the bouncy number. */
  private async impact(target: Side, damage: number, critical: boolean, eff: Effectiveness) {
    const shooter = other(target);
    const p = this.projectiles.get(shooter);
    const recipe = p?.recipe ?? this.recipe(shooter, "basic");
    const strong = p?.kind === "strong";
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

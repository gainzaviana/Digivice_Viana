/**
 * Chiptune sound effects synthesised in code (no audio files): square, triangle and noise voices
 * with pitch sweeps, rendered once into buffers. Safari only allows audio after a tap, so the
 * context is created on the first play() that follows one.
 */
export type Effect =
  | "tap" | "hit" | "crit" | "miss" | "launch" | "charge" | "clash" | "dodge" | "evolve"
  | "victory" | "defeat" | "slash" | "event" | "hatch" | "levelUp" | "reward";

type Wave = { kind: "square"; duty: number } | { kind: "triangle" } | { kind: "noise" };
interface Note { from: number; to: number; duration: number; wave: Wave; volume: number }

const SQ: Wave = { kind: "square", duty: 0.5 };
const THIN: Wave = { kind: "square", duty: 0.25 };
const TRI: Wave = { kind: "triangle" };
const NOISE: Wave = { kind: "noise" };
const n = (f: number, d: number, w: Wave = SQ, v = 0.6): Note => ({ from: f, to: f, duration: d, wave: w, volume: v });
const sweep = (a: number, b: number, d: number, w: Wave = SQ, v = 0.6): Note => ({ from: a, to: b, duration: d, wave: w, volume: v });

const NOTES: Record<Effect, Note[]> = {
  tap: [n(880, 0.03, THIN, 0.4)],
  hit: [sweep(220, 90, 0.09), n(0, 0.06, NOISE, 0.5)],
  crit: [sweep(660, 1320, 0.05), sweep(300, 80, 0.1), n(0, 0.1, NOISE, 0.6)],
  miss: [sweep(300, 140, 0.14, TRI, 0.7)],
  launch: [sweep(660, 990, 0.06, THIN, 0.4)],
  charge: [sweep(180, 820, 0.3, THIN, 0.45)],
  clash: [n(0, 0.16, NOISE, 0.7)],
  dodge: [sweep(1200, 500, 0.1, TRI, 0.6)],
  evolve: [...[523, 659, 784, 1047, 1319, 1568].map((f) => n(f, 0.07)), n(2093, 0.18)],
  victory: [n(523, 0.1), n(659, 0.1), n(784, 0.1), n(1047, 0.28)],
  defeat: [n(392, 0.16, TRI, 0.7), n(330, 0.16, TRI, 0.7), n(262, 0.34, TRI, 0.7)],
  slash: [sweep(1500, 3200, 0.08, THIN, 0.4), n(0, 0.05, NOISE, 0.4)],
  event: [n(988, 0.06), n(1319, 0.1)],
  hatch: [n(659, 0.08, TRI, 0.7), n(784, 0.08, TRI, 0.7), n(1047, 0.16, TRI, 0.7)],
  levelUp: [n(523, 0.07), n(784, 0.07), n(1047, 0.14)],
  reward: [n(784, 0.06), n(1047, 0.06), n(1319, 0.14)],
};

/** Renders notes into samples (exported for tests). */
export function renderNotes(notes: Note[], rate: number): Float32Array<ArrayBuffer> {
  const total = Math.floor(notes.reduce((s, x) => s + x.duration, 0) * rate);
  const out = new Float32Array(new ArrayBuffer(total * 4));
  let index = 0, phase = 0, noise = 0xace1;
  for (const note of notes) {
    const count = Math.floor(note.duration * rate);
    for (let i = 0; i < count && index < total; i++) {
      const t = i / Math.max(1, count);
      phase += (note.from + (note.to - note.from) * t) / rate;
      phase -= Math.floor(phase);
      let s: number;
      if (note.wave.kind === "square") s = phase < note.wave.duty ? 1 : -1;
      else if (note.wave.kind === "triangle") s = 4 * Math.abs(phase - 0.5) - 1;
      else {
        // 16-bit LFSR, the classic handheld noise channel.
        const bit = (noise ^ (noise >> 2) ^ (noise >> 3) ^ (noise >> 5)) & 1;
        noise = ((noise >> 1) | (bit << 15)) & 0xffff;
        s = noise & 1 ? -1 : 1;
      }
      const attack = Math.min(1, i / (0.004 * rate));
      const release = Math.min(1, (count - i) / (0.012 * rate));
      out[index++] = s * note.volume * attack * release;
    }
  }
  return out;
}

class Sound {
  enabled = true;
  private ctx?: AudioContext;
  private gain?: GainNode;
  private buffers = new Map<Effect, AudioBuffer>();

  play(effect: Effect) {
    if (!this.enabled || typeof window === "undefined") return;
    try {
      if (!this.ctx) {
        const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
        if (!Ctor) return;
        this.ctx = new Ctor();
        this.gain = this.ctx.createGain();
        this.gain.gain.value = 0.35;
        this.gain.connect(this.ctx.destination);
      }
      const ctx = this.ctx;
      if (ctx.state === "suspended") void ctx.resume();
      let buffer = this.buffers.get(effect);
      if (!buffer) {
        const samples = renderNotes(NOTES[effect], ctx.sampleRate);
        buffer = ctx.createBuffer(1, Math.max(1, samples.length), ctx.sampleRate);
        buffer.copyToChannel(samples, 0);
        this.buffers.set(effect, buffer);
      }
      const src = ctx.createBufferSource();
      src.buffer = buffer;
      src.connect(this.gain!);
      src.start();
    } catch {
      // Audio unavailable: play silently.
    }
  }
}

export const sound = new Sound();

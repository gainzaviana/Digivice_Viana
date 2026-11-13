/** A small seeded generator (sfc32): a fixed seed always replays the same walk or battle. */
export class Rng {
  private a: number;
  private b: number;
  private c: number;
  private d: number;

  constructor(seed: number = (Math.random() * 2 ** 32) >>> 0) {
    this.a = 0x9e3779b9;
    this.b = 0x243f6a88;
    this.c = 0xb7e15162;
    this.d = seed >>> 0;
    for (let i = 0; i < 15; i++) this.next();
  }

  /** Uniform 32-bit integer. */
  next(): number {
    this.a >>>= 0; this.b >>>= 0; this.c >>>= 0; this.d >>>= 0;
    let t = (this.a + this.b) | 0;
    this.a = this.b ^ (this.b >>> 9);
    this.b = (this.c + (this.c << 3)) | 0;
    this.c = (this.c << 21) | (this.c >>> 11);
    this.d = (this.d + 1) | 0;
    t = (t + this.d) | 0;
    this.c = (this.c + t) | 0;
    return t >>> 0;
  }

  /** 0 ≤ x < 1 */
  float(): number { return this.next() / 4294967296; }
  /** min…max inclusive */
  int(min: number, max: number): number { return min + Math.floor(this.float() * (max - min + 1)); }
  range(min: number, max: number): number { return min + this.float() * (max - min); }
  bool(): boolean { return this.next() % 2 === 0; }
  pick<T>(items: T[]): T | undefined { return items.length ? items[this.int(0, items.length - 1)] : undefined; }

  /** One element with probability proportional to its weight; undefined if all weights are 0. */
  weighted<T>(items: T[], weight: (t: T) => number): T | undefined {
    const total = items.reduce((s, t) => s + Math.max(0, weight(t)), 0);
    if (total <= 0) return undefined;
    let roll = this.float() * total;
    for (const t of items) {
      roll -= Math.max(0, weight(t));
      if (roll < 0) return t;
    }
    return items[items.length - 1];
  }
}

/** A deterministic seed from a string (e.g. today's date). */
export function seedFrom(text: string): number {
  let h = 5381;
  for (let i = 0; i < text.length; i++) h = (Math.imul(h, 33) + text.charCodeAt(i)) >>> 0;
  return h;
}

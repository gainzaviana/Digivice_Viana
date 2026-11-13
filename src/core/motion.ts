/**
 * Counts steps from the accelerometer while the game is open and visible (Safari stops sensor
 * events in the background). Only the acceleration magnitude is used; nothing leaves the device.
 *
 * Detection: the magnitude is smoothed, its slow average removed, and a step is a peak above a
 * threshold at a walking cadence (0.25–2 s apart). Steps only count after a run of several in a
 * row, so shaking or picking the phone up doesn't add steps.
 */

export type MotionPermission = "granted" | "denied" | "unsupported";

interface IOSMotion { requestPermission?: () => Promise<"granted" | "denied"> }

/** Must be called from a tap (iOS asks the player for permission once). */
export async function requestMotionPermission(): Promise<MotionPermission> {
  if (typeof window === "undefined" || typeof DeviceMotionEvent === "undefined") return "unsupported";
  const ctor = DeviceMotionEvent as unknown as IOSMotion;
  if (typeof ctor.requestPermission !== "function") return "granted";
  try {
    return (await ctor.requestPermission()) === "granted" ? "granted" : "denied";
  } catch {
    return "denied";
  }
}

export class StepDetector {
  private smooth = 9.81;
  private baseline = 9.81;
  private rising = false;
  private peak = 0;
  private lastStep = 0;
  private run = 0;
  private pending = 0;

  constructor(
    private readonly onSteps: (n: number) => void,
    private readonly threshold = 1.2,
    private readonly runToCount = 6,
  ) {}

  /** Feeds one sample: total acceleration in m/s² and its time in ms. */
  sample(magnitude: number, time: number) {
    this.smooth += (magnitude - this.smooth) * 0.35;
    this.baseline += (magnitude - this.baseline) * 0.02;
    const v = this.smooth - this.baseline;
    if (v > this.peak) this.peak = v;
    if (!this.rising && v > this.threshold) this.rising = true;
    if (this.rising && v < 0) {
      this.rising = false;
      this.peak = 0;
      this.step(time);
    }
  }

  private step(time: number) {
    const gap = time - this.lastStep;
    this.lastStep = time;
    if (gap < 250) return;
    if (gap > 2000) { this.run = 1; this.pending = 1; return; }
    this.run += 1;
    if (this.run < this.runToCount) { this.pending += 1; return; }
    const n = this.pending + 1;
    this.pending = 0;
    this.onSteps(n);
  }
}

/** Starts listening; returns a stop function. */
export function startMotion(onSteps: (n: number) => void): () => void {
  const detector = new StepDetector(onSteps);
  const handler = (e: DeviceMotionEvent) => {
    const a = e.accelerationIncludingGravity;
    if (!a || a.x == null || a.y == null || a.z == null) return;
    detector.sample(Math.hypot(a.x, a.y, a.z), e.timeStamp || performance.now());
  };
  window.addEventListener("devicemotion", handler);
  return () => window.removeEventListener("devicemotion", handler);
}

import { describe, expect, it } from "vitest";
import { newSave } from "../core/save";
import { applyHealthImport, creditLiveSteps, parseHealthText, parseImport, parseSyncReturn, setPendingAction, setTrackingWithoutImport, shortcutRunURL, takePendingAction, toInteger, shortcutSyncURL, withoutSyncParams } from "../core/steps";
import { StepDetector } from "../core/motion";

const now = new Date(2026, 10, 13, 18, 0);

describe("parseImport", () => {
  it("reads a valid link", () => {
    expect(parseImport("#importar?pasos=8.421&fecha=2026-11-13&accion=activar", now)).toEqual({ steps: 8421, day: "2026-11-13", action: "activar" });
  });
  it("defaults the day to today and ignores unknown actions", () => {
    expect(parseImport("#importar?pasos=10&accion=borrar", now)).toEqual({ steps: 10, day: "2026-11-13", action: undefined });
  });
  it("rejects bad values", () => {
    for (const h of ["", "#otra", "#importar?pasos=-5", "#importar?pasos=abc", "#importar?pasos=999999", "#importar?pasos=5&fecha=2026-11-14", "#importar?pasos=5&fecha=2026-10-01", "#importar?pasos=5&fecha=ayer"]) {
      expect(parseImport(h, now)).toBeUndefined();
    }
  });
});

describe("step crediting", () => {
  const imp = (steps: number, action?: "activar" | "desactivar") => ({ steps, day: "2026-11-13", action });

  it("ignores steps while off and starts counting from the reading that turns it on", () => {
    const s = newSave();
    expect(applyHealthImport(s, imp(3000, "activar"), now)).toMatchObject({ credited: 0, skipped: 3000 });
    expect(s.steps.tracking).toBe(true);
    expect(applyHealthImport(s, imp(5000), now).credited).toBe(2000);
    expect(applyHealthImport(s, imp(5000), now).credited).toBe(0);
    expect(applyHealthImport(s, imp(6000, "desactivar"), now).credited).toBe(1000);
    expect(applyHealthImport(s, imp(9000), now)).toMatchObject({ credited: 0, skipped: 3000 });
  });

  it("never counts motion-sensor steps twice", () => {
    const s = newSave();
    applyHealthImport(s, imp(1000, "activar"), now);
    expect(creditLiveSteps(s, 400, now)).toBe(400);
    expect(applyHealthImport(s, imp(1500), now)).toMatchObject({ credited: 100, matched: 400 });
    expect(s.steps.days["2026-11-13"].credited).toBe(500);
  });

  it("uses the first reading as the start after switching on without one", () => {
    const s = newSave();
    setTrackingWithoutImport(s, true, now);
    expect(applyHealthImport(s, imp(4000), now).credited).toBe(0);
    expect(applyHealthImport(s, imp(4500), now).credited).toBe(500);
  });

  it("credits nothing from the sensor while off", () => {
    const s = newSave();
    expect(creditLiveSteps(s, 50, now)).toBe(0);
  });
});

describe("StepDetector", () => {
  it("counts a steady walk and ignores a single jolt", () => {
    let total = 0;
    const d = new StepDetector((n) => (total += n));
    for (let t = 0; t < 10_000; t += 20) d.sample(9.81 + 3 * Math.sin((2 * Math.PI * t) / 550), t);
    expect(total).toBeGreaterThan(15);
    expect(total).toBeLessThan(20);
    let jolts = 0;
    const j = new StepDetector((n) => (jolts += n));
    for (let t = 0; t < 3000; t += 20) j.sample(t > 1000 && t < 1100 ? 16 : 9.81, t);
    expect(jolts).toBe(0);
  });
});

describe("parseHealthText", () => {
  it("reads what the Shortcut copies, a bare number or an import link", () => {
    expect(parseHealthText("enlace pasos=8421 fecha=2026-11-13", now)).toMatchObject({ steps: 8421, day: "2026-11-13" });
    expect(parseHealthText(" 8.421 ", now)).toMatchObject({ steps: 8421, day: "2026-11-13" });
    expect(parseHealthText("https://x.io/#importar?pasos=12&fecha=2026-11-12", now)).toMatchObject({ steps: 12, day: "2026-11-12" });
  });
  it("reads a Health sample copied as text", () => {
    expect(parseHealthText("6.240 pasos", now)?.steps).toBe(6240);
    expect(parseHealthText("6240 count", now)?.steps).toBe(6240);
    expect(parseHealthText("6240,6", now)?.steps).toBe(6241);
    expect(parseHealthText("6.240 pasos\n13/11/2026 0:00 – 13/11/2026 23:59", now)?.steps).toBe(6240);
    expect(parseHealthText("Pasos: 1.234.567", now)).toBeUndefined();
  });
  it("rejects anything else", () => {
    for (const t of ["", "hola", "pasos=", "enlace pasos=9999999", "pasos=5 fecha=2027-01-01", "3 de 5 Ecos"]) expect(parseHealthText(t, now)).toBeUndefined();
  });
});

describe("Shortcut round trip", () => {
  it("builds an x-callback link that comes back to the game", () => {
    const url = shortcutSyncURL("Enlace pasos", "https://x.github.io/Digivice_Viana/", "activar");
    expect(url.startsWith("shortcuts://x-callback-url/run-shortcut?name=Enlace%20pasos&x-success=")).toBe(true);
    const success = decodeURIComponent(/x-success=([^&]+)/.exec(url)![1]);
    expect(success).toBe("https://x.github.io/Digivice_Viana/?accion=activar&sync=ok");
  });
  it("reads what iOS appends (?sync=ok&result=…)", () => {
    expect(parseSyncReturn("?sync=ok&result=6240", now)).toEqual({ ok: true, imp: { steps: 6240, day: "2026-11-13", action: undefined } });
    expect(parseSyncReturn("?accion=activar&sync=ok&result=6.240%20pasos", now)).toMatchObject({ ok: true, imp: { steps: 6240, action: "activar" } });
    expect(parseSyncReturn("?sync=ok&result=", now)).toEqual({ ok: false, reason: "empty" });
    expect(parseSyncReturn("?sync=cancel", now)).toEqual({ ok: false, reason: "cancel" });
    expect(parseSyncReturn("?sync=error&errorMessage=x", now)).toEqual({ ok: false, reason: "error" });
    expect(parseSyncReturn("", now)).toBeUndefined();
  });
  it("tidies the address afterwards", () => {
    expect(withoutSyncParams("https://x.io/app/?accion=activar&sync=ok&result=12#importar?pasos=3")).toBe("/app/");
  });
});

describe("direct links and the home-screen app", () => {
  const now = new Date(2026, 10, 13, 18);
  it("reads ?syncSteps= as today's Health total", () => {
    expect(parseSyncReturn("?syncSteps=3200", now)).toEqual({ ok: true, imp: { steps: 3200, day: "2026-11-13", action: undefined } });
    expect(parseSyncReturn("?syncSteps=3.200&date=2026-11-12", now)).toMatchObject({ ok: true, imp: { steps: 3200, day: "2026-11-12" } });
    expect(parseSyncReturn("?syncSteps=abc", now)).toEqual({ ok: false, reason: "empty" });
  });
  it("cleans the link and runs the Shortcut without a return address", () => {
    expect(withoutSyncParams("https://x.io/game/?syncSteps=3200&date=2026-11-13")).toBe("/game/");
    expect(shortcutRunURL("Enlace pasos")).toBe("shortcuts://run-shortcut?name=Enlace%20pasos");
  });
});

describe("syncing the same day several times", () => {
  it("reads formatted totals and only credits the growth", () => {
    const now = new Date(2026, 10, 16, 12);
    expect(parseHealthText("3,250", now)?.steps).toBe(3250);
    expect(parseHealthText("3.250", now)?.steps).toBe(3250);
    expect(parseHealthText("3250\n", now)?.steps).toBe(3250);
    const save = newSave();
    setTrackingWithoutImport(save, true, now);
    // The first reading after switching the counter on is the starting point.
    const credited = ["1.000", "3.250", "3.250", "4,000"].map((t) => applyHealthImport(save, parseHealthText(t, now)!, now).credited);
    expect(credited).toEqual([0, 2250, 0, 750]);
  });
});

describe("a counter switch waiting for the Shortcut", () => {
  it("is used once and expires after 15 minutes", () => {
    const store = new Map<string, string>();
    const storage = { getItem: (k: string) => store.get(k) ?? null, setItem: (k: string, v: string) => void store.set(k, v), removeItem: (k: string) => void store.delete(k) } as unknown as Storage;
    setPendingAction("activar", storage, 1000);
    expect(takePendingAction(storage, 2000)).toBe("activar");
    expect(takePendingAction(storage, 3000)).toBeUndefined();
    setPendingAction("desactivar", storage, 0);
    expect(takePendingAction(storage, 16 * 60_000)).toBeUndefined();
  });
});

describe("step totals from Shortcuts, any format", () => {
  const now = new Date(2026, 10, 16, 12);
  it("reads whole numbers, decimals and thousands separators", () => {
    const cases: [string, number][] = [["3250", 3250], ["3250.0", 3250], ["3250,0", 3250], ["3250.000000", 3250], ["3.250", 3250], ["3,250", 3250],
      ["3 250", 3250], ["3 250", 3250], ["12.345,6", 12346], ["12,345.4", 12345], ["1.234.567", 1234567], ["3250,6", 3251]];
    for (const [raw, n] of cases) expect([raw, toInteger(raw)]).toEqual([raw, n]);
    expect(toInteger("abc")).toBeUndefined();
  });
  it("accepts ?syncSteps= and #syncSteps=, with units or decimals", () => {
    for (const [search, hash] of [["?syncSteps=3250.0", ""], ["?syncSteps=3.250%20pasos", ""], ["", "#syncSteps=3,250"], ["?x=1", "#syncSteps=3250&date=2026-11-16"]]) {
      expect(parseSyncReturn(search, now, hash)).toMatchObject({ ok: true, imp: { steps: 3250, day: "2026-11-16" } });
    }
    expect(parseSyncReturn("?syncSteps=", now)).toEqual({ ok: false, reason: "empty" });
    expect(withoutSyncParams("https://x.io/g/#syncSteps=3250")).toBe("/g/");
  });
});

describe("x-callback returns", () => {
  const now = new Date(2026, 10, 16, 12);
  it("reads ?sync=ok&result= and a bare ?result=, in any number format", () => {
    expect(parseSyncReturn("?sync=ok&result=3250.0", now)).toMatchObject({ ok: true, imp: { steps: 3250 } });
    expect(parseSyncReturn("?result=3.250", now)).toMatchObject({ ok: true, imp: { steps: 3250 } });
    expect(parseSyncReturn("?sync=ok", now)).toEqual({ ok: false, reason: "empty" });
    expect(shortcutSyncURL("enlace pasos", "https://g.io/Digivice_Viana/")).toBe(
      "shortcuts://x-callback-url/run-shortcut?name=enlace%20pasos&x-success=" + encodeURIComponent("https://g.io/Digivice_Viana/?sync=ok")
      + "&x-cancel=" + encodeURIComponent("https://g.io/Digivice_Viana/?sync=cancel") + "&x-error=" + encodeURIComponent("https://g.io/Digivice_Viana/?sync=error"));
  });
});

import { sculptData, shiftPalette } from "./sculpt";
import { SCULPTS } from "./sculpts";

/** Builds sculpted creatures off the main thread: { key, id, turn } → { key, data }. */
self.onmessage = (e: MessageEvent<{ key: string; id: string; turn: number }>) => {
  const { key, id, turn } = e.data;
  const design = SCULPTS[id];
  if (!design) { self.postMessage({ key, data: null }); return; }
  const d = turn ? { ...design, palette: shiftPalette(design.palette, turn) } : design;
  const data = sculptData(d);
  (self as unknown as Worker).postMessage({ key, data }, [data.pos.buffer, data.nrm.buffer, data.col.buffer, data.body.buffer, data.glow.buffer]);
};

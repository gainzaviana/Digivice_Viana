import { deflateSync, inflateSync } from "node:zlib";

/** Minimal PNG writer/reader for RGBA images (tools only). */
const crcTable = Array.from({ length: 256 }, (_, n) => { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; return c >>> 0; });
const crc = (b: Buffer) => { let c = 0xffffffff; for (const x of b) c = crcTable[(c ^ x) & 255] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; };
const chunk = (type: string, data: Buffer) => {
  const t = Buffer.from(type, "ascii"), len = Buffer.alloc(4), c = Buffer.alloc(4);
  len.writeUInt32BE(data.length); c.writeUInt32BE(crc(Buffer.concat([t, data])));
  return Buffer.concat([len, t, data, c]);
};

export function encodePNG(w: number, h: number, rgba: Uint8Array | Uint8ClampedArray): Buffer {
  const raw = Buffer.alloc((w * 4 + 1) * h);
  for (let y = 0; y < h; y++) { raw[y * (w * 4 + 1)] = 0; Buffer.from(rgba.buffer, rgba.byteOffset + y * w * 4, w * 4).copy(raw, y * (w * 4 + 1) + 1); }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(w, 0); ihdr.writeUInt32BE(h, 4); ihdr[8] = 8; ihdr[9] = 6;
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk("IHDR", ihdr), chunk("IDAT", deflateSync(raw)), chunk("IEND", Buffer.alloc(0))]);
}

/** Reads an 8-bit RGBA or RGB PNG (non-interlaced), as written by PIL. */
export function decodePNG(buf: Buffer): { w: number; h: number; rgba: Uint8Array } {
  let p = 8, w = 0, h = 0, type = 6;
  const idat: Buffer[] = [];
  let palette: Buffer | undefined, trns: Buffer | undefined;
  while (p < buf.length) {
    const len = buf.readUInt32BE(p), t = buf.toString("ascii", p + 4, p + 8), d = buf.subarray(p + 8, p + 8 + len);
    if (t === "IHDR") { w = d.readUInt32BE(0); h = d.readUInt32BE(4); type = d[9]; if (d[8] !== 8) throw new Error("only 8-bit"); }
    else if (t === "PLTE") palette = d; else if (t === "tRNS") trns = d; else if (t === "IDAT") idat.push(d);
    p += 12 + len;
  }
  const bpp = type === 6 ? 4 : type === 2 ? 3 : 1;
  const raw = inflateSync(Buffer.concat(idat));
  const stride = w * bpp, out = new Uint8Array(w * h * 4), prev = new Uint8Array(stride), cur = new Uint8Array(stride);
  for (let y = 0; y < h; y++) {
    const f = raw[y * (stride + 1)];
    for (let x = 0; x < stride; x++) {
      const v = raw[y * (stride + 1) + 1 + x], a = x >= bpp ? cur[x - bpp] : 0, b = prev[x], c = x >= bpp ? prev[x - bpp] : 0;
      const pr = a + b - c, pa = Math.abs(pr - a), pb = Math.abs(pr - b), pc = Math.abs(pr - c);
      cur[x] = (v + (f === 1 ? a : f === 2 ? b : f === 3 ? (a + b) >> 1 : f === 4 ? (pa <= pb && pa <= pc ? a : pb <= pc ? b : c) : 0)) & 255;
    }
    for (let x = 0; x < w; x++) {
      const o = (y * w + x) * 4;
      if (bpp === 4) out.set(cur.subarray(x * 4, x * 4 + 4), o);
      else if (bpp === 3) { out.set(cur.subarray(x * 3, x * 3 + 3), o); out[o + 3] = 255; }
      else { const i = cur[x]; out[o] = palette![i * 3]; out[o + 1] = palette![i * 3 + 1]; out[o + 2] = palette![i * 3 + 2]; out[o + 3] = trns && i < trns.length ? trns[i] : 255; }
    }
    prev.set(cur);
  }
  return { w, h, rgba: out };
}

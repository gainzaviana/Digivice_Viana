// Draws the game's icon: an original 32×32 pixel design in the game's palette (an Enlace handheld
// with an Eco on its screen), scaled to the PWA icon sizes. Writes public/icon-*.png.
//   npx tsx tools/make-icon.ts
import { writeFileSync } from "node:fs";
import { deflateSync } from "node:zlib";

const MAP = [
  "................................",
  "................................",
  "................................",
  "......aaaaaaaaaaaaaaaaaaaa......",
  "....aakkkkkkkkkkkkkkkkkkkkaa....",
  "...akKkkkkkkkkkkkkkkkkkkkkkka...",
  "...akKSSSSSSSSSSSSSSSSSSSSkka...",
  "...akKSssssssssssssssssssSkka...",
  "...akKSsssssxssssssxsssssSkka...",
  "...akKSssssxRxssssxRxssssSkka...",
  "...akKSsssxxxxxxxxxxxxsssSkka...",
  "...akKSssxoorrrrrrrrrrxssSkka...",
  "...akKSssxorwxrrrrwxrrxssSkka...",
  "...akKSssxorxxrrrrxxrrxssSkka...",
  "...akKSssxrrrrrrrrrrrRxssSkka...",
  "...akKSssxrryyyyyyyyRRxssSkka...",
  "...akKSssxrrrrrrrrrRRRxssSkka...",
  "...akKSsssxRRRRRRRRRRxsssSkka...",
  "...akKSssssxxxxxxxxxxssssSkka...",
  "...akKSssssssssssssssssssSkka...",
  "...akKSSSSSSSSSSSSSSSSSSSSkka...",
  "...akkkkkkkkkkkkkkkkkkkkkkkka...",
  "...akkkkakkkkkkkkkkkkkkkkkkka...",
  "...akkkaaakkkkkkkkkkrrkrrkkka...",
  "...akkkkakkkkkkkkkkkkkkkkkkka...",
  "...akkkkkkkkkkkkkkkkkkkkkkkka...",
  "...akkkkkkkkkkkkkkkkkkkkkkkka...",
  "....aakkkkkkkkkkkkkkkkkkkkaa....",
  "......aaaaaaaaaaaaaaaaaaaa......",
  "................................",
  "................................",
  "................................",
];
const COLOURS: Record<string, number> = {
  ".": 0x1b1830, x: 0x1b1830, k: 0x3a3557, K: 0x6b6690, a: 0xffb13b, S: 0x134b5a, s: 0x1f8a8e,
  r: 0xe04a3f, R: 0xa82b3c, o: 0xff8a5c, w: 0xf4f1ff, y: 0xffb13b,
};

const crcTable = Array.from({ length: 256 }, (_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});
const crc32 = (buf: Buffer) => { let c = 0xffffffff; for (const b of buf) c = crcTable[(c ^ b) & 255] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; };
function chunk(type: string, data: Buffer) {
  const len = Buffer.alloc(4); len.writeUInt32BE(data.length);
  const td = Buffer.concat([Buffer.from(type, "ascii"), data]);
  const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(td));
  return Buffer.concat([len, td, crc]);
}

/** A PNG of the icon at `size` px (a multiple of 32 keeps every pixel square; others use nearest). */
function png(size: number): Buffer {
  const raw = Buffer.alloc(size * (size * 3 + 1));
  for (let y = 0; y < size; y++) {
    raw[y * (size * 3 + 1)] = 0;
    for (let x = 0; x < size; x++) {
      const rgb = COLOURS[MAP[Math.floor((y * 32) / size)][Math.floor((x * 32) / size)]] ?? 0x1b1830;
      const o = y * (size * 3 + 1) + 1 + x * 3;
      raw[o] = rgb >> 16; raw[o + 1] = (rgb >> 8) & 255; raw[o + 2] = rgb & 255;
    }
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0); ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; ihdr[9] = 2; ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0;
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk("IHDR", ihdr), chunk("IDAT", deflateSync(raw)), chunk("IEND", Buffer.alloc(0))]);
}

for (const size of [180, 192, 512]) writeFileSync(`public/icon-${size}.png`, png(size));
writeFileSync("public/favicon.png", png(64));
console.log("Iconos escritos en public/");

/**
 * Generates the PWA icon set without any image dependency.
 *
 * The app must not fetch images at runtime, so the icons are plain PNG files
 * written straight from a pixel buffer with Node's built-in zlib. Re-run with
 * `npm run icons` after changing the palette in src/config/app-config.ts.
 */
import { deflateSync } from 'node:zlib';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const outDir = resolve(here, '../public/icons');

const BACKGROUND = [0x12, 0x10, 0x2a];
const CORAL = [0xff, 0x6b, 0x6b];
const LIME = [0xc6, 0xf7, 0x4f];
const VIOLET = [0x7c, 0x5c, 0xff];

const crcTable = (() => {
  const table = new Int32Array(256);
  for (let n = 0; n < 256; n += 1) {
    let c = n;
    for (let k = 0; k < 8; k += 1) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[n] = c;
  }
  return table;
})();

function crc32(buffer) {
  let c = -1;
  for (const byte of buffer) c = crcTable[(c ^ byte) & 0xff] ^ (c >>> 8);
  return (c ^ -1) >>> 0;
}

function chunk(type, data) {
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length, 0);
  const typed = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(typed), 0);
  return Buffer.concat([length, typed, crc]);
}

function encodePng(size, pixels) {
  const header = Buffer.alloc(13);
  header.writeUInt32BE(size, 0);
  header.writeUInt32BE(size, 4);
  header[8] = 8; // bit depth
  header[9] = 2; // colour type: truecolour
  const raw = Buffer.alloc(size * (size * 3 + 1));
  let offset = 0;
  for (let y = 0; y < size; y += 1) {
    raw[offset] = 0; // filter: none
    offset += 1;
    for (let x = 0; x < size; x += 1) {
      const [r, g, b] = pixels(x, y);
      raw[offset] = r;
      raw[offset + 1] = g;
      raw[offset + 2] = b;
      offset += 3;
    }
  }
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', header),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

/** Diamond test in normalised coordinates. */
function inDiamond(x, y, cx, cy, rx, ry) {
  return Math.abs(x - cx) / rx + Math.abs(y - cy) / ry <= 1;
}

/**
 * @param size icon edge length in pixels
 * @param scale 1 for a normal icon, 0.62 for maskable (keeps art in the safe zone)
 */
function draw(size, scale) {
  return (x, y) => {
    const nx = x / size;
    const ny = y / size;
    // Soft diagonal wash so the icon does not read as a flat square.
    const wash = (nx + ny) / 2;
    const background = BACKGROUND.map((channel, index) =>
      Math.round(channel + (VIOLET[index] - channel) * 0.18 * wash),
    );

    const cx = 0.5;
    const cy = 0.5;
    const big = 0.34 * scale;
    const small = 0.2 * scale;

    if (inDiamond(nx, ny, cx + 0.12 * scale, cy - 0.1 * scale, small, small * 1.35)) return LIME;
    if (inDiamond(nx, ny, cx + 0.12 * scale, cy - 0.1 * scale, small * 1.22, small * 1.62)) {
      return background;
    }
    if (inDiamond(nx, ny, cx - 0.05 * scale, cy + 0.05 * scale, big, big * 1.3)) return CORAL;
    return background;
  };
}

mkdirSync(outDir, { recursive: true });

const targets = [
  { file: 'icon-192.png', size: 192, scale: 1 },
  { file: 'icon-512.png', size: 512, scale: 1 },
  { file: 'icon-maskable-512.png', size: 512, scale: 0.62 },
];

for (const { file, size, scale } of targets) {
  writeFileSync(resolve(outDir, file), encodePng(size, draw(size, scale)));
  console.log(`wrote ${file} (${size}x${size})`);
}

const favicon = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" role="img" aria-label="Party Deck">
  <rect width="64" height="64" rx="14" fill="#12102a"/>
  <path d="M29 16 L45 32 L29 48 L13 32 Z" fill="#ff6b6b"/>
  <path d="M44 14 L54 25 L44 36 L34 25 Z" fill="#c6f74f" stroke="#12102a" stroke-width="3"/>
</svg>
`;
writeFileSync(resolve(outDir, 'favicon.svg'), favicon);
console.log('wrote favicon.svg');

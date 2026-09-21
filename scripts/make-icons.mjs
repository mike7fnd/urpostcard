import { deflateSync } from "node:zlib";
import { mkdirSync, writeFileSync } from "node:fs";

/**
 * Draws the home-screen icon and writes it out as PNG, at every size the
 * platforms ask for.
 *
 * Done here rather than with an image pipeline because the mark is four
 * shapes: a postcard on ink, tilted, with a stamp. Generating it keeps the
 * icons in step with the palette instead of drifting from it, and adds no
 * dependency to the project.
 *
 *   npm run icons
 */

const INK = [0x16, 0x15, 0x0f];
const PAPER = [0xf6, 0xf3, 0xec];
const PAPER_EDGE = [0xd9, 0xd2, 0xc2];
const ACCENT = [0xa8, 0x56, 0x3c];
const RULE = [0xc9, 0xc0, 0xac];

const SAMPLES = 4; // supersampling per axis, for edges that are not stairs

/** Signed distance to a rounded rectangle centred on the origin. */
function roundedRect(x, y, halfW, halfH, radius) {
  const dx = Math.abs(x) - (halfW - radius);
  const dy = Math.abs(y) - (halfH - radius);
  const outside = Math.hypot(Math.max(dx, 0), Math.max(dy, 0));
  return outside + Math.min(Math.max(dx, dy), 0) - radius;
}

/**
 * The mark, in a unit square. `inset` shrinks it for maskable icons, whose
 * outer fifth can be cropped to any shape the launcher likes.
 */
function shade(px, py, inset) {
  // Centre on the origin and undo the card's tilt, so the card can be tested
  // as an ordinary rectangle.
  const cx = (px - 0.5) / inset;
  const cy = (py - 0.5) / inset;

  const angle = (-9 * Math.PI) / 180;
  const x = cx * Math.cos(-angle) - cy * Math.sin(-angle);
  const y = cx * Math.sin(-angle) + cy * Math.cos(-angle);

  // Card stock showing beneath the printed face.
  if (roundedRect(x - 0.004, y + 0.012, 0.3, 0.204, 0.022) <= 0) {
    if (roundedRect(x, y, 0.3, 0.2, 0.022) > 0) return PAPER_EDGE;
  }

  if (roundedRect(x, y, 0.3, 0.2, 0.022) <= 0) {
    // Stamp, top right.
    if (x > 0.16 && x < 0.265 && y > -0.165 && y < -0.055) return ACCENT;

    // Divider, and two address lines.
    if (Math.abs(x - 0.02) < 0.004 && Math.abs(y) < 0.15) return RULE;
    if (x > 0.08 && x < 0.26 && Math.abs(y - 0.05) < 0.007) return RULE;
    if (x > 0.08 && x < 0.22 && Math.abs(y - 0.105) < 0.007) return RULE;

    // Message lines, left.
    if (x > -0.25 && x < -0.06 && Math.abs(y + 0.09) < 0.008) return RULE;
    if (x > -0.25 && x < -0.03 && Math.abs(y + 0.03) < 0.008) return RULE;
    if (x > -0.25 && x < -0.09 && Math.abs(y - 0.03) < 0.008) return RULE;

    return PAPER;
  }

  return INK;
}

function render(size, inset) {
  const pixels = Buffer.alloc(size * size * 4);

  for (let py = 0; py < size; py += 1) {
    for (let px = 0; px < size; px += 1) {
      let r = 0;
      let g = 0;
      let b = 0;

      for (let sy = 0; sy < SAMPLES; sy += 1) {
        for (let sx = 0; sx < SAMPLES; sx += 1) {
          const u = (px + (sx + 0.5) / SAMPLES) / size;
          const v = (py + (sy + 0.5) / SAMPLES) / size;
          const c = shade(u, v, inset);
          r += c[0];
          g += c[1];
          b += c[2];
        }
      }

      const n = SAMPLES * SAMPLES;
      const i = (py * size + px) * 4;
      pixels[i] = Math.round(r / n);
      pixels[i + 1] = Math.round(g / n);
      pixels[i + 2] = Math.round(b / n);
      pixels[i + 3] = 255;
    }
  }

  return pixels;
}

/* ------------------------------------------------------------ PNG writing */

const CRC_TABLE = (() => {
  const table = new Int32Array(256);
  for (let n = 0; n < 256; n += 1) {
    let c = n;
    for (let k = 0; k < 8; k += 1) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[n] = c;
  }
  return table;
})();

function crc32(buf) {
  let c = -1;
  for (const byte of buf) c = CRC_TABLE[(c ^ byte) & 0xff] ^ (c >>> 8);
  return (c ^ -1) >>> 0;
}

function chunk(type, data) {
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type, "ascii"), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body));
  return Buffer.concat([length, body, crc]);
}

function png(size, pixels) {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // RGBA
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;

  // One filter byte (none) in front of every scanline.
  const raw = Buffer.alloc(size * (size * 4 + 1));
  for (let y = 0; y < size; y += 1) {
    raw[y * (size * 4 + 1)] = 0;
    pixels.copy(raw, y * (size * 4 + 1) + 1, y * size * 4, (y + 1) * size * 4);
  }

  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk("IHDR", ihdr),
    chunk("IDAT", deflateSync(raw, { level: 9 })),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

/* ------------------------------------------------------------------ write */

mkdirSync("public/icons", { recursive: true });

const OUTPUTS = [
  // Full bleed, for platforms that show the icon as given.
  { file: "icon-192.png", size: 192, inset: 1 },
  { file: "icon-512.png", size: 512, inset: 1 },
  { file: "apple-touch-icon.png", size: 180, inset: 1 },
  // Maskable: the launcher may crop to a circle, so keep the mark inside the
  // middle 80% and let the ink run to the edge.
  { file: "icon-192-maskable.png", size: 192, inset: 0.72 },
  { file: "icon-512-maskable.png", size: 512, inset: 0.72 },
];

for (const { file, size, inset } of OUTPUTS) {
  const buffer = png(size, render(size, inset));
  writeFileSync(`public/icons/${file}`, buffer);
  console.log(`public/icons/${file}  ${size}×${size}  ${(buffer.length / 1024).toFixed(1)} kB`);
}

#!/usr/bin/env node
// Generates responsive WebP + JPEG variants from images/originals/ into images/.
// Idempotent: skips outputs that are newer than their source.
//
// Per-asset config lives in this file; add entries as new images are introduced.
// Usage: npm run optimize:images

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '..');
const SRC_DIR = path.join(ROOT, 'images', 'originals');
const OUT_DIR = path.join(ROOT, 'images');

let sharp;
try {
  ({ default: sharp } = await import('sharp'));
} catch (err) {
  console.error('\n[optimize-images] sharp is not installed. Run: npm install\n');
  process.exit(1);
}

// Categories of assets and the widths to emit. The renderer chooses based on
// suffix matching of the source filename.
const CONFIG = [
  // Hero / profile photo
  {
    match: /^me2\./i,
    widths: [240, 320, 480],
    formats: ['webp', 'jpeg'],
    quality: { webp: 82, jpeg: 84 },
  },
  // Education campus shots
  {
    match: /^(queens|usask)_campus\./i,
    widths: [400, 600, 800],
    formats: ['webp', 'jpeg'],
    quality: { webp: 75, jpeg: 78 },
  },
  // Logos (PNG)
  {
    match: /_(logo)\.(png|jpe?g)$/i,
    widths: [120, 240],
    formats: ['webp', 'png'],
    quality: { webp: 88, png: 90 },
  },
  // Project covers (wide hero / OG-style images for project pages)
  {
    match: /^PRISM_cover\.(png|jpe?g)$/i,
    widths: [400, 800, 1200],
    formats: ['webp', 'jpeg'],
    quality: { webp: 78, jpeg: 80 },
  },
  // Project card / deep-dive figures (square or near-square covers used at
  // ~350 CSS px in the homepage cards and up to ~700 CSS px in deep-dive
  // figures, so we need 2x and 3x variants to look sharp on retina).
  {
    match: /^(PRISM_cover_sqr|FedGaLA_nb|covid)\.(png|jpe?g)$/i,
    widths: [320, 480, 640, 800, 1200],
    formats: ['webp', 'jpeg'],
    quality: { webp: 80, jpeg: 82 },
  },
  // Paper thumbnails (everything else)
  { match: /.*/, widths: [160, 320], formats: ['webp', 'jpeg'], quality: { webp: 78, jpeg: 80 } },
];

// Favicon set
const FAVICON_SOURCE = path.join(SRC_DIR, 'icon-source.png');
const FAVICON_OUT = [
  { file: path.join(OUT_DIR, 'icon.png'), size: 192 },
  { file: path.join(OUT_DIR, 'icon-512.png'), size: 512 },
  { file: path.join(OUT_DIR, 'apple-touch-icon.png'), size: 180 },
];

function pickConfig(filename) {
  return CONFIG.find((c) => c.match.test(filename));
}

function outName(srcBase, width, format) {
  return `${srcBase}-${width}.${format}`;
}

async function isFresh(srcPath, outPath) {
  try {
    const [s, o] = await Promise.all([fs.promises.stat(srcPath), fs.promises.stat(outPath)]);
    return o.mtimeMs >= s.mtimeMs;
  } catch {
    return false;
  }
}

async function processOne(srcPath) {
  const filename = path.basename(srcPath);
  const ext = path.extname(filename);
  const base = path.basename(filename, ext);
  const cfg = pickConfig(filename);
  if (!cfg) return [];

  const meta = await sharp(srcPath).metadata();
  const srcWidth = meta.width ?? 0;
  const generated = [];

  for (const width of cfg.widths) {
    if (srcWidth && width > srcWidth) continue;
    const targetWidth = width;
    for (const format of cfg.formats) {
      const out = path.join(OUT_DIR, outName(base, targetWidth, format));
      if (await isFresh(srcPath, out)) {
        generated.push({ out, skipped: true });
        continue;
      }
      const pipeline = sharp(srcPath).resize({ width: targetWidth, withoutEnlargement: true });
      const opts = { quality: cfg.quality[format] ?? 80 };
      if (format === 'webp') await pipeline.webp(opts).toFile(out);
      else if (format === 'jpeg') await pipeline.jpeg({ ...opts, mozjpeg: true }).toFile(out);
      else if (format === 'png') await pipeline.png({ compressionLevel: 9 }).toFile(out);
      generated.push({ out, skipped: false });
    }
  }
  return generated;
}

async function makeFavicons() {
  if (!fs.existsSync(FAVICON_SOURCE)) {
    console.warn(`[optimize-images] favicon source missing: ${FAVICON_SOURCE} (skipped)`);
    return;
  }
  for (const { file, size } of FAVICON_OUT) {
    if (await isFresh(FAVICON_SOURCE, file)) {
      console.log(`  skip ${path.relative(ROOT, file)}`);
      continue;
    }
    await sharp(FAVICON_SOURCE)
      .resize(size, size, { fit: 'cover' })
      .png({ compressionLevel: 9 })
      .toFile(file);
    console.log(`  wrote ${path.relative(ROOT, file)}`);
  }
}

async function main() {
  if (!fs.existsSync(SRC_DIR)) {
    fs.mkdirSync(SRC_DIR, { recursive: true });
    console.log(`[optimize-images] created ${SRC_DIR}`);
    console.log('  Place high-resolution originals here, then re-run.');
    return;
  }

  const entries = (await fs.promises.readdir(SRC_DIR)).filter(
    (f) =>
      /\.(png|jpe?g|webp)$/i.test(f) &&
      !/^icon-source\./i.test(f) &&
      !/\.original\d*\.[^.]+$/i.test(f)
  );
  if (entries.length === 0) {
    console.log('[optimize-images] no source images in images/originals/');
  } else {
    let total = 0;
    for (const file of entries) {
      const src = path.join(SRC_DIR, file);
      const out = await processOne(src);
      for (const o of out) {
        console.log(`  ${o.skipped ? 'skip' : 'wrote'} ${path.relative(ROOT, o.out)}`);
      }
      total += out.length;
    }
    console.log(`[optimize-images] processed ${entries.length} sources, ${total} outputs.`);
  }

  await makeFavicons();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

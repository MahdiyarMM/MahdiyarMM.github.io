#!/usr/bin/env node
/**
 * Build a 1200x630 OG/Twitter share card.
 *
 * Composes a dark left panel with name + title text (rasterized from SVG)
 * and a right panel with the portrait from images/originals/me2.jpg.
 *
 * Outputs:
 *   images/og-cover.jpg
 *   images/og-cover.webp
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const __filename = fileURLToPath(import.meta.url);
const ROOT = path.resolve(path.dirname(__filename), '..');

const SITE = JSON.parse(fs.readFileSync(path.join(ROOT, 'data', 'site.json'), 'utf8'));
const SCHOLAR = (() => {
  try {
    return JSON.parse(fs.readFileSync(path.join(ROOT, 'scholar_data.json'), 'utf8'));
  } catch {
    return null;
  }
})();

const W = 1200;
const H = 630;
const PORTRAIT_W = 540;
const TEXT_W = W - PORTRAIT_W;

const name = SITE.name;
const subtitle = `${SITE.title} @ ${SITE.company}`;
const tagline = 'Applied AI · Computer Vision · Federated Learning';
const cites = SCHOLAR?.citations ?? SITE.stats.citations_fallback;
const h = SCHOLAR?.h_index ?? SITE.stats.h_index_fallback;
const stats = `${cites}+ citations · h-index ${h} · ${SITE.stats.publications_count_fallback}+ publications`;

const escape = (s) =>
  String(s).replace(
    /[&<>"']/g,
    (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;' })[c]
  );

const overlaySvg = `
<svg xmlns="http://www.w3.org/2000/svg" width="${TEXT_W}" height="${H}" viewBox="0 0 ${TEXT_W} ${H}">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#0f172a" />
      <stop offset="100%" stop-color="#1e293b" />
    </linearGradient>
    <linearGradient id="accent" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0%" stop-color="#3b82f6" />
      <stop offset="100%" stop-color="#8b5cf6" />
    </linearGradient>
  </defs>
  <rect width="100%" height="100%" fill="url(#bg)" />
  <rect x="64" y="180" width="64" height="6" rx="3" fill="url(#accent)" />
  <text x="64" y="260" font-family="Helvetica, Arial, sans-serif" font-size="56" font-weight="700" fill="#f8fafc">${escape(name)}</text>
  <text x="64" y="318" font-family="Helvetica, Arial, sans-serif" font-size="28" font-weight="500" fill="#cbd5e1">${escape(subtitle)}</text>
  <text x="64" y="372" font-family="Helvetica, Arial, sans-serif" font-size="22" font-weight="400" fill="#94a3b8">${escape(tagline)}</text>
  <text x="64" y="500" font-family="Helvetica, Arial, sans-serif" font-size="20" font-weight="500" fill="#e2e8f0">${escape(stats)}</text>
  <text x="64" y="552" font-family="Helvetica, Arial, sans-serif" font-size="18" font-weight="400" fill="#64748b">mahdiyar.ai</text>
</svg>
`;

async function build() {
  const portraitPath = path.join(ROOT, 'images', 'originals', 'me2.jpg');
  if (!fs.existsSync(portraitPath)) {
    throw new Error(`portrait missing: ${portraitPath}`);
  }
  const portrait = await sharp(portraitPath)
    .resize(PORTRAIT_W, H, { fit: 'cover', position: 'centre' })
    .toBuffer();

  const composed = await sharp({
    create: { width: W, height: H, channels: 4, background: { r: 15, g: 23, b: 42, alpha: 1 } },
  })
    .composite([
      { input: Buffer.from(overlaySvg), left: 0, top: 0 },
      { input: portrait, left: TEXT_W, top: 0 },
    ])
    .jpeg({ quality: 85, mozjpeg: true })
    .toBuffer();

  const outJpg = path.join(ROOT, 'images', 'og-cover.jpg');
  const outWebp = path.join(ROOT, 'images', 'og-cover.webp');
  fs.writeFileSync(outJpg, composed);
  await sharp(composed).webp({ quality: 82 }).toFile(outWebp);
  console.log(`og cover: ${outJpg} (${(composed.length / 1024).toFixed(1)} KB)`);
}

build().catch((e) => {
  console.error(e);
  process.exit(1);
});

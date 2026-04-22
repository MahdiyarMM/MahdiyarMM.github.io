#!/usr/bin/env node
/**
 * Build sitemap.xml from data/site.json + data/publications.json.
 * Includes the homepage, /research, and per-paper deep links.
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const ROOT = path.resolve(path.dirname(__filename), '..');

const SITE = JSON.parse(fs.readFileSync(path.join(ROOT, 'data', 'site.json'), 'utf8'));
const PUBS = JSON.parse(fs.readFileSync(path.join(ROOT, 'data', 'publications.json'), 'utf8'));
const PROJECTS = (() => {
  try {
    return JSON.parse(fs.readFileSync(path.join(ROOT, 'data', 'projects.json'), 'utf8'));
  } catch {
    return [];
  }
})();

const base = SITE.homepage.replace(/\/$/, '');
const today = new Date().toISOString().slice(0, 10);

const urls = [
  { loc: `${base}/`, lastmod: today, changefreq: 'monthly', priority: '1.0' },
  { loc: `${base}/research`, lastmod: today, changefreq: 'monthly', priority: '0.9' },
];

const POSTS = (() => {
  try {
    return JSON.parse(fs.readFileSync(path.join(ROOT, 'data', 'posts.json'), 'utf8'));
  } catch {
    return [];
  }
})();

// Both short notes and project deep dives now live under /posts/<slug>.
const noteEntries = [
  ...POSTS.map((p) => ({ slug: p.slug, lastmod: p.date || today, priority: '0.6' })),
  ...PROJECTS.map((p) => ({
    slug: p.id,
    lastmod: p.date || `${p.year}-01-01`,
    priority: '0.7',
  })),
];
if (noteEntries.length) {
  urls.push({ loc: `${base}/posts/`, lastmod: today, changefreq: 'weekly', priority: '0.7' });
  for (const e of noteEntries) {
    urls.push({
      loc: `${base}/posts/${e.slug}`,
      lastmod: e.lastmod,
      changefreq: 'monthly',
      priority: e.priority,
    });
  }
}

for (const p of PUBS) {
  urls.push({
    loc: `${base}/research#paper-${p.id}`,
    lastmod: today,
    changefreq: 'yearly',
    priority: '0.6',
  });
}

const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls
  .map(
    (u) =>
      `  <url>
    <loc>${u.loc}</loc>
    <lastmod>${u.lastmod}</lastmod>
    <changefreq>${u.changefreq}</changefreq>
    <priority>${u.priority}</priority>
  </url>`
  )
  .join('\n')}
</urlset>
`;

fs.writeFileSync(path.join(ROOT, 'sitemap.xml'), xml);
console.log(`sitemap: ${urls.length} urls`);

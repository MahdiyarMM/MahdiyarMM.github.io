#!/usr/bin/env node
/**
 * Render data/projects.json into long-form deep-dive pages under
 * posts/<id>.html. Deep dives live alongside short notes — the only
 * structural difference is a richer template (figure, problem/approach/
 * results/takeaways sections, related publications).
 *
 * Templates here are intentionally inlined (and small) to avoid pulling in a
 * heavyweight templating dep — the project shape is fixed and well-typed.
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const ROOT = path.resolve(path.dirname(__filename), '..');
const SITE = JSON.parse(fs.readFileSync(path.join(ROOT, 'data', 'site.json'), 'utf8'));
const PROJECTS = JSON.parse(fs.readFileSync(path.join(ROOT, 'data', 'projects.json'), 'utf8'));
const PUBS = JSON.parse(fs.readFileSync(path.join(ROOT, 'data', 'publications.json'), 'utf8'));
const PUBS_BY_ID = Object.fromEntries(PUBS.map((p) => [p.id, p]));

const OUT_DIR = path.join(ROOT, 'posts');
const VERSION = SITE.cache_bust;
const BASE = SITE.homepage.replace(/\/$/, '');

// Inline theme-init snippet — must run synchronously in <head> BEFORE the
// stylesheet link so `data-theme` is set before the first paint. Without
// this, deep-dive pages (which have no theme toggle) never set the
// attribute, and the `prefers-color-scheme: dark` rules win on devices
// whose OS is in dark mode even when the user picked "light".
// Header theme-toggle markup — same shape as the homepage so users can
// switch theme directly from a deep-dive page (essential on mobile, where
// navigating back just to flip theme is annoying). Wired up by
// js/modern.js's setupThemeToggle().
const THEME_TOGGLE = `<div class="theme-toggle-tri" id="theme-toggle" role="radiogroup" aria-label="Color theme">
          <button class="theme-segment" data-theme-value="light" type="button" role="radio" aria-checked="false" title="Light theme">
            <svg class="icon icon-sun" aria-hidden="true" focusable="false"><use href="/images/icons.svg#i-sun" /></svg>
            <span class="sr-only">Light</span>
          </button>
          <button class="theme-segment" data-theme-value="auto" type="button" role="radio" aria-checked="true" title="Match system theme">
            <svg class="icon icon-auto" aria-hidden="true" focusable="false"><use href="/images/icons.svg#i-auto" /></svg>
            <span class="sr-only">Auto</span>
          </button>
          <button class="theme-segment" data-theme-value="dark" type="button" role="radio" aria-checked="false" title="Dark theme">
            <svg class="icon icon-moon" aria-hidden="true" focusable="false"><use href="/images/icons.svg#i-moon" /></svg>
            <span class="sr-only">Dark</span>
          </button>
          <span class="sr-only" id="theme-toggle-label">Theme: auto. Use arrow keys to choose light, auto, or dark.</span>
        </div>`;

const THEME_INIT = `<script>
  (function () {
    try {
      var t = localStorage.getItem('theme');
      var resolved = (t === 'light' || t === 'dark')
        ? t
        : (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
      document.documentElement.setAttribute('data-theme', resolved);
    } catch (e) {}
  })();
</script>`;

const escapeHtml = (s) =>
  String(s).replace(
    /[&<>"']/g,
    (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]
  );

// Default widths to consider for any project image. The renderer probes the
// images/ directory and only emits sources for variants that actually exist,
// so adding a new image with fewer pre-rendered widths is still safe.
const CANDIDATE_WIDTHS = [160, 320, 480, 640, 800, 1200];

function availableWidths(image) {
  // `image` is a public URL like "/images/PRISM_cover_sqr"; map back to disk.
  const rel = image.replace(/^\//, '');
  return CANDIDATE_WIDTHS.filter((w) => fs.existsSync(path.join(ROOT, `${rel}-${w}.jpeg`)));
}

function srcsetFor(image, ext, widths) {
  return widths.map((w) => `${image}-${w}.${ext} ${w}w`).join(', ');
}

function picture(image, alt, sizes = '(max-width: 700px) 100vw, 700px') {
  const widths = availableWidths(image);
  if (widths.length === 0) {
    // Fall back to original two-width behaviour so the build never breaks.
    return `<picture>
            <source type="image/webp" srcset="${image}-160.webp 160w, ${image}-320.webp 320w" sizes="${sizes}" />
            <source type="image/jpeg" srcset="${image}-160.jpeg 160w, ${image}-320.jpeg 320w" sizes="${sizes}" />
            <img src="${image}-320.jpeg" alt="${escapeHtml(alt)}" loading="lazy" decoding="async" width="320" height="320" />
          </picture>`;
  }
  // Pick the smallest variant >= 640 for the eager src so older browsers
  // without srcset still get a decent-quality fallback.
  const fallback = widths.find((w) => w >= 640) ?? widths[widths.length - 1];
  return `<picture>
            <source type="image/webp" srcset="${srcsetFor(image, 'webp', widths)}" sizes="${sizes}" />
            <source type="image/jpeg" srcset="${srcsetFor(image, 'jpeg', widths)}" sizes="${sizes}" />
            <img src="${image}-${fallback}.jpeg" alt="${escapeHtml(alt)}" loading="lazy" decoding="async" width="${fallback}" height="${fallback}" />
          </picture>`;
}

function relatedPubs(ids) {
  if (!ids?.length) return '';
  const items = ids
    .map((id) => PUBS_BY_ID[id])
    .filter(Boolean)
    .map((p) => {
      const venue = p.venues[0];
      const url = p.links?.[0]?.url || `/research#paper-${p.id}`;
      return `<li><a href="${escapeHtml(url)}" target="_blank" rel="noopener noreferrer">${escapeHtml(p.title)}</a> <span class="related-venue">— ${escapeHtml(venue.name)}, ${venue.year}</span></li>`;
    });
  if (!items.length) return '';
  return `<section class="project-related" aria-labelledby="related-heading">
        <h2 id="related-heading">Related publications</h2>
        <ul class="project-related-list">${items.join('')}</ul>
      </section>`;
}

function projectJsonLd(p) {
  const url = `${BASE}/posts/${p.id}`;
  return {
    '@context': 'https://schema.org',
    '@type': 'CreativeWork',
    name: p.title,
    headline: p.title,
    description: p.tagline,
    image: `${BASE}${p.image}-320.jpeg`,
    keywords: (p.tags || []).join(', '),
    datePublished: p.date || String(p.year),
    author: { '@type': 'Person', name: SITE.name, url: SITE.homepage },
    isPartOf: { '@type': 'WebSite', name: SITE.name, url: SITE.homepage },
    url,
  };
}

function breadcrumbsJsonLd(p) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: `${BASE}/` },
      { '@type': 'ListItem', position: 2, name: 'Notes', item: `${BASE}/posts/` },
      { '@type': 'ListItem', position: 3, name: p.title, item: `${BASE}/posts/${p.id}` },
    ],
  };
}

function pageHtml(p) {
  const linksHtml = p.links
    .map(
      (l) =>
        `<a class="project-link" href="${escapeHtml(l.url)}" target="_blank" rel="noopener noreferrer">${escapeHtml(l.label)}</a>`
    )
    .join('');
  const tagsHtml = (p.tags || [])
    .map((t) => `<li class="project-tag">${escapeHtml(t)}</li>`)
    .join('');
  const resultsHtml = (p.results || []).map((r) => `<li>${escapeHtml(r)}</li>`).join('');
  const takeawaysHtml = (p.takeaways || []).map((t) => `<li>${escapeHtml(t)}</li>`).join('');
  const ogImg = `${BASE}/images/og-cover.jpg?v=${VERSION}`;
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${escapeHtml(p.title)} — ${escapeHtml(SITE.name)}</title>
  <meta name="description" content="${escapeHtml(p.tagline)}" />
  <meta name="keywords" content="${escapeHtml((p.tags || []).join(', '))}" />
  <meta name="author" content="${escapeHtml(SITE.name)}" />

  <meta property="og:title" content="${escapeHtml(p.title)}" />
  <meta property="og:description" content="${escapeHtml(p.tagline)}" />
  <meta property="og:type" content="article" />
  <meta property="og:url" content="${BASE}/posts/${p.id}" />
  <meta property="og:image" content="${ogImg}" />
  <meta property="og:image:width" content="1200" />
  <meta property="og:image:height" content="630" />
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content="${escapeHtml(p.title)}" />
  <meta name="twitter:description" content="${escapeHtml(p.tagline)}" />
  <meta name="twitter:image" content="${ogImg}" />

  <link rel="canonical" href="${BASE}/posts/${p.id}" />
  <link rel="alternate" type="application/rss+xml" title="${escapeHtml(SITE.name)} feed" href="/feed.xml" />
  <link rel="icon" type="image/x-icon" href="/images/favicon.ico" />
  <link rel="icon" type="image/png" sizes="192x192" href="/images/icon.png" />
  <link rel="icon" type="image/png" sizes="512x512" href="/images/icon-512.png" />
  <link rel="apple-touch-icon" sizes="180x180" href="/images/apple-touch-icon.png" />
  <link rel="manifest" href="/manifest.json" />
  <meta name="theme-color" content="#ffffff" media="(prefers-color-scheme: light)" />
  <meta name="theme-color" content="#1e1e1e" media="(prefers-color-scheme: dark)" />

  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;500&display=optional" rel="stylesheet" />
  ${THEME_INIT}
  <link rel="stylesheet" type="text/css" href="/styles/modern.css?v=${VERSION}" />
  <link rel="prefetch" href="/images/icons.svg" as="image" type="image/svg+xml" />

  <script type="application/ld+json">${JSON.stringify(projectJsonLd(p))}</script>
  <script type="application/ld+json">${JSON.stringify(breadcrumbsJsonLd(p))}</script>
</head>
<body class="project-page post-page">
  <a href="#main" class="skip-link">Skip to content</a>
  <div id="sr-announcer" class="sr-only" role="status" aria-live="polite" aria-atomic="true"></div>

  <header class="header" role="banner">
    <div class="header-content">
      <a href="/" class="brand" aria-label="${escapeHtml(SITE.name)} - Home">${escapeHtml(SITE.name)}</a>
      <nav role="navigation" aria-label="Main navigation">
        <a href="/">Home</a>
        <a href="/research">Research</a>
        <a href="/posts/" aria-current="page">Notes</a>
        <a data-site-link="cv" href="#" hidden rel="noopener" aria-label="Download CV (PDF)">CV</a>
        ${THEME_TOGGLE}
      </nav>
    </div>
  </header>

  <main id="main" class="project-main">
    <nav class="breadcrumbs" aria-label="Breadcrumb">
      <ol>
        <li><a href="/">Home</a></li>
        <li><a href="/posts/">Notes</a></li>
        <li aria-current="page">${escapeHtml(p.title.split(':')[0])}</li>
      </ol>
    </nav>

    <article class="project-article">
      <header class="project-header">
        <p class="project-eyebrow">Deep dive · ${escapeHtml(p.venue)} · ${p.year}</p>
        <h1 class="project-title">${escapeHtml(p.title)}</h1>
        <p class="project-tagline">${escapeHtml(p.tagline)}</p>
        <ul class="project-tags">${tagsHtml}</ul>
        <div class="project-links">${linksHtml}</div>
      </header>

      <figure class="project-figure">
        ${picture(p.image, p.image_alt)}
        <figcaption>${escapeHtml(p.image_alt)}</figcaption>
      </figure>

      <section aria-labelledby="problem-heading">
        <h2 id="problem-heading">Problem</h2>
        <p>${escapeHtml(p.problem)}</p>
      </section>

      <section aria-labelledby="approach-heading">
        <h2 id="approach-heading">Approach</h2>
        <p>${escapeHtml(p.approach)}</p>
      </section>

      <section aria-labelledby="results-heading">
        <h2 id="results-heading">Key results</h2>
        <ul class="project-bullets">${resultsHtml}</ul>
      </section>

      <section aria-labelledby="takeaways-heading">
        <h2 id="takeaways-heading">Takeaways</h2>
        <ul class="project-bullets">${takeawaysHtml}</ul>
      </section>

      ${relatedPubs(p.related_publication_ids)}

      <footer class="project-cta">
        <a class="btn btn-primary" href="/research#paper-${p.publication_id}">View paper on Research page</a>
        <a class="btn btn-secondary" href="/posts/">All notes</a>
        <a class="btn btn-secondary" href="mailto:${escapeHtml(SITE.email)}?subject=${encodeURIComponent('About ' + p.title)}">Get in touch</a>
      </footer>
    </article>
  </main>

  <footer role="contentinfo" class="site-footer">
    <p>&copy; <span id="year-now">${new Date().getFullYear()}</span> ${escapeHtml(SITE.name)}. All rights reserved.</p>
    <p class="site-footer-meta">Last updated <time datetime="${new Date().toISOString().slice(0, 10)}">${new Date().toISOString().slice(0, 10)}</time></p>
  </footer>

  <script src="/js/site-data.js?v=${VERSION}" defer></script>
  <script src="/js/modern.js?v=${VERSION}" defer></script>
</body>
</html>
`;
}

function main() {
  fs.mkdirSync(OUT_DIR, { recursive: true });
  for (const p of PROJECTS) {
    const out = path.join(OUT_DIR, `${p.id}.html`);
    fs.writeFileSync(out, pageHtml(p));
    console.log(`wrote ${out}`);
  }
}

main();

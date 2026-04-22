#!/usr/bin/env node
/**
 * Render data/posts.json into:
 *   posts/<slug>.html  — individual post pages
 *   posts/index.html   — chronological post index
 *   feed.xml           — RSS 2.0 feed for syndication
 *
 * Markdown is rendered via the `marked` library if present; otherwise we fall
 * back to a minimal renderer that handles paragraphs, headings, lists, links,
 * and inline code (sufficient for the post body conventions used here).
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const ROOT = path.resolve(path.dirname(__filename), '..');
const SITE = JSON.parse(fs.readFileSync(path.join(ROOT, 'data', 'site.json'), 'utf8'));
const POSTS = JSON.parse(fs.readFileSync(path.join(ROOT, 'data', 'posts.json'), 'utf8'));
const PROJECTS = (() => {
  try {
    return JSON.parse(fs.readFileSync(path.join(ROOT, 'data', 'projects.json'), 'utf8'));
  } catch {
    return [];
  }
})();
const POSTS_DIR = path.join(ROOT, 'posts');
const VERSION = SITE.cache_bust;
const BASE = SITE.homepage.replace(/\/$/, '');

// Inline theme-init snippet — must run synchronously in <head> BEFORE the
// stylesheet link so `data-theme` is set before the first paint. Without
// this, the notes index and per-post pages (which have no theme toggle)
// never set the attribute, and the `prefers-color-scheme: dark` rules win
// on devices whose OS is in dark mode even when the user picked "light".
// Header theme-toggle markup — same shape as the homepage so users can
// switch theme directly from a notes/post page (essential on mobile, where
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

// Normalize the two content kinds (short notes + project deep dives) into a
// single feed-shaped entry so the index and RSS can mix them chronologically.
const FEED_ENTRIES = [
  ...POSTS.map((p) => ({
    kind: 'note',
    slug: p.slug,
    title: p.title,
    date: p.date,
    summary: p.summary,
    tags: p.tags || [],
    eyebrow: 'Note',
  })),
  ...PROJECTS.map((p) => ({
    kind: 'deep-dive',
    slug: p.id,
    title: p.title,
    date: p.date || `${p.year}-01-01`,
    summary: p.tagline,
    tags: p.tags || [],
    eyebrow: `Deep dive · ${p.venue}`,
  })),
].sort((a, b) => (a.date < b.date ? 1 : -1));

const escapeHtml = (s) =>
  String(s).replace(
    /[&<>"']/g,
    (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]
  );

let markdownToHtml;
try {
  const mod = await import('marked');
  markdownToHtml = (md) => mod.marked.parse(md);
} catch {
  markdownToHtml = (md) => fallbackMd(md);
}

function fallbackMd(md) {
  const blocks = md.split(/\n\n+/);
  return blocks
    .map((block) => {
      if (/^#{1,6}\s/.test(block)) {
        const m = block.match(/^(#{1,6})\s+(.*)$/);
        const lvl = m[1].length;
        return `<h${lvl}>${inline(m[2])}</h${lvl}>`;
      }
      if (/^\s*[-*]\s+/m.test(block)) {
        const items = block
          .split(/\n/)
          .filter((l) => l.trim())
          .map((l) => l.replace(/^\s*[-*]\s+/, ''))
          .map((l) => `<li>${inline(l)}</li>`)
          .join('');
        return `<ul>${items}</ul>`;
      }
      return `<p>${inline(block)}</p>`;
    })
    .join('\n');

  function inline(s) {
    return s
      .replace(/`([^`]+)`/g, (_, c) => `<code>${escapeHtml(c)}</code>`)
      .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
      .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>');
  }
}

function postHtml(p) {
  const ogImg = `${BASE}/images/og-cover.jpg?v=${VERSION}`;
  const body = markdownToHtml(p.body_md);
  const tagsHtml = (p.tags || []).map((t) => `<li class="post-tag">${escapeHtml(t)}</li>`).join('');
  const jsonLd = JSON.stringify({
    '@context': 'https://schema.org',
    '@type': 'BlogPosting',
    headline: p.title,
    datePublished: p.date,
    dateModified: p.date,
    description: p.summary,
    image: ogImg,
    author: { '@type': 'Person', name: SITE.name, url: SITE.homepage },
    mainEntityOfPage: `${BASE}/posts/${p.slug}`,
    keywords: (p.tags || []).join(', '),
  });

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${escapeHtml(p.title)} — ${escapeHtml(SITE.name)}</title>
  <meta name="description" content="${escapeHtml(p.summary)}" />
  <meta name="author" content="${escapeHtml(SITE.name)}" />

  <meta property="og:title" content="${escapeHtml(p.title)}" />
  <meta property="og:description" content="${escapeHtml(p.summary)}" />
  <meta property="og:type" content="article" />
  <meta property="og:url" content="${BASE}/posts/${p.slug}" />
  <meta property="og:image" content="${ogImg}" />
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content="${escapeHtml(p.title)}" />
  <meta name="twitter:description" content="${escapeHtml(p.summary)}" />
  <meta name="twitter:image" content="${ogImg}" />

  <link rel="canonical" href="${BASE}/posts/${p.slug}" />
  <link rel="alternate" type="application/rss+xml" title="${escapeHtml(SITE.name)} feed" href="/feed.xml" />
  <link rel="icon" type="image/x-icon" href="/images/favicon.ico" />
  <link rel="manifest" href="/manifest.json" />
  <meta name="theme-color" content="#ffffff" media="(prefers-color-scheme: light)" />
  <meta name="theme-color" content="#1e1e1e" media="(prefers-color-scheme: dark)" />

  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;500&display=optional" rel="stylesheet" />
  ${THEME_INIT}
  <link rel="stylesheet" type="text/css" href="/styles/modern.css?v=${VERSION}" />

  <script type="application/ld+json">${jsonLd}</script>
</head>
<body class="post-page">
  <a href="#main" class="skip-link">Skip to content</a>
  <header class="header" role="banner">
    <div class="header-content">
      <a href="/" class="brand">${escapeHtml(SITE.name)}</a>
      <nav role="navigation" aria-label="Main navigation">
        <a href="/">Home</a>
        <a href="/research">Research</a>
        <a href="/posts/" aria-current="page">Notes</a>
        ${THEME_TOGGLE}
      </nav>
    </div>
  </header>

  <main id="main" class="post-main">
    <nav class="breadcrumbs" aria-label="Breadcrumb">
      <ol>
        <li><a href="/">Home</a></li>
        <li><a href="/posts/">Notes</a></li>
        <li aria-current="page">${escapeHtml(p.title)}</li>
      </ol>
    </nav>
    <article class="post-article">
      <header class="post-header">
        <p class="post-eyebrow"><time datetime="${p.date}">${p.date}</time></p>
        <h1 class="post-title">${escapeHtml(p.title)}</h1>
        <p class="post-summary">${escapeHtml(p.summary)}</p>
        <ul class="post-tags">${tagsHtml}</ul>
      </header>
      <div class="post-body">${body}</div>
      <footer class="post-footer">
        <a href="/posts/" class="btn btn-secondary">All notes</a>
        <a href="/feed.xml" class="btn btn-secondary">RSS feed</a>
      </footer>
    </article>
  </main>

  <footer class="site-footer" role="contentinfo">
    <p>&copy; ${new Date().getFullYear()} ${escapeHtml(SITE.name)}. All rights reserved.</p>
    <p class="site-footer-meta">Last updated <time data-site="last_updated" datetime="${SITE.last_updated || ''}">${SITE.last_updated || ''}</time></p>
  </footer>
  <script src="/js/site-data.js?v=${VERSION}" defer></script>
  <script src="/js/modern.js?v=${VERSION}" defer></script>
</body>
</html>
`;
}

function indexHtml() {
  const noteCount = FEED_ENTRIES.filter((p) => p.kind === 'note').length;
  const deepDiveCount = FEED_ENTRIES.filter((p) => p.kind === 'deep-dive').length;

  const items = FEED_ENTRIES.length
    ? FEED_ENTRIES.map(
        (p) => `        <li class="post-list-item post-list-item--${p.kind}">
          <a class="post-list-link" href="/posts/${p.slug}">
            <div class="post-list-meta">
              <span class="post-list-badge post-list-badge--${p.kind}">${
                p.kind === 'deep-dive' ? 'Deep dive' : 'Note'
              }</span>
              <span class="post-list-venue">${escapeHtml(
                p.kind === 'deep-dive' ? p.eyebrow.replace(/^Deep dive · /, '') : ''
              )}</span>
              <time class="post-list-date" datetime="${p.date}">${p.date}</time>
            </div>
            <h2 class="post-list-title">${escapeHtml(p.title)}</h2>
            <p class="post-list-summary">${escapeHtml(p.summary)}</p>
            <span class="post-list-cta" aria-hidden="true">Read &rarr;</span>
          </a>
        </li>`
      ).join('\n')
    : `        <li class="post-list-empty">No notes yet — check back soon.</li>`;

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Notes — ${escapeHtml(SITE.name)}</title>
  <meta name="description" content="Short technical notes and long-form project deep dives from ${escapeHtml(SITE.name)}." />
  <link rel="canonical" href="${BASE}/posts/" />
  <link rel="alternate" type="application/rss+xml" title="${escapeHtml(SITE.name)} feed" href="/feed.xml" />
  <link rel="icon" type="image/x-icon" href="/images/favicon.ico" />
  <link rel="manifest" href="/manifest.json" />
  <meta name="theme-color" content="#ffffff" media="(prefers-color-scheme: light)" />
  <meta name="theme-color" content="#1e1e1e" media="(prefers-color-scheme: dark)" />
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;500&display=optional" rel="stylesheet" />
  ${THEME_INIT}
  <link rel="stylesheet" type="text/css" href="/styles/modern.css?v=${VERSION}" />
</head>
<body class="posts-index">
  <a href="#main" class="skip-link">Skip to content</a>
  <header class="header" role="banner">
    <div class="header-content">
      <a href="/" class="brand">${escapeHtml(SITE.name)}</a>
      <nav role="navigation" aria-label="Main navigation">
        <a href="/">Home</a>
        <a href="/research">Research</a>
        <a href="/posts/" aria-current="page">Notes</a>
        ${THEME_TOGGLE}
      </nav>
    </div>
  </header>
  <main id="main" class="post-main posts-index-main">
    <section class="posts-hero" aria-labelledby="notes-heading">
      <p class="posts-hero-eyebrow">Writing</p>
      <h1 id="notes-heading" class="posts-hero-title">Notes &amp; Deep Dives</h1>
      <p class="posts-hero-lede">
        A growing collection of short technical write-ups and long-form project deep dives —
        spanning vision-language models, federated learning, and applied medical imaging.
      </p>
      <div class="posts-hero-meta">
        <span class="posts-hero-stat"><strong>${deepDiveCount}</strong> deep dive${deepDiveCount === 1 ? '' : 's'}</span>
        <span class="posts-hero-stat"><strong>${noteCount}</strong> note${noteCount === 1 ? '' : 's'}</span>
      </div>
    </section>
    <section aria-label="All entries">
      <ol class="post-list" reversed>
${items}
      </ol>
    </section>
  </main>
  <footer class="site-footer" role="contentinfo">
    <p>&copy; ${new Date().getFullYear()} ${escapeHtml(SITE.name)}. All rights reserved.</p>
  </footer>
  <script src="/js/modern.js?v=${VERSION}" defer></script>
</body>
</html>
`;
}

function feedXml() {
  const items = FEED_ENTRIES.map((p) => {
    const url = `${BASE}/posts/${p.slug}`;
    return `    <item>
      <title>${escapeHtml(p.title)}</title>
      <link>${url}</link>
      <guid isPermaLink="true">${url}</guid>
      <pubDate>${new Date(p.date).toUTCString()}</pubDate>
      <description><![CDATA[${p.summary}]]></description>
    </item>`;
  }).join('\n');
  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>${escapeHtml(SITE.name)} — Notes</title>
    <link>${BASE}/posts/</link>
    <atom:link href="${BASE}/feed.xml" rel="self" type="application/rss+xml" />
    <description>Short technical notes from ${escapeHtml(SITE.name)}.</description>
    <language>en-us</language>
    <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>
${items}
  </channel>
</rss>
`;
}

function main() {
  fs.mkdirSync(POSTS_DIR, { recursive: true });
  for (const p of POSTS) {
    fs.writeFileSync(path.join(POSTS_DIR, `${p.slug}.html`), postHtml(p));
    console.log(`wrote posts/${p.slug}.html`);
  }
  fs.writeFileSync(path.join(POSTS_DIR, 'index.html'), indexHtml());
  fs.writeFileSync(path.join(ROOT, 'feed.xml'), feedXml());
  console.log(`wrote posts/index.html and feed.xml (${FEED_ENTRIES.length} entries)`);
}

main();

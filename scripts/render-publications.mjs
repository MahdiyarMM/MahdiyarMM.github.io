#!/usr/bin/env node
/**
 * Render data/publications.json into research.html as static <article class="paper-card">
 * cards between <!-- publications:start --> and <!-- publications:end -->.
 *
 * Also emits a per-paper ScholarlyArticle JSON-LD block right after the cards
 * (between <!-- publications-jsonld:start --> and <!-- publications-jsonld:end -->).
 *
 * Idempotent: re-runs replace whatever is currently between the markers.
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const ROOT = path.resolve(path.dirname(__filename), '..');
const HTML = path.join(ROOT, 'research.html');
const DATA = path.join(ROOT, 'data', 'publications.json');
const SITE_URL = 'https://mahdiyar.ai';

const escapeHtml = (s) =>
  String(s).replace(
    /[&<>"']/g,
    (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]
  );

function authorMarkup(authors, equal = []) {
  return authors
    .map((name) => {
      const isMe = name === 'Mahdiyar Molahasani';
      const eq = equal.includes(name) ? '<sup>*</sup>' : '';
      return isMe ? `<strong>${escapeHtml(name)}</strong>${eq}` : `${escapeHtml(name)}${eq}`;
    })
    .join(', ');
}

function venueLine(v) {
  return `<em>${escapeHtml(v.name)}</em>, ${v.year}`;
}

function linkMarkup(links = []) {
  if (!links.length) return '';
  return (
    '<div class="paper-links">' +
    links
      .map(
        (l) =>
          `<a href="${escapeHtml(l.url)}" class="code-link" target="_blank" rel="noopener noreferrer">${escapeHtml(l.label)}</a>`
      )
      .join('') +
    '</div>'
  );
}

function pictureMarkup(image, alt) {
  // image is the basename prefix, e.g. /images/PRISM_cover_sqr
  const base = image;
  return `<picture>
            <source type="image/webp" srcset="${base}-160.webp 160w, ${base}-320.webp 320w" sizes="(max-width: 600px) 120px, 160px" />
            <source type="image/jpeg" srcset="${base}-160.jpeg 160w, ${base}-320.jpeg 320w" sizes="(max-width: 600px) 120px, 160px" />
            <img src="${base}-160.jpeg" alt="${escapeHtml(alt)}" width="160" height="160" loading="lazy" decoding="async" />
          </picture>`;
}

function tagMarkup(tags = []) {
  if (!tags.length) return '';
  return (
    '<ul class="paper-tags">' +
    tags.map((t) => `<li class="paper-tag">${escapeHtml(t)}</li>`).join('') +
    '</ul>'
  );
}

function cardMarkup(p, idx) {
  const venuesHtml = p.venues.map((v) => `<div class="venue">${venueLine(v)}</div>`).join('');
  const equalNote = p.equal_contribution?.length
    ? '<p class="paper-equal-note"><sup>*</sup> Equal contribution</p>'
    : '';
  const highlightAttr = p.highlight ? ' data-highlight="true"' : '';
  const primaryUrl =
    p.links?.find((l) => /arxiv|openreview|spie|ieee|journal/i.test(l.label))?.url ||
    p.links?.[0]?.url ||
    '#';
  const orderAttr = Number.isInteger(p.display_order)
    ? ` data-paper-order="${p.display_order}"`
    : '';
  return `      <article class="paper-card paper-info" id="paper-${escapeHtml(p.id)}" data-paper-id="${escapeHtml(p.id)}" data-paper-year="${p.year}" data-paper-tags="${escapeHtml((p.tags || []).join('|'))}"${orderAttr}${highlightAttr}>
        <div class="paper-card-media">
          ${pictureMarkup(p.image, p.image_alt || p.title)}
        </div>
        <div class="paper-card-body">
          <h3 class="paper-title"><a href="${escapeHtml(primaryUrl)}" target="_blank" rel="noopener noreferrer">${escapeHtml(p.title)}</a></h3>
          <p class="authors">${authorMarkup(p.authors, p.equal_contribution)}</p>
          ${equalNote}
          ${venuesHtml}
          ${tagMarkup(p.tags)}
          <p class="paper-description">${escapeHtml(p.description)}</p>
          ${linkMarkup(p.links)}
          <button class="paper-cite-btn" type="button" data-cite-id="${escapeHtml(p.id)}" aria-label="Copy BibTeX citation for ${escapeHtml(p.title)}">Cite (BibTeX)</button>
        </div>
      </article>`;
}

function jsonLdFor(p) {
  const venue = p.venues[0];
  const sameAs = (p.links || []).map((l) => l.url).filter(Boolean);
  return {
    '@context': 'https://schema.org',
    '@type': 'ScholarlyArticle',
    '@id': `${SITE_URL}/research#paper-${p.id}`,
    name: p.title,
    headline: p.title,
    abstract: p.description,
    datePublished: String(p.year),
    inLanguage: 'en',
    image: `${SITE_URL}${p.image}-320.jpeg`,
    keywords: (p.tags || []).join(', '),
    author: p.authors.map((name) => ({ '@type': 'Person', name })),
    isPartOf: { '@type': 'PublicationVolume', name: venue.name, datePublished: String(venue.year) },
    publisher: { '@type': 'Organization', name: venue.name },
    url: sameAs[0] || `${SITE_URL}/research#paper-${p.id}`,
    sameAs,
  };
}

function replaceBetween(html, startMarker, endMarker, body) {
  const re = new RegExp(`(${startMarker})([\\s\\S]*?)(${endMarker})`);
  if (!re.test(html)) {
    throw new Error(`markers not found: ${startMarker} ... ${endMarker}`);
  }
  return html.replace(re, `$1\n${body}\n      $3`);
}

function main() {
  const html = fs.readFileSync(HTML, 'utf8');
  const pubs = JSON.parse(fs.readFileSync(DATA, 'utf8'));
  // Sort newest year first, then by manual `display_order` (higher = first)
  // as a tie-breaker so within-year ordering is editable from data, finally
  // alphabetical title for stability.
  pubs.sort(
    (a, b) =>
      b.year - a.year ||
      (b.display_order || 0) - (a.display_order || 0) ||
      a.title.localeCompare(b.title)
  );

  const cards = pubs.map((p, i) => cardMarkup(p, i)).join('\n\n');
  const jsonLd = pubs
    .map((p) => `<script type="application/ld+json">${JSON.stringify(jsonLdFor(p))}</script>`)
    .join('\n      ');

  let out = replaceBetween(html, '<!-- publications:start -->', '<!-- publications:end -->', cards);
  out = replaceBetween(
    out,
    '<!-- publications-jsonld:start -->',
    '<!-- publications-jsonld:end -->',
    jsonLd
  );

  fs.writeFileSync(HTML, out);
  console.log(`render-publications: ${pubs.length} cards rendered`);
}

main();

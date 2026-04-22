/**
 * Shared site-data loader.
 * Single source of truth for citation count, h-index, publications count,
 * years of experience, and any other number rendered across pages.
 *
 * Usage in HTML:
 *   <span data-site="citations">609</span>
 *   <span data-site="h_index">10</span>
 *   <span data-site="publications_count">18</span>
 *   <span data-site="years_experience">8</span>
 *   <span data-site="citations" data-animate="true">0</span>
 *
 * The fallback value already in the element is used when fetches fail,
 * so the page is meaningful without JavaScript.
 */

(function () {
  'use strict';

  const SITE_DATA_URL = '/data/site.json';
  const SCHOLAR_DATA_URL = '/scholar_data.json';
  const ANIMATION_MS = 1500;

  function bindTyping(site) {
    const el = document.getElementById('typing-text');
    if (!el) return;
    const texts = Array.isArray(site?.typing_texts)
      ? site.typing_texts.filter((t) => typeof t === 'string' && t.length)
      : null;
    if (!texts || !texts.length) return;
    try {
      el.dataset.typingTexts = JSON.stringify(texts);
    } catch (_) {}
    document.dispatchEvent(new CustomEvent('sitedata:typing', { detail: { texts } }));
  }

  function bindBackground(site) {
    const mode = site?.background;
    if (typeof mode === 'string' && mode.length) {
      document.body.setAttribute('data-background', mode);
    }
  }

  function bindLinks(site) {
    // <a data-site-link="cv" hidden> ... </a> is shown only when site.cv_url is non-empty.
    document.querySelectorAll('[data-site-link]').forEach((el) => {
      const key = el.getAttribute('data-site-link');
      const url = key === 'cv' ? site?.cv_url : null;
      if (url && typeof url === 'string') {
        if (el.tagName === 'A') el.setAttribute('href', url);
        el.removeAttribute('hidden');
      } else {
        el.setAttribute('hidden', '');
      }
    });
  }

  function bind(values) {
    const elements = document.querySelectorAll('[data-site]');
    elements.forEach((el) => {
      const key = el.getAttribute('data-site');
      if (!(key in values)) return;
      const target = Number(values[key]);
      if (!Number.isFinite(target)) {
        el.textContent = String(values[key]);
        return;
      }
      const animate = el.getAttribute('data-animate') === 'true';
      if (!animate) {
        el.textContent = String(target);
        return;
      }
      const start = performance.now();
      function tick(now) {
        const t = Math.min((now - start) / ANIMATION_MS, 1);
        const eased = 1 - Math.pow(1 - t, 3);
        el.textContent = String(Math.round(target * eased));
        if (t < 1) requestAnimationFrame(tick);
      }
      requestAnimationFrame(tick);
    });
  }

  function readFallbacks() {
    const out = {};
    document.querySelectorAll('[data-site]').forEach((el) => {
      const key = el.getAttribute('data-site');
      const text = (el.textContent || '').trim();
      const num = Number(text.replace(/[^\d.-]/g, ''));
      if (Number.isFinite(num)) out[key] = num;
    });
    return out;
  }

  async function fetchJson(url) {
    try {
      const r = await fetch(url, { cache: 'no-store' });
      if (!r.ok) return null;
      return await r.json();
    } catch {
      return null;
    }
  }

  async function load() {
    const fallbacks = readFallbacks();
    const [site, scholar] = await Promise.all([
      fetchJson(SITE_DATA_URL),
      fetchJson(SCHOLAR_DATA_URL),
    ]);

    const stats = (site && site.stats) || {};
    const values = {
      citations: scholar?.citations ?? stats.citations_fallback ?? fallbacks.citations,
      h_index: scholar?.h_index ?? stats.h_index_fallback ?? fallbacks.h_index,
      i10_index: scholar?.i10_index ?? stats.i10_index_fallback ?? fallbacks.i10_index,
      publications_count: stats.publications_count_fallback ?? fallbacks.publications_count,
      years_experience: stats.years_experience ?? fallbacks.years_experience,
    };

    bind(values);
    bindLinks(site);
    bindTyping(site);
    bindBackground(site);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', load);
  } else {
    load();
  }
})();

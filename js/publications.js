/**
 * Publications enhancer.
 *
 * Pure progressive enhancement on top of statically-rendered paper cards.
 * Without JavaScript:
 *   - All cards are visible (rendered by scripts/render-publications.mjs)
 *   - No filter / sort / search UI is shown
 *
 * With JavaScript:
 *   - The toolbar is revealed
 *   - Tag filter chips are derived from the cards' data-paper-tags
 *   - Search filters by title, authors, tags, description
 *   - Sort by year (asc/desc) or by Google Scholar citation count if available
 *   - BibTeX copy button reads bibtex from data/publications.json and copies
 *
 * The publications data file is fetched lazily so the page is interactive
 * before the JSON arrives. All UI works against DOM data attributes alone;
 * the JSON fetch only powers BibTeX copy and citation-count sorting.
 */

(function () {
  'use strict';

  const PUBS_URL = '/data/publications.json';

  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

  let pubsById = {};
  let pubsLoaded = false;

  function announce(msg) {
    const el = document.getElementById('sr-announcer');
    if (!el) return;
    el.textContent = '';
    requestAnimationFrame(() => {
      el.textContent = msg;
    });
  }

  function readCards() {
    return $$('.paper-card[data-paper-id]').map((el) => ({
      el,
      id: el.getAttribute('data-paper-id'),
      year: Number(el.getAttribute('data-paper-year')) || 0,
      order: Number(el.getAttribute('data-paper-order')) || 0,
      tags: (el.getAttribute('data-paper-tags') || '').split('|').filter(Boolean),
      title: ($('.paper-title', el)?.textContent || '').toLowerCase(),
      authors: ($('.authors', el)?.textContent || '').toLowerCase(),
      desc: ($('.paper-description', el)?.textContent || '').toLowerCase(),
    }));
  }

  // Number of tag chips to show before the "Show all" toggle kicks in.
  // 6 chips + the "All" chip ≈ 1 row on wide desktop / 2 rows on phones.
  const FILTER_VISIBLE_TAGS = 6;

  function buildFilterChips(cards, container) {
    const tagCounts = new Map();
    for (const c of cards) for (const t of c.tags) tagCounts.set(t, (tagCounts.get(t) || 0) + 1);
    const tags = Array.from(tagCounts.entries())
      .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
      .slice(0, 14);

    container.innerHTML = '';
    container.dataset.collapsed = 'true';

    const allBtn = document.createElement('button');
    allBtn.type = 'button';
    allBtn.className = 'publication-filter';
    allBtn.dataset.tag = '__all__';
    allBtn.setAttribute('aria-pressed', 'true');
    allBtn.textContent = `All (${cards.length})`;
    container.appendChild(allBtn);

    tags.forEach(([tag, count], i) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'publication-filter';
      b.dataset.tag = tag;
      b.setAttribute('aria-pressed', 'false');
      b.textContent = `${tag} (${count})`;
      if (i >= FILTER_VISIBLE_TAGS) b.dataset.overflow = 'true';
      container.appendChild(b);
    });

    const overflowCount = Math.max(0, tags.length - FILTER_VISIBLE_TAGS);
    if (overflowCount > 0) {
      const toggle = document.createElement('button');
      toggle.type = 'button';
      toggle.className = 'publication-filter publication-filter-toggle';
      toggle.dataset.role = 'toggle';
      toggle.setAttribute('aria-expanded', 'false');
      toggle.setAttribute('aria-controls', container.id);
      toggle.textContent = `Show all tags (+${overflowCount})`;
      toggle.dataset.expandText = `Show all tags (+${overflowCount})`;
      toggle.dataset.collapseText = 'Show fewer';
      container.appendChild(toggle);
    }
  }

  function toggleFilterOverflow(container, expand) {
    const collapsed = expand === undefined ? container.dataset.collapsed !== 'true' : !expand;
    container.dataset.collapsed = collapsed ? 'true' : 'false';
    const toggle = container.querySelector('[data-role="toggle"]');
    if (toggle) {
      toggle.setAttribute('aria-expanded', collapsed ? 'false' : 'true');
      toggle.textContent = collapsed ? toggle.dataset.expandText : toggle.dataset.collapseText;
    }
  }

  function applyFilters(cards, state, emptyEl) {
    const q = state.q.trim().toLowerCase();
    let visible = 0;
    for (const c of cards) {
      const matchTag = state.tag === '__all__' || c.tags.includes(state.tag);
      const matchQuery =
        !q ||
        c.title.includes(q) ||
        c.authors.includes(q) ||
        c.desc.includes(q) ||
        c.tags.some((t) => t.toLowerCase().includes(q));
      const show = matchTag && matchQuery;
      c.el.hidden = !show;
      if (show) visible++;
    }
    emptyEl.hidden = visible !== 0;
    return visible;
  }

  function applySort(cards, mode, gridEl) {
    const sorted = [...cards];
    // Within-year tie-breaker: manual data-paper-order (higher first), so the
    // default "newest first" view matches the static render order from
    // scripts/render-publications.mjs (PRISM > FedGaLA > FedSB for 2025).
    if (mode === 'year-asc') {
      sorted.sort((a, b) => a.year - b.year || a.order - b.order);
    } else if (mode === 'cites-desc') {
      sorted.sort(
        (a, b) =>
          (pubsById[b.id]?.citations || 0) - (pubsById[a.id]?.citations || 0) ||
          b.year - a.year ||
          b.order - a.order
      );
    } else {
      sorted.sort((a, b) => b.year - a.year || b.order - a.order);
    }
    for (const c of sorted) gridEl.appendChild(c.el);
  }

  function attachCiteButtons() {
    $$('.paper-cite-btn[data-cite-id]').forEach((btn) => {
      btn.addEventListener('click', async () => {
        const id = btn.getAttribute('data-cite-id');
        await ensurePubs();
        const bib = pubsById[id]?.bibtex;
        if (!bib) {
          announce('BibTeX not available for this paper.');
          return;
        }
        try {
          await navigator.clipboard.writeText(bib.trim() + '\n');
          const original = btn.textContent;
          btn.setAttribute('aria-pressed', 'true');
          btn.textContent = 'Copied';
          announce('BibTeX citation copied to clipboard.');
          setTimeout(() => {
            btn.textContent = original;
            btn.setAttribute('aria-pressed', 'false');
          }, 1800);
        } catch {
          window.prompt('Copy the BibTeX citation:', bib);
        }
      });
    });
  }

  async function ensurePubs() {
    if (pubsLoaded) return;
    try {
      const r = await fetch(PUBS_URL, { cache: 'no-store' });
      if (!r.ok) throw new Error(`http ${r.status}`);
      const list = await r.json();
      pubsById = Object.fromEntries(list.map((p) => [p.id, p]));
    } catch {
      pubsById = {};
    } finally {
      pubsLoaded = true;
    }
  }

  function init() {
    const grid = document.getElementById('publications-grid');
    const toolbar = document.getElementById('publications-toolbar');
    const filters = document.getElementById('publications-filters');
    const search = document.getElementById('publications-search');
    const sort = document.getElementById('publications-sort');
    const empty = document.getElementById('publications-empty');
    if (!grid || !toolbar || !filters || !search || !sort || !empty) return;

    const cards = readCards();
    if (!cards.length) return;

    buildFilterChips(cards, filters);
    toolbar.classList.remove('is-pre-js');
    toolbar.hidden = false;

    const state = { tag: '__all__', q: '', sort: 'year-desc' };

    filters.addEventListener('click', (e) => {
      const btn = e.target.closest('.publication-filter');
      if (!btn) return;
      // The "Show all tags" toggle expands/collapses overflow chips and
      // doesn't change the active filter.
      if (btn.dataset.role === 'toggle') {
        toggleFilterOverflow(filters);
        return;
      }
      $$('.publication-filter:not([data-role="toggle"])', filters).forEach((b) =>
        b.setAttribute('aria-pressed', 'false')
      );
      btn.setAttribute('aria-pressed', 'true');
      state.tag = btn.dataset.tag;
      // If the user activated an overflow chip, reveal the rest so the
      // active selection stays visible after click.
      if (btn.dataset.overflow === 'true' && filters.dataset.collapsed === 'true') {
        toggleFilterOverflow(filters, true);
      }
      const visible = applyFilters(cards, state, empty);
      announce(`${visible} publication${visible === 1 ? '' : 's'} shown.`);
    });

    let searchTimer = null;
    search.addEventListener('input', () => {
      clearTimeout(searchTimer);
      searchTimer = setTimeout(() => {
        state.q = search.value;
        const visible = applyFilters(cards, state, empty);
        announce(`${visible} publication${visible === 1 ? '' : 's'} match.`);
      }, 120);
    });

    sort.addEventListener('change', async () => {
      state.sort = sort.value;
      if (state.sort === 'cites-desc') await ensurePubs();
      applySort(cards, state.sort, grid);
    });

    attachCiteButtons();
    ensurePubs();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();

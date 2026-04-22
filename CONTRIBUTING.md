# Contributing

This is a personal site, but the build pipeline is fully reproducible. The notes below
exist so that future-me (or anyone reading) can change content without breaking anything.

## TL;DR

```bash
# 1. install dev tooling once
npm install
npx simple-git-hooks

# 2. run the dev server with live-reload at http://localhost:5173
npm run dev

# 3. before committing
npm run build      # regenerate publications, deep-dives, posts, sitemap, robots
npm run check      # html-validate + prettier --check
pytest -q          # python tests for the Scholar fetcher
```

## Repo layout

```
data/
  site.json              site-wide config (name, stats, typing texts, CV link, build date, ...)
  publications.json      structured paper list
  publications.schema.json
  projects.json          PRISM / FedGaLA / COVID-CXNet deep dives (rendered to /posts/<id>)
  posts.json             short-form notes (rendered to /posts/ + feed.xml)
  talks.json             placeholder for future talks
images/
  originals/             source assets — DO NOT touch in production HTML
  ...                    optimized webp/jpeg variants are checked in
scripts/
  serve.mjs              local static server with clean URL rewrites + live-reload
  optimize-images.mjs    sharp-based responsive image generator
  render-publications.mjs
  render-projects.mjs
  render-posts.mjs
  build-sitemap.mjs
  build-robots.mjs
  build-og-cover.mjs
  update-build-date.mjs
fetch_scholar_data.py    nightly Google Scholar metrics updater (GitHub Actions)
tests/                   pytest tests for fetch_scholar_data.py
```

The deployed site is the repo itself — Cloudflare Pages serves files as-is. There is no
build step at deploy time. All "building" happens locally via `npm run build`, and the
generated HTML/XML/JSON files are committed.

## Common tasks

### Add a new publication

1. Add an entry to `data/publications.json` (validate against `publications.schema.json`).
2. Run `npm run build:publications` (or just `npm run build`).
3. Open `http://localhost:5173/research` and confirm the card renders, filters work, and
   BibTeX copies cleanly.

### Add a new note (blog post)

1. Add an entry to `data/posts.json` with a kebab-case slug and Markdown `body_md`.
2. Run `npm run build:posts`.
3. Open `http://localhost:5173/posts/<slug>` to review.

### Add a new project deep dive

Deep dives are long-form project write-ups that live alongside short notes under `/posts/`.

1. Add an entry to `data/projects.json` (include a `date` field for chronological sorting).
2. Drop a hero image at `images/originals/<id>.png` and re-run `npm run optimize:images`.
3. Run `npm run build:deepdives && npm run build:posts` (or just `npm run build`).
4. The page will appear at `/posts/<id>` and on the Notes index alongside short notes.

### Update site stats / typing texts / CV link

Edit `data/site.json`. The `cache_bust` field is appended to `?v=` query strings on CSS/JS
references — bump it any time you ship CSS or JS changes so visitors don't get a stale
copy from the Cloudflare edge cache.

### Refresh Google Scholar metrics

`fetch_scholar_data.py` runs nightly via `.github/workflows/update_scholar_data.yml`. To
test locally:

```bash
SCHOLAR_AUTHOR_ID=cXDt3NQAAAAJ python3 fetch_scholar_data.py
pytest -q tests/test_fetch_scholar_data.py
```

The script refuses to overwrite `scholar_data.json` if Scholar returns zero or a regression,
so a transient block can't ratchet the public-facing numbers downward.

## Quality gates

`npm run check` (also wired as a pre-commit hook via `simple-git-hooks`) runs:

- `html-validate` against `index.html`, `research.html`, and all generated post / deep-dive pages
- `prettier --check` against the formatted file set

Heavier gates (run manually before a release):

- `npm run a11y` — pa11y-ci against `http://localhost:5173/` (server must be running)
- `npm run lighthouse` — Lighthouse CI gate
- `pytest -q` — Python test suite

## Style

- Plain HTML/CSS/JS — no framework, no bundler, no transpiler.
- Generated HTML lives next to hand-written HTML; both are valid.
- JSON data files are the single source of truth. Avoid duplicating numbers (citations,
  publication count, etc.) into the HTML by hand — bind them via `data-site` attributes
  and let `js/site-data.js` populate them.
- Python: 3.11+, type hints on new code, ruff for lint/format. See `pyproject.toml`.

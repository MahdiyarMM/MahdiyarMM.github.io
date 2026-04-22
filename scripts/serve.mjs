#!/usr/bin/env node
// Tiny zero-dep dev server for the static site.
// Features:
//   - Serves repo root as static files.
//   - Clean URLs: /research -> research.html, /posts/prism -> posts/prism.html.
//   - SPA-ish fallback: unknown extensions -> 404.
//   - SSE-based live reload: watches HTML/CSS/JS/JSON/MD/SVG and tells the browser to reload.
//   - No third-party deps; works on Node 18+.

import http from 'node:http';
import fs from 'node:fs';
import fsp from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '..');
const PORT = Number.parseInt(process.env.PORT ?? '5173', 10);

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.mjs': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.avif': 'image/avif',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.txt': 'text/plain; charset=utf-8',
  '.xml': 'application/xml; charset=utf-8',
  '.md': 'text/markdown; charset=utf-8',
  '.pdf': 'application/pdf',
};

const RELOAD_SNIPPET = `
<script>(() => {
  if (window.__livereload) return;
  window.__livereload = true;
  const es = new EventSource('/__livereload');
  es.addEventListener('reload', () => window.location.reload());
  es.addEventListener('css', (e) => {
    document.querySelectorAll('link[rel="stylesheet"]').forEach((l) => {
      const url = new URL(l.href);
      url.searchParams.set('_lr', Date.now());
      l.href = url.toString();
    });
  });
})();</script>
`;

const sseClients = new Set();

function broadcast(eventName) {
  for (const res of sseClients) {
    res.write(`event: ${eventName}\n`);
    res.write(`data: ${Date.now()}\n\n`);
  }
}

async function tryResolve(urlPath) {
  // Strip query/hash and decode.
  const clean = decodeURIComponent(urlPath.split('?')[0].split('#')[0]);
  // Disallow path traversal.
  if (clean.includes('..')) return null;
  const candidates = [];
  if (clean.endsWith('/')) {
    candidates.push(path.join(ROOT, clean, 'index.html'));
  } else {
    candidates.push(path.join(ROOT, clean));
    if (!path.extname(clean)) {
      candidates.push(path.join(ROOT, clean + '.html'));
      candidates.push(path.join(ROOT, clean, 'index.html'));
    }
  }
  for (const file of candidates) {
    try {
      const stat = await fsp.stat(file);
      if (stat.isFile()) return file;
    } catch {
      // try next
    }
  }
  return null;
}

const server = http.createServer(async (req, res) => {
  if (req.url === '/__livereload') {
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
    });
    res.write(': hello\n\n');
    sseClients.add(res);
    req.on('close', () => sseClients.delete(res));
    return;
  }

  const file = await tryResolve(req.url ?? '/');
  if (!file) {
    res.writeHead(404, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(
      `<!doctype html><meta charset="utf-8"><title>404</title><h1>404 Not Found</h1><p>${req.url}</p>`
    );
    return;
  }

  const ext = path.extname(file).toLowerCase();
  const type = MIME[ext] ?? 'application/octet-stream';
  res.setHeader('Content-Type', type);
  res.setHeader('Cache-Control', 'no-store');

  if (ext === '.html') {
    let body = await fsp.readFile(file, 'utf8');
    // Inject reload snippet just before </body>, or append if missing.
    if (body.includes('</body>')) {
      body = body.replace('</body>', RELOAD_SNIPPET + '</body>');
    } else {
      body += RELOAD_SNIPPET;
    }
    res.end(body);
    return;
  }

  fs.createReadStream(file).pipe(res);
});

const watchExts = new Set(['.html', '.css', '.js', '.mjs', '.json', '.svg', '.md']);
const ignorePathFragments = [
  '/node_modules/',
  '/reports/',
  '/.git/',
  '/.lighthouseci/',
  '/dist/',
  '/.cache/',
];

let debounceTimer = null;
let pendingCss = false;
let pendingFull = false;

function flushSoon() {
  if (debounceTimer) clearTimeout(debounceTimer);
  debounceTimer = setTimeout(() => {
    if (pendingFull) {
      console.log('[livereload] reload');
      broadcast('reload');
    } else if (pendingCss) {
      console.log('[livereload] css');
      broadcast('css');
    }
    pendingFull = false;
    pendingCss = false;
  }, 100);
}

function onChange(_event, fname) {
  if (!fname) return;
  const norm = '/' + fname.replace(/\\/g, '/');
  if (ignorePathFragments.some((frag) => norm.includes(frag))) return;
  const ext = path.extname(fname).toLowerCase();
  if (!watchExts.has(ext)) return;
  if (ext === '.css') pendingCss = true;
  else pendingFull = true;
  flushSoon();
}

// Watch a small set of source directories. macOS uses FSEvents which is
// implicitly recursive; we pass recursive on darwin/win32 only and fall back
// to per-directory watches on Linux to avoid the EMFILE issue.
const recursiveSupported = process.platform === 'darwin' || process.platform === 'win32';
const watchTargets = ['', 'styles', 'js', 'scripts', 'data', 'posts'];

for (const sub of watchTargets) {
  const full = path.join(ROOT, sub);
  if (!fs.existsSync(full)) continue;
  try {
    fs.watch(full, { persistent: true, recursive: recursiveSupported }, onChange);
  } catch (err) {
    console.warn(`[livereload] cannot watch ${sub || '.'}:`, err?.message);
  }
}

server.listen(PORT, '127.0.0.1', () => {
  console.log(
    `\n  Local dev server\n  http://localhost:${PORT}/\n  http://localhost:${PORT}/research\n`
  );
});

#!/usr/bin/env node
/**
 * Update site.last_updated to today's date (UTC, ISO yyyy-mm-dd).
 * Run as part of the build pipeline so the visible "last updated" footer
 * value tracks the most recent deploy.
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const ROOT = path.resolve(path.dirname(__filename), '..');
const SITE_PATH = path.join(ROOT, 'data', 'site.json');

const today = new Date().toISOString().slice(0, 10);
const site = JSON.parse(fs.readFileSync(SITE_PATH, 'utf8'));
const prev = site.last_updated;
site.last_updated = today;
fs.writeFileSync(SITE_PATH, JSON.stringify(site, null, 2) + '\n');
console.log(`last_updated: ${prev} -> ${today}`);

#!/usr/bin/env node
/**
 * Build robots.txt from data/site.json. Allow_ai_crawlers controls explicit
 * AI-crawler stanzas; either way, the resulting file enumerates them so the
 * intent is unambiguous.
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const ROOT = path.resolve(path.dirname(__filename), '..');
const SITE = JSON.parse(fs.readFileSync(path.join(ROOT, 'data', 'site.json'), 'utf8'));

const aiBots = [
  'GPTBot',
  'ChatGPT-User',
  'OAI-SearchBot',
  'ClaudeBot',
  'Claude-Web',
  'anthropic-ai',
  'PerplexityBot',
  'Perplexity-User',
  'Google-Extended',
  'CCBot',
  'cohere-ai',
  'Bytespider',
  'Amazonbot',
  'meta-externalagent',
  'Applebot-Extended',
  'DuckAssistBot',
];

const allow = SITE.allow_ai_crawlers ? 'Allow' : 'Disallow';
const headerNote = SITE.allow_ai_crawlers
  ? '# AI crawlers are explicitly allowed; please use citations and respect attribution.'
  : '# AI training crawlers are explicitly disallowed.';

const aiBlock = aiBots.map((b) => `User-agent: ${b}\n${allow}: /\n`).join('\n');

const out = `# robots.txt for ${SITE.homepage}
User-agent: *
Allow: /
Crawl-delay: 1

${headerNote}
${aiBlock}
Sitemap: ${SITE.homepage.replace(/\/$/, '')}/sitemap.xml
`;

fs.writeFileSync(path.join(ROOT, 'robots.txt'), out);
console.log(
  `robots.txt: AI crawlers ${SITE.allow_ai_crawlers ? 'allowed' : 'disallowed'} (${aiBots.length} stanzas)`
);

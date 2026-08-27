/**
 * Guards the core SEO invariant: content that should rank must be present in the
 * server-rendered HTML, not injected on the client.
 *
 * Runs against the build output rather than a dev server, so it fails for the
 * same reason a crawler would.
 */
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

interface RouteExpectation {
  readonly htmlPath: string;
  readonly label: string;
}

const ROUTES: readonly RouteExpectation[] = [
  { htmlPath: 'server/app/index.html', label: '/' },
  {
    htmlPath: 'server/app/passport-photo-checker.html',
    label: '/passport-photo-checker',
  },
];

const REQUIRED_PATTERNS: readonly (readonly [string, RegExp])[] = [
  ['a <title>', /<title>[^<]{10,}<\/title>/i],
  ['a meta description', /<meta[^>]+name="description"[^>]+content="[^"]{20,}"/i],
  ['exactly one <h1>', /<h1[^>]*>[\s\S]*?<\/h1>/i],
  ['a declared language', /<html[^>]+lang="[a-z]{2}"/i],
  ['an absolute canonical URL', /<link[^>]+rel="canonical"[^>]+href="https?:\/\//i],
  ['an Open Graph title', /<meta[^>]+property="og:title"/i],
  ['an Open Graph image', /<meta[^>]+property="og:image"/i],
  ['a Twitter card', /<meta[^>]+name="twitter:card"/i],
  ['JSON-LD structured data', /<script[^>]+type="application\/ld\+json"/i],
];

const FORBIDDEN_PATTERNS: readonly (readonly [string, RegExp])[] = [
  ['a guarantee of acceptance', /\bguarantee(d|s)?\b/i],
  // A canonical pointing at the wrong origin silently de-indexes the page.
  ['a localhost canonical', /rel="canonical"[^>]+href="https?:\/\/(localhost|127\.)/i],
];

const failures: string[] = [];

for (const route of ROUTES) {
  let html: string;
  try {
    html = await readFile(join('.next', route.htmlPath), 'utf8');
  } catch {
    failures.push(`${route.label}: no prerendered HTML found — the route is not statically generated`);
    continue;
  }

  for (const [label, pattern] of REQUIRED_PATTERNS) {
    if (!pattern.test(html)) failures.push(`${route.label}: missing ${label}`);
  }
  for (const [label, pattern] of FORBIDDEN_PATTERNS) {
    if (pattern.test(html)) failures.push(`${route.label}: contains ${label}`);
  }
}

if (failures.length > 0) {
  console.error('SEO assertions failed:\n' + failures.map((f) => `  - ${f}`).join('\n'));
  process.exit(1);
}

console.log(`SEO assertions passed for ${ROUTES.length} route(s).`);

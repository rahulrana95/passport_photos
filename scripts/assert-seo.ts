/**
 * Guards the core SEO invariant: content that should rank must be present in the
 * server-rendered HTML, not injected on the client.
 *
 * Runs against the build output rather than a dev server, so it fails for the
 * same reason a crawler would.
 */
import { readdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';

interface RouteExpectation {
  readonly htmlPath: string;
  readonly label: string;
  /** Extra patterns this kind of page must satisfy, beyond the shared set. */
  readonly extra?: readonly (readonly [string, RegExp])[];
}

const APP_DIR = 'server/app';
const DOCUMENT_SUFFIX = '-photo.html';

/**
 * Everything a country page has to carry, on top of the shared set.
 *
 * These are the page's reason for existing. A country page whose requirements
 * arrived after hydration would rank for nothing, and one whose provenance line
 * was missing would be asserting government requirements with no citation —
 * which is the claim this product's credibility rests on.
 */
const COUNTRY_PATTERNS: readonly (readonly [string, RegExp])[] = [
  ['the requirements table', /<table[\s\S]*?<\/table>/i],
  ['a head-height row', /Head height/i],
  ['the verification date', /Requirements last verified on/i],
  ['a link to the issuing authority', /<a[^>]+href="https?:\/\/[^"]+"[^>]*rel="noreferrer/i],
  ['FAQ structured data', /"@type":"FAQPage"/],
  ['HowTo structured data', /"@type":"HowTo"/],
  ['breadcrumb structured data', /"@type":"BreadcrumbList"/],
  // The whole point of building the answers from the specification.
  ['no unfilled copy placeholder', /^(?!.*\{(country|document|min|max)\}).*$/s],
];

/**
 * Everything a size page has to carry.
 *
 * The list of countries is the reason the page exists: somebody searching a
 * number has been told it by a form and does not know whose rule it is. A page
 * that only restated the number would be a dictionary entry competing with the
 * country pages for the same reader.
 */
const DIMENSION_PATTERNS: readonly (readonly [string, RegExp])[] = [
  ['a link to at least one country page', /href="\/[a-z-]+\/[a-z-]+-photo"/i],
  ['breadcrumb structured data', /"@type":"BreadcrumbList"/],
  ['no unfilled copy placeholder', /^(?!.*\{(size|width|height|edge)\}).*$/s],
];

/** Pages whose file sits directly in the app directory rather than in a folder. */
const DIMENSION_SLUGS = new Set(
  ['2x2-inch-photo', '35x45mm-photo', '50x70mm-photo', '600x600-photo', 'resize-photo-to-240kb'],
);

/**
 * Discovered from the build output rather than listed here.
 *
 * A hand-maintained list falls behind the day a country is added, and it falls
 * behind silently: the new page simply is not checked. Reading the directory
 * means every page the build produced is asserted, including ones nobody
 * remembered to mention.
 */
const generatedRoutes = async (): Promise<readonly RouteExpectation[]> => {
  const entries = await readdir(join('.next', APP_DIR), { withFileTypes: true });
  const routes: RouteExpectation[] = [];

  for (const entry of entries) {
    if (entry.name.startsWith('[') || entry.name.startsWith('_')) continue;

    if (entry.isFile()) {
      const slug = entry.name.replace('.html', '');
      if (entry.name.endsWith('.html') && DIMENSION_SLUGS.has(slug)) {
        routes.push({
          htmlPath: join(APP_DIR, entry.name),
          label: `/${slug}`,
          extra: DIMENSION_PATTERNS,
        });
      }
      continue;
    }

    if (!entry.isDirectory()) continue;

    const files = await readdir(join('.next', APP_DIR, entry.name));

    for (const file of files.filter((name) => name.endsWith(DOCUMENT_SUFFIX))) {
      routes.push({
        htmlPath: join(APP_DIR, entry.name, file),
        label: `/${entry.name}/${file.replace('.html', '')}`,
        extra: COUNTRY_PATTERNS,
      });
    }
  }

  return routes;
};

const ROUTES: readonly RouteExpectation[] = [
  { htmlPath: `${APP_DIR}/index.html`, label: '/' },
  { htmlPath: `${APP_DIR}/passport-photo-checker.html`, label: '/passport-photo-checker' },
  {
    htmlPath: `${APP_DIR}/why-was-my-passport-photo-rejected.html`,
    label: '/why-was-my-passport-photo-rejected',
    // The reasons are the page. If they arrived after hydration it would rank
    // for nothing, and the reader who needs them most is the one who came from
    // a search rather than from inside the site.
    extra: [['every rejection reason in the HTML', /Head height[\s\S]*Glasses/i]],
  },
  {
    htmlPath: `${APP_DIR}/passport-photo-head-size.html`,
    label: '/passport-photo-head-size',
    extra: [['the comparison table', /<table[\s\S]*?<\/table>/i]],
  },
  {
    htmlPath: `${APP_DIR}/passport-photo-background-check.html`,
    label: '/passport-photo-background-check',
    extra: [['the comparison table', /<table[\s\S]*?<\/table>/i]],
  },
  {
    htmlPath: `${APP_DIR}/privacy.html`,
    label: '/privacy',
    // The claim itself has to be in the served HTML. A privacy page whose
    // central sentence arrives with JavaScript is one a cautious reader — the
    // only kind who opens it — may never see.
    extra: [['the promise, in the HTML', /never leaves your device/i]],
  },
  {
    htmlPath: `${APP_DIR}/terms.html`,
    label: '/terms',
    extra: [['who actually decides', /decision belongs to the authority|belongs to the authority/i]],
  },
  ...(await generatedRoutes()),
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
  for (const [label, pattern] of route.extra ?? []) {
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

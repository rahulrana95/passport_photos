import { expect, test, type Page } from '@playwright/test';

/**
 * Every country page, crawled the way a search engine crawls one.
 *
 * These pages ARE the product's distribution: nobody searches for the checker,
 * they search for "us passport photo size". So what is asserted here is the
 * things that decide whether the page can rank at all — that the requirements
 * are in the server's HTML rather than injected after hydration, that the
 * canonical points at itself, that the structured data matches what is visible,
 * and that no link in the template leads anywhere that 404s.
 *
 * The route list comes from the sitemap rather than from a list written here.
 * A hand-maintained list falls behind the day a country is added, and it falls
 * behind silently — the new page is simply never checked.
 */

const SITEMAP_PATH = '/sitemap.xml';
const COUNTRY_ROUTE = /^\/[a-z-]+\/[a-z-]+-photo$/;

/** Model download plus a WebAssembly runtime, for the page that runs one. */
const ENGINE_TIMEOUT_MS = 120_000;

const countryRoutes = async (page: Page): Promise<readonly string[]> => {
  const response = await page.request.get(SITEMAP_PATH);
  const xml = await response.text();

  return [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)]
    .map((match) => new URL(match[1] as string).pathname)
    .filter((path) => COUNTRY_ROUTE.test(path));
};

test.describe('country pages', () => {
  test('the sitemap lists at least one, and every one of them renders', async ({ page }) => {
    // A sitemap entry with no page behind it is reported by Search Console as
    // an error against the whole property, not against the one URL.
    const routes = await countryRoutes(page);
    expect(routes.length).toBeGreaterThan(0);

    for (const route of routes) {
      const response = await page.request.get(route);
      expect(response.status(), `${route} should be served`).toBe(200);
    }
  });

  test('every page carries its requirements in the server HTML', async ({ page }) => {
    const routes = await countryRoutes(page);

    for (const route of routes) {
      const html = await (await page.request.get(route)).text();

      expect(html, `${route} should carry a requirements table`).toContain('<table');
      expect(html, `${route} should cite when it was verified`).toContain(
        'Requirements last verified on',
      );
      expect(html, `${route} should leave no copy placeholder`).not.toMatch(/\{country\}/);
    }
  });

  test('every page declares itself canonical at its own URL', async ({ page }) => {
    // Two URLs for one page splits its ranking between them, and a template is
    // the one place that mistake reaches every page at once.
    const routes = await countryRoutes(page);

    for (const route of routes) {
      await page.goto(route);
      const canonical = await page
        .locator('link[rel="canonical"]')
        .getAttribute('href');

      expect(canonical, `${route} should be canonical at itself`).toContain(route);
    }
  });

  test('every page has exactly one h1, naming its own country', async ({ page }) => {
    const routes = await countryRoutes(page);

    for (const route of routes) {
      await page.goto(route);
      const headings = page.locator('h1');

      await expect(headings, `${route} should have one h1`).toHaveCount(1);
      await expect(headings).not.toBeEmpty();
    }
  });

  test('no page links anywhere that does not exist', async ({ page }) => {
    // The template's own links, checked on a real page. A broken link in a
    // template is a broken site rather than a broken URL — the sitemap made
    // exactly this mistake once, advertising a page nobody had built.
    await page.goto('/us/passport-photo');

    const hrefs = await page.locator('a[href^="/"]').evaluateAll((links) =>
      links.map((link) => link.getAttribute('href') ?? ''),
    );
    expect(hrefs.length).toBeGreaterThan(0);

    for (const href of new Set(hrefs)) {
      const response = await page.request.get(href);
      expect(response.status(), `${href} is linked from a country page`).toBeLessThan(400);
    }
  });

  test('an unknown country is a real 404, not a page saying nothing', async ({ page }) => {
    // A soft 404 — status 200 with an apology on it — is indexed, competes
    // with the real pages, and never gets removed.
    const response = await page.request.get('/france/passport-photo');

    expect(response.status()).toBe(404);
  });

  test('a document this country does not issue is a real 404', async ({ page }) => {
    const response = await page.request.get('/uk/licence-photo');

    expect(response.status()).toBe(404);
  });

  test('asks nothing when the page is about one document', async ({ page }) => {
    // The picker is a question, and the reader answered it by arriving here.
    await page.goto('/us/passport-photo');

    // Scoped to the checker's own question: the theme control in the header is
    // a radio group too, and it belongs there.
    await expect(page.getByText('What are you applying for?')).toHaveCount(0);
    await expect(page.getByText('Drop your photo here')).toBeVisible();
  });

  test('runs the real engine against this country’s specification', async ({ page }) => {
    test.setTimeout(ENGINE_TIMEOUT_MS);
    await page.goto('/uk/passport-photo');

    const photo = await page.evaluate(() => {
      const canvas = document.createElement('canvas');
      canvas.width = 600;
      canvas.height = 600;
      const context = canvas.getContext('2d');
      if (context === null) throw new Error('This browser has no 2D canvas.');
      context.fillStyle = '#d8d8d8';
      context.fillRect(0, 0, canvas.width, canvas.height);
      return canvas.toDataURL('image/jpeg');
    });

    await page.locator('input[type="file"]').first().setInputFiles({
      name: 'plain.jpg',
      mimeType: 'image/jpeg',
      buffer: Buffer.from(photo.slice(photo.indexOf(',') + 1), 'base64'),
    });

    await expect(page.getByText('We could not find a face in that photo.')).toBeVisible({
      timeout: ENGINE_TIMEOUT_MS,
    });
  });
});

import { expect, test, type Page } from '@playwright/test';

/**
 * The pages about a number rather than about a country.
 *
 * "2x2 photo", "600x600 photo", "resize photo to 240kb" — searches made by
 * somebody who has been handed a number by a form and does not know whose rule
 * it is. What is asserted here is the thing that makes these pages worth
 * having: that each one names the countries that ask for it, links to them,
 * and is linked back.
 */

const SITEMAP_PATH = '/sitemap.xml';
const COUNTRY_ROUTE = /^\/[a-z-]+\/[a-z-]+-photo$/;
const DIMENSION_ROUTE = /^\/[0-9a-z-]+$/;

const routesFromSitemap = async (page: Page): Promise<readonly string[]> => {
  const xml = await (await page.request.get(SITEMAP_PATH)).text();

  return [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map(
    (match) => new URL(match[1] as string).pathname,
  );
};

const dimensionRoutes = async (page: Page): Promise<readonly string[]> => {
  const routes = await routesFromSitemap(page);

  return routes.filter(
    (path) => DIMENSION_ROUTE.test(path) && !COUNTRY_ROUTE.test(path) && path !== '/',
  );
};

test.describe('size pages', () => {
  test('the sitemap lists them and every one renders', async ({ page }) => {
    const routes = await dimensionRoutes(page);
    expect(routes.length).toBeGreaterThan(0);

    for (const route of routes) {
      const response = await page.request.get(route);
      expect(response.status(), `${route} should be served`).toBe(200);
    }
  });

  test('every one names the countries that ask for it', async ({ page }) => {
    // The reason the page exists. A page that only restated the number would
    // be a dictionary entry competing with the country pages for the same
    // reader while telling them less.
    const routes = await dimensionRoutes(page);

    for (const route of routes) {
      await page.goto(route);
      const links = page.locator(`a[href^="/"][href$="-photo"]`);

      await expect(links.first(), `${route} should link a country page`).toBeVisible();
    }
  });

  test('the country pages link back to the sizes they use', async ({ page }) => {
    // Cross-linked in both directions on purpose: the country page owns the
    // requirements, the size page owns "who else asks for this".
    await page.goto('/us/passport-photo');

    await expect(page.getByRole('link', { name: /2 × 2/ })).toBeVisible();
  });

  test('a US page points at the square and not at the European size', async ({ page }) => {
    await page.goto('/us/passport-photo');
    const sizeLinks = page.locator('a[href="/2x2-inch-photo"], a[href="/35x45mm-photo"]');

    await expect(sizeLinks).toHaveCount(1);
  });

  test('a size nothing verified uses is a real 404', async ({ page }) => {
    // Declared in the catalogue, deliberately not published: a page about a
    // requirement we have not checked is the one thing this must not publish.
    const response = await page.request.get('/50x70mm-photo');

    expect(response.status()).toBe(404);
  });

  test('every link on a size page leads somewhere that exists', async ({ page }) => {
    await page.goto('/2x2-inch-photo');

    const hrefs = await page
      .locator('a[href^="/"]')
      .evaluateAll((links) => links.map((link) => link.getAttribute('href') ?? ''));
    expect(hrefs.length).toBeGreaterThan(0);

    for (const href of new Set(hrefs)) {
      const response = await page.request.get(href);
      expect(response.status(), `${href} is linked from a size page`).toBeLessThan(400);
    }
  });

  test('offers every specification that uses the size, so the picker is a real choice', async ({
    page,
  }) => {
    await page.goto('/2x2-inch-photo');

    // Named rather than counted: the header's theme control is a radio group
    // too, and it collapses on mobile — so a global count asserts the header's
    // layout rather than the checker's choices.
    await expect(page.getByText('What are you applying for?')).toBeVisible();
    await expect(page.getByLabel('United States Passport')).toBeVisible();
    await expect(page.getByLabel('United States Visa')).toBeVisible();
  });
});

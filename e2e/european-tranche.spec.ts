import { expect, test } from '@playwright/test';

/**
 * The three countries that broke the registry's assumptions.
 *
 * France, Germany and the Netherlands publish the same photo size and disagree
 * about nearly everything else. What is asserted here is not that each page
 * exists — the country page tests already cover that shape — but that each page
 * says the thing that is TRUE OF THAT COUNTRY and would be wrong of its
 * neighbour. A tranche that rendered three near-identical pages would pass a
 * page-exists test and be worthless.
 */

const FRANCE = '/france/passport-photo';
const GERMANY = '/germany/passport-photo';
const NETHERLANDS = '/netherlands/passport-photo';

test.describe('the first European tranche', () => {
  test('France says white is forbidden, which is the opposite of the US rule', async ({ page }) => {
    const html = await (await page.request.get(FRANCE)).text();
    const american = await (await page.request.get('/us/passport-photo')).text();

    expect(html).toContain('32 mm');
    expect(html).toMatch(/light grey/i);
    expect(american).toMatch(/white/i);
  });

  test('Germany states no file size and no maximum age, rather than blanks', async ({ page }) => {
    // The authority publishes neither. A row saying "not specified" is a row a
    // reader will act on, so there is no row at all.
    await page.goto(GERMANY);

    const table = page.locator('table').first();
    await expect(table).toBeVisible();

    await expect(table.getByRole('rowheader', { name: 'Printed size' })).toBeVisible();
    await expect(table.getByRole('rowheader', { name: 'File' })).toHaveCount(0);
    await expect(table.getByRole('rowheader', { name: 'How recent' })).toHaveCount(0);
  });

  test('every country says who is allowed to take the photo', async ({ page }) => {
    // Where this is not "anyone", knowing the photo would pass is not the same
    // as being able to submit it, and the page has to say so.
    for (const route of [FRANCE, GERMANY, NETHERLANDS]) {
      await page.goto(route);
      const table = page.locator('table').first();

      await expect(
        table.getByRole('rowheader', { name: 'Who may take it' }),
        `${route} should say who may take the photo`,
      ).toBeVisible();
    }

    const german = await (await page.request.get(GERMANY)).text();
    expect(german).toContain('cannot be submitted');
  });

  test('the neighbours do not agree about the head, and the pages show it', async ({ page }) => {
    // 26-30mm in the Netherlands against 32-36mm in France, on an identically
    // sized photograph. If these two pages ever agree, one of them is wrong.
    const dutch = await (await page.request.get(NETHERLANDS)).text();
    const french = await (await page.request.get(FRANCE)).text();

    expect(dutch).toContain('26 mm');
    expect(dutch).toContain('30 mm');
    expect(french).toContain('32 mm');
    expect(french).toContain('36 mm');

    // Same size, different measurement: France excludes the hair, Germany does
    // not. The crown wording is the reason a photo passes in one and fails next
    // door, so it has to be in the served HTML of both.
    const german = await (await page.request.get(GERMANY)).text();
    expect(french).toContain('crown of your skull');
    expect(german).toContain('top of your head including your hair');
  });

  test('they join the size page they share, and it lists them', async ({ page }) => {
    await page.goto('/35x45mm-photo');

    for (const name of ['France passport', 'Germany passport', 'Netherlands passport']) {
      await expect(page.getByText(name, { exact: false }).first()).toBeVisible();
    }
  });

  test('they appear in the comparison pages, which is the point of them', async ({ page }) => {
    await page.goto('/passport-photo-head-size');

    await expect(page.getByRole('rowheader', { name: 'France passport' })).toBeVisible();
    await expect(page.getByRole('rowheader', { name: 'Germany passport' })).toBeVisible();
    await expect(page.getByRole('rowheader', { name: 'Netherlands passport' })).toBeVisible();
  });

  test('each cites the authority it came from', async ({ page }) => {
    for (const route of [FRANCE, GERMANY, NETHERLANDS]) {
      const html = await (await page.request.get(route)).text();

      expect(html, `${route} must cite its source`).toMatch(
        /service-public\.gouv\.fr|bundesdruckerei|netherlandsworldwide/,
      );
    }
  });

  test('no link on them leads anywhere that does not exist', async ({ page }) => {
    for (const route of [FRANCE, GERMANY, NETHERLANDS]) {
      await page.goto(route);

      const hrefs = await page
        .locator('a[href^="/"]')
        .evaluateAll((links) => links.map((link) => link.getAttribute('href') ?? ''));

      for (const href of new Set(hrefs)) {
        const response = await page.request.get(href);
        expect(response.status(), `${href} is linked from ${route}`).toBeLessThan(400);
      }
    }
  });
});

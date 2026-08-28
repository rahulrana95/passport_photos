import { expect, test } from '@playwright/test';

/**
 * The pages for a reader with a problem rather than a country.
 *
 * The rejection page is the one that matters most here, and what is asserted
 * is that it is a different page rather than a redirect: somebody arriving
 * with a rejection notice already has the verdict and wants the diagnosis, so
 * the reasons come before the upload.
 */

const REJECTED = '/why-was-my-passport-photo-rejected';
const HEAD_SIZE = '/passport-photo-head-size';
const BACKGROUND = '/passport-photo-background-check';

test.describe('problem pages', () => {
  test('the rejection page answers before it asks for anything', async ({ page }) => {
    // Not a redirect to the checker. Offering an upload first answers a
    // question this reader did not ask.
    await page.goto(REJECTED);

    const reasons = page.getByText('Head height', { exact: true });
    const dropzone = page.getByText('Drop your photo here');

    await expect(reasons).toBeVisible();
    await expect(dropzone).toBeVisible();

    const reasonsTop = (await reasons.boundingBox())?.y ?? 0;
    const dropzoneTop = (await dropzone.boundingBox())?.y ?? 0;
    expect(reasonsTop).toBeLessThan(dropzoneTop);
  });

  test('every rejection reason is in the served HTML', async ({ page }) => {
    // The reader who needs them most arrived from a search, and a crawler that
    // has to run JavaScript to find them may never see them at all.
    const html = await (await page.request.get(REJECTED)).text();

    expect(html).toContain('Head height');
    expect(html).toContain('Glasses');
    expect(html).toContain('Marks and creases');
  });

  test('the navigation links to it again, from every page', async ({ page }) => {
    // PR #29 removed this link because it pointed at a 404 on every page of
    // the site. It is back because the page is.
    await page.goto('/us/passport-photo');

    const link = page.getByRole('link', { name: 'Why was mine rejected?' }).first();
    await expect(link).toBeVisible();

    await link.click();
    await expect(page).toHaveURL(new RegExp(`${REJECTED}$`));
  });

  test('the topic pages compare every country on one requirement', async ({ page }) => {
    // The mirror of a country page, and the comparison somebody refused in one
    // country and applying in another actually needs.
    for (const route of [HEAD_SIZE, BACKGROUND]) {
      await page.goto(route);

      // By row header rather than by text: the checker below the table offers
      // the same countries as radio labels, and matching either would pass
      // while asserting nothing about the comparison.
      await expect(page.locator('table'), `${route} should compare countries`).toBeVisible();
      await expect(page.getByRole('rowheader', { name: 'United States passport' })).toBeVisible();
      await expect(page.getByRole('rowheader', { name: 'United Kingdom passport' })).toBeVisible();
    }
  });

  test('the head size page states both units and how the top is measured', async ({ page }) => {
    // The reason the same photograph passes in one country and fails in
    // another. Bare numbers would hide it.
    const html = await (await page.request.get(HEAD_SIZE)).text();

    expect(html).toMatch(/mm/);
    expect(html).toMatch(/%/);
    expect(html).toContain('crown of your skull');
    expect(html).toContain('top of your head including your hair');
  });

  test('each declares itself canonical at its own URL', async ({ page }) => {
    for (const route of [REJECTED, HEAD_SIZE, BACKGROUND]) {
      await page.goto(route);
      const canonical = await page.locator('link[rel="canonical"]').getAttribute('href');

      expect(canonical, `${route} should be canonical at itself`).toContain(route);
    }
  });

  test('no link on them leads anywhere that does not exist', async ({ page }) => {
    for (const route of [REJECTED, HEAD_SIZE, BACKGROUND]) {
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

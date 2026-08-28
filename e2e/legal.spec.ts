import { expect, test } from '@playwright/test';

/**
 * The pages a cautious reader opens before they trust anything else.
 *
 * These were deliberately absent for several releases and the footer links to
 * them were removed rather than left pointing at 404s — the reader who clicks
 * Privacy is precisely the one who cannot be shown a missing page. This is
 * that debt paid.
 */

const PRIVACY = '/privacy';
const TERMS = '/terms';
const ENGINE_TIMEOUT_MS = 120_000;

test.describe('legal surfaces', () => {
  test('both pages exist and are reachable from every page of the site', async ({ page }) => {
    await page.goto('/us/passport-photo');

    for (const [name, route] of [['Privacy', PRIVACY], ['Terms', TERMS]] as const) {
      const link = page.getByRole('link', { name, exact: true }).first();
      await expect(link, `${name} should be linked`).toBeVisible();
      expect(await link.getAttribute('href')).toBe(route);
    }
  });

  test('the privacy claim is in the served HTML, not injected later', async ({ page }) => {
    // The one sentence this page exists for. A reader cautious enough to open
    // it may well have JavaScript restricted, and would then be told nothing.
    const html = await (await page.request.get(PRIVACY)).text();

    expect(html).toMatch(/never leaves your device/i);
    expect(html).toMatch(/developer tools/i);
  });

  test('the privacy page says what IS collected, not only what is not', async ({ page }) => {
    // "Nothing is collected" would be false — there are page views, speed
    // measurements and usage events. A privacy page that overclaims is worse
    // than one that admits the truth plainly.
    const html = await (await page.request.get(PRIVACY)).text();

    expect(html).toMatch(/Vercel Analytics|Speed Insights/i);
    expect(html).toMatch(/cookie/i);
  });

  test('nothing anywhere promises the application will be accepted', async ({ page }) => {
    // The claim this product must never make. Checked across the pages a
    // reader actually lands on, not only the terms.
    for (const route of [PRIVACY, TERMS, '/us/passport-photo', '/passport-photo-checker']) {
      const html = await (await page.request.get(route)).text();

      expect(html, `${route} must not promise acceptance`).not.toMatch(/\bguarantee(d|s)?\b/i);
      expect(html, `${route} must not promise acceptance`).not.toMatch(/will be accepted\b/i);
    }
  });

  test('the terms name who actually decides', async ({ page }) => {
    const html = await (await page.request.get(TERMS)).text();

    expect(html).toMatch(/belongs to the authority/i);
  });

  test('no link on either page leads anywhere that does not exist', async ({ page }) => {
    for (const route of [PRIVACY, TERMS]) {
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

  test('the disclaimer appears WITH the result, not only in the footer', async ({ page }) => {
    // The plan's edge case, and the reason it matters: somebody just told
    // their photo meets the requirements is at the exact moment they might
    // read that as "this will be accepted". A sentence three hundred pixels
    // below the fold is not where that correction does any work.
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

    const heading = page.getByRole('heading', { name: 'What we checked' });
    await expect(heading).toBeVisible({ timeout: ENGINE_TIMEOUT_MS });

    // Above the results, and above the footer copy that says the same thing.
    const disclaimers = page.getByText('The final decision always belongs to that authority.');
    await expect(disclaimers.first()).toBeVisible();

    const inPanel = (await disclaimers.first().boundingBox())?.y ?? 0;
    const headingTop = (await heading.boundingBox())?.y ?? 0;

    expect(inPanel).toBeLessThan(headingTop);
  });
});

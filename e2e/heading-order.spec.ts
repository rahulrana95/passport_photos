import { expect, test } from '@playwright/test';

/**
 * Heading order, on every kind of page.
 *
 * Somebody using a screen reader navigates by heading. A page that jumps from
 * h1 to h3 tells them a level was skipped and leaves them looking for the
 * section that is not there — and it is invisible to everyone else, which is
 * why it survives.
 *
 * This existed on the checker page and on every country page: the result
 * panel's own headings started at h3 while every other section on those pages
 * was an h2. Nothing caught it, because the performance and accessibility
 * budget only ever measured the homepage — the simplest page here, and the one
 * that does not mount the checker.
 */

const ROUTES = [
  '/',
  '/passport-photo-checker',
  '/us/passport-photo',
  '/germany/passport-photo',
  '/35x45mm-photo',
  '/why-was-my-passport-photo-rejected',
  '/passport-photo-head-size',
  '/passport-photo-background-check',
];

const FIRST_LEVEL = 1;

test.describe('headings', () => {
  for (const route of ROUTES) {
    test(`descend one level at a time on ${route}`, async ({ page }) => {
      await page.goto(route);

      const levels = await page
        .locator('h1, h2, h3, h4, h5, h6')
        .evaluateAll((nodes) => nodes.map((node) => Number(node.tagName.slice(1))));

      expect(levels[0], `${route} should open with an h1`).toBe(FIRST_LEVEL);

      let previous = FIRST_LEVEL;
      for (const level of levels) {
        expect(
          level,
          `${route} jumps from h${String(previous)} to h${String(level)}`,
        ).toBeLessThanOrEqual(previous + 1);
        previous = level;
      }
    });
  }

  test('every page has exactly one h1', async ({ page }) => {
    for (const route of ROUTES) {
      await page.goto(route);

      await expect(page.locator('h1'), `${route} should have one h1`).toHaveCount(1);
    }
  });
});

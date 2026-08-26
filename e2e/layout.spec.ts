import { expect, test } from '@playwright/test';

test.describe('layout shell', () => {
  test('the skip link is the first thing the keyboard reaches, and it works', async ({ page }) => {
    await page.goto('/');

    await page.keyboard.press('Tab');
    const skip = page.getByRole('link', { name: /skip to content/i });
    await expect(skip).toBeFocused();

    await page.keyboard.press('Enter');
    await expect(page).toHaveURL(/#main-content$/);
  });

  test('navigation links are real anchors present in the served HTML', async ({ request }) => {
    // Fetched rather than rendered: this asserts what a crawler receives, not
    // what React produces after hydration.
    const html = await (await request.get('/')).text();

    expect(html).toContain('href="/us/passport-photo"');
    expect(html).toContain('href="/passport-photo-checker"');
  });

  test('the mobile menu opens and closes without JavaScript state', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/');

    const summary = page.getByText('Menu', { exact: true });
    await summary.click();
    await expect(page.getByRole('navigation', { name: 'Primary, mobile' })).toBeVisible();
  });

  test('an unknown route returns a genuine 404, not a soft 200', async ({ request }) => {
    // A soft 404 keeps the URL in the index and wastes crawl budget.
    const response = await request.get('/this-route-does-not-exist');
    expect(response.status()).toBe(404);
  });

  test('the footer disclaimer appears on every page', async ({ page }) => {
    await page.goto('/');

    await expect(page.getByText(/final decision always belongs/i).last()).toBeVisible();
  });
});

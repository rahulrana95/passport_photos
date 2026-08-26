import { expect, test } from '@playwright/test';

test.describe('home page', () => {
  test('renders the heading and the acceptance disclaimer', async ({ page }) => {
    await page.goto('/');

    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    // The disclaimer lives in the footer now, so it appears on every page
    // rather than being repeated per page body.
    await expect(page.getByText(/final decision always belongs/i)).toBeVisible();
  });

  test('never claims guaranteed acceptance', async ({ page }) => {
    await page.goto('/');

    const body = (await page.textContent('body')) ?? '';
    expect(body.toLowerCase()).not.toContain('guaranteed');
  });
});

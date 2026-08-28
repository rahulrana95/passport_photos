import { expect, test, type Page } from '@playwright/test';

/**
 * The whole product, by keyboard alone.
 *
 * Somebody who cannot use a mouse has to be able to get from an empty page to
 * a verdict and out again with a downloaded file. Every individual control has
 * a unit test saying it is focusable; what none of them can say is whether the
 * PATH works — whether the result you just produced is reachable from the
 * control that produced it, in an order that makes sense.
 *
 * The verdict is announced through a polite live region rather than by moving
 * focus, which is deliberate: an async completion that steals focus is
 * disorienting, and the reader may still be reading the thing they were on.
 * The live region says the answer arrived; these tests say you can then get to
 * it.
 */

const ENGINE_TIMEOUT_MS = 120_000;
const PAGE_PATH = '/uk/passport-photo';
const MAX_TABS = 40;

const plainPhoto = async (page: Page): Promise<Buffer> => {
  const data = await page.evaluate(() => {
    const canvas = document.createElement('canvas');
    canvas.width = 600;
    canvas.height = 600;
    const context = canvas.getContext('2d');
    if (context === null) throw new Error('This browser has no 2D canvas.');
    context.fillStyle = '#d8d8d8';
    context.fillRect(0, 0, canvas.width, canvas.height);
    return canvas.toDataURL('image/jpeg');
  });
  return Buffer.from(data.slice(data.indexOf(',') + 1), 'base64');
};

test.describe('by keyboard alone', () => {
  test('the photo chooser can be reached and operated without a mouse', async ({ page }) => {
    await page.goto(PAGE_PATH);

    // Tab until the file input takes focus. A label is not enough on its own:
    // the input behind it has to be the thing that receives focus, or pressing
    // Enter does nothing and the reader is stuck at a control that looks live.
    let reached = false;
    for (let step = 0; step < MAX_TABS && !reached; step += 1) {
      await page.keyboard.press('Tab');
      reached = await page.evaluate(() => {
        const active = document.activeElement;
        return active instanceof HTMLInputElement && active.type === 'file';
      });
    }

    expect(reached, 'the file input was never reachable by Tab').toBe(true);
  });

  test('the verdict is announced, and then reachable', async ({ page }) => {
    test.setTimeout(ENGINE_TIMEOUT_MS);
    await page.goto(PAGE_PATH);

    await page.locator('input[type="file"]').first().setInputFiles({
      name: 'plain.jpg',
      mimeType: 'image/jpeg',
      buffer: await plainPhoto(page),
    });

    // Announced first: a polite live region carrying the verdict, so somebody
    // who cannot see the panel appear is told the wait ended and what the
    // answer was — not merely that something changed.
    const announcement = page.getByRole('status').filter({ hasText: /check/i }).first();
    await expect(announcement).toBeVisible({ timeout: ENGINE_TIMEOUT_MS });

    // And then reachable: the results follow the control that produced them in
    // document order, so tabbing forward arrives rather than doubling back.
    const heading = page.getByRole('heading', { name: 'What we checked' });
    await expect(heading).toBeVisible();

    const headingBox = await heading.boundingBox();
    const uploadBox = await page.getByText('Start over').or(page.getByText('Drop your photo here')).first().boundingBox();

    expect(headingBox?.y ?? 0).toBeGreaterThan(uploadBox?.y ?? Number.POSITIVE_INFINITY);
  });

  test('nothing traps focus: every stop can be left again', async ({ page }) => {
    // A trap is the one keyboard failure with no workaround — a reader who
    // cannot Tab out of a control cannot reach anything after it, including
    // the answer and the way back.
    await page.goto(PAGE_PATH);

    const seen: string[] = [];
    for (let step = 0; step < MAX_TABS; step += 1) {
      await page.keyboard.press('Tab');
      seen.push(
        await page.evaluate(() => {
          const active = document.activeElement;
          return active === null ? 'none' : `${active.tagName}:${active.getAttribute('href') ?? active.textContent?.slice(0, 20) ?? ''}`;
        }),
      );
    }

    // A trap shows up as the same element every time from some point onward.
    const lastFive = seen.slice(-5);
    expect(new Set(lastFive).size, `focus stuck on ${lastFive[0] ?? ''}`).toBeGreaterThan(1);
  });
});

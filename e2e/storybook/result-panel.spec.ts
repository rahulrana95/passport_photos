import { expect, test, type Page } from '@playwright/test';

/**
 * The claim the loading state makes, measured rather than asserted in a comment.
 *
 * "Zero CLS — reserve the panel's height before results arrive" is a statement
 * about rendered pixels, and it cannot be checked in jsdom, which has no layout
 * at all. Every earlier version of this panel passed its unit tests while
 * jumping by a third of its own height when the answer landed; the number below
 * is the only thing that caught it.
 */

const VIEWPORT = { width: 900, height: 1200 };

const story = (id: string): string =>
  `/iframe.html?id=result-resultpanel--${id}&viewMode=story`;

const panelHeight = async (page: Page, id: string): Promise<number> => {
  await page.goto(story(id));
  await page.locator('#storybook-root section').waitFor({ state: 'visible' });
  await page.evaluate(() => document.fonts.ready);

  return page.evaluate(() =>
    Math.round(document.querySelector('#storybook-root section')?.getBoundingClientRect().height ?? 0),
  );
};

test.use({ viewport: VIEWPORT });

test.describe('result panel layout stability', () => {
  test('the waiting state is exactly as tall as the answer', async ({ page }) => {
    const waiting = await panelHeight(page, 'waiting');
    const ready = await panelHeight(page, 'all-pass');

    // Exactly. Not "close to": the reservation is derived from the same engine
    // that produces the rows, so any difference is a bug in the derivation
    // rather than rounding.
    expect(waiting).toBe(ready);
  });

  test('starting the analysis moves nothing', async ({ page }) => {
    const waiting = await panelHeight(page, 'waiting');
    const analysing = await panelHeight(page, 'analysing');

    // The progress bar's space is held in every state. Letting it appear and
    // vanish would move everything below it twice — once when the checks
    // start and once when they end.
    expect(analysing).toBe(waiting);
  });

  test('a report with failures grows only by the advice it adds', async ({ page }) => {
    const waiting = await panelHeight(page, 'waiting');
    const mixed = await panelHeight(page, 'mixed');

    // Failing rows carry a line of advice that passing rows do not, and which
    // cannot be reserved without knowing the verdict in advance. Bounded here
    // so the residual stays a few lines rather than quietly becoming a third
    // of the panel again.
    expect(mixed).toBeGreaterThanOrEqual(waiting);
    expect(mixed - waiting).toBeLessThan(VIEWPORT.height / 4);
  });

  test('a photo nothing could be measured on shrinks by no more than its unused lines', async ({
    page,
  }) => {
    const waiting = await panelHeight(page, 'waiting');
    const undetectable = await panelHeight(page, 'nothing-measurable');

    // The opposite residual: rows reserved a measurement line that a failed
    // analysis never fills. Also bounded, and also not reservable — whether a
    // stage produced a number is a fact about the photograph.
    expect(waiting - undetectable).toBeLessThan(VIEWPORT.height / 4);
  });

  test('the reserved rows are the rows that arrive', async ({ page }) => {
    await page.goto(story('waiting'));
    await page.locator('#storybook-root section').waitFor({ state: 'visible' });
    const reserved = await page.locator('[data-placeholder="rule-row"]').count();

    await page.goto(story('all-pass'));
    await page.locator('#storybook-root section').waitFor({ state: 'visible' });
    const real = await page.locator('#storybook-root section [class*="row"]').count();

    expect(reserved).toBeGreaterThan(0);
    expect(real).toBeGreaterThanOrEqual(reserved);
  });

  test('the verdict is announced once, not twice', async ({ page }) => {
    await page.goto(story('all-pass'));
    await page.locator('#storybook-root section').waitFor({ state: 'visible' });

    // Two live regions for one verdict says it twice. A screen-reader user
    // hearing the answer repeated has to work out whether something changed.
    await expect(page.locator('[aria-live]')).toHaveCount(1);
  });

  test('a failure interrupts, because the reader is waiting on it', async ({ page }) => {
    await page.goto(story('failed'));
    await page.locator('#storybook-root section').waitFor({ state: 'visible' });

    await expect(page.getByRole('alert')).toBeVisible();
  });
});

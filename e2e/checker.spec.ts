import { expect, test, type Page } from '@playwright/test';

/**
 * The checker page, driven end to end against the real engine.
 *
 * Everything below this page has unit tests, and every one of them passed on
 * the day the page shipped broken: the analysis worker was emitted as a raw
 * TypeScript file, the browser could not parse it, and the worker died before
 * running a line. Nothing in jsdom can see that, because nothing in jsdom loads
 * a worker or a WebAssembly runtime. So this spec runs the real thing — the
 * built worker, the real models, the real detector — and asserts the reader
 * gets an answer rather than an apology.
 *
 * The photograph is a plain field with no face in it, and "no face" is the
 * correct, deterministic answer for it. That answer is only reachable if the
 * worker booted, the models loaded and the analysis ran to completion, which is
 * the whole of what this spec is for. A real portrait cannot live in the
 * repository, so the passing verdict is covered by the unit and story suites.
 */

const PAGE_PATH = '/passport-photo-checker';

/** Model download plus a WebAssembly runtime, on a cold cache. */
const ENGINE_TIMEOUT_MS = 120_000;

const PHOTO_EDGE_PX = 600;

/** Every way the engine can fail to run at all, in the reader's words. */
const ENGINE_FAILURES = [
  'The checks stopped unexpectedly.',
  'The checks could not be loaded.',
  'This browser blocked the analysis engine from starting.',
];

/**
 * A photograph made in the browser, rather than committed as a fixture.
 *
 * It has to be a real encoded image — the page decodes it with the same
 * createImageBitmap a phone photo goes through — and it has to be larger than
 * the minimum ingestion accepts. A canvas gives both, with nothing to keep in
 * the repository.
 */
const plainPhoto = async (page: Page): Promise<Buffer> => {
  const dataUrl = await page.evaluate((edge: number) => {
    const canvas = document.createElement('canvas');
    canvas.width = edge;
    canvas.height = edge;
    const context = canvas.getContext('2d');
    if (context === null) throw new Error('This browser has no 2D canvas.');
    context.fillStyle = '#d8d8d8';
    context.fillRect(0, 0, edge, edge);
    return canvas.toDataURL('image/jpeg');
  }, PHOTO_EDGE_PX);

  return Buffer.from(dataUrl.slice(dataUrl.indexOf(',') + 1), 'base64');
};

test.describe('photo checker page', () => {
  test('is served with its heading and every document choice already in the HTML', async ({
    page,
  }) => {
    // Server-rendered, because this page is the one carrying search traffic. A
    // crawler that has to run JavaScript to see the document list is a crawler
    // that may never see it.
    const response = await page.goto(PAGE_PATH);
    const html = (await response?.text()) ?? '';

    expect(html).toContain('Check your passport photo');
    expect(html).toContain('United States Passport');
    expect(html).toContain('United Kingdom Passport');
  });

  test('says the photo never leaves the device', async ({ page }) => {
    await page.goto(PAGE_PATH);

    await expect(page.getByText(/stays on your device/i).first()).toBeVisible();
  });

  test('runs the real analysis engine and answers', async ({ page }) => {
    test.setTimeout(ENGINE_TIMEOUT_MS);
    await page.goto(PAGE_PATH);

    await page.locator('input[type="file"]').first().setInputFiles({
      name: 'plain.jpg',
      mimeType: 'image/jpeg',
      buffer: await plainPhoto(page),
    });

    // The verdict for a photograph with nobody in it. Reaching it means the
    // worker started, the models downloaded and the detector ran.
    await expect(page.getByText('We could not find a face in that photo.')).toBeVisible({
      timeout: ENGINE_TIMEOUT_MS,
    });

    for (const failure of ENGINE_FAILURES) {
      await expect(page.getByText(failure)).toHaveCount(0);
    }
  });

  test('offers a live camera, not a file picker wearing a camera label', async ({ page }) => {
    // `capture` on a file input is ignored by every desktop browser, so the
    // button used to open the same picker as "Choose a photo" and appear to do
    // nothing. What replaces it needs no camera to be present to be asserted:
    // the camera's own controls stand where the dropzone was.
    await page.goto(PAGE_PATH);

    await page.getByText('Take a photo').click();

    await expect(page.getByRole('button', { name: 'Use my camera' })).toBeVisible();
    await expect(page.getByLabel('Camera preview')).toBeAttached();
    await expect(page.getByText('Drop your photo here')).toHaveCount(0);
  });

  test('serves the analysis worker as JavaScript the browser can parse', async ({ request }) => {
    // The bug this page shipped with, asserted directly: the worker was served
    // as TypeScript source. A worker that 404s or arrives as text/plain is dead
    // on arrival, and every symptom of it appears far away from the cause.
    const response = await request.get('/workers/analysis.worker.js');

    expect(response.status()).toBe(200);
    expect(response.headers()['content-type']).toContain('javascript');
    expect(await response.text()).not.toContain('import type');
  });
});

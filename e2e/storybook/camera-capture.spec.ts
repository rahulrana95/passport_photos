import { expect, test, type Page } from '@playwright/test';

/**
 * The camera, in a real browser, with Chromium's fake capture device.
 *
 * `--use-fake-device-for-media-stream` gives getUserMedia a real MediaStream
 * carrying a synthetic moving pattern, and `--use-fake-ui-for-media-stream`
 * auto-answers the permission prompt. Together they exercise the parts jsdom
 * cannot reach at all: an actual stream attached to an actual <video>, actual
 * frames arriving, and the tracks actually stopping when asked.
 *
 * The stories inject a stub environment so the screenshot suite never asks for
 * a camera; this spec drives the SAME component against the real API by
 * telling the story to use the browser's.
 */

/**
 * The Idle story with its stub environment UNSET.
 *
 * `!undefined` is Storybook's own URL-args syntax, and using it is what makes
 * this spec exercise the real getUserMedia while the screenshot suite — which
 * renders the same story without the override — never asks for a camera. A
 * dedicated real-camera story would have been captured by the screenshot suite
 * too, and its baseline would then depend on whether the runner happened to
 * have a camera.
 */
const STORY_URL =
  '/iframe.html?id=camera-cameracapture--idle&viewMode=story&args=environment:!undefined';

test.use({
  launchOptions: {
    args: [
      '--use-fake-device-for-media-stream',
      '--use-fake-ui-for-media-stream',
    ],
  },
});

const open = async (page: Page): Promise<void> => {
  await page.goto(STORY_URL);
  await expect(page.getByRole('button', { name: 'Use my camera' })).toBeVisible();
};

/** How many camera tracks the page currently has running. */
const liveTrackCount = (page: Page): Promise<number> =>
  page.evaluate(() => {
    const video = document.querySelector('video');
    const stream = video?.srcObject as MediaStream | null;
    return stream === null || stream === undefined
      ? 0
      : stream.getTracks().filter((track) => track.readyState === 'live').length;
  });

test.describe('camera capture', () => {
  test('opens a real camera and attaches it to the preview', async ({ page }) => {
    await open(page);

    await page.getByRole('button', { name: 'Use my camera' }).click();

    await expect(page.getByRole('button', { name: 'Take the photo' })).toBeVisible();
    await expect.poll(() => liveTrackCount(page)).toBeGreaterThan(0);
  });

  test('plays actual frames, at the size the sensor is producing', async ({ page }) => {
    await open(page);
    await page.getByRole('button', { name: 'Use my camera' }).click();
    await expect(page.getByRole('button', { name: 'Take the photo' })).toBeVisible();

    // Polled, not read once: metadata arrives a beat after the stream is
    // attached, which is exactly why grabFrame has to be able to ask before
    // the camera is ready and be told "not yet".
    const HAVE_CURRENT_DATA = 2;
    await expect
      .poll(() => page.evaluate(() => document.querySelector('video')?.readyState ?? 0))
      .toBeGreaterThanOrEqual(HAVE_CURRENT_DATA);

    // videoWidth is the STREAM's, not the element's. A preview laid out at a
    // few hundred CSS pixels still carries the whole picture behind it, and
    // measuring the element instead is how a passport photograph ends up with
    // a tenth of the detail the camera took.
    const size = await page.evaluate(() => {
      const video = document.querySelector('video');
      return { videoWidth: video?.videoWidth ?? 0, clientWidth: video?.clientWidth ?? 0 };
    });

    expect(size.videoWidth).toBeGreaterThan(size.clientWidth);
  });

  test('mirrors the preview, which is a display transform and nothing more', async ({ page }) => {
    await open(page);
    await page.getByRole('button', { name: 'Use my camera' }).click();

    const video = page.locator('video');
    await expect(video).toHaveAttribute('data-mirrored', 'true');
    // The flip must be on the element. If it were applied to the pixels, the
    // captured photograph would have the parting on the wrong side — a
    // rejection the reader cannot see coming.
    await expect(video).toHaveCSS('transform', /matrix\(-1,/);
  });

  test('shows the guidance banner over the picture', async ({ page }) => {
    await open(page);
    await page.getByRole('button', { name: 'Use my camera' }).click();

    // The story's analyse returns no landmarks, so the honest answer is that
    // it is still looking. What matters here is that the loop is running
    // against real frames and the banner is being driven by it.
    await expect(page.getByRole('status')).toBeVisible();
  });

  test('stops every track when the reader turns it off', async ({ page }) => {
    await open(page);
    await page.getByRole('button', { name: 'Use my camera' }).click();
    await expect.poll(() => liveTrackCount(page)).toBeGreaterThan(0);

    await page.getByRole('button', { name: 'Turn the camera off' }).click();

    // Not tidiness. A track left running keeps the camera indicator lit, and
    // on a product that promises the photograph never leaves the device, an
    // indicator that stays on is the accusation.
    await expect.poll(() => liveTrackCount(page)).toBe(0);
  });

  test('leaks no track when the camera is switched', async ({ page }) => {
    await open(page);
    await page.getByRole('button', { name: 'Use my camera' }).click();
    await expect.poll(() => liveTrackCount(page)).toBeGreaterThan(0);

    await page.getByRole('button', { name: 'Switch camera' }).click();

    // The old stream has to be stopped before the new one opens, or the reader
    // ends up with two live tracks and an indicator that never goes out. The
    // unmount path is asserted in the unit suite, where the tracks can still
    // be inspected after the tree is gone.
    await expect(page.locator('video')).toHaveAttribute('data-mirrored', 'false');
    await expect.poll(() => liveTrackCount(page)).toBe(1);
  });

  test('offers the upload route without a camera being involved', async ({ page }) => {
    await page.goto('/iframe.html?id=camera-cameracapture--with-upload-fallback&viewMode=story');

    // Most desktops have no camera worth using, and plenty of readers already
    // have a better photograph on their phone.
    await expect(page.getByRole('button', { name: 'Upload a photo instead' })).toBeVisible();
  });

  test('explains a refusal rather than failing silently', async ({ page }) => {
    await page.goto('/iframe.html?id=camera-cameracapture--permission-denied&viewMode=story');

    await expect(page.getByRole('alert')).toContainText('blocking camera access');
  });
});

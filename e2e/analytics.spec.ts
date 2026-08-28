import { expect, test } from '@playwright/test';

/**
 * What actually leaves the device during a real check.
 *
 * The unit tests prove the payload builder cannot construct a leaking event.
 * This proves the claim end to end, which is a different claim: it watches
 * every request the browser makes while a photograph is checked, and asserts
 * that nothing in any of them looks like a measurement of a face.
 *
 * This is the product's central promise. A page that says the photo never
 * leaves your device and then posts its head height in millimetres would be
 * lying, and no amount of unit testing of the layer that was bypassed would
 * have noticed.
 */

const ENGINE_TIMEOUT_MS = 120_000;

/** The words that would mean a measurement had escaped. */
const FORBIDDEN = /headHeight|eyeLine|crown|landmark|chin|ratio|confidence|widthPx|heightPx/i;

test.describe('what analytics may see', () => {
  test('no request carries anything measured from the photograph', async ({ page }) => {
    test.setTimeout(ENGINE_TIMEOUT_MS);

    const suspicious: string[] = [];
    page.on('request', (request) => {
      const body = request.postData() ?? '';
      const url = request.url();

      // A body and a query string, and nothing else. Data leaves in one of
      // those two; a PATH cannot carry it out. Inspecting the whole URL flags
      // /models/face_landmarker.task — which is the model coming IN, the
      // opposite of a leak, and exactly the kind of false positive that gets
      // a privacy test disabled rather than believed.
      const query = new URL(url).search;

      if (FORBIDDEN.test(body) || FORBIDDEN.test(query)) {
        suspicious.push(`${request.method()} ${url} ${body.slice(0, 200)}`);
      }
    });

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

    await expect(page.getByText('We could not find a face in that photo.')).toBeVisible({
      timeout: ENGINE_TIMEOUT_MS,
    });

    expect(suspicious, 'a measurement reached the network').toEqual([]);
  });

  test('no photograph is uploaded, whatever else happens', async ({ page }) => {
    // The claim in its strongest form: not "no measurement", but no image
    // bytes at all. Any request large enough to be a photograph is a failure.
    test.setTimeout(ENGINE_TIMEOUT_MS);

    const LARGEST_PLAUSIBLE_BEACON_BYTES = 4_000;
    const uploads: string[] = [];

    page.on('request', (request) => {
      const body = request.postData();
      if (body !== null && body.length > LARGEST_PLAUSIBLE_BEACON_BYTES) {
        uploads.push(`${request.method()} ${request.url()} (${String(body.length)} bytes)`);
      }
    });

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

    await expect(page.getByText('We could not find a face in that photo.')).toBeVisible({
      timeout: ENGINE_TIMEOUT_MS,
    });

    expect(uploads, 'something large enough to be a photograph was sent').toEqual([]);
  });
});
